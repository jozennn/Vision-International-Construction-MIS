<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth; // 🚨 Required to track which Engineer is picking the project
use Carbon\Carbon;

class EngineeringController extends Controller
{
    // ─── Dashboard Stats ───────────────────────────────────────────────────
    public function getDashboardStats()
    {
        try {
            $user = Auth::user(); // 🚨 Get the currently logged-in user

            // Count total projects, excluding "Lead"
            $totalProjects = Project::whereNotIn('status', ['Lead'])->count();

            // Resolve Engineers
            [$totalEngineers, $engineersList] = $this->resolveEngineers();

            // Grab ALL projects to parse through
            $allProjects = Project::all();

            $activeProjectsList    = [];
            $completedProjectsList = [];
            $pickupQueue           = []; // 🚨 NEW: Holds unassigned projects
            $totalPercent          = 0.0;
            $activeCount           = 0;

            // Initialize all 12 months with 0
            $monthlyCompletions = [
                'Jan' => 0, 'Feb' => 0, 'Mar' => 0, 'Apr' => 0, 'May' => 0, 'Jun' => 0,
                'Jul' => 0, 'Aug' => 0, 'Sep' => 0, 'Oct' => 0, 'Nov' => 0, 'Dec' => 0,
            ];
            
            $yearlyCompletions = [];

            foreach ($allProjects as $project) {
                // 🚨 BULLETPROOF: Lowercase & Trim removes all accidental spaces!
                $status = strtolower(trim($project->status));
                $isCompleted = in_array($status, ['completed', 'archived']);
                $isExcluded = in_array($status, ['lead']);

                // Calculate progress using our new smart engine
                $progress = $this->computeProgress($project);

                // 🚨 Check if ANY engineer is currently assigned to this project
                $assignedStaffCount = DB::table('engineering_tasks')
                    ->where('project_id', $project->id)
                    ->count();

                $projectData = [
                    'id'          => $project->id,
                    'name'        => $project->project_name,
                    'status'      => $project->status,
                    'client'      => $project->client_name ?? 'Unknown Client',
                    'progress'    => round($progress),
                    'is_assigned' => $assignedStaffCount > 0 // 🚨 Flag to track assignment status
                ];

                if ($isCompleted) {
                    $projectData['progress'] = 100;

                    // Safely grab the date
                    $date = $project->updated_at ? Carbon::parse($project->updated_at) : now();
                    $month = $date->format('M');
                    $year  = $date->format('Y');

                    $projectData['completion_month'] = $month;
                    $projectData['completion_year']  = $year;

                    $completedProjectsList[] = $projectData;

                    // Safely tally the chart data (Removed strict year checks!)
                    if (isset($monthlyCompletions[$month])) {
                        $monthlyCompletions[$month]++;
                    }
                    $yearlyCompletions[$year] = ($yearlyCompletions[$year] ?? 0) + 1;

                } elseif (!$isExcluded) {
                    
                    // 🚨 PICKUP QUEUE VS ACTIVE WORKSPACE LOGIC 🚨
                    if ($assignedStaffCount === 0) {
                        // Nobody is assigned yet -> send to the Pickup Queue
                        $pickupQueue[] = $projectData;
                    } else {
                        // Check if the CURRENT user is one of the assigned staff
                        $isMyProject = DB::table('engineering_tasks')
                            ->where('project_id', $project->id)
                            ->where('assigned_to', $user?->id)
                            ->exists();

                        // Dept Heads see all active tasks. Engineers ONLY see projects they are assigned to.
                        if ($isMyProject || ($user && $user->role === 'dept_head')) {
                            $activeProjectsList[] = $projectData;
                            $totalPercent += $progress;
                            $activeCount++;
                        }
                    }
                }
            }

            // Global Progress Math
            $avgProgress = $activeCount > 0 ? round($totalPercent / $activeCount) : 0;

            // Build Chart Arrays
            $chartDataMonthly = [];
            foreach ($monthlyCompletions as $month => $count) {
                $chartDataMonthly[] = ['name' => $month, 'Completed' => $count];
            }

            ksort($yearlyCompletions);
            $chartDataYearly = [];
            foreach ($yearlyCompletions as $year => $count) {
                $chartDataYearly[] = ['name' => (string)$year, 'Completed' => $count];
            }

            return response()->json([
                'total_projects'    => $totalProjects,
                'pending_tasks'     => count($activeProjectsList),
                'project_progress'  => $avgProgress . '%',
                'total_engineers'   => $totalEngineers,
                'engineers_list'    => $engineersList,
                'active_projects'   => $activeProjectsList,
                'completed_projects'=> $completedProjectsList,
                'pickup_queue'      => $pickupQueue, // 🚨 Send the queue to React
                'chart_data_monthly'=> $chartDataMonthly,
                'chart_data_yearly' => $chartDataYearly,
            ]);

        } catch (\Throwable $e) {
            Log::error('Engineering Dashboard Error', ['msg' => $e->getMessage()]);
            return response()->json([
                'LARAVEL_CRASHED' => true,
                'message'         => $e->getMessage(),
            ], 200); 
        }
    }

