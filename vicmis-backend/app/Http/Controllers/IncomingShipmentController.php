<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Shipment;
use App\Models\ShipmentProject;
use Illuminate\Support\Facades\DB;

class IncomingShipmentController extends Controller
{
    // Returns shipments with their origin info and the list of allocated projects
    public function getShipments() {
        return response()->json(Shipment::with('projects')->latest()->get());
    }

    // Logic for creating a new shipment with multiple projects
    public function storeShipment(Request $request) {
        $request->validate([
            'shipment_number' => 'required|unique:shipments',
            'origin_type'     => 'required|string', 
            'projects'        => 'required|array|min:1',
            'projects.*.project_name' => 'required|string',
            // ADDED: Validate quantity as an integer
            'projects.*.quantity'     => 'nullable|integer|min:0', 
        ]);

        return DB::transaction(function () use ($request) {
            $shipment = Shipment::create([
                'origin_type'       => $request->origin_type,
                'shipment_number'   => $request->shipment_number,
                'container_type'    => $request->container_type,
                'status'            => $request->status ?? 'ONGOING PRODUCTION',
                'location'          => $request->location,
                'shipment_status'   => $request->shipment_status ?? 'WAITING',
                'tentative_arrival' => $request->tentative_arrival,
            ]);

            foreach ($request->projects as $proj) {
                $shipment->projects()->create([
                    'project_name'     => $proj['project_name'],
                    'product_category' => $proj['product_category'] ?? null,
                    // ADDED: Save the quantity to the shipment_projects table
                    'quantity'         => $proj['quantity'] ?? 0,
                    'coverage_sqm'     => $proj['coverage_sqm'] ?? 0,
                ]);
            }

            return response()->json($shipment->load('projects'), 201);
        });
    }

    // Logic for updating Logistics (Date, Location, Status)
    public function updateShipment(Request $request, $id) {
        $shipment = Shipment::findOrFail($id);
        
        $shipment->update($request->only([
            'status', 
            'location', 
            'tentative_arrival', 
            'shipment_status'
        ]));

        return response()->json($shipment->load('projects'));
    }
}