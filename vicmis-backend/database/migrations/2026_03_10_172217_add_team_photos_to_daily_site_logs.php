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
            $table->string('team_photo_1')->nullable()->after('installers_data');
            $table->string('team_photo_2')->nullable()->after('team_photo_1');
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
