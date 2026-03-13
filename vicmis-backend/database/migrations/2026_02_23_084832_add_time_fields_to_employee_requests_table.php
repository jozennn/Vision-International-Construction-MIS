<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
    {
        Schema::table('employee_requests', function (Blueprint $table) {
            // Adding time columns for OT logic
            $table->time('start_time')->nullable()->after('end_date');
            $table->time('end_time')->nullable()->after('start_time');
        });
    }

    public function down()
    {
        Schema::table('employee_requests', function (Blueprint $table) {
            $table->dropColumn(['start_time', 'end_time']);
        });
    }
};
