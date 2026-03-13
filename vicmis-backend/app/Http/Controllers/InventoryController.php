<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

// Models
use App\Models\ConstructionMaterial;
use App\Models\OfficeMaterial;
use App\Models\IncomingShipment;
use App\Models\DeliveryMaterial;
use App\Models\MaterialRequest;
use App\Models\ShipmentLog;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    // --- 1. CONSTRUCTION MATERIALS ---
    public function getConstruction() {
        return response()->json(ConstructionMaterial::latest()->get());
    }

    public function storeConstruction(Request $request) {
        $request->validate([
            'name' => 'required|string',
            'quantity' => 'required|integer',
        ]);

        $material = ConstructionMaterial::where('name', $request->name)->first();

        if ($material) {
            $material->increment('quantity', $request->quantity);
            if($request->unit_price) $material->update(['unit_price' => $request->unit_price]);
            return response()->json($material, 200);
        }

        return response()->json(ConstructionMaterial::create($request->all()), 201);
    }

    // --- 2. OFFICE MATERIALS ---
    public function getOffice() {
        return response()->json(OfficeMaterial::latest()->get());
    }

    public function storeOffice(Request $request) {
        $request->validate([
            'name' => 'required|string',
            'quantity' => 'required|integer',
        ]);

        $material = OfficeMaterial::where('name', $request->name)->first();

        if ($material) {
            $material->increment('quantity', $request->quantity);
            return response()->json($material, 200);
        }

        return response()->json(OfficeMaterial::create($request->all()), 201);
    }

    // --- 4. DELIVERY MATERIALS (Stock Out Logic) ---
    public function getDelivery() {
        return response()->json(DeliveryMaterial::latest()->get());
    }

    public function storeDelivery(Request $request) {
        $request->validate([
            'item_name' => 'required|string',
            'quantity' => 'required|integer',
            'category' => 'required|string' 
        ]);

        $source = ($request->category === 'construction') 
            ? ConstructionMaterial::where('name', $request->item_name)->first()
            : OfficeMaterial::where('name', $request->item_name)->first();

        if (!$source || $source->quantity < $request->quantity) {
            return response()->json(['message' => 'Insufficient stock in ' . $request->category], 400);
        }

        $source->decrement('quantity', $request->quantity);

        $delivery = DeliveryMaterial::create([
            'item_name' => $request->item_name,
            'destination' => $request->destination,
            'quantity' => $request->quantity,
            'driver_name' => $request->driver_name,
            'departure_time' => now()
        ]);

        return response()->json($delivery, 201);
    }

    // --- 6. DASHBOARD ALERTS ---
    public function getLowStockAlerts() {
        try {
            $lowConstruction = ConstructionMaterial::where('quantity', '<', 10)
                ->get(['name', 'quantity', 'unit'])
                ->map(fn($item) => [...$item->toArray(), 'category' => 'Construction']);

            $lowOffice = OfficeMaterial::where('quantity', '<', 10)
                ->get(['name', 'quantity', 'unit'])
                ->map(fn($item) => [...$item->toArray(), 'category' => 'Office']);

            return response()->json($lowConstruction->concat($lowOffice));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // --- GENERIC DELETE ---
    public function destroy($type, $id) {
        $model = match($type) {
            'construction' => ConstructionMaterial::find($id),
            'office'       => OfficeMaterial::find($id),
            'incoming'     => IncomingShipment::find($id),
            'delivery'     => DeliveryMaterial::find($id),
            'request'      => MaterialRequest::find($id),
            default        => null
        };

        if (!$model) return response()->json(['message' => 'Not Found'], 404);
        
        $model->delete();
        return response()->json(['message' => 'Successfully deleted from ' . $type]);
    }

    public function getPendingActions() {
        return response()->json([
            'incoming' => IncomingShipment::where('status', 'pending')->latest()->get(),
            'deliveries' => DeliveryMaterial::where('status', 'pending')->latest()->get(),
        ]);
    }

    public function approveAction(Request $request, $type, $id) {
        if ($type === 'incoming') {
            $record = IncomingShipment::findOrFail($id);
            $model = ($record->category === 'construction') 
                ? ConstructionMaterial::firstOrCreate(['name' => $record->item_name])
                : OfficeMaterial::firstOrCreate(['name' => $record->item_name]);

            $model->increment('quantity', $record->quantity);
            $record->update(['status' => 'approved']);
        } 
        
        if ($type === 'delivery') {
            $record = DeliveryMaterial::findOrFail($id);
            $model = ($record->category === 'construction') 
                ? ConstructionMaterial::where('name', $record->item_name)->first()
                : OfficeMaterial::where('name', $record->item_name)->first();

            if (!$model || $model->quantity < $record->quantity) {
                return response()->json(['message' => 'Insufficient stock to approve this delivery'], 400);
            }

            $model->decrement('quantity', $record->quantity);
            $record->update(['status' => 'approved']);
        }

        return response()->json(['message' => 'Transaction Approved & Inventory Updated']);
    }

    public function rejectAction($type, $id) {
        $record = match($type) {
            'incoming' => IncomingShipment::find($id),
            'delivery' => DeliveryMaterial::find($id),
            default => null
        };

        if (!$record) return response()->json(['message' => 'Record not found'], 404);
        $record->update(['status' => 'rejected']);
        return response()->json(['message' => 'Transaction has been rejected.']);
    }

    public function stockIn(Request $request) {
        $validated = $request->validate([
            'name' => 'required|string',
            'quantity' => 'required|numeric',
            'supplier' => 'required|string',
            'unit_price' => 'required|numeric',
        ]);

        $log = ShipmentLog::create(array_merge($validated, ['status' => 'On the Way']));
        return response()->json(['message' => 'Shipment scheduled!', 'data' => $log], 201);
    }

    public function getShipmentHistory() {
        return response()->json(ShipmentLog::orderBy('created_at', 'desc')->get());
    }

    public function markAsReceived($id) {
        return DB::transaction(function () use ($id) {
            $log = ShipmentLog::findOrFail($id);
            if ($log->status === 'Received') return response()->json(['message' => 'Already received'], 400);

            $log->status = 'Received';
            $log->save();

            $material = ConstructionMaterial::firstOrNew(['name' => $log->name]);
            $material->quantity += $log->quantity;
            $material->unit_price = $log->unit_price;
            $material->supplier = $log->supplier;
            $material->save();

            return response()->json(['message' => 'Stock updated in warehouse!']);
        });
    }

    public function stockOut(Request $request) {
        try {
            $validated = $request->validate([
                'name'      => 'required|string',
                'quantity'  => 'required|numeric',
                'recipient' => 'required|string',
                'destination' => 'required|string',
                'driver'    => 'required|string',
                'expected_delivery' => 'required|date'
            ]);

            $material = ConstructionMaterial::where('name', $validated['name'])->first();

            if (!$material || $material->quantity < $validated['quantity']) {
                return response()->json(['message' => 'Insufficient stock levels.'], 400);
            }

            $material->decrement('quantity', $validated['quantity']);

            \App\Models\DeliveryMaterial::create([
                'item_name'              => $validated['name'],
                'quantity'               => $validated['quantity'],
                'recipient'              => $validated['recipient'],
                'destination'            => $validated['destination'],
                'driver_name'            => $validated['driver'],
                'status'                 => 'In Transit',
                'departure_time'         => now()->format('H:i:s'),
                'expected_delivery_date' => $validated['expected_delivery'], 
            ]);

            return response()->json(['message' => 'Dispatch successful!'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function markAsDelivered($id) {
        try {
            $delivery = \App\Models\DeliveryMaterial::findOrFail($id);
            $delivery->update(['status' => 'Delivered']);
            return response()->json(['message' => 'Status updated to Delivered!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error updating status.'], 500);
        }
    }

    public function getLogisticsHistory() {
        try {
            $data = \App\Models\DeliveryMaterial::latest()->get();
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}