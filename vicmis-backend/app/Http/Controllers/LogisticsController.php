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
    // GET /api/inventory/logistics — UNCHANGED
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
    // PATCH /api/inventory/logistics/{id}/delivered
    //
    // Fixes applied:
    //   1. data_get() for safe item access (handles both Eloquent models & arrays)
    //   2. Guard against double-processing when multiple Logistics rows share
    //      the same material_request_id (dispatch creates one row per item).
    //      Only the FIRST row marked delivered triggers material injection &
    //      stock decrement; subsequent rows just flip their status.
    //   3. Notification + material injection still fire exactly once per request.
    // =========================================================================
    public function markDelivered(int $id): JsonResponse
    {
        $delivery = Logistics::findOrFail($id);

        abort_if($delivery->status === 'Delivered', 422, 'Already marked as delivered.');

        DB::transaction(function () use ($delivery) {

            // ── 1. Mark this delivery record ───────────────────────────────
            $delivery->update([
                'status'         => 'Delivered',
                'date_delivered' => now(),
            ]);

            // ── 2. Resolve associated material request (if any) ────────────
            $materialRequest = $delivery->material_request_id
                ? MaterialRequest::with('items')->find($delivery->material_request_id)
                : null;

            // ── 3. Guard: if another sibling delivery for the same request
            //       has already been marked Delivered, skip side-effects to
            //       prevent duplicate material injection & double stock deduct.
            if ($materialRequest) {
                $alreadyProcessed = Logistics::where('material_request_id', $materialRequest->id)
                    ->where('id', '!=', $delivery->id)
                    ->where('status', 'Delivered')
                    ->exists();

                if ($alreadyProcessed) {
                    // Just mark delivered — no further side effects needed.
                    return;
                }
            }

            // ── 4. Resolve the project ─────────────────────────────────────
            $projectId = $materialRequest?->project_id
                ?? Project::where('project_name', $delivery->project_name)->value('id');

            if ($projectId) {
                $project     = Project::with('materials')->find($projectId);
                $matTracking = $project?->materials;

                // Get existing material_items JSON array (or start fresh)
                $existingItems = [];
                if ($matTracking && $matTracking->material_items) {
                    $decoded       = is_string($matTracking->material_items)
                        ? json_decode($matTracking->material_items, true)
                        : $matTracking->material_items;
                    $existingItems = is_array($decoded) ? $decoded : [];
                }

                $today   = now()->toDateString();
                $newRows = [];

                if ($materialRequest) {
                    // ── Request-based: one row per item ────────────────────
                    foreach ($materialRequest->items as $item) {
                        // Safe access for both Eloquent models and plain arrays
                        $productCode  = data_get($item, 'product_code');
                        $description  = data_get($item, 'description') ?? $productCode;
                        $requestedQty = (float) (data_get($item, 'requested_qty') ?? data_get($item, 'quantity') ?? 1);

                        $newRows[] = [
                            'name'                => $productCode
                                                     ? "{$productCode} ({$description})"
                                                     : $description,
                            'description'         => $description,
                            'delivery_date'       => $delivery->date_of_delivery ?? $today,
                            'qty'                 => $requestedQty,
                            'total'               => $requestedQty,
                            'installed'           => 0,
                            'remaining_inventory' => $requestedQty,
                            'is_new_arrival'      => true,
                            'logistics_id'        => $delivery->id,
                            'remarks'             => 'Auto-added from material request delivery',
                        ];
                    }
                } else {
                    // ── Manual delivery: single row ────────────────────────
                    $newRows[] = [
                        'name'                => $delivery->product_code,
                        'description'         => null,
                        'delivery_date'       => $delivery->date_of_delivery ?? $today,
                        'qty'                 => $delivery->quantity,
                        'total'               => $delivery->quantity,
                        'installed'           => 0,
                        'remaining_inventory' => $delivery->quantity,
                        'is_new_arrival'      => true,
                        'logistics_id'        => $delivery->id,
                        'remarks'             => 'Auto-added from manual delivery',
                    ];
                }

                // Merge and save
                if ($project) {
                    $project->materials()->updateOrCreate(
                        ['project_id' => $projectId],
                        ['material_items' => json_encode(array_merge($existingItems, $newRows))]
                    );
                }

                // ── 5. Notify Engineering ──────────────────────────────────
                $projectName = $materialRequest?->project_name ?? $delivery->project_name;
                \App\Models\AppNotification::create([
                    'target_department' => 'Engineering',
                    'target_role'       => null,
                    'project_id'        => $projectId,
                    'message'           => "✅ Materials Delivered: '{$projectName}' has new arrivals. Check Materials Monitoring.",
                ]);
            }

            // ── 6. Decrement warehouse stock ───────────────────────────────
            if ($materialRequest) {
                foreach ($materialRequest->items as $item) {
                    $productCode  = data_get($item, 'product_code');
                    $requestedQty = (float) (data_get($item, 'requested_qty') ?? data_get($item, 'quantity') ?? 1);

                    if ($productCode) {
                        $this->decrementStock($productCode, $requestedQty);
                    }
                }
            } elseif ($delivery->product_code) {
                $this->decrementStock($delivery->product_code, $delivery->quantity ?? 1);
            }
        });

        return response()->json([
            'message' => 'Marked as delivered. Materials Monitoring has been updated.',
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
    // Thresholds:  0 → NO STOCK | 1–10 → LOW STOCK | 11+ → ON STOCK
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