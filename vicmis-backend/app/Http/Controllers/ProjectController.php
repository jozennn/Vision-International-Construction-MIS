<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Not Authenticated'], 401);

        $query = Project::query();

        // 🚨 1. ADMIN & MANAGEMENT: True God Mode (See Everything)
        if (in_array($user->role, ['admin', 'manager']) || $user->department === 'Management') {
            // We apply ZERO filters here. They see every project in the database.
        } else {
            // 🚨 2. NORMAL DEPARTMENTS: Grouped safely so it doesn't break
            $query->where(function ($q) use ($user) {
                if ($user->department === 'Engineering') {
                    $q->whereIn('status', [
                        'Measurement based on Plan',
                        'Actual Measurement',
                        'Pending Head Review',
                        'Initial Site Inspection',
                        'Checking of Delivery of Materials',
                        'Bidding of Project',
                        'Awarding of Project',
                        'Contract Signing for Installer',
                        'Deployment and Orientation of Installers',
                        'Site Inspection & Project Monitoring',
                        'Request Materials Needed',
                        'Request Billing',
                        'Site Inspection & Quality Checking',
                        'Final Site Inspection with the Client',
                        'Signing of COC',
                        'Request Final Billing'
                    ]);
                } elseif ($user->department === 'Sales') {
                    $q->whereIn('status', ['Floor Plan', 'Purchase Order', 'P.O & Work Order']);
                } elseif ($user->department === 'Logistics') {
                    $q->whereIn('status', ['Checking of Delivery of Materials', 'Request Materials Needed']);
                } elseif ($user->department === 'Accounting' || $user->department === 'Accounting/Procurement') {
                    $q->whereIn('status', ['Request Billing', 'Request Final Billing']);
                }

                // Everyone else can ALSO see Completed projects without breaking Admin view
                $q->orWhere('status', 'Completed');
            });
        }

        return response()->json($query->latest()->get());
    }
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id'      => 'required',
            'project_name' => 'required',
            'client_name'  => 'required',
            'location'     => 'required',
            'project_type' => 'required',
        ]);

        $validated['status'] = 'Floor Plan';
        $project = Project::create($validated);
        Lead::where('id', $request->lead_id)->update(['status' => 'Project Created']);

        return response()->json(['message' => 'Lead converted to Project!', 'project' => $project], 201);
    }

    // --- WORKFLOW ACTIONS ---

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $dataToUpdate = ['status' => $request->status];

        if ($request->has('subcontractor_name')) {
            $dataToUpdate['subcontractor_name'] = $request->subcontractor_name;
        }
        if ($request->has('contract_amount')) {
            $dataToUpdate['contract_amount'] = $request->contract_amount;
        }

        // 🚨 NEW: Handle Rejection Notes 🚨
        if ($request->has('rejection_notes')) {
            $dataToUpdate['rejection_notes'] = $request->rejection_notes;
        } else {
            // If they are moving forward normally, wipe the old rejection notes clean!
            $dataToUpdate['rejection_notes'] = null;
        }
        // 🚨 DYNAMIC FILE CATCHER (Updated with all 8 files!) 🚨
        $fileKeys = [
            'floor_plan_image',
            'po_document',
            'work_order_document',
            'site_inspection_photo',
            'delivery_receipt_document',
            'bidding_document',
            'subcontractor_agreement_document',
            'mobilization_photo', // 🚨 ADD THIS HERE!
            'coc_document'
        ];

        foreach ($fileKeys as $key) {
            if ($request->hasFile($key)) {
                $dataToUpdate[$key] = $request->file($key)->store('project_documents', 'public');
            }
        }

        $project->update($dataToUpdate);
        return response()->json(['message' => 'Status updated successfully!', 'project' => $project]);
    }

    public function submitPlanData(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $project->update([
            'plan_measurement' => $request->plan_measurement,
            'plan_boq'         => $request->plan_boq,
            'status'           => 'Actual Measurement'
        ]);
        return response()->json(['message' => 'Plan data saved. Awaiting actual site visit.']);
    }

    public function submitActualData(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $project->update([
            'actual_measurement' => $request->actual_measurement,
            'final_boq'          => $request->final_boq,
            'status'             => 'Pending Head Review'
        ]);
        return response()->json(['message' => 'Actual data saved. Sent to Head for review.']);
    }

    public function approveBOQ(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $project->update([
            'is_phase1_approved' => true,
            'status' => 'Purchase Order'
        ]);
        return response()->json(['message' => 'Verified! Sent back to Sales for P.O.']);
    }

    public function getSalesStats(): JsonResponse
    {
        return response()->json([
            'total_leads' => Lead::count(),
            'converted_projects' => Project::count(),
            'pending_approvals' => Project::where('is_phase1_approved', false)->count(),
            'win_rate' => '75%'
        ]);
    }

    public function getRecentLeads(): JsonResponse
    {
        return response()->json(Lead::latest()->take(5)->get());
    }
    // Fetch all daily logs for a specific project
    public function getDailyLogs($id)
    {
        $logs = \App\Models\DailySiteLog::where('project_id', $id)->orderBy('log_date', 'desc')->get();
        return response()->json($logs);
    }

    // Save a new daily log
    public function storeDailyLog(Request $request, $id)
    {
        $request->validate([
            'log_date' => 'required|date',
        ]);

        $photoPath = $request->hasFile('photo') ? $request->file('photo')->store('daily_logs', 'public') : null;

        $installersData = json_decode($request->installers_data, true) ?? [];
        foreach ($installersData as $key => &$installer) {
            if ($request->hasFile("installer_photo_$key")) {
                $installer['photo_path'] = $request->file("installer_photo_$key")->store('daily_logs/installers', 'public');
            }
        }

        $log = \App\Models\DailySiteLog::create([
            'project_id' => $id,
            'log_date' => $request->log_date,
            'client_start_date' => $request->client_start_date, // 🚨 NEW
            'client_end_date' => $request->client_end_date,     // 🚨 NEW
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'lead_man' => $request->lead_man,
            'total_area' => $request->total_area,
            'accomplishment_percent' => $request->accomplishment_percent,
            'workers_count' => $request->workers_count,
            'installers_data' => json_encode($installersData),
            'remarks' => $request->remarks,
            'photo_path' => $photoPath,
        ]);

        return response()->json(['message' => 'Daily log saved successfully!', 'log' => $log]);
    }
    // Fetch all issues
    public function getIssues($id)
    {
        return response()->json(\App\Models\ProjectIssue::where('project_id', $id)->latest()->get());
    }

    // Save a new issue
    public function storeIssue(Request $request, $id)
    {
        $request->validate([
            'problem' => 'required|string',
            'solution' => 'nullable|string'
        ]);

        $issue = \App\Models\ProjectIssue::create([
            'project_id' => $id,
            'problem' => $request->problem,
            'solution' => $request->solution
        ]);

        return response()->json(['message' => 'Issue logged!', 'issue' => $issue]);
    }
    // 🚨 NEW: Saves Materials and Timeline Data
    public function saveTracking(Request $request, $id)
    {
        $project = \App\Models\Project::findOrFail($id);

        if ($request->has('materials_tracking')) $project->materials_tracking = $request->materials_tracking;
        if ($request->has('timeline_tracking')) $project->timeline_tracking = $request->timeline_tracking;
        if ($request->has('site_inspection_report')) $project->site_inspection_report = $request->site_inspection_report; // 🚨 NEW

        $project->save();
        return response()->json(['message' => 'Tracking updated successfully!']);
    }
    // 🚨 VIP Image Fetcher (Bypasses Storage CORS issues!)
    // 🚨 THE BULLETPROOF BASE64 IMAGE FETCHER 🚨
    public function fetchImage(Request $request)
    {
        $path = $request->query('path');

        // Find the absolute path to the file
        $fullPath = storage_path('app/public/' . str_replace('public/', '', $path));

        if (!file_exists($fullPath)) {
            return response()->json(['error' => 'Image not found at ' . $fullPath], 404);
        }

        // Turn the image into a text string
        $fileContents = file_get_contents($fullPath);
        $base64 = base64_encode($fileContents);

        // Figure out if it's a png or jpeg
        $mime = mime_content_type($fullPath);
        $extension = str_contains($mime, 'png') ? 'png' : 'jpeg';

        // Send it back as safe JSON text!
        return response()->json([
            'base64' => 'data:' . $mime . ';base64,' . $base64,
            'extension' => $extension
        ]);
    }
}
