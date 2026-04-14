<?php

namespace App\Http\Controllers;

use App\Models\MaterialRequest;
use App\Models\MaterialRequestItem;
use App\Models\WarehouseInventory;
use App\Models\Logistics;
use App\Models\ReorderRequest;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MaterialRequestController extends Controller
{
    // =========================================================================
    // GET /projects/{id}/material-requests
    // =========================================================================
    public function getProjectRequests(int $id): JsonResponse
    {
        try {
            $requests = MaterialRequest::with('items')
                ->where('project_id', $id)
                ->latest()
                ->get();

            $requests->each(function ($req) {
                $req->requested_by_name = $req->requester_name ?? 'Unknown';
                
                $items = $req->items ?? [];
                foreach ($items as $item) {
                    $productCode = is_object($item) ? $item->product_code : ($item['product_code'] ?? null);
                    
                    if (!empty($productCode)) {
                        $inv = WarehouseInventory::where('product_code', $productCode)->first();
                        $currentStock = $inv->current_stock ?? 0;
                        $stockStatus = $inv->availability ?? 'NO STOCK';
                    } else {
                        $currentStock = 0;
                        $stockStatus = 'NO STOCK';
                    }
                    
                    if (is_object($item)) {
                        $item->current_stock = $currentStock;
                        $item->stock_status = $stockStatus;
                    } else {
                        $item['current_stock'] = $currentStock;
                        $item['stock_status'] = $stockStatus;
                    }
                }
            });

            return response()->json($requests);
            
        } catch (\Exception $e) {
            \Log::error('getProjectRequests Error: ' . $e->getMessage());
            return response()->json([]);
        }
    }

    // =========================================================================
    // GET /material-requests/pending
    // GET /inventory/material-requests
    // =========================================================================
    public function getPending(Request $request): JsonResponse
    {
        try {
            $status = $request->filled('status')
                ? (is_array($request->status) ? $request->status : [$request->status])
                : ['pending', 'reordering'];

            $perPage = $request->input('per_page', 20);
            
            $query = MaterialRequest::with('items')
                ->whereIn('status', $status)
                ->when($request->project_id, fn($q, $p) => $q->where('project_id', $p))
                ->latest();

            if ($perPage >= 9999) {
                $requests = $query->get();
                
                $requests->transform(function ($req) {
                    $req->requested_by_name = $req->requester_name ?? 'Unknown';
                    
                    $items = $req->items ?? [];
                    foreach ($items as $item) {
                        $productCode = is_object($item) ? $item->product_code : ($item['product_code'] ?? null);
                        
                        if (!empty($productCode)) {
                            $inv = WarehouseInventory::where('product_code', $productCode)->first();
                            $currentStock = $inv->current_stock ?? 0;
                            $stockStatus = $inv->availability ?? 'NO STOCK';
                        } else {
                            $currentStock = 0;
                            $stockStatus = 'NO STOCK';
                        }
                        
                        if (is_object($item)) {
                            $item->current_stock = $currentStock;
                            $item->stock_status = $stockStatus;
                        } else {
                            $item['current_stock'] = $currentStock;
                            $item['stock_status'] = $stockStatus;
                        }
                    }
                    
                    return $req;
                });
                
                return response()->json(['data' => $requests, 'total' => $requests->count()]);
            }

            $paginated = $query->paginate($perPage);

            $paginated->getCollection()->transform(function ($req) {
                $req->requested_by_name = $req->requester_name ?? 'Unknown';
                
                $items = $req->items ?? [];
                foreach ($items as $item) {
                    $productCode = is_object($item) ? $item->product_code : ($item['product_code'] ?? null);
                    
                    if (!empty($productCode)) {
                        $inv = WarehouseInventory::where('product_code', $productCode)->first();
                        $currentStock = $inv->current_stock ?? 0;
                        $stockStatus = $inv->availability ?? 'NO STOCK';
                    } else {
                        $currentStock = 0;
                        $stockStatus = 'NO STOCK';
                    }
                    
                    if (is_object($item)) {
                        $item->current_stock = $currentStock;
                        $item->stock_status = $stockStatus;
                    } else {
                        $item['current_stock'] = $currentStock;
                        $item['stock_status'] = $stockStatus;
                    }
                }
                
                return $req;
            });

            return response()->json($paginated);
            
        } catch (\Exception $e) {
            \Log::error('getPending Error: ' . $e->getMessage());
            return response()->json(['data' => [], 'total' => 0]);
        }
    }

    // =========================================================================
    // POST /projects/{id}/material-requests
    // =========================================================================
    public function store(Request $request, int $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'requested_by_name'     => 'required|string|max:255',
            'engineer_name'         => 'nullable|string|max:255',
            'destination'           => 'nullable|string|max:255',
            'items'                 => 'required|array|min:1',
            'items.*.description'   => 'required|string|max:255',
            'items.*.product_code'  => 'nullable|string|max:100',
            'items.*.unit'          => 'nullable|string|max:50',
            'items.*.requested_qty' => 'required|numeric|min:0.01',
            'items.*.unit_cost'     => 'nullable|numeric|min:0',
            'items.*.total_cost'    => 'nullable|numeric|min:0',
        ]);

        try {
            $materialRequest = DB::transaction(function () use ($validated, $project) {
                $req = MaterialRequest::create([
                    'project_id'     => $project->id,
                    'project_name'   => $project->project_name,
                    'requester_name' => $validated['requested_by_name'],
                    'status'         => 'pending',
                    'items'          => $validated['items'],
                ]);

                foreach ($validated['items'] as $item) {
                    $req->items()->create([
                        'description'   => $item['description'],
                        'product_code'  => $item['product_code']  ?? null,
                        'unit'          => $item['unit']          ?? null,
                        'requested_qty' => $item['requested_qty'],
                        'unit_cost'     => $item['unit_cost']     ?? null,
                        'total_cost'    => $item['total_cost']    ?? null,
                    ]);
                }

                return $req;
            });

            $totalValue = collect($validated['items'])->sum('total_cost');
            $valueStr = $totalValue > 0 
                ? ' (Total: ₱' . number_format($totalValue, 2) . ')' 
                : '';

            \App\Models\AppNotification::create([
                'target_department' => 'Logistics',
                'target_role'       => null,
                'project_id'        => $project->id,
                'message'           => "📦 Material Request: '{$project->project_name}' needs materials{$valueStr}.",
            ]);

            return response()->json($materialRequest->load('items'), 201);
            
        } catch (\Exception $e) {
            \Log::error('Material Request Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Server Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // PATCH /material-requests/{id}
    // =========================================================================
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $req = MaterialRequest::with('items')->findOrFail($id);
        $action = $request->input('action');

        return match ($action) {
            'dispatch' => $this->handleDispatch($request, $req),
            'reorder'  => $this->handleReorder($request, $req),
            'reject'   => $this->handleReject($request, $req),
            default    => response()->json(['message' => "Unknown action: {$action}"], 422),
        };
    }

    // =========================================================================
    // POST /inventory/material-requests/{id}/dispatch
    // =========================================================================
public function dispatch(Request $request, int $id): JsonResponse
{
    try {
        $req = MaterialRequest::findOrFail($id);
        
        if ($req->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be dispatched.'], 422);
        }

        $validated = $request->validate([
            'trucking_service' => 'required|string|max:255',
            'driver_name'      => 'required|string|max:255',
            'destination'      => 'required|string|max:255',
            'date_of_delivery' => 'required|date',
        ]);

        // Get items as array
        $items = $req->items ?? [];
        
        DB::transaction(function () use ($req, $validated, $items) {
            foreach ($items as $item) {
                // 👇 Use array syntax, not object syntax
                $productCode = $item['product_code'] ?? $item['description'] ?? '';
                
                $inv = !empty($productCode)
                    ? WarehouseInventory::where('product_code', $productCode)->first()
                    : null;

                Logistics::create([
                    'material_request_id' => $req->id,
                    'trucking_service'    => $validated['trucking_service'],
                    'product_category'    => $inv->product_category ?? '',
                    'product_code'        => $productCode,
                    'is_consumable'       => $inv->is_consumable ?? false,
                    'project_name'        => $req->project_name,
                    'driver_name'         => $validated['driver_name'],
                    'destination'         => $validated['destination'],
                    'quantity'            => $item['requested_qty'] ?? $item['quantity'] ?? 1,
                    'date_of_delivery'    => $validated['date_of_delivery'],
                    'status'              => 'In Transit',
                ]);
            }

            $req->update(['status' => 'dispatched']);
        });

        \App\Models\AppNotification::create([
            'target_department' => 'Engineering',
            'target_role'       => null,
            'project_id'        => $req->project_id,
            'message'           => "🚚 Materials dispatched for '{$req->project_name}'. Delivery is In Transit.",
        ]);

        return response()->json([
            'message' => 'Request dispatched successfully.',
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Dispatch Error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Dispatch Error: ' . $e->getMessage(),
        ], 500);
    }
}

    // =========================================================================
    // POST /inventory/material-requests/{id}/reorder
    // =========================================================================
    public function reorder(Request $request, int $id): JsonResponse
    {
        $req = MaterialRequest::with('items')->findOrFail($id);
        return $this->handleReorder($request, $req);
    }

    // =========================================================================
    // PATCH /inventory/material-requests/{id}/reject
    // =========================================================================
    public function reject(Request $request, int $id): JsonResponse
    {
        $req = MaterialRequest::with('items')->findOrFail($id);
        return $this->handleReject($request, $req);
    }

    // =========================================================================
    // PRIVATE — handleDispatch
    // =========================================================================
   private function handleDispatch(Request $request, MaterialRequest $req): JsonResponse
{
    abort_if($req->status !== 'pending', 422, 'Only pending requests can be dispatched.');

    $validated = $request->validate([
        'trucking_service' => 'required|string|max:255',
        'driver_name'      => 'required|string|max:255',
        'destination'      => 'required|string|max:255',
        'date_of_delivery' => 'required|date',
    ]);

    try {
        $items = $req->items ?? [];
        
        $deliveries = DB::transaction(function () use ($req, $validated, $items) {
            $created = [];

            foreach ($items as $item) {
                // 👇 Use array syntax
                $productCode = $item['product_code'] ?? $item['description'] ?? '';
                
                $inv = !empty($productCode)
                    ? WarehouseInventory::where('product_code', $productCode)->first()
                    : null;

                $delivery = Logistics::create([
                    'material_request_id' => $req->id,
                    'trucking_service'    => $validated['trucking_service'],
                    'product_category'    => $inv->product_category ?? '',
                    'product_code'        => $productCode,
                    'is_consumable'       => $inv->is_consumable ?? false,
                    'project_name'        => $req->project_name,
                    'driver_name'         => $validated['driver_name'],
                    'destination'         => $validated['destination'],
                    'quantity'            => $item['requested_qty'] ?? 1,
                    'date_of_delivery'    => $validated['date_of_delivery'],
                    'status'              => 'In Transit',
                ]);

                $created[] = $delivery;
            }

            $req->update(['status' => 'dispatched']);

            \App\Models\AppNotification::create([
                'target_department' => 'Engineering',
                'target_role'       => null,
                'project_id'        => $req->project_id,
                'message'           => "🚚 Materials dispatched for '{$req->project_name}'. Delivery is In Transit.",
            ]);

            return $created;
        });

        return response()->json([
            'message'    => 'Request dispatched. Delivery records created.',
            'deliveries' => $deliveries,
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Dispatch Error: ' . $e->getMessage());
        return response()->json([
            'message' => 'Dispatch Error: ' . $e->getMessage(),
        ], 500);
    }
}
    // =========================================================================
    // PRIVATE — handleReorder
    // =========================================================================
    private function handleReorder(Request $request, MaterialRequest $req): JsonResponse
    {
        abort_if($req->status !== 'pending', 422, 'Only pending requests can trigger a reorder.');

        $validated = $request->validate([
            'quantity_needed' => 'nullable|integer|min:1',
            'notes'           => 'nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($req, $validated) {
            foreach ($req->items as $item) {
                $inv = $item->product_code
                    ? WarehouseInventory::where('product_code', $item->product_code)->first()
                    : null;

                if (!$inv || $inv->availability === 'NO STOCK' || $inv->availability === 'LOW STOCK') {
                    ReorderRequest::create([
                        'warehouse_inventory_id' => $inv?->id,
                        'material_request_id'    => $req->id,
                        'product_category'       => $inv?->product_category ?? '',
                        'product_code'           => $item->product_code    ?? '',
                        'current_stock'          => $inv?->current_stock   ?? 0,
                        'unit'                   => $item->unit            ?? '',
                        'availability'           => $inv?->availability    ?? 'NO STOCK',
                        'quantity_needed'        => $validated['quantity_needed'] ?? (int) $item->requested_qty,
                        'notes'                  => $validated['notes']    ?? null,
                    ]);
                }
            }

            $req->update(['status' => 'reordering']);

            \App\Models\AppNotification::create([
                'target_department' => 'Accounting/Procurement',
                'target_role'       => 'dept_head',
                'project_id'        => $req->project_id,
                'message'           => "⚠️ Reorder Required: '{$req->project_name}' needs stock replenishment before delivery.",
            ]);
        });

        return response()->json(['message' => 'Reorder request sent to Procurement.']);
    }

    // =========================================================================
    // PRIVATE — handleReject
    // =========================================================================
    private function handleReject(Request $request, MaterialRequest $req): JsonResponse
    {
        abort_if(
            in_array($req->status, ['dispatched', 'rejected']),
            422,
            'Cannot reject a request that has already been dispatched or rejected.'
        );

        $req->update([
            'status'        => 'rejected',
            'reject_reason' => $request->reason ?? null,
        ]);

        \App\Models\AppNotification::create([
            'target_department' => 'Engineering',
            'target_role'       => null,
            'project_id'        => $req->project_id,
            'message'           => "❌ Material request rejected for '{$req->project_name}'. " . ($request->reason ?? 'No reason given.'),
        ]);

        return response()->json(['message' => 'Request rejected.']);
    }
}