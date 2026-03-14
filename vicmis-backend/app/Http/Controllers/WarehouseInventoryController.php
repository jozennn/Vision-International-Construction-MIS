<?php

namespace App\Http\Controllers;

use App\Models\WarehouseInventory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class WarehouseInventoryController extends Controller
{
    // ─── GET /api/warehouse-inventory ─────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $query = WarehouseInventory::query();

        // Filter: Main Products vs Consumables
        if ($request->has('type')) {
            if ($request->type === 'consumable') {
                $query->consumables();
            } elseif ($request->type === 'main') {
                $query->mainProducts();
            }
        }

        // Filter: by product category
        if ($request->has('category') && $request->category !== 'all') {
            $query->byCategory($request->category);
        }

        // Filter: by availability
        if ($request->has('availability') && $request->availability !== 'all') {
            $query->where('availability', $request->availability);
        }

        // Search by code or category
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('product_code', 'like', "%{$search}%")
                  ->orWhere('product_category', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->get('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50]) ? $perPage : 10;

        $paginated = $query->orderBy('product_category')->orderBy('product_code')->paginate($perPage);

        // Append computed total_after_reserve to each item
        $paginated->getCollection()->transform(function ($item) {
            $item->total_after_reserve = $item->total_after_reserve;
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
            'product_category' => ['required', 'string', Rule::in(array_keys(WarehouseInventory::categories()))],
            'product_code'     => 'required|string|max:100',
            'unit'             => 'required|string|max:50',
            'current_stock'    => 'required|integer|min:0',
            'delivery_in'      => 'nullable|integer|min:0',
            'delivery_out'     => 'nullable|integer|min:0',
            'return_out'       => 'nullable|integer|min:0',
            'return_in'        => 'nullable|integer|min:0',
            'reserve'          => 'nullable|integer|min:0',
            'condition'        => ['nullable', Rule::in(['Good', 'Damaged', 'Returned'])],
            'is_consumable'    => 'boolean',
            'notes'            => 'nullable|string',
        ]);

        // Auto-derive availability
        $validated['availability'] = WarehouseInventory::deriveAvailability(
            $validated['current_stock']
        );

        // Auto-set is_consumable if category is CONSUMABLES
        if ($validated['product_category'] === 'CONSUMABLES') {
            $validated['is_consumable'] = true;
        }

        $item = WarehouseInventory::create($validated);
        $item->total_after_reserve = $item->total_after_reserve;

        return response()->json(['data' => $item, 'message' => 'Product added successfully.'], 201);
    }

    // ─── GET /api/warehouse-inventory/{id} ────────────────────────────────────
    public function show(int $id): JsonResponse
    {
        $item = WarehouseInventory::findOrFail($id);
        $item->total_after_reserve = $item->total_after_reserve;
        return response()->json(['data' => $item]);
    }

    // ─── PUT /api/warehouse-inventory/{id} ────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $item = WarehouseInventory::findOrFail($id);

        $validated = $request->validate([
            'product_category' => ['sometimes', 'string', Rule::in(array_keys(WarehouseInventory::categories()))],
            'product_code'     => 'sometimes|string|max:100',
            'unit'             => 'sometimes|string|max:50',
            'current_stock'    => 'sometimes|integer|min:0',
            'delivery_in'      => 'nullable|integer|min:0',
            'delivery_out'     => 'nullable|integer|min:0',
            'return_out'       => 'nullable|integer|min:0',
            'return_in'        => 'nullable|integer|min:0',
            'reserve'          => 'nullable|integer|min:0',
            'condition'        => ['nullable', Rule::in(['Good', 'Damaged', 'Returned'])],
            'is_consumable'    => 'boolean',
            'notes'            => 'nullable|string',
        ]);

        // Re-derive availability if stock changed
        if (isset($validated['current_stock'])) {
            $validated['availability'] = WarehouseInventory::deriveAvailability(
                $validated['current_stock']
            );
        }

        $item->update($validated);
        $item->total_after_reserve = $item->total_after_reserve;

        return response()->json(['data' => $item, 'message' => 'Product updated successfully.']);
    }

    // ─── DELETE /api/warehouse-inventory/{id} ─────────────────────────────────
    public function destroy(int $id): JsonResponse
    {
        WarehouseInventory::findOrFail($id)->delete();
        return response()->json(['message' => 'Product deleted successfully.']);
    }

    // ─── GET /api/warehouse-inventory/meta ────────────────────────────────────
    // Returns categories + preset codes for the frontend dropdowns
    public function meta(): JsonResponse
    {
        return response()->json([
            'categories'   => array_keys(WarehouseInventory::categories()),
            'preset_codes' => WarehouseInventory::presetCodes(),
            'units_by_category' => WarehouseInventory::categories(),
        ]);
    }
}