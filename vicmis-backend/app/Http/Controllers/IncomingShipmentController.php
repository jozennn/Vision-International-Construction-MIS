<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Shipment;
use App\Models\ShipmentProject;
use App\Models\ShipmentReport;
use App\Models\WarehouseInventory;
use Illuminate\Support\Facades\DB;

class IncomingShipmentController extends Controller
{
    // ─── GET /api/inventory/shipments ─────────────────────────────────────────
    public function getShipments(): JsonResponse
    {
        return response()->json(
            Shipment::with('projects')->latest()->get()
        );
    }

    // ─── GET /api/inventory/shipments/meta ────────────────────────────────────
    public function meta(): JsonResponse
    {
        $categories = WarehouseInventory::select('product_category')
            ->distinct()
            ->orderBy('product_category')
            ->pluck('product_category');

        $codesByCategory = WarehouseInventory::select('product_category', 'product_code', 'unit')
            ->orderBy('product_category')
            ->orderBy('product_code')
            ->get()
            ->groupBy('product_category')
            ->map(fn($items) => $items->map(fn($i) => [
                'product_code' => $i->product_code,
                'unit'         => $i->unit,
            ])->values());

        return response()->json([
            'categories'        => $categories,
            'codes_by_category' => $codesByCategory,
        ]);
    }

