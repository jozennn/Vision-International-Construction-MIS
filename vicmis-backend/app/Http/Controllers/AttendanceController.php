<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Attendance;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    public function saveSingle(Request $request)
{
    $validated = $request->validate([
        'user_id' => 'required',
        'year'    => 'required|integer',
        'month'   => 'required|integer',
        'day'     => 'required|integer',
        'status'  => 'nullable|string',
    ]);

    try {
        // Construct a standard YYYY-MM-DD string for your 'date' column
        $dateString = sprintf('%04d-%02d-%02d', $validated['year'], $validated['month'], $validated['day']);

        $attendance = Attendance::updateOrCreate(
            [
                'user_id' => $validated['user_id'],
                'year'    => $validated['year'],
                'month'   => $validated['month'],
                'day'     => $validated['day'],
            ],
            [
                'status' => $validated['status'],
                'date'   => $dateString // Providing the missing 'date' value
            ]
        );

        return response()->json(['message' => 'Saved', 'data' => $attendance]);
    } catch (\Exception $e) {
        // Return the actual error so we can stop guessing!
        return response()->json([
            'error' => 'Database error occurred.',
            'message' => $e->getMessage() 
        ], 500);
    }
}

public function getMonthData(Request $request)
{
    try {
        $year = $request->query('year');
        $month = $request->query('month');

        if (!$year || !$month) {
            return response()->json(['error' => 'Parameters missing'], 400);
        }

        // We use 'year' and 'month' columns directly 
        // and 'employee' relationship defined in the Model above
        $records = Attendance::where('year', $year)
                             ->where('month', $month)
                             ->with('employee') 
                             ->get();

        return response()->json($records);

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Server Error',
            'message' => $e->getMessage()
        ], 500);
    }
}

    public function load(Request $request)
    {
        $request->validate([
            'month' => 'required|integer',
            'year'  => 'required|integer',
        ]);

        $logs = Attendance::where('month', $request->month)
            ->where('year', $request->year)
            ->get();

        // Transform into key-value pairs for optimized frontend lookups
        $formattedLogs = $logs->reduce(function ($carry, $log) {
            $key = "{$log->user_id}-{$log->year}-{$log->month}-{$log->day}";
            $carry[$key] = $log->status;
            return $carry;
        }, []);

        return response()->json($formattedLogs);
    }
}