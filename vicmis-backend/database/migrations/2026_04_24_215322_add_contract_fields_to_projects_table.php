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
        Schema::table('projects', function (Blueprint $table) {
            // Add your new columns here
            $table->string('contract_path')->nullable();
            $table->string('contract_url')->nullable();
            $table->string('contract_name')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Drop the columns if you ever need to rollback
            $table->dropColumn(['contract_path', 'contract_url', 'contract_name']);
        });
    }
};