    // ─── Self-Pickup Logic (Engineers Claiming Projects) ───────────────────
    public function pickProject(Request $request)
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id'
        ]);

        $user = Auth::user();

        // Prevent race condition: Check if someone else picked it while their page was open
        $alreadyAssigned = DB::table('engineering_tasks')
            ->where('project_id', $request->project_id)
            ->exists();

        if ($alreadyAssigned) {
            return response()->json(['message' => 'Too late! Another engineer already claimed this project.'], 403);
        }

        DB::table('engineering_tasks')->insert([
            'project_id'   => $request->project_id,
            'assigned_to'  => $user->id,
            'instructions' => "SELF-PICKED: Engineer claimed this project independently.",
            'status'       => 'Pending',
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['message' => 'Project claimed! It is now in your active workspace.']);
    }

    // ─── Assign Task Logic (Head Engineer Dispatch) ────────────────────────
    public function assignTask(Request $request)
    {
        $validated = $request->validate([
            'project_id'    => 'required|exists:projects,id',
            'engineer_ids'  => 'required|array|min:1|max:10',
            'engineer_ids.*'=> 'required|exists:users,id|distinct',
            'instructions'  => 'required|string|max:5000',
        ]);

        $teamSize = count($validated['engineer_ids']);
        $baseInstructions = "TEAM SIZE: {$teamSize} Engineer(s) Dispatched\n\n" . $validated['instructions'];

        DB::transaction(function () use ($validated, $baseInstructions) {
            foreach ($validated['engineer_ids'] as $index => $engId) {
                $roleTitle = $index === 0 ? '👑 LEAD ENGINEER' : '🛠️ SUPPORT STAFF';
                DB::table('engineering_tasks')->insert([
                    'project_id'   => $validated['project_id'],
                    'assigned_to'  => $engId,
                    'instructions' => "ROLE: {$roleTitle}\n{$baseInstructions}",
                    'status'       => 'Pending',
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
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
                return [ $query->count(), $query->select('id', 'name')->orderBy('name')->get() ];
            }
        }
        return [0, collect()];
    }

    /**
     * Compute average percent completion based on workflow status.
     */
    private function computeProgress(Project $project): float
    {
        // Lowercase check to prevent string mismatch errors
        $status = strtolower(trim($project->status));

        if (in_array($status, ['completed', 'archived'])) {
            return 100.0;
        }

        // Map every single phase to an automatic percentage (LOWERCASE KEYS)
        $statusMap = [
            'floor plan' => 5,
            'measurement based on plan' => 10,
            'actual measurement' => 15,
            'pending head review' => 20,
            'purchase order' => 25,
            'p.o & work order' => 30,
            'pending work order verification' => 35,
            'initial site inspection' => 40,
            'checking of delivery of materials' => 45,
            'pending dr verification' => 50,
            'bidding of project' => 55,
            'awarding of project' => 60,
            'contract signing for installer' => 65,
            'deployment and orientation of installers' => 70,
            'site inspection & project monitoring' => 75,
            'request materials needed' => 75,
            'request billing' => 85,
            'site inspection & quality checking' => 90,
            'pending qa verification' => 92,
            'final site inspection with the client' => 95,
            'signing of coc' => 98,
            'request final billing' => 99,
        ];

        $baseProgress = $statusMap[$status] ?? 0;

        // Factor in Gantt Chart Progress if applicable
        if ($status === 'site inspection & project monitoring' && !empty($project->timeline_tracking)) {
            $timeline = is_string($project->timeline_tracking) ? json_decode($project->timeline_tracking, true) : $project->timeline_tracking;
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

        return (float) $baseProgress;
    }
}