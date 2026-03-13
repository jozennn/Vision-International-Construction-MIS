<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
    {
        Schema::table('daily_site_logs', function (Blueprint $table) {
            $table->string('lead_man')->nullable()->after('log_date');
            $table->string('total_area')->nullable()->after('lead_man');
            $table->json('installers_data')->nullable()->after('workers_count');
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
