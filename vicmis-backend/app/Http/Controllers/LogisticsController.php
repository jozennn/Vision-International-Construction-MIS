<?php

namespace App\Http\Controllers;

use App\Models\Logistics;
use App\Models\WarehouseInventory;
use App\Models\MaterialRequest;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class LogisticsController extends Controller
{
    // =========================================================================
    // GET /api/inventory/logistics
    // Paginated list with optional filters — UNCHANGED
    // =========================================================================
    public function index(Request $request): JsonResponse
    {
        $query = Logistics::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('product_category', 'like', "%{$s}%")
                  ->orWhere('product_code',     'like', "%{$s}%")
                  ->orWhere('project_name',     'like', "%{$s}%")
                  ->orWhere('driver_name',      'like', "%{$s}%")
                  ->orWhere('destination',      'like', "%{$s}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('is_consumable', $request->type === 'consumable');
        }

        $perPage = in_array((int) $request->get('per_page', 10), [10, 25, 50])
            ? (int) $request->get('per_page', 10)
            : 10;

        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data'         => $paginated->items(),
            'total'        => $paginated->total(),
            'per_page'     => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'from'         => $paginated->firstItem(),
            'to'           => $paginated->lastItem(),
        ]);
    }

    // =========================================================================
    // GET /api/inventory/logistics/meta — UNCHANGED
    // =========================================================================
    public function meta(): JsonResponse
    {
        $categories = WarehouseInventory::select('product_category')
            ->distinct()
            ->orderBy('product_category')
            ->pluck('product_category');

        $products = WarehouseInventory::select(
                'product_category',
                'product_code',
                'availability',
                'current_stock',
                'is_consumable'
            )
            ->orderBy('product_category')
            ->orderBy('product_code')
            ->get()
            ->groupBy('product_category');

        return response()->json([
            'categories' => $categories,
            'products'   => $products,
        ]);
    }

    // =========================================================================
    // POST /api/inventory/logistics — UNCHANGED
    // =========================================================================
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'trucking_service' => 'required|string|max:255',
            'product_category' => 'required|string|max:255',
            'product_code'     => 'required|string|max:255',
            'is_consumable'    => 'boolean',
            'project_name'     => 'required|string|max:255',
            'driver_name'      => 'required|string|max:255',
            'destination'      => 'required|string|max:255',
            'date_of_delivery' => 'required|date',
            'quantity'         => 'required|integer|min:1',
        ]);

        $validated['status'] = 'In Transit';

        DB::transaction(function () use ($validated) {
            $item = WarehouseInventory::where('product_category', $validated['product_category'])
                ->where('product_code', $validated['product_code'])
                ->first();

            if ($item) {
                $newStock = max(0, $item->current_stock - $validated['quantity']);
                $item->update([
                    'current_stock' => $newStock,
                    'delivery_out'  => $item->delivery_out + $validated['quantity'],
                    'availability'  => WarehouseInventory::deriveAvailability($newStock),
                ]);
            }

            Logistics::create($validated);
        });

        return response()->json(['message' => 'Delivery scheduled successfully.'], 201);
    }

    // =========================================================================
    // PATCH /api/inventory/logistics/{id}/delivered  ← UPDATED
    //
    // Original: just set status = Delivered.
    //
    // NEW side effects (all in one DB transaction):
    //   1. status → 'Delivered', date_delivered → now()
    //   2. If delivery came from a material request:
    //        - Inject one new arrival row per item into project_materials.material_items (JSON)
    //        - Each row gets is_new_arrival: true  →  frontend badge
    //        - Decrement warehouse stock per item
    //   3. If manual delivery (no material_request_id):
    //        - Inject single new arrival row for the delivery's product_code
    //        - Decrement warehouse stock
    //   4. Notify Engineering that materials have arrived
    // =========================================================================
    // In LogisticsController.php, update the markDelivered method

