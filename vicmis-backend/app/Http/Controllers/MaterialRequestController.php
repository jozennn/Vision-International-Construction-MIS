<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MaterialRequest;
use App\Models\Project; // Make sure to import your Project model

class MaterialRequestController extends Controller
{
    // 1. Engineering sends a request
    public function store(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);

        $materialRequest = MaterialRequest::create([
            'project_id' => $project->id,
            'project_name' => $project->project_name, // Assuming your column is project_name
            'requester_name' => $request->requester_name,
            'items' => $request->items,
            'status' => 'Pending'
        ]);

        return response()->json(['message' => 'Requested successfully', 'data' => $materialRequest], 201);
    }

    // 2. Logistics fetches pending requests
    public function getPending()
    {
        $requests = MaterialRequest::where('status', 'Pending')
                                   ->orderBy('created_at', 'desc')
                                   ->get();
                                   
        return response()->json($requests);
    }
    
// 3. Logistics updates status (Dispatch/Deny)
    public function updateStatus(Request $request, $id)
    {
        $materialRequest = MaterialRequest::findOrFail($id);
        $materialRequest->status = $request->status;
        
        // 🚨 CATCH THE APPROVER'S NAME HERE 🚨
        if ($request->has('approver_name')) {
            $materialRequest->approver_name = $request->approver_name;
        }
        
        $materialRequest->save();

        // 🚨 NEW LOGIC: If approved, add the quantities to the Project's Materials Tracking 🚨
        if ($request->status === 'Dispatched') {
            $project = Project::find($materialRequest->project_id);
            
            if ($project) {
                // 1. Get the current tracking list (or start fresh from the Final BOQ if empty)
                $tracking = json_decode($project->materials_tracking, true);
                
                if (!$tracking || empty($tracking)) {
                    $tracking = json_decode($project->final_boq, true);
                    // Initialize installed and remaining if starting fresh
                    foreach ($tracking as &$item) {
                        $item['installed'] = 0;
                        $item['remaining'] = (float)$item['qty'];
                    }
                }

                // 2. Get the items Logistics just approved
                $requestedItems = json_decode($materialRequest->items, true);

                // 3. Loop through requested items and add them to the tracker
                foreach ($requestedItems as $reqItem) {
                    $found = false;
                    
                    foreach ($tracking as &$trackItem) {
                        // Match the item by its description
                        if ($trackItem['description'] === $reqItem['description']) {
                            $reqQty = (float)($reqItem['requestedQty'] ?? 0);
                            
                            // Add the new quantity to Total Qty and Remaining
                            $trackItem['qty'] = (float)($trackItem['qty'] ?? 0) + $reqQty;
                            $trackItem['remaining'] = (float)($trackItem['remaining'] ?? 0) + $reqQty;
                            
                            $found = true;
                            break;
                        }
                    }
                    
                    // Edge Case: If Logistics dispatches an entirely new item not originally in the BOQ
                    if (!$found) {
                        $reqQty = (float)($reqItem['requestedQty'] ?? 0);
                        $tracking[] = [
                            'description' => $reqItem['description'],
                            'unit' => $reqItem['unit'] ?? '',
                            'qty' => $reqQty,
                            'installed' => 0,
                            'remaining' => $reqQty
                        ];
                    }
                }

                // 4. Save the updated tracking back to the Project
                $project->materials_tracking = json_encode($tracking);
                $project->save();
            }
        }
        
        return response()->json(['message' => 'Status updated and Project Materials adjusted!']);
    }
    // Fetch all requests (Pending, Dispatched, Denied) for a specific project
    public function getProjectRequests($projectId)
    {
        $requests = MaterialRequest::where('project_id', $projectId)
                                   ->orderBy('created_at', 'desc')
                                   ->get();
                                   
        return response()->json($requests);
    }
}