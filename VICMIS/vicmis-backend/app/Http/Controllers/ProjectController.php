<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\Lead;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    // ==========================================
    // 🚨 1. NOTIFICATION ENGINE HELPERS 🚨
    // ==========================================
    
    private function createNotification($dept, $role, $projectId, $message) {
        AppNotification::create([
            'target_department' => $dept,
            'target_role' => $role,
            'project_id' => $projectId,
            'message' => $message
        ]);
    }

    private function notifyNextPhase($status, $project) {
        $msg = "Action Required: '{$project->project_name}' has moved to {$status}.";
        
        switch($status) {
            case 'Measurement based on Plan':
            case 'Actual Measurement':
            case 'Initial Site Inspection':
            case 'Site Inspection & Project Monitoring':
            case 'Site Inspection & Quality Checking':
            case 'Final Site Inspection with the Client':
            case 'Signing of COC':
                $this->createNotification('Engineering', null, $project->id, $msg);
                break;
            case 'Pending Head Review':
            case 'Pending DR Verification':
            case 'Pending QA Verification': // 🚨 NEW QA VERIFICATION ALERT
                $this->createNotification('Engineering', 'dept_head', $project->id, "Approval Needed: '{$project->project_name}' is awaiting Head Verification.");
                break;
            case 'Pending Work Order Verification':
                $this->createNotification('Sales', 'dept_head', $project->id, "Approval Needed: '{$project->project_name}' requires Work Order Verification.");
                break;
            case 'Checking of Delivery of Materials':
            case 'Request Materials Needed':
                $this->createNotification('Logistics', null, $project->id, $msg);
                break;
            case 'Bidding of Project':
            case 'Awarding of Project':
                $this->createNotification('Management', null, $project->id, $msg);
                break;
            case 'Request Billing':
            case 'Request Final Billing':
                // Double alert to ensure Accounting gets it regardless of database spelling!
                $this->createNotification('Accounting', 'dept_head', $project->id, "Billing Action Required: '{$project->project_name}' requires payment processing.");
                $this->createNotification('Accounting/Procurement', 'dept_head', $project->id, "Billing Action Required: '{$project->project_name}' requires payment processing.");
                break;
        }
    }

    // ==========================================
    // 🚨 2. NOTIFICATION ENDPOINTS FOR REACT 🚨
    // ==========================================
    
    public function getNotifications(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) return response()->json([]);

        $dept = strtolower($user->dept ?? $user->department ?? '');
        $role = strtolower($user->role ?? '');

        $notifications = AppNotification::where('is_read', false)
            ->where(function ($query) use ($dept, $role, $user) {
                if (in_array($role, ['admin', 'manager'])) return;

                $query->whereRaw('LOWER(target_department) = ?', [$dept])
                      ->orWhereRaw('? LIKE CONCAT("%", LOWER(target_department), "%")', [$dept])
                      ->where(function ($q) use ($role) {
                          $q->whereNull('target_role')
                            ->orWhereRaw('LOWER(target_role) = ?', [$role]);
                      });
            })
            ->latest()
            ->get();

        return response()->json($notifications);
    }

    public function markNotificationRead($id): JsonResponse
    {
        $notif = AppNotification::find($id);
        if($notif) {
            $notif->update(['is_read' => true]);
        }
        return response()->json(['message' => 'Marked as read']);
    }

    // ==========================================
    // 🚨 3. GOD-MODE PROJECT LIST ROUTE 🚨
    // ==========================================

