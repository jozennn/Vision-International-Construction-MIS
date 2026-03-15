<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

use App\Models\Project;
use App\Models\Lead;
use App\Models\AppNotification;
use App\Models\ProjectRejectionLog;
use App\Models\DailySiteLog;
use App\Models\ProjectIssue;
use App\Models\ProjectMobilization;

class ProjectController extends Controller
{
    // =========================================================================
    // EAGER LOAD
    // =========================================================================
    private const EAGER = [
        'lead.salesRep',
        'assignments.user',
        'boqPlan',
        'boqActual',
        'poOrder',
        'siteInspection.inspector',
        'materials',
        'mobilization',
        'qaHandover',
        'progressBilling',
        'finalBilling',
        'latestRejection.rejectedBy',
    ];

    // =========================================================================
    // 1. NOTIFICATION ENGINE
    // =========================================================================

    private function createNotification($dept, $role, $projectId, $message): void
    {
        AppNotification::create([
            'target_department' => $dept,
            'target_role'       => $role,
            'project_id'        => $projectId,
            'message'           => $message,
        ]);
    }

    private function notifyNextPhase(string $status, Project $project): void
    {
        $msg = "Action Required: '{$project->project_name}' has moved to {$status}.";

        switch ($status) {
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
            case 'Pending QA Verification':
                $this->createNotification('Engineering', 'dept_head', $project->id,
                    "Approval Needed: '{$project->project_name}' is awaiting Head Verification.");
                break;

            case 'Pending Work Order Verification':
                $this->createNotification('Sales', 'dept_head', $project->id,
                    "Approval Needed: '{$project->project_name}' requires Work Order Verification.");
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
                $this->createNotification('Accounting', 'dept_head', $project->id,
                    "Billing Action Required: '{$project->project_name}' requires payment processing.");
                $this->createNotification('Accounting/Procurement', 'dept_head', $project->id,
                    "Billing Action Required: '{$project->project_name}' requires payment processing.");
                break;
        }
    }

    // =========================================================================
    // 2. NOTIFICATION ENDPOINTS
    // =========================================================================

    public function getNotifications(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) return response()->json([]);

        $dept = strtolower($user->dept ?? $user->department ?? '');
        $role = strtolower($user->role ?? '');

        $notifications = AppNotification::where('is_read', false)
            ->where(function ($query) use ($dept, $role) {
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
        if ($notif) $notif->update(['is_read' => true]);
        return response()->json(['message' => 'Marked as read']);
    }

    // =========================================================================
    // 3. PROJECT LIST
    // =========================================================================

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Not Authenticated'], 401);

        $dept  = strtolower($user->dept ?? $user->department ?? '');
        $role  = strtolower($user->role ?? '');
        $email = strtolower($user->email ?? '');

        $query = Project::with(self::EAGER);

        $isGlobal = in_array($role, ['admin', 'manager', 'dept_head'])
            || str_contains($dept, 'management')
            || str_contains($email, 'ops')
            || str_contains($email, 'admin');

        if (!$isGlobal) {
            $query->where(function ($q) use ($dept, $role, $email, $user) {

                if (str_contains($dept, 'engineering') || str_contains($email, 'eng')) {
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
                            'Request Final Billing',
                        ]);

                        if ($role !== 'dept_head') {
                            $engQ->whereHas('assignments', function ($a) use ($user) {
                                $a->where('user_id', $user->id)
                                  ->whereIn('role', ['lead_engineer', 'support_engineer'])
                                  ->whereNull('removed_at');
                            });
                        }
                    });

                } elseif (str_contains($dept, 'sales') || str_contains($email, 'sales')) {
                    $q->where(function ($salesQ) use ($user) {
                        $salesQ->whereIn('status', [
                            'Floor Plan',
                            'Purchase Order',
                            'P.O & Work Order',
                            'Pending Work Order Verification',
                        ])
                        ->where(function ($ownerQ) use ($user) {
                            $ownerQ->whereHas('assignments', function ($a) use ($user) {
                                $a->where('user_id', $user->id)
                                  ->where('role', 'sales')
                                  ->whereNull('removed_at');
                            })->orWhereHas('lead', function ($l) use ($user) {
                                $l->where('sales_rep_id', $user->id);
                            });
                        });
                    });

                } elseif (
                    str_contains($dept, 'logistics') ||
                    str_contains($dept, 'inventory') ||
                    str_contains($email, 'logistic')
                ) {
                    $q->whereIn('status', [
                        'Checking of Delivery of Materials',
                        'Request Materials Needed',
                    ]);

                } elseif (
                    str_contains($dept, 'accounting') ||
                    str_contains($dept, 'finance') ||
                    str_contains($role, 'accounting') ||
                    str_contains($email, 'accounting')
                ) {
                    $q->whereIn('status', ['Request Billing', 'Request Final Billing']);
                }

