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

    /*
    |--------------------------------------------------------------------------
    | resolvePermissions — single source of truth for module access
    |--------------------------------------------------------------------------
    | Called by:
    |   - GET /user          (session restore on page refresh)
    |   - AuthController     (verify2FA + refresh via userPayload helper)
    |
    | Access matrix:
    |   super_admin / admin / manager  →  all modules
    |   Sales                          →  Customer, Reports
    |   Engineering                    →  Project, Reports
    |   Inventory / Logistics          →  Inventory, Reports
    |   Accounting / Procurement       →  Project, Inventory, Reports
    |   dept_head (any dept)           →  dept modules + Project + Reports
    |--------------------------------------------------------------------------
    */
    public function resolvePermissions(): array
    {
        $role = $this->role ?? '';
        $dept = strtolower($this->department ?? '');

        if (in_array($role, ['super_admin', 'admin', 'manager'])) {
            return ['Project', 'Customer', 'Inventory', 'Reports', 'Setting'];
        }

        $permissions = [];

        // Sales → Customer + Reports
        if (str_contains($dept, 'sales')) {
            $permissions[] = 'Customer';
            $permissions[] = 'Reports';
            $permissions[] = 'Project'; // Sales also need Project access to view assigned projects
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

        // dept_head: dept modules already added above + Project + Reports
        if ($role === 'dept_head') {
            $permissions[] = 'Project';
            $permissions[] = 'Reports';
        }

        return array_values(array_unique($permissions));
    }

    /*
    |--------------------------------------------------------------------------
    | getDepartmentTable
    |--------------------------------------------------------------------------
    */
    public function getDepartmentTable(): ?string
    {
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

    /*
    |--------------------------------------------------------------------------
    | getJobDetails
    |--------------------------------------------------------------------------
    */
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