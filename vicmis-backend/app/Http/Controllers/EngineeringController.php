<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class EngineeringController extends Controller
{
    // ─── Dashboard Stats ───────────────────────────────────────────────────
    public function getDashboardStats()
    {
        try {
            $user = Auth::user();

            $tasksTableExists = Schema::hasTable('engineering_tasks');

            $totalProjects = Project::whereNotIn('status', ['Lead'])->count();

            [$totalEngineers, $engineersList] = $this->resolveEngineers();

            // Pre-load ALL assignment data in 2 queries (fixes N+1)
            // Checks BOTH tables: project_assignments (new) + engineering_tasks (legacy)
            $assignmentCounts = [];
            $myAssignments    = [];

            // New normalized table
            $newCounts = ProjectAssignment::whereNull('removed_at')
                ->selectRaw('project_id, COUNT(*) as total')
                ->groupBy('project_id')
                ->pluck('total', 'project_id')
                ->toArray();

            // Legacy table fallback
            $legacyCounts = [];
            if ($tasksTableExists) {
                $legacyCounts = DB::table('engineering_tasks')
                    ->selectRaw('project_id, COUNT(*) as total')
                    ->groupBy('project_id')
                    ->pluck('total', 'project_id')
                    ->toArray();
            }

            // Merge — prefer new table, fall back to legacy
            foreach (array_keys($newCounts + $legacyCounts) as $pid) {
                $assignmentCounts[$pid] = max($newCounts[$pid] ?? 0, $legacyCounts[$pid] ?? 0);
            }

            if ($user) {
                // Check new table first, then legacy
                $newMine = ProjectAssignment::where('user_id', $user->id)
                    ->whereNull('removed_at')
                    ->pluck('project_id')
                    ->toArray();

                $legacyMine = $tasksTableExists
                    ? DB::table('engineering_tasks')
                        ->where('assigned_to', $user->id)
                        ->pluck('project_id')
                        ->toArray()
                    : [];

                $myAssignments = array_flip(array_unique(array_merge($newMine, $legacyMine)));
            }

            $allProjects           = Project::all();
            $activeProjectsList    = [];
            $completedProjectsList = [];
            $pickupQueue           = [];
            $totalPercent          = 0.0;
            $activeCount           = 0;

            $monthlyCompletions = [
                'Jan' => 0, 'Feb' => 0, 'Mar' => 0, 'Apr' => 0,
                'May' => 0, 'Jun' => 0, 'Jul' => 0, 'Aug' => 0,
                'Sep' => 0, 'Oct' => 0, 'Nov' => 0, 'Dec' => 0,
            ];
            $yearlyCompletions = [];

            foreach ($allProjects as $project) {
                $status      = strtolower(trim($project->status));
                $isCompleted = in_array($status, ['completed', 'archived']);
                $isExcluded  = in_array($status, ['lead']);

                $progress           = $this->computeProgress($project);
                $assignedStaffCount = $assignmentCounts[$project->id] ?? 0;

                $projectData = [
                    'id'          => $project->id,
                    'name'        => $project->project_name,
                    'status'      => $project->status,
                    'client'      => $project->client_name ?? 'Unknown Client',
                    'progress'    => round($progress),
                    'is_assigned' => $assignedStaffCount > 0,
                ];

                if ($isCompleted) {
                    $projectData['progress'] = 100;

                    $date  = $project->updated_at ? Carbon::parse($project->updated_at) : now();
                    $month = $date->format('M');
                    $year  = $date->format('Y');

                    $projectData['completion_month'] = $month;
                    $projectData['completion_year']  = $year;

                    $completedProjectsList[] = $projectData;

                    if (isset($monthlyCompletions[$month])) {
                        $monthlyCompletions[$month]++;
                    }
                    $yearlyCompletions[$year] = ($yearlyCompletions[$year] ?? 0) + 1;

                } elseif (!$isExcluded) {
                    if ($assignedStaffCount === 0) {
                        $pickupQueue[] = $projectData;
                    } else {
                        $isMyProject = isset($myAssignments[$project->id]);

                        if ($isMyProject || ($user && $user->role === 'dept_head')) {
                            $activeProjectsList[] = $projectData;
                            $totalPercent += $progress;
                            $activeCount++;
                        }
                    }
                }
            }

            $avgProgress = $activeCount > 0 ? round($totalPercent / $activeCount) : 0;

            $chartDataMonthly = [];
            foreach ($monthlyCompletions as $month => $count) {
                $chartDataMonthly[] = ['name' => $month, 'Completed' => $count];
            }

            ksort($yearlyCompletions);
            $chartDataYearly = [];
            foreach ($yearlyCompletions as $year => $count) {
                $chartDataYearly[] = ['name' => (string) $year, 'Completed' => $count];
            }

            return response()->json([
                'total_projects'     => $totalProjects,
                'pending_tasks'      => count($activeProjectsList),
                'project_progress'   => $avgProgress . '%',
                'total_engineers'    => $totalEngineers,
                'engineers_list'     => $engineersList,
                'active_projects'    => $activeProjectsList,
                'completed_projects' => $completedProjectsList,
                'pickup_queue'       => $pickupQueue,
                'chart_data_monthly' => $chartDataMonthly,
                'chart_data_yearly'  => $chartDataYearly,
            ]);

        } catch (\Throwable $e) {
            Log::error('Engineering Dashboard Error', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);
            return response()->json([
                'LARAVEL_CRASHED'    => true,
                'message'            => $e->getMessage(),
                'total_projects'     => 0,
                'pending_tasks'      => 0,
                'project_progress'   => '0%',
                'total_engineers'    => 0,
                'engineers_list'     => [],
                'active_projects'    => [],
                'completed_projects' => [],
                'pickup_queue'       => [],
                'chart_data_monthly' => [],
                'chart_data_yearly'  => [],
            ], 200);
        }
    }

    // ─── Self-Pickup ───────────────────────────────────────────────────────
    public function pickProject(Request $request)
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id',
        ]);

        $user = Auth::user();

        // Check both tables to prevent double-claiming
        $alreadyAssigned = DB::table('engineering_tasks')
            ->where('project_id', $request->project_id)
            ->exists()
            || ProjectAssignment::where('project_id', $request->project_id)
                ->whereNull('removed_at')
                ->exists();

        if ($alreadyAssigned) {
            return response()->json([
                'message' => 'Too late! Another engineer already claimed this project.',
            ], 403);
        }

        DB::transaction(function () use ($request, $user) {
            // Write to legacy table (keeps engineering dashboard working)
            DB::table('engineering_tasks')->insert([
                'project_id'   => $request->project_id,
                'assigned_to'  => $user->id,
                'instructions' => 'SELF-PICKED: Engineer claimed this project independently.',
                'status'       => 'Pending',
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // Write to normalized table (keeps ProjectController filter working)
            ProjectAssignment::firstOrCreate(
                [
                    'project_id' => $request->project_id,
                    'user_id'    => $user->id,
                    'role'       => 'lead_engineer',
                ],
                [
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                ]
            );
        });

        return response()->json(['message' => 'Project claimed! It is now in your active workspace.']);
    }

    // ─── Assign Task ───────────────────────────────────────────────────────
    public function assignTask(Request $request)
    {
        $validated = $request->validate([
            'project_id'     => 'required|exists:projects,id',
            'engineer_ids'   => 'required|array|min:1|max:10',
            'engineer_ids.*' => 'required|exists:users,id|distinct',
            'instructions'   => 'required|string|max:5000',
        ]);

        $teamSize         = count($validated['engineer_ids']);
        $baseInstructions = "TEAM SIZE: {$teamSize} Engineer(s) Dispatched\n\n" . $validated['instructions'];
        $assignedBy       = Auth::id();

        DB::transaction(function () use ($validated, $baseInstructions, $assignedBy) {
            foreach ($validated['engineer_ids'] as $index => $engId) {
                $roleTitle    = $index === 0 ? '👑 LEAD ENGINEER' : '🛠️ SUPPORT STAFF';
                $assignedRole = $index === 0 ? 'lead_engineer' : 'support_engineer';

                // ── Legacy table (keeps engineering dashboard working) ─────
                DB::table('engineering_tasks')->insert([
                    'project_id'   => $validated['project_id'],
                    'assigned_to'  => $engId,
                    'instructions' => "ROLE: {$roleTitle}\n{$baseInstructions}",
                    'status'       => 'Pending',
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);

                // ── Normalized table (keeps ProjectController filter working)
                ProjectAssignment::firstOrCreate(
                    [
                        'project_id' => $validated['project_id'],
                        'user_id'    => $engId,
                        'role'       => $assignedRole,
                    ],
                    [
                        'assigned_by' => $assignedBy,
                        'assigned_at' => now(),
                    ]
                );
            }
        });

        return response()->json(['message' => 'Team successfully assigned!']);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────
    private function resolveEngineers(): array
    {
        $columns = ['department', 'dept'];
        foreach ($columns as $col) {
            if (Schema::hasColumn('users', $col)) {
                $query = User::where($col, 'LIKE', '%Engineering%');
                return [
                    $query->count(),
                    $query->select('id', 'name')->orderBy('name')->get(),
                ];
            }
        }
        return [0, collect()];
    }

    private function computeProgress(Project $project): float
    {
        $status = strtolower(trim($project->status));

        if (in_array($status, ['completed', 'archived'])) {
            return 100.0;
        }

        $statusMap = [
            'floor plan'                               => 5,
            'measurement based on plan'                => 10,
            'actual measurement'                       => 15,
            'pending head review'                      => 20,
            'purchase order'                           => 25,
            'p.o & work order'                         => 30,
            'pending work order verification'          => 35,
            'initial site inspection'                  => 40,
            'checking of delivery of materials'        => 45,
            'pending dr verification'                  => 50,
            'bidding of project'                       => 55,
            'awarding of project'                      => 60,
            'contract signing for installer'           => 65,
            'deployment and orientation of installers' => 70,
            'site inspection & project monitoring'     => 75,
            'request materials needed'                 => 75,
            'request billing'                          => 85,
            'site inspection & quality checking'       => 90,
            'pending qa verification'                  => 92,
            'final site inspection with the client'    => 95,
            'signing of coc'                           => 98,
            'request final billing'                    => 99,
        ];

        $baseProgress = $statusMap[$status] ?? 0;

        if ($status === 'site inspection & project monitoring') {
            // Try normalized table first, fall back to project column
            $mat = $project->materials;
            $timelineRaw = $mat?->timeline_tracking ?? $project->timeline_tracking ?? null;

            if (!empty($timelineRaw)) {
                $timeline = is_string($timelineRaw)
                    ? json_decode($timelineRaw, true)
                    : $timelineRaw;

                if (is_array($timeline) && count($timeline) > 0) {
                    $sum = 0; $count = 0;
                    foreach ($timeline as $t) {
                        if (($t['type'] ?? 'task') === 'group') continue;
                        $sum += (float) ($t['percent'] ?? 0);
                        $count++;
                    }
                    if ($count > 0) {
                        $baseProgress = 70 + (($sum / $count) * 0.15);
                    }
                }
            }
        }

        return (float) $baseProgress;
    }

    public function getEngineers() {
    $engineers = \App\Models\EngineeringDept::with('user')->get()
        ->map(fn($row) => [
            'id'       => $row->user_id,
            'name'     => $row->user->name ?? '',
            'position' => $row->position   ?? '',
        ])->filter(fn($e) => $e['name'])->values();
    return response()->json(['engineers' => $engineers]);
    }
}