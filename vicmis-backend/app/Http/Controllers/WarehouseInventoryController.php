<?php

namespace App\Http\Controllers;

use App\Models\WarehouseInventory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WarehouseInventoryController extends Controller
{
    // ─── GET /api/warehouse-inventory ─────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $query = WarehouseInventory::query();

        if ($request->has('type')) {
            if ($request->type === 'consumable') $query->consumables();
            elseif ($request->type === 'main')   $query->mainProducts();
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->byCategory($request->category);
        }

        if ($request->filled('availability') && $request->availability !== 'all') {
            $query->where('availability', $request->availability);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) =>
                $q->where('product_code',      'like', "%{$s}%")
                  ->orWhere('product_category', 'like', "%{$s}%")
            );
        }

        // Support large per_page for dashboard full-table scans (e.g. per_page=9999)
        $perPage = (int) $request->get('per_page', 10);
        if ($perPage > 9999) $perPage = 9999;
        if ($perPage < 1)    $perPage = 10;

        $paginated = $query
            ->orderBy('product_category')
            ->orderBy('product_code')
            ->paginate($perPage);

        $paginated->getCollection()->transform(function ($item) {
            $item->total_after_reserve = $item->total_after_reserve;
            $item->total_stock_value   = $item->total_stock_value;
            return $item;
        });

        return response()->json([
            'data'         => $paginated->items(),
            'total'        => $paginated->total(),
            'per_page'     => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'from'         => $paginated->firstItem(),
            'to'           => $paginated->lastItem(),
            'categories'   => array_keys(WarehouseInventory::categories()),
            'preset_codes' => WarehouseInventory::presetCodes(),
        ]);
    }

    // ─── POST /api/warehouse-inventory ────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_category' => 'required|string|max:150',
            'product_code'     => 'required|string|max:100',
            'unit'             => 'required|string|max:50',
            'price_per_piece'  => 'nullable|numeric|min:0',
            'current_stock'    => 'required|integer|min:0',
            'delivery_in'      => 'nullable|integer|min:0',
            'delivery_out'     => 'nullable|integer|min:0',
            'return_out'       => 'nullable|integer|min:0',
            'return_in'        => 'nullable|integer|min:0',
            'reserve'          => 'nullable|integer|min:0',
            'condition'        => 'nullable|in:Good,Damaged,Returned',
            'is_consumable'    => 'boolean',
            'notes'            => 'nullable|string',
        ]);

        $validated['availability'] = WarehouseInventory::deriveAvailability(
            $validated['current_stock']
        );

        if (strtoupper($validated['product_category']) === 'CONSUMABLES') {
            $validated['is_consumable'] = true;
        }

        // Default price to 0 if not provided
        $validated['price_per_piece'] = $validated['price_per_piece'] ?? 0;

        $item = WarehouseInventory::create($validated);
        $item->total_after_reserve = $item->total_after_reserve;
        $item->total_stock_value   = $item->total_stock_value;

        return response()->json(['data' => $item, 'message' => 'Product added successfully.'], 201);
    }

    // ─── GET /api/warehouse-inventory/{id} ────────────────────────────────────
    public function show(int $id): JsonResponse
    {
        $item = WarehouseInventory::findOrFail($id);
        $item->total_after_reserve = $item->total_after_reserve;
        $item->total_stock_value   = $item->total_stock_value;
        return response()->json(['data' => $item]);
    }

    // ─── PUT /api/warehouse-inventory/{id} ────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $item = WarehouseInventory::findOrFail($id);

        $validated = $request->validate([
            'product_category' => 'sometimes|string|max:150',
            'product_code'     => 'sometimes|string|max:100',
            'unit'             => 'sometimes|string|max:50',
            'price_per_piece'  => 'nullable|numeric|min:0',
            'current_stock'    => 'sometimes|integer|min:0',
            'delivery_in'      => 'nullable|integer|min:0',
            'delivery_out'     => 'nullable|integer|min:0',
            'return_out'       => 'nullable|integer|min:0',
            'return_in'        => 'nullable|integer|min:0',
            'reserve'          => 'nullable|integer|min:0',
            'condition'        => 'nullable|in:Good,Damaged,Returned',
            'is_consumable'    => 'boolean',
            'notes'            => 'nullable|string',
        ]);

        if (isset($validated['current_stock'])) {
            $validated['availability'] = WarehouseInventory::deriveAvailability(
                $validated['current_stock']
            );
        }

        $item->update($validated);
        $item->total_after_reserve = $item->total_after_reserve;
        $item->total_stock_value   = $item->total_stock_value;

        return response()->json(['data' => $item, 'message' => 'Product updated successfully.']);
    }

    // ─── DELETE /api/warehouse-inventory/{id} ─────────────────────────────────
    public function destroy(int $id): JsonResponse
    {
        WarehouseInventory::findOrFail($id)->delete();
        return response()->json(['message' => 'Product deleted successfully.']);
    }

    // ─── GET /api/warehouse-inventory/meta ────────────────────────────────────
    public function meta(): JsonResponse
    {
        return response()->json([
            'categories'        => array_keys(WarehouseInventory::categories()),
            'preset_codes'      => WarehouseInventory::presetCodes(),
            'units_by_category' => WarehouseInventory::categories(),
        ]);
    }

    // ─── GET /api/inventory/alerts ────────────────────────────────────────────
    public function getAlerts(): JsonResponse
    {
        $noStock  = WarehouseInventory::where('availability', 'NO STOCK')->count();
        $lowStock = WarehouseInventory::where('availability', 'LOW STOCK')->count();
        $onStock  = WarehouseInventory::where('availability', 'ON STOCK')->count();

        return response()->json([
            'no_stock'     => $noStock,
            'low_stock'    => $lowStock,
            'on_stock'     => $onStock,
            'total_alerts' => $noStock + $lowStock,
        ]);
    }
}