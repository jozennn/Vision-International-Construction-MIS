<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    /**
     * FETCH ALL (Updated to include Birthday COALESCE)
     */
    public function index()
    {
        $employees = User::where('role', '!=', 'admin')
            ->leftJoin('engineering_dept_table', 'users.id', '=', 'engineering_dept_table.user_id')
            ->leftJoin('sales_dept_table', 'users.id', '=', 'sales_dept_table.user_id')
            ->leftJoin('hr_dept_table', 'users.id', '=', 'hr_dept_table.user_id')
            ->leftJoin('management_dept_table', 'users.id', '=', 'management_dept_table.user_id')
            ->leftJoin('logistics_dept_table', 'users.id', '=', 'logistics_dept_table.user_id')
            ->leftJoin('marketing_dept_table', 'users.id', '=', 'marketing_dept_table.user_id')
            ->leftJoin('accounting_dept_table', 'users.id', '=', 'accounting_dept_table.user_id')
            ->leftJoin('it_dept_table', 'users.id', '=', 'it_dept_table.user_id')
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'users.department',
                'users.status',
                'users.role',
                DB::raw('COALESCE(
                    engineering_dept_table.position, sales_dept_table.position, hr_dept_table.position,
                    management_dept_table.position, logistics_dept_table.position, marketing_dept_table.position,
                    accounting_dept_table.position, it_dept_table.position
                ) as position'),
                DB::raw('COALESCE(
                    engineering_dept_table.rate_per_day, sales_dept_table.rate_per_day, hr_dept_table.rate_per_day,
                    management_dept_table.rate_per_day, logistics_dept_table.rate_per_day, marketing_dept_table.rate_per_day,
                    accounting_dept_table.rate_per_day, it_dept_table.rate_per_day
                ) as rate_per_day'),
                // Added birthday COALESCE
                DB::raw('COALESCE(
                    engineering_dept_table.birthday, sales_dept_table.birthday, hr_dept_table.birthday,
                    management_dept_table.birthday, logistics_dept_table.birthday, marketing_dept_table.birthday,
                    accounting_dept_table.birthday, it_dept_table.birthday
                ) as birthday')
            )
            ->get();

        return response()->json($employees);
    }

    /**
     * REGISTER EMPLOYEE (Now defaults to Active and saves Birthday)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string',
            'email'        => 'required|email|unique:users,email',
            'position'     => 'required|string',
            'department'   => 'required|string',
            'rate_per_day' => 'required|numeric',
            'birthday'     => 'required|date', // Added birthday validation
        ]);

        return DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'       => $validated['name'],
                'email'      => $validated['email'],
                'password'   => Hash::make('Welcome123!'), 
                'role'       => 'employee',
                'department' => $validated['department'],
                'status'     => 'Active', // Automatically set to Active
            ]);

            $table = $this->getDeptTable($validated['department']);
            
            if ($table) {
                DB::table($table)->insert([
                    'user_id'      => $user->id,
                    'position'     => $validated['position'],
                    'rate_per_day' => $validated['rate_per_day'],
                    'birthday'     => $validated['birthday'], // Saved to dept table
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
            }

            return response()->json(['message' => 'Employee created successfully!', 'user' => $user], 201);
        });
    }

    /**
     * UPDATE EMPLOYEE (Handles Birthday and Dept Swapping)
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $oldDept = $user->department;

        $validated = $request->validate([
            'name'         => 'sometimes|string',
            'department'   => 'sometimes|string',
            'status'       => 'sometimes|string',
            'position'     => 'sometimes|string',
            'rate_per_day' => 'sometimes|numeric',
            'birthday'     => 'sometimes|date', // Added birthday
        ]);

        return DB::transaction(function () use ($user, $validated, $oldDept) {
            $user->update(array_intersect_key($validated, array_flip(['name', 'department', 'status'])));
            $newDept = $user->department;

            if ($oldDept !== $newDept) {
                $oldTable = $this->getDeptTable($oldDept);
                if ($oldTable) DB::table($oldTable)->where('user_id', $user->id)->delete();

                $newTable = $this->getDeptTable($newDept);
                if ($newTable) {
                    DB::table($newTable)->insert([
                        'user_id'      => $user->id,
                        'position'     => $validated['position'] ?? 'Staff',
                        'rate_per_day' => $validated['rate_per_day'] ?? 0,
                        'birthday'     => $validated['birthday'] ?? null,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]);
                }
            } else {
                $table = $this->getDeptTable($newDept);
                if ($table) {
                    DB::table($table)->where('user_id', $user->id)->update(
                        array_intersect_key($validated, array_flip(['position', 'rate_per_day', 'birthday']))
                    );
                }
            }

            return response()->json(['message' => 'Employee updated successfully']);
        });
    }

    private function getDeptTable($dept)
    {
        $map = [
            'Engineering'            => 'engineering_dept_table',
            'Sales'                  => 'sales_dept_table',
            'HR'                     => 'hr_dept_table',
            'Management'             => 'management_dept_table',
            'Logistics'              => 'logistics_dept_table',
            'Marketing'              => 'marketing_dept_table',
            'IT'                     => 'it_dept_table',
            'Accounting'             => 'accounting_dept_table',
            'Accounting/Procurement' => 'accounting_dept_table',
        ];
        return $map[$dept] ?? null;
    }
}