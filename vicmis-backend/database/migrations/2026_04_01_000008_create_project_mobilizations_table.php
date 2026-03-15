<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_mobilizations
 *
 * Tracks subcontractor contract signing and site deployment/orientation.
 * Phases: "Contract Signing for Installer" → "Deployment and Orientation of Installers"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_mobilizations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->unique()
                  ->constrained('projects')
                  ->onDelete('cascade');

            // ── Subcontractor contract ────────────────────────────────────
            $table->string('subcontractor_name')->nullable();
            $table->string('subcontractor_agreement_document')->nullable();
            $table->foreignId('contract_uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('contract_signed_at')->nullable();

            // ── Deployment / Orientation ──────────────────────────────────
            $table->string('mobilization_photo')->nullable();
            $table->text('deployment_notes')->nullable();
            $table->foreignId('deployed_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('deployed_at')->nullable();

            // ── Installer roster ─────────────────────────────────────────
            // Stored as JSON array of objects: [{ name, position }, ...]
            // Positions: Lead Installer | Installer | Helper | Supervisor
            $table->json('installer_roster')->nullable();

            // Derived count — kept in sync on save for easy querying
            $table->integer('installer_count')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_mobilizations');
    }
};