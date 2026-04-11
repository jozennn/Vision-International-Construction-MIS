<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ReorderRequest;

class ReorderRequestController extends Controller
{
    // GET /api/inventory/reorder-requests
    public function index(): JsonResponse
    {
        return response()->json(
            ReorderRequest::latest()->get()
        );
    }

    // POST /api/inventory/reorder-requests
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'warehouse_inventory_id' => 'required|exists:warehouse_inventories,id',
            'product_category'       => 'required|string',
            'product_code'           => 'required|string',
            'current_stock'          => 'required|integer',
            'unit'                   => 'required|string',
            'availability'           => 'required|string',
            'notes'                  => 'nullable|string',
        ]);

        $reorder = ReorderRequest::create($request->all());

        return response()->json([
            'message' => 'Reorder request submitted.',
            'data'    => $reorder,
        ], 201);
    }

    // PATCH /api/inventory/reorder-requests/{id}/status
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,acknowledged,ordered',
        ]);

        $reorder = ReorderRequest::findOrFail($id);
        $reorder->update(['status' => $request->status]);

        return response()->json(['message' => 'Status updated.', 'data' => $reorder]);
    }
}