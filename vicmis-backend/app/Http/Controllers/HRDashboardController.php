<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\EmployeeRequest;
use App\Models\Attendance;
use App\Models\Announcement; // Added missing import
use App\Models\LeaveRequest;  // Added missing import
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class HRDashboardController extends Controller
{
    /**
     * Get consolidated dashboard statistics and the latest announcement.
     */
public function getStats()
{
    try {
        $now = \Carbon\Carbon::now();
        $currentMonth = $now->month;
        $currentYear = $now->year;
        $currentDay = $now->day;

        // 1. Total Employees (Exclude Admins)
        $totalEmployees = \App\Models\User::where('role', '!=', 'admin')->count() ?: 0;

        // 2. Pending Requests
        $pendingRequests = 0;
        if (\Illuminate\Support\Facades\Schema::hasTable('employee_requests')) {
            $pendingRequests = \App\Models\EmployeeRequest::where('status', 'pending')->count();
        }

        // 3. Attendance Rate (Fix: Use year/month/day columns)
        $rateValue = 0;
        if (\Illuminate\Support\Facades\Schema::hasTable('attendances')) {
            $presentToday = \App\Models\Attendance::where('year', $currentYear)
                ->where('month', $currentMonth)
                ->where('day', $currentDay)
                ->where('status', 'P')
                ->count();

            $rateValue = $totalEmployees > 0 
                ? round(($presentToday / $totalEmployees) * 100) 
                : 0;
        }

        // 4. Monthly Absences & Lates
        $absencesThisMonth = \App\Models\Attendance::where('month', $currentMonth)
            ->where('year', $currentYear)
            ->where('status', 'A')
            ->count();

        // 5. Birthdays Loop
        $deptTables = [
            'engineering_dept_table', 'sales_dept_table', 'hr_dept_table', 
            'management_dept_table', 'logistics_dept_table', 'marketing_dept_table', 
            'accounting_dept_table', 'it_dept_table'
        ];

        $birthdayList = collect();
        foreach ($deptTables as $table) {
            if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
                $results = \Illuminate\Support\Facades\DB::table($table)
                    ->join('users', "{$table}.user_id", '=', 'users.id')
                    ->whereMonth("{$table}.birthday", $currentMonth)
                    ->select('users.name', \Illuminate\Support\Facades\DB::raw("DATE_FORMAT({$table}.birthday, '%M %d') as date"))
                    ->get();
                $birthdayList = $birthdayList->concat($results);
            }
        }

        // 6. Announcement Safety Check
        // If the Announcement model doesn't exist, this is what triggers the 500 error.
        $announcementMessage = 'Next Payroll: ' . $now->endOfMonth()->format('M d, Y');
        if (class_exists('App\Models\Announcement')) {
            $latestAnn = \App\Models\Announcement::where('event_date', '>=', $now->toDateString())
                ->orderBy('event_date', 'asc')
                ->first();
            if ($latestAnn) $announcementMessage = $latestAnn->message;
        }

        return response()->json([
            'employees' => $totalEmployees,
            'pending' => $pendingRequests,
            'attendance_rate' => $rateValue . '%',
            'announcement' => $announcementMessage,
            'birthdays' => $birthdayList,
            'absences_this_month' => $absencesThisMonth,
            'lates_this_month' => 0 
        ]);

    } catch (\Exception $e) {
        // This will return the EXACT error message to your React console
        return response()->json([
            'error' => 'Dashboard calculation failed',
            'message' => $e->getMessage(),
            'line' => $e->getLine()
        ], 500);
    }
}
    /**
     * Save or update an announcement via the Global Broadcaster.
     */
    public function setAnnouncement(Request $request)
    {
        try {
            $data = $request->validate([
                'event_date' => 'required|date',
                'message'    => 'required|string',
                'type'       => 'nullable|string'
            ]);

            $announcement = Announcement::updateOrCreate(
                ['event_date' => $data['event_date']],
                [
                    'message' => $data['message'], 
                    'type'    => $data['type'] ?? 'holiday'
                ]
            );

            return response()->json($announcement);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Specifically get today's announcement.
     */
    // Inside HRDashboardController.php
public function getTodayAnnouncement() 
{
    try {
        // Use first() instead of get() to avoid returning an array
        $announcement = Announcement::latest()->first(); 

        if (!$announcement) {
            return response()->json(['message' => 'System Ready', 'type' => 'notice']);
        }

        return response()->json([
            'message' => $announcement->message,
            'type'    => $announcement->type,
            'date'    => $announcement->created_at->format('M d')
        ]);
    } catch (\Exception $e) {
        // This prevents the 500 error by returning the error as JSON instead of crashing
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

}