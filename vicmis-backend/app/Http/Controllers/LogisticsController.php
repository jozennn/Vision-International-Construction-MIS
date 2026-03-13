<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Logistics; // Using this as the main model
use App\Models\ConstructionMaterial;
use App\Models\OfficeMaterial;
use Carbon\Carbon;

class LogisticsController extends Controller
{
    /**
     * Get all delivery logs (History)
     */
    public function getLogisticsHistory() {
        try {
            // Updated to use Logistics model
            $data = Logistics::latest()->get();
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle "Stock Out" - Schedule a new delivery
     */
    public function stockOut(Request $request) {
        try {
            $validated = $request->validate([
                'trucking_service' => 'required|string',
                'product_category' => 'required|string',
                'consumables'      => 'required|string',
                'project_name'     => 'required|string',
                'driver_name'      => 'required|string',
                'destination'      => 'required|string',
                'date_of_delivery' => 'required|date'
                // If you add a 'quantity' field to the form, add it here too
            ]);

            // --- INVENTORY LOGIC ---
            // Find the material being sent out
            $material = ConstructionMaterial::where('name', $validated['consumables'])->first();

            // Optional: check if stock exists. 
            // If your form includes a quantity, change '1' to $request->quantity
            if (!$material || $material->quantity < 1) {
                return response()->json(['message' => 'Insufficient stock in warehouse.'], 400);
            }

            // Decrement the stock
            $material->decrement('quantity', 1); 

            // --- CREATE RECORD ---
            // Changed from DeliveryMaterial to Logistics to match your import
            $delivery = Logistics::create([
                'trucking_service' => $validated['trucking_service'],
                'product_category' => $validated['product_category'],
                'consumables'      => $validated['consumables'],
                'project_name'     => $validated['project_name'],
                'driver_name'      => $validated['driver_name'],
                'destination'      => $validated['destination'],
                'date_of_delivery' => $validated['date_of_delivery'],
                'status'           => 'In Transit'
            ]);

            return response()->json(['message' => 'Dispatch successful!', 'data' => $delivery], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Mark as Delivered
     */
    public function markAsDelivered($id) {
        try {
            $delivery = Logistics::findOrFail($id);
            $delivery->update([
                'status' => 'Delivered',
                'date_delivered' => Carbon::now() 
            ]);
            return response()->json(['message' => 'Status updated to Delivered!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error updating status.'], 500);
        }
    }
}