public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Not Authenticated'], 401);

        $query = Project::query();

        // Convert everything to lowercase so capitalization/spaces never break the system!
        $dept = strtolower($user->dept ?? $user->department ?? '');
        $role = strtolower($user->role ?? '');
        $email = strtolower($user->email ?? '');

        // 1. ADMIN & MANAGEMENT: See everything
        if (in_array($role, ['admin', 'manager']) || str_contains($dept, 'management') || str_contains($email, 'ops') || str_contains($email, 'admin')) {
            // Zero filters applied.
        } else {
            // 2. NORMAL DEPARTMENTS: Grouped with flexible Catch-All strings
            $query->where(function ($q) use ($dept, $role, $email, $user) {
                
                // ENGINEERING
                if (str_contains($dept, 'engineering') || str_contains($email, 'eng')) {
                    
                    // Group the engineering phases and the security lock together
                    $q->where(function ($engQ) use ($role, $user) {
                        $engQ->whereIn('status', [
                            'Measurement based on Plan',
                            'Actual Measurement',
                            'Pending Head Review',
                            'Initial Site Inspection',
                            'Checking of Delivery of Materials',
                            'Pending DR Verification', 
                            'Bidding of Project',
                            'Awarding of Project',
                            'Contract Signing for Installer',
                            'Deployment and Orientation of Installers',
                            'Site Inspection & Project Monitoring',
                            'Request Materials Needed',
                            'Request Billing',
                            'Site Inspection & Quality Checking',
                            'Pending QA Verification',
                            'Final Site Inspection with the Client',
                            'Signing of COC',
                            'Request Final Billing'
                        ]);

                        // 🚨 STRICT BACKEND LOCK FOR STANDARD ENGINEERS 🚨
                        // If you are NOT the Dept Head, you ONLY get projects assigned specifically to YOU.
                        if ($role !== 'dept_head') {
                            $engQ->whereIn('id', function($subquery) use ($user) {
                                $subquery->select('project_id')
                                         ->from('engineering_tasks')
                                         ->where('assigned_to', $user->id);
                            });
                        }
                    });
                } 
                // SALES
                elseif (str_contains($dept, 'sales') || str_contains($email, 'sales')) {
                    $q->whereIn('status', [
                        'Floor Plan', 
                        'Purchase Order', 
                        'P.O & Work Order', 
                        'Pending Work Order Verification' 
                    ]);
                } 
                // LOGISTICS
                elseif (str_contains($dept, 'logistics') || str_contains($dept, 'inventory') || str_contains($email, 'logistic')) {
                    $q->whereIn('status', ['Checking of Delivery of Materials', 'Request Materials Needed']);
                } 
                // ACCOUNTING
                elseif (str_contains($dept, 'accounting') || str_contains($dept, 'finance') || str_contains($role, 'accounting') || str_contains($email, 'accounting')) {
                    $q->whereIn('status', ['Request Billing', 'Request Final Billing']);
                }

                // Everyone sees Completed projects
                $q->orWhere('status', 'Completed');
            });
        }

        // 🚨 MAP SECURITY FLAGS 🚨
        $projects = $query->latest()->get()->map(function ($project) use ($user) {
            
            // Check if ANYONE has claimed it
            $isClaimed = DB::table('engineering_tasks')
                ->where('project_id', $project->id)
                ->exists();

            // Check if the CURRENT USER is assigned to it
            $isMine = DB::table('engineering_tasks')
                ->where('project_id', $project->id)
                ->where('assigned_to', $user->id)
                ->exists();

            // Attach to the project data
            $project->is_claimed = $isClaimed;
            $project->is_mine = $isMine; 
            
            return $project;
        });

        return response()->json($projects);
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

        if ($request->has('rejection_notes')) {
            $dataToUpdate['rejection_notes'] = $request->rejection_notes;
            $deptToNotify = $project->status === 'Pending Work Order Verification' ? 'Sales' : 'Engineering';
            $this->createNotification($deptToNotify, null, $project->id, "🚨 REJECTED: '{$project->project_name}' - {$request->rejection_notes}");
        } else {
            $dataToUpdate['rejection_notes'] = null;
            $this->notifyNextPhase($request->status, $project);
        }

        // 🚨 UPDATED DYNAMIC FILE CATCHER 🚨
        $fileKeys = [
            'floor_plan_image',
            'po_document',
            'work_order_document',
            'site_inspection_photo',
            'delivery_receipt_document',
            'bidding_document',
            'subcontractor_agreement_document',
            'mobilization_photo', 
            'coc_document',
            'billing_invoice_document',
            'qa_photo',
            'client_walkthrough_doc',
            'final_invoice_document'
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
        
        $this->notifyNextPhase('Actual Measurement', $project);
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
        
        $this->notifyNextPhase('Pending Head Review', $project);
        return response()->json(['message' => 'Actual data saved. Sent to Head for review.']);
    }

    public function approveBOQ(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $project->update([
            'is_phase1_approved' => true,
            'status' => 'Purchase Order'
        ]);
        
        $this->createNotification('Sales', null, $project->id, "✅ BOQ Approved for '{$project->project_name}'. Please prepare the P.O.");
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

    public function getDailyLogs($id)
    {
        $logs = \App\Models\DailySiteLog::where('project_id', $id)->orderBy('log_date', 'desc')->get();
        return response()->json($logs);
    }

    public function storeDailyLog(Request $request, $id)
    {
        $request->validate(['log_date' => 'required|date']);

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
            'client_start_date' => $request->client_start_date, 
            'client_end_date' => $request->client_end_date,     
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

    public function getIssues($id)
    {
        return response()->json(\App\Models\ProjectIssue::where('project_id', $id)->latest()->get());
    }

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

    public function saveTracking(Request $request, $id)
    {
        $project = \App\Models\Project::findOrFail($id);

        if ($request->has('materials_tracking')) $project->materials_tracking = $request->materials_tracking;
        if ($request->has('timeline_tracking')) $project->timeline_tracking = $request->timeline_tracking;
        if ($request->has('site_inspection_report')) $project->site_inspection_report = $request->site_inspection_report; 

        $project->save();
        return response()->json(['message' => 'Tracking updated successfully!']);
    }

    public function fetchImage(Request $request)
    {
        $path = $request->query('path');
        $fullPath = storage_path('app/public/' . str_replace('public/', '', $path));

        if (!file_exists($fullPath)) {
            return response()->json(['error' => 'Image not found at ' . $fullPath], 404);
        }

        $fileContents = file_get_contents($fullPath);
        $base64 = base64_encode($fileContents);
        $mime = mime_content_type($fullPath);
        $extension = str_contains($mime, 'png') ? 'png' : 'jpeg';

        return response()->json([
            'base64' => 'data:' . $mime . ';base64,' . $base64,
            'extension' => $extension
        ]);
    }
    public function show($id)
    {
        $project = \App\Models\Project::find($id);
        

        if (!$project) {
            return response()->json(['message' => 'Project not found in database'], 404);
        }

        return response()->json($project);
    }
}