public function markDelivered(int $id): JsonResponse
{
    $delivery = Logistics::findOrFail($id);

    abort_if($delivery->status === 'Delivered', 422, 'Already marked as delivered.');

    DB::transaction(function () use ($delivery) {

        // ── 1. Mark the delivery ───────────────────────────────────────
        $delivery->update([
            'status'         => 'Delivered',
            'date_delivered' => now(),
        ]);

        // ── 2. Find the associated material request (if any) ───────────
        $materialRequest = $delivery->material_request_id
            ? MaterialRequest::with('items')->find($delivery->material_request_id)
            : null;

        // ── 3. Resolve the project ─────────────────────────────────────
        $projectId = $materialRequest?->project_id
            ?? Project::where('project_name', $delivery->project_name)->value('id');

        if ($projectId) {
            $project     = Project::with('materials')->find($projectId);
            $matTracking = $project?->materials;

            // Get existing material_items JSON array (or start fresh)
            $existingItems = [];
            if ($matTracking && $matTracking->material_items) {
                $decoded = is_string($matTracking->material_items)
                    ? json_decode($matTracking->material_items, true)
                    : $matTracking->material_items;
                $existingItems = is_array($decoded) ? $decoded : [];
            }

            $today      = now()->toDateString();
            $newRows    = [];

            if ($materialRequest) {
                // ── Request-based delivery: one row per requested item ──
                foreach ($materialRequest->items as $item) {
                    $newRows[] = [
                        'id'                => 'arrival_' . uniqid(),
                        'name'              => $item->product_code
                                                ? "{$item->product_code} ({$item->description})"
                                                : $item->description,
                        'description'       => $item->description,
                        'delivery_date'     => $delivery->date_of_delivery ?? $today,
                        'qty'               => $item->requested_qty,
                        'total'             => $item->requested_qty,
                        'installed'         => 0,
                        'remaining_inventory' => $item->requested_qty,
                        'is_new_arrival'    => true,
                        'logistics_id'      => $delivery->id,
                        'material_request_id' => $delivery->material_request_id,
                        'remarks'           => 'Auto-added from material request delivery',
                    ];
                }
                
                // Update material request status to delivered
                $materialRequest->update(['status' => 'delivered']);
            } else {
                // ── Manual delivery: single row ────────────────────────
                $newRows[] = [
                    'id'                => 'arrival_' . uniqid(),
                    'name'              => $delivery->product_code,
                    'description'       => null,
                    'delivery_date'     => $delivery->date_of_delivery ?? $today,
                    'qty'               => $delivery->quantity,
                    'total'             => $delivery->quantity,
                    'installed'         => 0,
                    'remaining_inventory' => $delivery->quantity,
                    'is_new_arrival'    => true,
                    'logistics_id'      => $delivery->id,
                    'remarks'           => 'Auto-added from manual delivery',
                ];
            }

            // Merge new rows into existing tracking items
            $mergedItems = array_merge($existingItems, $newRows);

            // Upsert the project_materials row
            if ($project) {
                $project->materials()->updateOrCreate(
                    ['project_id' => $projectId],
                    ['material_items' => json_encode($mergedItems)]
                );
            }

            // ── 4. Notify Engineering ──────────────────────────────────
            $projectName = $materialRequest?->project_name ?? $delivery->project_name;
            \App\Models\AppNotification::create([
                'target_department' => 'Engineering',
                'target_role'       => null,
                'project_id'        => $projectId,
                'message'           => "✅ Materials Delivered: '{$projectName}' has new arrivals. Check Materials Monitoring.",
            ]);
        }

        // ── 5. Decrement warehouse stock (only for manual deliveries) ──
        // For request-based deliveries, stock was already decremented during dispatch
        if (!$materialRequest && $delivery->product_code) {
            $this->decrementStock($delivery->product_code, $delivery->quantity ?? 1);
        }
    });

    return response()->json([
        'message' => $delivery->material_request_id 
            ? 'Marked as delivered. Materials have been added to project monitoring.'
            : 'Marked as delivered. Stock updated and materials added to project monitoring.',
        'data'    => $delivery->fresh(),
    ]);
}
    // =========================================================================
    // DELETE /api/inventory/logistics/{id} — UNCHANGED
    // =========================================================================
    public function destroy(int $id): JsonResponse
    {
        Logistics::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // =========================================================================
    // PRIVATE HELPER — Decrement stock and re-derive availability
    //
    // Thresholds match your existing BoqTable.jsx logic:
    //   0       → NO STOCK
    //   1 – 10  → LOW STOCK
    //   11+     → ON STOCK
    // =========================================================================
    private function decrementStock(string $productCode, float $qty): void
    {
        $inv = WarehouseInventory::where('product_code', $productCode)->first();
        if (!$inv) return;

        $newStock = max(0, $inv->current_stock - $qty);

        $inv->update([
            'current_stock' => $newStock,
            'delivery_out'  => ($inv->delivery_out ?? 0) + $qty,
            'availability'  => WarehouseInventory::deriveAvailability($newStock),
        ]);
    }
}