    // ─── POST /api/inventory/shipments ────────────────────────────────────────
    public function storeShipment(Request $request): JsonResponse
    {
        // Base validation for all shipments
        $validator = validator($request->all(), [
            'shipment_number'             => 'required|unique:shipments',
            'origin_type'                 => 'required|string',
            'shipment_purpose'            => 'required|in:RESERVE_FOR_PROJECT,NEW_STOCK',
            'projects'                    => 'required|array|min:1',
            'projects.*.product_category' => 'required|string',
            'projects.*.product_code'     => 'required|string',
            'projects.*.quantity'         => 'nullable|integer|min:0',
            'projects.*.unit'             => 'nullable|string',
            'container_type'              => 'nullable|string',
            'status'                      => 'nullable|string',
            'location'                    => 'nullable|string',
            'shipment_status'             => 'nullable|string',
            // tentative_arrival is NOT required - will be set by logistics later
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Additional validation for RESERVE_FOR_PROJECT shipments only
        if ($request->shipment_purpose === 'RESERVE_FOR_PROJECT') {
            $projectValidator = validator($request->all(), [
                'projects.*.project_name' => 'required|string',
                'projects.*.coverage_sqm' => 'nullable|numeric|min:0',
            ]);
            
            if ($projectValidator->fails()) {
                return response()->json([
                    'message' => 'Project details are required for Reserve shipments',
                    'errors' => $projectValidator->errors()
                ], 422);
            }
        }

        return DB::transaction(function () use ($request) {
            $shipment = Shipment::create([
                'origin_type'       => $request->origin_type,
                'shipment_purpose'  => $request->shipment_purpose,
                'shipment_number'   => $request->shipment_number,
                'container_type'    => $request->container_type,
                'status'            => $request->status ?? 'ONGOING PRODUCTION',
                'location'          => $request->location,
                'shipment_status'   => $request->shipment_status ?? 'WAITING',
                'tentative_arrival' => null, // Always null until logistics updates
                'added_to_inventory'=> false,
            ]);

            foreach ($request->projects as $proj) {
                $shipment->projects()->create([
                    'project_name'     => $proj['project_name'] ?? null,
                    'product_category' => $proj['product_category'],
                    'product_code'     => $proj['product_code'],
                    'unit'             => $proj['unit'] ?? null,
                    'quantity'         => $proj['quantity'] ?? 0,
                    'coverage_sqm'     => $proj['coverage_sqm'] ?? 0,
                ]);
            }

            return response()->json([
                'message' => 'Shipment registered successfully',
                'shipment' => $shipment->load('projects')
            ], 201);
        });
    }

    // ─── PUT /api/inventory/shipments/{id} ────────────────────────────────────
    public function updateShipment(Request $request, $id): JsonResponse
    {
        $shipment = Shipment::findOrFail($id);

        $shipment->update($request->only([
            'status',
            'location',
            'tentative_arrival',  // Logistics can update this later
            'shipment_status',
        ]));

        return response()->json($shipment->load('projects'));
    }

    // ─── POST /api/inventory/shipments/{id}/add-to-inventory ──────────────────
    public function addToInventory(Request $request, $id): JsonResponse
    {
        $shipment = Shipment::with('projects')->findOrFail($id);

        if ($shipment->added_to_inventory) {
            return response()->json(['message' => 'Shipment already added to inventory.'], 422);
        }

        if ($shipment->shipment_status !== 'ARRIVED') {
            return response()->json(['message' => 'Shipment must be ARRIVED before adding to inventory.'], 422);
        }

        return DB::transaction(function () use ($shipment) {
            $isReserve = $shipment->shipment_purpose === 'RESERVE_FOR_PROJECT';

            foreach ($shipment->projects as $proj) {
                $qty       = (int) ($proj->quantity ?? 0);
                $category  = $proj->product_category;
                $code      = $proj->product_code;
                $unit      = $proj->unit ?? 'Pcs';

                $inventory = WarehouseInventory::where('product_category', $category)
                    ->where('product_code', $code)
                    ->first();

                if ($inventory) {
                    $newStock   = $inventory->current_stock + $qty;
                    $newReserve = $isReserve
                        ? ($inventory->reserve ?? 0) + $qty
                        : ($inventory->reserve ?? 0);

                    $inventory->update([
                        'current_stock' => $newStock,
                        'reserve'       => $newReserve,
                        'availability'  => WarehouseInventory::deriveAvailability($newStock),
                    ]);
                } else {
                    $isConsumable = strtoupper($category) === 'CONSUMABLES';

                    WarehouseInventory::create([
                        'product_category' => $category,
                        'product_code'     => $code,
                        'unit'             => $unit,
                        'current_stock'    => $qty,
                        'reserve'          => $isReserve ? $qty : 0,
                        'delivery_in'      => 0,
                        'delivery_out'     => 0,
                        'return_out'       => 0,
                        'return_in'        => 0,
                        'condition'        => 'Good',
                        'is_consumable'    => $isConsumable,
                        'availability'     => WarehouseInventory::deriveAvailability($qty),
                    ]);
                }
            }

            $shipment->update(['added_to_inventory' => true]);

            return response()->json([
                'message'  => 'Shipment successfully added to inventory.',
                'shipment' => $shipment->fresh('projects'),
            ]);
        });
    }

    // ─── POST /api/inventory/shipments/report ─────────────────────────────────
    public function storeReport(Request $request): JsonResponse
    {
        $validator = validator($request->all(), [
            'shipment_id'                    => 'required|exists:shipments,id',
            'shipment_number'                => 'required|string',
            'items'                          => 'required|array|min:1',
            'items.*.product_category'       => 'required|string',
            'items.*.product_code'           => 'required|string',
            'items.*.issue'                  => 'required|string|max:500',
            'items.*.condition'              => 'required|string',
            'items.*.quantity_affected'      => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $report = ShipmentReport::create([
            'shipment_id'     => $request->shipment_id,
            'shipment_number' => $request->shipment_number,
            'items'           => json_encode($request->items),
            'filed_by'        => auth()->id() ?? null,
        ]);

        return response()->json([
            'message' => 'Report filed successfully.',
            'report'  => $this->formatReport($report),
        ], 201);
    }

    // ─── GET /api/inventory/shipments/reports ─────────────────────────────────
    public function getReports(): JsonResponse
    {
        $reports = ShipmentReport::latest()->get()->map(fn($r) => $this->formatReport($r));
        return response()->json($reports);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────
    private function formatReport(ShipmentReport $r): array
    {
        return [
            'id'              => $r->id,
            'shipment_id'     => $r->shipment_id,
            'shipment_number' => $r->shipment_number,
            'items'           => is_string($r->items) ? json_decode($r->items, true) : $r->items,
            'created_at'      => $r->created_at?->toISOString(),
        ];
    }
}