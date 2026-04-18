<?php
// app/Http/Controllers/LogisticsController.php

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
    // =========================================================================
    public function index(Request $request): JsonResponse
    {
        // ── FIX: SoftDeletes trait already appends `deleted_at IS NULL`
        //   automatically via its global scope. Calling ->whereNull('deleted_at')
        //   on top of that creates a conflicting/duplicate condition.
        //   Use withoutTrashed() for active records and onlyTrashed() for the bin.
        // ─────────────────────────────────────────────────────────────────────
        if ($request->has('trashed') && $request->trashed === 'true') {
            $query = Logistics::onlyTrashed();
        } else {
            // withoutTrashed() is explicit and safe — equivalent to the
            // SoftDeletes global scope but avoids double-condition conflicts
            $query = Logistics::withoutTrashed();
        }

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

        // ── FIX: Allow any per_page value including 9999 (used by dashboard
        //   to fetch all records for count summaries). Old code only allowed
        //   [10, 25, 50] and silently fell back to 10, causing the dashboard
        //   counts to be wrong and triggering unexpected behaviour.
        // ─────────────────────────────────────────────────────────────────────
        $perPage = (int) $request->get('per_page', 10);
        if ($perPage < 1)     $perPage = 10;
        if ($perPage > 9999)  $perPage = 9999;

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
    // GET /api/inventory/logistics/meta
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
    // POST /api/inventory/logistics
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
    // =========================================================================
    public function markDelivered(int $id): JsonResponse
    {
        $delivery = Logistics::findOrFail($id);

        abort_if($delivery->status === 'Delivered', 422, 'Already marked as delivered.');

        DB::transaction(function () use ($delivery) {

            $delivery->update([
                'status'         => 'Delivered',
                'date_delivered' => now(),
            ]);

            $materialRequest = $delivery->material_request_id
                ? MaterialRequest::find($delivery->material_request_id)
                : null;

            $projectId = $materialRequest?->project_id
                ?? Project::where('project_name', $delivery->project_name)->value('id');

            if ($projectId) {
                $project     = Project::with('materials')->find($projectId);
                $matTracking = $project?->materials;

                $existingItems = [];
                if ($matTracking && $matTracking->material_items) {
                    $decoded = is_string($matTracking->material_items)
                        ? json_decode($matTracking->material_items, true)
                        : $matTracking->material_items;
                    $existingItems = is_array($decoded) ? $decoded : [];
                }

                $today   = now()->toDateString();
                $newRows = [];

                if ($materialRequest) {
                    $items = $materialRequest->items;

                    foreach ($items as $item) {
                        $productCode     = $item['product_code']     ?? null;
                        $productCategory = $item['product_category'] ?? null;

                        $inv = null;
                        if (!empty($productCode)) {
                            $query = WarehouseInventory::where('product_code', $productCode);
                            if (!empty($productCategory)) {
                                $query->where('product_category', $productCategory);
                            }
                            $inv = $query->first();
                        }

                        $newRows[] = [
                            'id'               => 'arrival_' . time() . '_' . rand(1000, 9999),
                            'boqKey'           => $productCode,
                            'name'             => $productCode ?: $item['description'],
                            'description'      => $item['description'],
                            'product_category' => $productCategory ?: ($inv->product_category ?? ''),
                            'unit'             => $item['unit'] ?? 'Pcs',
                            'deliveries'       => [
                                [
                                    'date' => $delivery->date_of_delivery ?? $today,
                                    'qty'  => (int) $item['requested_qty'],
                                ]
                            ],
                            'installed'        => [],
                            'remarks'          => $item['remarks'] ?? 'Auto-added from material request delivery',
                            'is_new_arrival'   => true,
                            'logistics_id'     => $delivery->id,
                        ];
                    }

                    $materialRequest->update(['status' => 'delivered']);

                } else {
                    $inv = WarehouseInventory::where('product_code', $delivery->product_code)
                        ->where('product_category', $delivery->product_category)
                        ->first();

                    $newRows[] = [
                        'id'               => 'arrival_' . time() . '_' . rand(1000, 9999),
                        'boqKey'           => $delivery->product_code,
                        'name'             => $delivery->product_code,
                        'description'      => null,
                        'product_category' => $delivery->product_category ?: ($inv->product_category ?? ''),
                        'unit'             => 'Pcs',
                        'deliveries'       => [
                            [
                                'date' => $delivery->date_of_delivery ?? $today,
                                'qty'  => (int) $delivery->quantity,
                            ]
                        ],
                        'installed'        => [],
                        'remarks'          => 'Auto-added from manual delivery',
                        'is_new_arrival'   => true,
                        'logistics_id'     => $delivery->id,
                    ];
                }

                $mergedItems = array_merge($existingItems, $newRows);

                if ($project) {
                    $project->materials()->updateOrCreate(
                        ['project_id' => $projectId],
                        ['material_items' => json_encode($mergedItems)]
                    );
                }

                $projectName = $materialRequest?->project_name ?? $delivery->project_name;

                \App\Models\AppNotification::create([
                    'target_department' => 'Engineering',
                    'target_role'       => null,
                    'project_id'        => $projectId,
                    'message'           => "✅ Materials Delivered: '{$projectName}' has new arrivals."
                                         . " Check Materials Monitoring.",
                ]);
            }

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
    // DELETE /api/inventory/logistics/{id} (Soft Delete)
    // =========================================================================
    public function destroy(int $id): JsonResponse
    {
        $delivery = Logistics::findOrFail($id);
        $delivery->delete();
        return response()->json(['message' => 'Delivery moved to bin successfully.']);
    }

    // =========================================================================
    // POST /api/inventory/logistics/{id}/restore
    // =========================================================================
    public function restore(int $id): JsonResponse
    {
        $delivery = Logistics::onlyTrashed()->findOrFail($id);
        $delivery->restore();
        return response()->json(['message' => 'Delivery restored successfully.']);
    }

    // =========================================================================
    // DELETE /api/inventory/logistics/{id}/force (Permanent Delete)
    // =========================================================================
    public function forceDelete(int $id): JsonResponse
    {
        $delivery = Logistics::onlyTrashed()->findOrFail($id);
        $delivery->forceDelete();
        return response()->json(['message' => 'Delivery permanently deleted.']);
    }

    // =========================================================================
    // PRIVATE HELPER
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