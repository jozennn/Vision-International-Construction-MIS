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
        'two_factor_expires_at'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_expires_at' => 'datetime',
        ];
    }

    /**
     * Helper to get the correct department table name.
     * This makes it easy to query the split tables from anywhere.
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

    /**
     * Get the job-specific details (Position/Rate) from the dept table.
     */
    public function getJobDetails()
    {
        $table = $this->getDepartmentTable();
        
        if (!$table) return null;

        return DB::table($table)->where('user_id', $this->id)->first();
    }

    public function employeeRequests()
    {
    // This allows $user->employeeRequests to work
        return $this->hasMany(EmployeeRequest::class); 
    }
}