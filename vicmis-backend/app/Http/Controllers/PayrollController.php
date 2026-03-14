<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payroll;
use Illuminate\Support\Facades\Validator;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
  public function finalize(Request $request)
{
    // Validate every field in the payrolls array
    $request->validate([
        'payrolls' => 'required|array',
        'payrolls.*.user_id' => 'required|exists:users,id',
        'payrolls.*.month' => 'required|integer',
        'payrolls.*.year' => 'required|integer',
        'payrolls.*.days_present' => 'required|integer',
        'payrolls.*.total_amount' => 'required|numeric',
    ]);

    try {
        foreach ($request->payrolls as $data) {
            \App\Models\Payroll::updateOrCreate(
                [
                    'user_id' => $data['user_id'],
                    'month'   => $data['month'],
                    'year'    => $data['year'],
                ],
                [
                    'days_present' => $data['days_present'],
                    'total_amount' => $data['total_amount'],
                    'status'       => 'pending',
                ]
            );
        }

        return response()->json(['message' => 'Payroll successfully sent to Accounting!']);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Database error occurred.',
            'error' => $e->getMessage()
        ], 500);
    }
}
    public function getPending()
    {
        $pending = Payroll::with('user')
            ->where('status', 'pending')
            ->get();

        return response()->json($pending);
    }

    public function approveAll()
    {
        Payroll::where('status', 'pending')->update(['status' => 'approved']);
        return response()->json(['message' => 'Funds released successfully']);
    }

    public function rejectAll(Request $request)
    {
        $request->validate([
            'note' => 'required|string|max:500'
        ]);

        Payroll::where('status', 'pending')->update([
            'status' => 'rejected',
            'rejection_note' => $request->note
        ]);

        return response()->json(['message' => 'Payroll rejected and sent back to HR.']);
    }
}