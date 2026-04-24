<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'department',
        'status',
        'two_factor_code',
        'two_factor_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'     => 'datetime',
            'password'              => 'hashed',
            'two_factor_expires_at' => 'datetime',
            'two_factor_code'       => 'string',
        ];
    }

    public function resolvePermissions(): array
    {
        $role = $this->role ?? '';
        $dept = strtolower($this->department ?? '');

        if (in_array($role, ['super_admin', 'admin', 'manager'])) {
            return ['Project', 'Customer', 'Inventory', 'Reports', 'Setting'];
        }

        $permissions = [];

        // Sales → Customer + Reports + Project
        if (str_contains($dept, 'sales')) {
            $permissions[] = 'Customer';
            $permissions[] = 'Reports';
            $permissions[] = 'Project'; 
        }

        // Engineering → Project + Reports
        if (str_contains($dept, 'engineering')) {
            $permissions[] = 'Project';
            $permissions[] = 'Reports';
        }

        // Inventory / Logistics → Inventory + Reports
        if (str_contains($dept, 'inventory') || str_contains($dept, 'logistics')) {
            $permissions[] = 'Inventory';
            $permissions[] = 'Reports';
        }

        // Accounting / Procurement → Project + Inventory + Reports
        if (str_contains($dept, 'accounting') || str_contains($dept, 'procurement')) {
            $permissions[] = 'Project';
            $permissions[] = 'Inventory';
            $permissions[] = 'Reports';
        }

        // dept_head: gets dept modules already added above + Project + Reports
        if ($role === 'dept_head') {
            $permissions[] = 'Project';
            $permissions[] = 'Reports';
        }

        // ==========================================
        // NEW: Fallback for Custom Created Departments
        // ==========================================
        if (empty($permissions)) {
            // Give baseline access so custom departments aren't locked out of the UI
            $permissions[] = 'Reports';
            
            // If they are a standard employee in a custom department, grant basic Project view
            if ($role === 'department_employee') {
                $permissions[] = 'Project';
            }
        }

        return array_values(array_unique($permissions));
    }

    public function getDepartmentTable(): ?string
    {
        // Safe fallback: Custom departments will automatically return null
        // which prevents the app from crashing when looking for a table that doesn't exist yet.
        return match ($this->department) {
            'Engineering'            => 'engineering_dept_table',
            'Sales'                  => 'sales_dept_table',
            'HR'                     => 'hr_dept_table',
            'Management'             => 'management_dept_table',
            'Logistics'              => 'logistics_dept_table',
            'Marketing'              => 'marketing_dept_table',
            'IT'                     => 'it_dept_table',
            'Accounting/Procurement' => 'accounting_dept_table',
            default                  => null,
        };
    }

    public function getJobDetails()
    {
        $table = $this->getDepartmentTable();

        if (!$table) return null;

        return DB::table($table)->where('user_id', $this->id)->first();
    }

    public function employeeRequests()
    {
        return $this->hasMany(EmployeeRequest::class);
    }
}