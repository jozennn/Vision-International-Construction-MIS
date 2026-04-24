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
            // Check if contract_path exists before adding
            if (!Schema::hasColumn('projects', 'contract_path')) {
                $table->string('contract_path')->nullable();
            }
            
            // Check if contract_url exists before adding
            if (!Schema::hasColumn('projects', 'contract_url')) {
                $table->string('contract_url')->nullable();
            }

            // Check if contract_name exists before adding
            if (!Schema::hasColumn('projects', 'contract_name')) {
                $table->string('contract_name')->nullable();
            }
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