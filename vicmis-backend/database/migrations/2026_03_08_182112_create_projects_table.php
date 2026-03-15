<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * projects — CORE IDENTITY ONLY
 *
 * Only stores what is true for the entire lifecycle of the project.
 * Every phase-specific column has been moved to its own table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();

            // ── Source lead ───────────────────────────────────────────────
            $table->foreignId('lead_id')
                  ->constrained('leads')
                  ->onDelete('cascade');

            // ── Core identity ─────────────────────────────────────────────
            $table->string('project_name');
            $table->string('client_name');
            $table->string('location');
            $table->string('project_type')->nullable();

            // ── Workflow state (the single source of truth for phase) ──────
            $table->string('status')->default('Floor Plan');
            $table->boolean('is_completed')->default(false);

            // ── Floor plan document (belongs to the project itself) ────────
            $table->string('floor_plan_image')->nullable();

            // ── Financial summary (resolved at awarding phase) ────────────
            $table->decimal('contract_amount', 15, 2)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};