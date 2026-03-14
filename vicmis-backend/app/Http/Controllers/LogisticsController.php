<?php

namespace App\Http\Controllers;

use App\Models\Logistics;
use App\Models\WarehouseInventory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class LogisticsController extends Controller
{
    // ─── GET /api/inventory/logistics ─────────────────────────────────────────
    // Paginated list with optional filters
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

    // ─── GET /api/inventory/logistics/meta ────────────────────────────────────
    // Returns categories + codes for dropdowns, with availability info
    public function meta(): JsonResponse
    {
        // Get all unique categories from warehouse_inventory
        $categories = WarehouseInventory::select('product_category')
            ->distinct()
            ->orderBy('product_category')
            ->pluck('product_category');

        // Get all products grouped by category with availability
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

    // ─── POST /api/inventory/logistics ────────────────────────────────────────
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

        // Decrement stock in warehouse_inventory
        DB::transaction(function () use ($validated) {
            $item = WarehouseInventory::where('product_category', $validated['product_category'])
                ->where('product_code', $validated['product_code'])
                ->first();

            if ($item) {
                $newStock = max(0, $item->current_stock - $validated['quantity']);
                $item->update([
                    'current_stock'  => $newStock,
                    'delivery_out'   => $item->delivery_out + $validated['quantity'],
                    'availability'   => WarehouseInventory::deriveAvailability($newStock),
                ]);
            }

            Logistics::create($validated);
        });

        return response()->json(['message' => 'Delivery scheduled successfully.'], 201);
    }

    // ─── PATCH /api/inventory/logistics/{id}/delivered ────────────────────────
    public function markDelivered(int $id): JsonResponse
    {
        $delivery = Logistics::findOrFail($id);
        $delivery->update([
            'status'         => 'Delivered',
            'date_delivered' => now(),
        ]);
        return response()->json(['message' => 'Marked as delivered.', 'data' => $delivery]);
    }

    // ─── DELETE /api/inventory/logistics/{id} ─────────────────────────────────
    public function destroy(int $id): JsonResponse
    {
        Logistics::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
