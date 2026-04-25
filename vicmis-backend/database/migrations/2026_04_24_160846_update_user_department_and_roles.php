<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // 1. Change department from ENUM to a standard String/VARCHAR
        DB::statement("ALTER TABLE users MODIFY COLUMN department VARCHAR(255) NOT NULL DEFAULT 'Unassigned'");

        // 2. Add 'department_employee' to the existing role ENUM
        // Make sure to include all your existing roles here plus the new one
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'super_admin', 
            'manager', 
            'dept_head', 
            'sales_employee', 
            'logistics_employee', 
            'engineering_employee', 
            'accounting_employee', 
            'department_employee',
            'admin'  -- 👈 add your old role value here
        ) NOT NULL DEFAULT 'department_employee'");
    }

    public function down()
    {
        // Optional: Revert logic if needed
    }
};