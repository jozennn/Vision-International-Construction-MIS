<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lead;
use Illuminate\Support\Facades\Auth;

class LeadController extends Controller
{
    /**
     * Display a listing of the leads.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Admin sees all leads across the company
        if ($user->role === 'admin') {
            return response()->json(
                Lead::with('salesRep')->latest()->get()
            );
        }

        // Sales Reps only see leads linked to their specific User ID
        return response()->json(
            Lead::where('sales_rep_id', $user->id)
                ->with('salesRep')
                ->latest()
                ->get()
        );
    }

    /**
     * Store a newly created lead.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name'   => 'required|string|max:255',
            'project_name'  => 'required|string|max:255',
            'location'      => 'required|string',
            'contact_no'    => 'required|string',
            'email'         => 'nullable|email',
            'notes'         => 'nullable|string',
            'status'        => 'string'
        ]);

        // AUTOMATIC ASSIGNMENT:
        // We ignore any 'salesRep' name sent from frontend and use the Auth ID.
        $validated['sales_rep_id'] = $request->user()->id;

        $lead = Lead::create($validated);

        // Load the relationship before returning so React has the name
        return response()->json($lead->load('salesRep'), 201);
    }

    /**
     * Update lead status (For the Approvals process)
     */
    public function updateStatus(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        
        // Security check: Only the owner or an admin can update
        if (Auth::user()->role !== 'admin' && $lead->sales_rep_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lead->update($request->only(['status', 'approval_status']));

        return response()->json($lead);
    }

    public function update(Request $request, $id)
    {
        // 1. Find the lead or return 404
        $lead = Lead::findOrFail($id);

        // 2. Validate the incoming data
        $validated = $request->validate([
            'notes' => 'nullable|string',
            'status' => 'required|string',
        ]);

        // 3. Update the database record
        $lead->update([
            'notes' => $validated['notes'],
            'status' => $validated['status'],
        ]);

        // 4. Return the updated lead with the salesRep relation
        return response()->json($lead->load('salesRep'));
    }
}