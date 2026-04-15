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
                    $productCode = is_object($item) ? ($item->product_code ?? null) : ($item['product_code'] ?? null);
                    $productCategory = is_object($item) ? ($item->product_category ?? null) : ($item['product_category'] ?? null);
                    $description = is_object($item) ? ($item->description ?? null) : ($item['description'] ?? null);
                    
                    $inv = null;

                    // 1. Try exact match first (code + category)
                    if (!empty($productCode)) {
                        $inv = WarehouseInventory::where('product_code', $productCode)
                            ->when(!empty($productCategory), fn($q) => $q->where('product_category', $productCategory))
                            ->first();

                        // Fallback: match by product_code only
                        if (!$inv) {
                            $inv = WarehouseInventory::where('product_code', $productCode)->first();
                        }
                    }

                    // 2. Fallback: match by description/product_name if code is missing or not found
                    if (!$inv && !empty($description)) {
                        $inv = WarehouseInventory::where('product_name', $description)
                            ->orWhere('product_code', $description)
                            ->first();
                    }

                    $currentStock = $inv->current_stock ?? 0;
                    $stockStatus = $inv->availability ?? 'NO STOCK';
                    
                    if (is_object($item)) {
                        $item->current_stock = $currentStock;
                        $item->stock_status = $stockStatus;
                        // Map the real product code back so frontend knows it
                        if (empty($item->product_code) && $inv) {
                            $item->product_code = $inv->product_code; 
                        }
                    } else {
                        $item['current_stock'] = $currentStock;
                        $item['stock_status'] = $stockStatus;
                        if (empty($item['product_code']) && $inv) {
                            $item['product_code'] = $inv->product_code;
                        }
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
        
        $query = MaterialRequest::whereIn('status', $status);
        
        if ($request->project_id) {
            $query->where('project_id', $request->project_id);
        }
        
        $query->latest();

        if ($perPage >= 9999) {
            $requests = $query->get();
            
            $result = [];
            foreach ($requests as $req) {
                $reqData = $req->toArray();
                $reqData['requested_by_name'] = $req->requester_name ?? 'Unknown';
                
                // items is already an array from the JSON cast
                $itemsData = [];
                foreach ($req->items as $item) {
                    $productCode = $item['product_code'] ?? null;
                    $productCategory = $item['product_category'] ?? null;
                    
                    $item['current_stock'] = 0;
                    $item['stock_status'] = 'NO STOCK';
                    
                    if (!empty($productCode)) {
                        $invQuery = WarehouseInventory::where('product_code', $productCode);
                        
                        if (!empty($productCategory)) {
                            $invQuery->where('product_category', $productCategory);
                        }
                        
                        $inv = $invQuery->first();
                        
                        if ($inv) {
                            $item['current_stock'] = (int) $inv->current_stock;
                            $item['stock_status'] = $inv->availability;
                        }
                    }
                    
                    $itemsData[] = $item;
                }
                
                $reqData['items'] = $itemsData;
                $result[] = $reqData;
            }
            
            return response()->json([
                'data' => $result,
                'total' => count($result)
            ]);
        }

        $paginated = $query->paginate($perPage);
        
        $result = [];
        foreach ($paginated->items() as $req) {
            $reqData = $req->toArray();
            $reqData['requested_by_name'] = $req->requester_name ?? 'Unknown';
            
            $itemsData = [];
            foreach ($req->items as $item) {
                $productCode = $item['product_code'] ?? null;
                $productCategory = $item['product_category'] ?? null;
                
                $item['current_stock'] = 0;
                $item['stock_status'] = 'NO STOCK';
                
                if (!empty($productCode)) {
                    $invQuery = WarehouseInventory::where('product_code', $productCode);
                    
                    if (!empty($productCategory)) {
                        $invQuery->where('product_category', $productCategory);
                    }
                    
                    $inv = $invQuery->first();
                    
                    if ($inv) {
                        $item['current_stock'] = (int) $inv->current_stock;
                        $item['stock_status'] = $inv->availability;
                    }
                }
                
                $itemsData[] = $item;
            }
            
            $reqData['items'] = $itemsData;
            $result[] = $reqData;
        }

        return response()->json([
            'data' => $result,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
            'from' => $paginated->firstItem(),
            'to' => $paginated->lastItem(),
        ]);
        
    } catch (\Exception $e) {
        \Log::error('getPending Error: ' . $e->getMessage());
        return response()->json([
            'data' => [],
            'total' => 0,
            'current_page' => 1,
            'last_page' => 1,
        ]);
    }
}
    // =========================================================================
    // POST /projects/{id}/material-requests
    // =========================================================================
    public function store(Request $request, int $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'requested_by_name'        => 'required|string|max:255',
            'engineer_name'            => 'nullable|string|max:255',
            'destination'              => 'nullable|string|max:255',
            'items'                    => 'required|array|min:1',
            'items.*.description'      => 'required|string|max:255',
            'items.*.product_code'     => 'nullable|string|max:100',
            'items.*.product_category' => 'nullable|string|max:255',
            'items.*.unit'             => 'nullable|string|max:50',
            'items.*.requested_qty'    => 'required|numeric|min:0.01',
            'items.*.unit_cost'        => 'nullable|numeric|min:0',
            'items.*.total_cost'       => 'nullable|numeric|min:0',
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
                        'description'      => $item['description'],
                        'product_code'     => $item['product_code']  ?? null,
                        'product_category' => $item['product_category'] ?? null,
                        'unit'             => $item['unit']          ?? null,
                        'requested_qty'    => $item['requested_qty'],
                        'unit_cost'        => $item['unit_cost']     ?? null,
                        'total_cost'       => $item['total_cost']    ?? null,
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
            return $this->handleDispatch($request, $req);
        } catch (\Exception $e) {
            \Log::error('Dispatch Error: ' . $e->getMessage());
            return response()->json(['message' => 'Dispatch Error: ' . $e->getMessage()], 500);
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
                    $productCode = $item['product_code'] ?? null;
                    $productCategory = $item['product_category'] ?? '';
                    $description = $item['description'] ?? '';
                    
                    $inv = null;
                    if (!empty($productCode)) {
                        $inv = WarehouseInventory::where('product_code', $productCode)
                            ->when(!empty($productCategory), fn($q) => $q->where('product_category', $productCategory))
                            ->first();
                    }

                    if (!$inv && !empty($description)) {
                        $inv = WarehouseInventory::where('product_name', $description)->orWhere('product_code', $description)->first();
                    }

                    $finalProductCode = $inv->product_code ?? $productCode ?? $description;

                    $delivery = Logistics::create([
                        'material_request_id' => $req->id,
                        'trucking_service'    => $validated['trucking_service'],
                        'product_category'    => $productCategory ?: ($inv->product_category ?? ''),
                        'product_code'        => $finalProductCode,
                        'is_consumable'       => $inv->is_consumable ?? false,
                        'project_name'        => $req->project_name,
                        'driver_name'         => $validated['driver_name'],
                        'destination'         => $validated['destination'],
                        'quantity'            => $item['requested_qty'] ?? $item['quantity'] ?? 1,
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

        try {
            DB::transaction(function () use ($req, $validated) {
                $items = $req->items ?? [];
                
                foreach ($items as $item) {
                    $productCode = is_array($item) ? ($item['product_code'] ?? null) : ($item->product_code ?? null);
                    $productCategory = is_array($item) ? ($item['product_category'] ?? null) : ($item->product_category ?? null);
                    $description = is_array($item) ? ($item['description'] ?? '') : ($item->description ?? '');
                    $unit = is_array($item) ? ($item['unit'] ?? 'Pcs') : ($item->unit ?? 'Pcs');
                    $requestedQty = is_array($item) ? ($item['requested_qty'] ?? 1) : ($item->requested_qty ?? 1);
                    
                    $inv = null;
                    if (!empty($productCode)) {
                        $inv = WarehouseInventory::where('product_code', $productCode)
                            ->when(!empty($productCategory), fn($q) => $q->where('product_category', $productCategory))
                            ->first();
                    }
                    if (!$inv && !empty($description)) {
                        $inv = WarehouseInventory::where('product_name', $description)->orWhere('product_code', $description)->first();
                    }

                    $finalProductCode = $inv->product_code ?? $productCode ?? $description;

                    ReorderRequest::create([
                        'warehouse_inventory_id' => $inv?->id,
                        'product_category'       => $productCategory ?: ($inv?->product_category ?? $description),
                        'product_code'           => $finalProductCode,
                        'current_stock'          => $inv?->current_stock ?? 0,
                        'unit'                   => $unit,
                        'availability'           => $inv?->availability ?? 'NO STOCK',
                        'quantity_needed'        => $validated['quantity_needed'] ?? (int) $requestedQty,
                        'notes'                  => $validated['notes'] ?? null,
                    ]);
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
            
        } catch (\Exception $e) {
            \Log::error('Reorder Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to send reorder request: ' . $e->getMessage(),
            ], 500);
        }
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