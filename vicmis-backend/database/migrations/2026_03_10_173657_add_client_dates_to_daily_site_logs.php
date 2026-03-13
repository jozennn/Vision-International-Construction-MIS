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
            // Do the same for the other 3 dates if they are in this file...
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
