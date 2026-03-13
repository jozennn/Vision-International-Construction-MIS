<?php

namespace App\Http\Controllers;

use App\Models\EmployeeRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class EmployeeRequestController extends Controller
{
    /**
     * Get all pending requests for HR review
     */
    public function getPending()
    {
        try {
            // with('user') allows us to see the name of the person making the request
            $requests = EmployeeRequest::with('user')
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($requests, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to load requests: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Approve or Reject a request
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected'
        ]);

        try {
            $empRequest = EmployeeRequest::findOrFail($id);
            $empRequest->status = $request->status;
            $empRequest->save();

            $daysSynced = 0; // Track how many days we actually mark

            if ($request->status === 'approved') {
                $type = strtolower($empRequest->type);
                
                // 1. Handle Overtime (Single Specific Date)
                if ($type === 'ot' || $type === 'overtime') {
                    $this->syncAttendance($empRequest->user_id, $empRequest->date, 'OT');
                    $daysSynced = 1;
                } 
                
                // 2. Handle Leave/Absent (Range of Dates)
                else {
                    $attendanceCode = ($type === 'absent') ? 'A' : 'L';
                    
                    $start = \Carbon\Carbon::parse($empRequest->start_date);
                    $end = \Carbon\Carbon::parse($empRequest->end_date);

                    // Loop through every day in the range
                    while ($start->lte($end)) {
                        // Only record if it's a weekday (Monday-Friday)
                        if (!$start->isWeekend()) {
                            $this->syncAttendance($empRequest->user_id, $start->format('Y-m-d'), $attendanceCode);
                            $daysSynced++;
                        }
                        $start->addDay();
                    }
                }
            }

            return response()->json([
                'message' => "Request approved. Sync complete: {$daysSynced} workdays marked as " . ($attendanceCode ?? 'OT') . ".",
                'data' => $empRequest,
                'synced_count' => $daysSynced
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Update failed: ' . $e->getMessage()], 500);
        }
    }
    /**
     * Helper to keep the updateOrCreate logic clean
     */
    private function syncAttendance($userId, $dateString, $code)
    {
        $dateObj = \Carbon\Carbon::parse($dateString);

        \App\Models\Attendance::updateOrCreate(
            [
                'user_id' => $userId,
                'year'    => $dateObj->year,
                'month'   => $dateObj->month,
                'day'     => $dateObj->day,
            ],
            [
                'date'    => $dateObj->format('Y-m-d'),
                'status'  => $code
            ]
        );
    }
    // App\Http\Controllers\EmployeeRequestController.php

    public function store(Request $request) 
    {
        // 1. Dynamic Validation
        $rules = [
            'type'   => 'required|string',
            'reason' => 'required|string',
        ];

        // Align validation with the keys sent from your React state
        if ($request->type === 'OT') {
            $rules['date'] = 'required|date';
            $rules['start_time'] = 'required';
            $rules['end_time']   = 'required';
        } else {
            $rules['start_date'] = 'required|date';
            $rules['end_date']   = 'required|date|after_or_equal:start_date';
        }

        $validated = $request->validate($rules);

        try {
            $hours = null;

            // 2. Auto-calculate hours if it's an Overtime request
            if ($validated['type'] === 'OT') {
                $start = \Carbon\Carbon::parse($validated['start_time']);
                $end = \Carbon\Carbon::parse($validated['end_time']);
                
                // Calculate difference in hours (e.g., 2.5)
                $hours = $start->diffInMinutes($end) / 60;
            }

            // 3. Create the record
            $newRequest = EmployeeRequest::create([
                'user_id'    => auth()->id(),
                'type'       => $validated['type'],
                'reason'     => $validated['reason'],
                'status'     => 'pending',
                
                // Use the validated data to ensure clean input
                'date'       => $validated['date'] ?? null,
                'start_date' => $validated['start_date'] ?? null,
                'end_date'   => $validated['end_date'] ?? null,
                'start_time' => $validated['start_time'] ?? null,
                'end_time'   => $validated['end_time'] ?? null,
                'hours'      => $hours, 
            ]);

            return response()->json($newRequest, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Submission failed: ' . $e->getMessage()], 500);
        }
    }
}