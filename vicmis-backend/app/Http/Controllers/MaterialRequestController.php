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
    //
    // Called by the engineer to see the status of their own requests
    // for a specific project.
    // =========================================================================
    public function getProjectRequests(int $id): JsonResponse
    {
        $requests = MaterialRequest::with('items')
            ->where('project_id', $id)
            ->latest()
            ->get();

        // Enrich each item with live stock data from warehouse
        $requests->each(function ($req) {
            $req->items->each(function ($item) {
                if ($item->product_code) {
                    $inv = WarehouseInventory::where('product_code', $item->product_code)->first();
                    $item->current_stock = $inv?->current_stock;
                    $item->stock_status  = $inv?->availability ?? null;
                }
            });
        });

        return response()->json($requests);
    }

    // =========================================================================
    // GET /material-requests/pending
    //
    // Called by Logistics (DeliveryMat → "Pending Requests" tab).
    // Returns ALL pending + reordering requests across all projects,
    // each item enriched with live stock data.
    //
    // Query params:
    //   status     — default includes 'pending' and 'reordering'
    //   project_id — optional filter
    //   per_page   — default 20
    // =========================================================================
    public function getPending(Request $request): JsonResponse
    {
        $status = $request->filled('status')
            ? [$request->status]
            : ['pending', 'reordering'];

        $query = MaterialRequest::with('items')
            ->whereIn('status', $status)
            ->when($request->project_id, fn($q, $p) => $q->where('project_id', $p))
            ->latest();

        $paginated = $query->paginate($request->per_page ?? 20);

        // Enrich each item with current stock info from warehouse
        $paginated->getCollection()->each(function ($req) {
            $req->items->each(function ($item) {
                if ($item->product_code) {
                    $inv = WarehouseInventory::where('product_code', $item->product_code)->first();
                    $item->current_stock = $inv?->current_stock;
                    $item->stock_status  = $inv?->availability ?? null;
                } else {
                    $item->current_stock = null;
                    $item->stock_status  = null;
                }
            });
        });

        return response()->json($paginated);
    }

    // =========================================================================
    // POST /projects/{id}/material-requests
    //
    // Called by the engineer from PhaseCommandCenter → "Request Materials" button.
    // Creates a material_request + material_request_items (status: pending).
    //
    // Also fires the existing notification engine used by ProjectController
    // so Logistics gets alerted automatically.
    //
    // Request body:
    // {
    //   requested_by_name: string,
    //   engineer_name:     string | null,
    //   destination:       string | null,
    //   items: [
    //     { description, product_code, unit, requested_qty }
    //   ]
    // }
    // In MaterialRequestController.php - store() method

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
                // 👇 Use columns that actually exist
                $req = MaterialRequest::create([
                    'project_id'     => $project->id,
                    'project_name'   => $project->project_name,
                    'requester_name' => $validated['requested_by_name'],
                    'status'         => 'pending',
                    'items'          => $validated['items'], // Store items in JSON as backup
                ]);

                // Also create individual item records for easier querying
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

            // Rest of notification code...
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
            \Log::error('Material Request Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Server Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // PATCH /material-requests/{id}
    //
    // General status update — used by Logistics for dispatch, reorder, reject.
    // Action is determined by the 'action' field in the request body.
    //
    // Request body for dispatch:
    // {
    //   action: 'dispatch',
    //   trucking_service, driver_name, destination, date_of_delivery
    // }
    //
    // Request body for reorder:
    // {
    //   action: 'reorder',
    //   quantity_needed, notes
    // }
    //
    // Request body for reject:
    // {
    //   action: 'reject',
    //   reason (optional)
    // }
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
    // PRIVATE — handleDispatch
    //
    // Logistics confirms stock is available → creates Logistics rows
    // (one per item in the request) using the existing Logistics model.
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

        $deliveries = DB::transaction(function () use ($req, $validated) {
            $created = [];

            foreach ($req->items as $item) {
                $inv = $item->product_code
                    ? WarehouseInventory::where('product_code', $item->product_code)->first()
                    : null;

                // Use the existing Logistics model / logistics table
                $delivery = Logistics::create([
                    'material_request_id' => $req->id,
                    'project_name'        => $req->project_name,
                    'trucking_service'    => $validated['trucking_service'],
                    'driver_name'         => $validated['driver_name'],
                    'destination'         => $validated['destination'],
                    'date_of_delivery'    => $validated['date_of_delivery'],
                    'product_category'    => $inv?->product_category ?? '',
                    'product_code'        => $item->product_code ?? $item->description,
                    'is_consumable'       => $inv?->is_consumable ?? false,
                    'quantity'            => $item->requested_qty,
                    'status'              => 'In Transit',
                ]);

                $created[] = $delivery;
            }

            $req->update(['status' => 'dispatched']);

            // Notify engineer that materials are on the way
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
    }

    // =========================================================================
    // PRIVATE — handleReorder
    //
    // Logistics triggers a reorder → creates ReorderRequest entries
    // for out-of-stock items using the existing ReorderRequestController model.
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

                // Only reorder items that are actually out of stock
                if (!$inv || $inv->availability === 'NO STOCK' || $inv->availability === 'LOW STOCK') {
                    // Use the existing ReorderRequest model / reorder_requests table
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

            // Notify Procurement/Accounting (matches your existing phase notification pattern)
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

        // Notify engineer their request was rejected
        \App\Models\AppNotification::create([
            'target_department' => 'Engineering',
            'target_role'       => null,
            'project_id'        => $req->project_id,
            'message'           => "❌ Material request rejected for '{$req->project_name}'. " . ($request->reason ?? 'No reason given.'),
        ]);

        return response()->json(['message' => 'Request rejected.']);
    }
}