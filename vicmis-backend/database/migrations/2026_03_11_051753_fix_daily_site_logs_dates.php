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
        Schema::table('daily_site_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('daily_site_logs', 'client_start_date')) {
                $table->date('client_start_date')->nullable()->after('log_date');
            }
            if (!Schema::hasColumn('daily_site_logs', 'client_end_date')) {
                $table->date('client_end_date')->nullable()->after('client_start_date');
            }
            if (!Schema::hasColumn('daily_site_logs', 'start_date')) {
                $table->date('start_date')->nullable()->after('client_end_date');
            }
            if (!Schema::hasColumn('daily_site_logs', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('daily_site_logs', function (Blueprint $table) {
            //
        });
    }
};