                $q->orWhere('status', 'Completed');
            });
        }

        $projects = $query->latest()->get()->map(function ($project) use ($user) {
            $formatted = $this->formatProject($project);

            try {
                $formatted['is_claimed'] = DB::table('engineering_tasks')
                    ->where('project_id', $project->id)->exists();
                $formatted['is_mine'] = DB::table('engineering_tasks')
                    ->where('project_id', $project->id)
                    ->where('assigned_to', $user->id)->exists();
            } catch (\Exception $e) {
                $formatted['is_claimed'] = false;
                $formatted['is_mine']    = false;
            }

            return $formatted;
        });

        return response()->json($projects);
    }

    // =========================================================================
    // 4. SINGLE PROJECT
    // =========================================================================

    public function show($id): JsonResponse
    {
        $project = Project::with(self::EAGER)->find($id);
        if (!$project) return response()->json(['message' => 'Project not found'], 404);
        return response()->json(['project' => $this->formatProject($project)]);
    }

    // =========================================================================
    // 5. CREATE PROJECT
    // =========================================================================

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

    // =========================================================================
    // 6. ADVANCE STATUS (generic)
    // =========================================================================

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $project = Project::with(self::EAGER)->findOrFail($id);
        $dataToUpdate = ['status' => $request->status];

        // ── Contract amount ───────────────────────────────────────────────────
        if ($request->has('contract_amount')) {
            $dataToUpdate['contract_amount'] = $request->contract_amount;
        }

        // ── Subcontractor name (Awarding phase) ───────────────────────────────
        if ($request->has('subcontractor_name')) {
            $dataToUpdate['subcontractor_name'] = $request->subcontractor_name;

            ProjectMobilization::updateOrCreate(
                ['project_id' => $project->id],
                ['subcontractor_name' => $request->subcontractor_name]
            );
        }

        // ── Installer roster (Deployment phase) ───────────────────────────────
        if ($request->has('installer_roster')) {
            $roster = $request->installer_roster;

            if (is_string($roster)) {
                $roster = json_decode($roster, true) ?? [];
            }

            $validRoster = array_values(
                array_filter((array) $roster, fn($i) => !empty(trim($i['name'] ?? '')))
            );

            ProjectMobilization::updateOrCreate(
                ['project_id' => $project->id],
                [
                    'installer_roster' => $validRoster,
                    'deployed_by'      => Auth::id(),
                    'deployed_at'      => now(),
                ]
            );
        }

        // ── Rejection vs advance vs go-back ─────────────────────────────────
        if ($request->filled('rejection_notes')) {
            // Use filled() not has() — has() returns true even for null values
            // which causes a DB NOT NULL constraint failure on rejection_notes.
            ProjectRejectionLog::create([
                'project_id'        => $project->id,
                'rejected_phase'    => $project->status,
                'returned_to_phase' => $request->status,
                'reason'            => $request->rejection_notes,
                'rejected_by'       => Auth::id(),
                'rejected_at'       => now(),
            ]);

            $deptToNotify = $project->status === 'Pending Work Order Verification' ? 'Sales' : 'Engineering';
            $this->createNotification($deptToNotify, null, $project->id,
                "🚨 REJECTED: '{$project->project_name}' - {$request->rejection_notes}");

        } elseif ($request->boolean('go_back')) {
            // Silent go-back — no notification, no rejection log

        } else {
            $this->notifyNextPhase($request->status, $project);
        }

        // ── File uploads ──────────────────────────────────────────────────────
        $fileKeys = [
            'floor_plan_image', 'po_document', 'work_order_document',
            'site_inspection_photo', 'delivery_receipt_document',
            'bidding_document', 'subcontractor_agreement_document',
            'mobilization_photo', 'coc_document', 'billing_invoice_document',
            'qa_photo', 'client_walkthrough_doc', 'final_invoice_document',
        ];

        foreach ($fileKeys as $key) {
            if ($request->hasFile($key)) {
                $path = $request->file($key)->store('project_documents', 'public');
                $this->storePhaseFile($project, $key, $path);
            }
        }

        $project->update($dataToUpdate);

        return response()->json([
            'message' => 'Status updated successfully!',
            'project' => $this->formatProject($project->fresh(self::EAGER)),
        ]);
    }

    // =========================================================================
    // 7. MOBILIZATION ENDPOINTS
    // These replace the separate MobilizationController — all logic lives here.
    // =========================================================================

    /**
     * GET /api/projects/{id}/mobilization
     * Returns the mobilization record for display (roster, photo, etc.)
     */
    public function getMobilization(int $id): JsonResponse
    {
        $mob = ProjectMobilization::where('project_id', $id)->first();

        if (!$mob) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'subcontractor_name'               => $mob->subcontractor_name,
                'subcontractor_agreement_document' => $mob->subcontractor_agreement_document,
                'contract_signed_at'               => $mob->contract_signed_at,
                'mobilization_photo'               => $mob->mobilization_photo,
                'installer_roster'                 => $mob->installer_roster ?? [],
                'installer_count'                  => $mob->installer_count,
                'deployed_at'                      => $mob->deployed_at,
            ],
        ]);
    }

    /**
     * POST /api/projects/{id}/mobilization/contract
     * Confirms the handover checklist and advances to Deployment phase.
     * Copies subcontractor_name from the project row into project_mobilizations.
     */
    public function saveMobilizationContract(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'new_status' => 'required|string',
        ]);

        try {
            $project = Project::with(self::EAGER)->findOrFail($id);

            // Pull subcontractor name saved during the Awarding phase
            $subName = $project->mobilization?->subcontractor_name
                    ?? $project->subcontractor_name
                    ?? null;

            ProjectMobilization::updateOrCreate(
                ['project_id' => $project->id],
                [
                    'subcontractor_name'               => $subName,
                    'subcontractor_agreement_document' => $project->mobilization?->subcontractor_agreement_document
                                                          ?? $project->subcontractor_agreement_document,
                    'contract_signed_at'               => now(),
                    'contract_uploaded_by'             => Auth::id(),
                ]
            );

            $project->update(['status' => $request->new_status]);
            $this->notifyNextPhase($request->new_status, $project);

            return response()->json([
                'message' => 'Contract confirmed.',
                'project' => $this->formatProject($project->fresh(self::EAGER)),
            ]);

        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/projects/{id}/mobilization/deploy   (multipart/form-data)
     * Saves installer roster + mobilization photo, advances to Site Inspection.
     */
    public function saveMobilizationDeploy(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'new_status'       => 'required|string',
            'installer_roster' => 'required|string',
            'mobilization_photo' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        try {
            $project = Project::with(self::EAGER)->findOrFail($id);

            // Decode roster JSON string sent via FormData
            $roster = json_decode($request->installer_roster, true);

            if (!is_array($roster) || empty($roster)) {
                return response()->json(['message' => 'Installer roster is required.'], 422);
            }

            $validRoster = array_values(
                array_filter($roster, fn($i) => !empty(trim($i['name'] ?? '')))
            );

            if (empty($validRoster)) {
                return response()->json(['message' => 'At least one installer name is required.'], 422);
            }

            $photoPath = null;
            if ($request->hasFile('mobilization_photo')) {
                $photoPath = $request->file('mobilization_photo')
                    ->store('mobilization_photos', 'public');
            }

            // installer_roster mutator auto-syncs installer_count
            ProjectMobilization::updateOrCreate(
                ['project_id' => $project->id],
                array_filter([
                    'installer_roster'   => $validRoster,
                    'mobilization_photo' => $photoPath,
                    'deployed_by'        => Auth::id(),
                    'deployed_at'        => now(),
                ], fn($v) => $v !== null)
            );

            $project->update(['status' => $request->new_status]);
            $this->notifyNextPhase($request->new_status, $project);

            return response()->json([
                'message' => 'Team mobilized successfully.',
                'project' => $this->formatProject($project->fresh(self::EAGER)),
            ]);

        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // 8. BOQ SUBMIT ENDPOINTS
    // =========================================================================

    public function submitPlanData(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $rows    = json_decode($request->plan_boq, true) ?? [];
        $total   = collect($rows)->sum(fn($r) => floatval($r['total'] ?? 0));

        $project->boqPlan()->updateOrCreate(
            ['project_id' => $project->id],
            [
                'submitted_by'     => Auth::id(),
                'plan_measurement' => $request->plan_measurement,
                'plan_sqm'         => $request->plan_sqm,
                'boq_rows'         => $rows,
                'grand_total'      => $total,
                'submitted_at'     => now(),
            ]
        );

        $project->update(['status' => 'Actual Measurement']);
        $this->notifyNextPhase('Actual Measurement', $project);

        return response()->json(['message' => 'Plan data saved. Awaiting actual site visit.']);
    }

    public function submitActualData(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $rows    = json_decode($request->final_boq, true) ?? [];
        $total   = collect($rows)->sum(fn($r) => floatval($r['total'] ?? 0));

        $project->boqActual()->updateOrCreate(
            ['project_id' => $project->id],
            [
                'submitted_by'       => Auth::id(),
                'actual_measurement' => $request->actual_measurement,
                'actual_sqm'         => $request->actual_sqm,
                'boq_rows'           => $rows,
                'grand_total'        => $total,
                'review_status'      => 'pending',
                'submitted_at'       => now(),
            ]
        );

        $project->update(['status' => 'Pending Head Review']);
        $this->notifyNextPhase('Pending Head Review', $project);

        return response()->json(['message' => 'Actual data saved. Sent to Head for review.']);
    }

    public function approveBOQ(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $project->boqActual()->update([
            'review_status' => 'approved',
            'reviewed_by'   => Auth::id(),
            'reviewed_at'   => now(),
        ]);

        $project->update(['status' => 'Purchase Order']);

        $this->createNotification('Sales', null, $project->id,
            "✅ BOQ Approved for '{$project->project_name}'. Please prepare the P.O.");

        return response()->json(['message' => 'Verified! Sent back to Sales for P.O.']);
    }

    // =========================================================================
    // 9. SITE INSPECTION
    // =========================================================================

    public function submitSiteInspection(Request $request, $id): JsonResponse
    {
        $request->validate([
            'inspector_id'    => 'required|integer|exists:users,id',
            'inspector_name'  => 'required|string',
            'inspection_date' => 'required|date',
            'inspection_time' => 'required|string',
            'checklist'       => 'required|string',
        ]);

        $project   = Project::findOrFail($id);
        $checklist = json_decode($request->checklist, true);
        $photoPath = null;

        if ($request->hasFile('site_inspection_photo')) {
            $photoPath = $request->file('site_inspection_photo')
                ->store('project_documents', 'public');
        }

        $project->siteInspection()->updateOrCreate(
            ['project_id' => $project->id],
            [
                'inspector_id'     => $request->inspector_id,
                'inspector_name'   => $request->inspector_name,
                'position'         => $request->position,
                'site_location'    => $request->site_location ?? $project->location,
                'inspection_date'  => $request->inspection_date,
                'inspection_time'  => $request->inspection_time,
                'materials_scope'  => $request->materials_scope,
                'notes_remarks'    => $request->notes_remarks,
                'checklist'        => $checklist,
                'inspection_photo' => $photoPath,
                'submitted_at'     => now(),
            ]
        );

        return response()->json(['message' => 'Site inspection saved.']);
    }

    public function getSiteInspection($id): JsonResponse
    {
        $project    = Project::findOrFail($id);
        $inspection = $project->siteInspection;
        if (!$inspection) return response()->json(['message' => 'No inspection found.'], 404);
        return response()->json($inspection);
    }

    // =========================================================================
    // 10. DAILY LOGS & ISSUES
    // =========================================================================

    public function getDailyLogs($id): JsonResponse
    {
        $logs = DailySiteLog::where('project_id', $id)->orderBy('log_date', 'desc')->get();
        return response()->json($logs);
    }

    public function storeDailyLog(Request $request, $id): JsonResponse
    {
        $request->validate(['log_date' => 'required|date']);

        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store('daily_logs', 'public')
            : null;

        $installersData = json_decode($request->installers_data, true) ?? [];
        foreach ($installersData as $key => &$installer) {
            if ($request->hasFile("installer_photo_$key")) {
                $installer['photo_path'] = $request->file("installer_photo_$key")
                    ->store('daily_logs/installers', 'public');
            }
        }

        $log = DailySiteLog::create([
            'project_id'             => $id,
            'log_date'               => $request->log_date,
            'client_start_date'      => $request->client_start_date,
            'client_end_date'        => $request->client_end_date,
            'start_date'             => $request->start_date,
            'end_date'               => $request->end_date,
            'lead_man'               => $request->lead_man,
            'total_area'             => $request->total_area,
            'accomplishment_percent' => $request->accomplishment_percent,
            'workers_count'          => $request->workers_count,
            'installers_data'        => json_encode($installersData),
            'remarks'                => $request->remarks,
            'photo_path'             => $photoPath,
        ]);

        return response()->json(['message' => 'Daily log saved successfully!', 'log' => $log]);
    }

    public function getIssues($id): JsonResponse
    {
        return response()->json(ProjectIssue::where('project_id', $id)->latest()->get());
    }

    public function storeIssue(Request $request, $id): JsonResponse
    {
        $request->validate([
            'problem'  => 'required|string',
            'solution' => 'nullable|string',
        ]);

        $issue = ProjectIssue::create([
            'project_id' => $id,
            'problem'    => $request->problem,
            'solution'   => $request->solution,
        ]);

        return response()->json(['message' => 'Issue logged!', 'issue' => $issue]);
    }

    // =========================================================================
    // 11. SALES STATS
    // =========================================================================

    public function getSalesStats(): JsonResponse
    {
        return response()->json([
            'total_leads'        => Lead::count(),
            'converted_projects' => Project::count(),
            'pending_approvals'  => Project::where('status', 'Pending Head Review')->count(),
            'win_rate'           => '75%',
        ]);
    }

    public function getRecentLeads(): JsonResponse
    {
        return response()->json(Lead::with('salesRep')->latest()->take(5)->get());
    }

    // =========================================================================
    // 12. IMAGE FETCH HELPER
    // =========================================================================

    public function fetchImage(Request $request): JsonResponse
    {
        $path     = $request->query('path');
        $fullPath = storage_path('app/public/' . str_replace('public/', '', $path));

        if (!file_exists($fullPath)) {
            return response()->json(['error' => 'File not found.'], 404);
        }

        $fileContents = file_get_contents($fullPath);
        $base64       = base64_encode($fileContents);
        $mime         = mime_content_type($fullPath);

        // Correctly detect PDF, PNG, JPEG
        $extension = match(true) {
            str_contains($mime, 'pdf')  => 'pdf',
            str_contains($mime, 'png')  => 'png',
            default                     => 'jpeg',
        };

        return response()->json([
            'base64'    => 'data:' . $mime . ';base64,' . $base64,
            'extension' => $extension,
        ]);
    }

    // =========================================================================
    // 13. TRACKING SAVE ENDPOINTS
    // =========================================================================

    public function saveTrackingLegacy(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $data = [];
        if ($request->has('material_items'))     $data['material_items']    = $request->material_items;
        if ($request->has('materials_tracking')) $data['material_items']    = $request->materials_tracking;
        if ($request->has('timeline_tracking'))  $data['timeline_tracking'] = $request->timeline_tracking;

        if ($request->has('site_inspection_report')) {
            $project->siteInspection()->updateOrCreate(
                ['project_id' => $project->id],
                ['notes_remarks' => $request->site_inspection_report]
            );
        }

        if (!empty($data)) {
            $project->materials()->updateOrCreate(
                ['project_id' => $project->id],
                $data
            );
        }

        return response()->json(['message' => 'Tracking updated.']);
    }

    public function saveTrackingMaterials(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $project->materials()->updateOrCreate(
            ['project_id' => $project->id],
            ['material_items' => $request->material_items]
        );

        return response()->json(['message' => 'Materials tracking updated.']);
    }

    public function saveTrackingTimeline(Request $request, $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $project->materials()->updateOrCreate(
            ['project_id' => $project->id],
            ['timeline_tracking' => $request->timeline_tracking]
        );

        return response()->json(['message' => 'Timeline tracking updated.']);
    }

    // =========================================================================
    // 14. PRIVATE HELPERS
    // =========================================================================

    private function storePhaseFile(Project $project, string $field, string $path): void
    {
        $uid = $project->id;
        $by  = Auth::id();
        $now = now();

        $map = [
            'floor_plan_image'      => fn() => $project->update(['floor_plan_image' => $path]),

            'po_document'           => fn() => $project->poOrder()->updateOrCreate(['project_id' => $uid], ['po_document'        => $path, 'po_uploaded_by' => $by, 'po_uploaded_at' => $now]),
            'work_order_document'   => fn() => $project->poOrder()->updateOrCreate(['project_id' => $uid], ['work_order_document' => $path, 'wo_uploaded_by' => $by, 'wo_uploaded_at' => $now]),

            'site_inspection_photo' => fn() => $project->siteInspection()->updateOrCreate(['project_id' => $uid], ['inspection_photo' => $path, 'submitted_at' => $now]),

            'delivery_receipt_document' => fn() => $project->materials()->updateOrCreate(['project_id' => $uid], ['delivery_receipt_document' => $path, 'dr_uploaded_by' => $by, 'dr_uploaded_at' => $now]),
            'bidding_document'          => fn() => $project->materials()->updateOrCreate(['project_id' => $uid], ['bidding_document'          => $path, 'bidding_submitted_at' => $now]),

            'subcontractor_agreement_document' => fn() => ProjectMobilization::updateOrCreate(
                ['project_id' => $uid],
                ['subcontractor_agreement_document' => $path, 'contract_uploaded_by' => $by, 'contract_signed_at' => $now]
            ),
            'mobilization_photo' => fn() => ProjectMobilization::updateOrCreate(
                ['project_id' => $uid],
                ['mobilization_photo' => $path, 'deployed_by' => $by, 'deployed_at' => $now]
            ),

            'qa_photo'               => fn() => $project->qaHandover()->updateOrCreate(['project_id' => $uid], ['qa_photo'               => $path, 'qa_submitted_by' => $by, 'qa_submitted_at' => $now]),
            'client_walkthrough_doc' => fn() => $project->qaHandover()->updateOrCreate(['project_id' => $uid], ['client_walkthrough_doc' => $path, 'walkthrough_completed_at' => $now]),
            'coc_document'           => fn() => $project->qaHandover()->updateOrCreate(['project_id' => $uid], ['coc_document'           => $path, 'coc_uploaded_by' => $by, 'coc_signed_at' => $now]),

            'billing_invoice_document' => fn() => $project->billings()->updateOrCreate(['project_id' => $uid, 'billing_type' => 'progress'], ['invoice_document' => $path, 'submitted_by' => $by, 'submitted_at' => $now]),
            'final_invoice_document'   => fn() => $project->billings()->updateOrCreate(['project_id' => $uid, 'billing_type' => 'final'],    ['invoice_document' => $path, 'submitted_by' => $by, 'submitted_at' => $now]),
        ];

        if (isset($map[$field])) ($map[$field])();
    }

    private function formatProject(Project $project): array
    {
        $po        = $project->poOrder;
        $si        = $project->siteInspection;
        $mat       = $project->materials;
        $mob       = $project->mobilization;
        $qa        = $project->qaHandover;
        $boqPlan   = $project->boqPlan;
        $boqActual = $project->boqActual;

        return [
            // ── Core ──────────────────────────────────────────────────────
            'id'                    => $project->id,
            'lead_id'               => $project->lead_id,
            'project_name'          => $project->project_name,
            'client_name'           => $project->client_name,
            'location'              => $project->location,
            'project_type'          => $project->project_type,
            'status'                => $project->status,
            'is_completed'          => $project->is_completed,
            'contract_amount'       => $project->contract_amount,
            'floor_plan_image'      => $project->floor_plan_image,
            'created_at'            => $project->created_at,

            // ── Personnel ─────────────────────────────────────────────────
            'created_by'            => $project->created_by,
            'created_by_name'       => $project->created_by_name,
            'assigned_engineers'    => $project->assigned_engineers,
            'assigned_engineer_ids' => $project->assigned_engineer_ids,

            // ── Rejection ─────────────────────────────────────────────────
            'rejection_notes'       => $project->rejection_notes,

            // ── BOQ Plan ──────────────────────────────────────────────────
            'plan_measurement'      => $boqPlan?->plan_measurement,
            'plan_sqm'              => $boqPlan?->plan_sqm,
            'plan_boq'              => $boqPlan?->boq_rows ? json_encode($boqPlan->boq_rows) : null,

            // ── BOQ Actual ────────────────────────────────────────────────
            'actual_measurement'    => $boqActual?->actual_measurement,
            'actual_sqm'            => $boqActual?->actual_sqm,
            'final_boq'             => $boqActual?->boq_rows ? json_encode($boqActual->boq_rows) : null,
            'is_phase1_approved'    => $boqActual?->review_status === 'approved',

            // ── PO ────────────────────────────────────────────────────────
            'po_document'           => $po?->po_document,
            'work_order_document'   => $po?->work_order_document,

            // ── Site inspection ───────────────────────────────────────────
            'site_inspection_photo'  => $si?->inspection_photo,
            'site_inspection_report' => $si ? [
                'inspector_name'  => $si->inspector_name,
                'position'        => $si->position,
                'inspection_date' => $si->inspection_date,
                'checklist'       => $si->checklist,
                'notes_remarks'   => $si->notes_remarks,
            ] : null,

            // ── Materials ─────────────────────────────────────────────────
            'delivery_receipt_document' => $mat?->delivery_receipt_document,
            'bidding_document'          => $mat?->bidding_document,

            // ── Mobilization ──────────────────────────────────────────────
            'subcontractor_name'               => $mob?->subcontractor_name
                                                  ?? $mat?->subcontractor_name
                                                  ?? $project->subcontractor_name,
            'subcontractor_agreement_document' => $mob?->subcontractor_agreement_document,
            'mobilization_photo'               => $mob?->mobilization_photo,
            'installer_roster'                 => $mob?->installer_roster ?? [],
            'installer_count'                  => $mob?->installer_count ?? 0,

            // ── QA / Handover ─────────────────────────────────────────────
            'qa_photo'               => $qa?->qa_photo,
            'client_walkthrough_doc' => $qa?->client_walkthrough_doc,
            'coc_document'           => $qa?->coc_document,

            // ── Billing ───────────────────────────────────────────────────
            'billing_invoice_document' => $project->progressBilling?->invoice_document,
            'final_invoice_document'   => $project->finalBilling?->invoice_document,

            // ── Tracking ──────────────────────────────────────────────────
            'material_items'    => $mat?->material_items,
            'timeline_tracking' => $mat?->timeline_tracking,
        ];
    }
}