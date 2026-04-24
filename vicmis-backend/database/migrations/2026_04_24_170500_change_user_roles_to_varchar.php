<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Change role from ENUM to a standard String/VARCHAR so custom roles work
        DB::statement("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'department_employee'");
    }

    public function down()
    {
        // Optional revert logic
    }
};