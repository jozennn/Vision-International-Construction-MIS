<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_site_inspections
 *
 * Replaces: site_inspection_photo, site_inspection_report (JSON) on projects table.
 * Phase   : "Initial Site Inspection"
 *
 * This is the normalized version of the SiteInspection model we already built.
 * The old separate site_inspections table can be merged here or kept as-is.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_site_inspections', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->unique()
                  ->constrained('projects')
                  ->onDelete('cascade');

            // Inspector (references users table)
            $table->foreignId('inspector_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->string('inspector_name');
            $table->string('position')->nullable();

            // Form header fields
            $table->string('site_location')->nullable();
            $table->date('inspection_date')->nullable();
            $table->string('inspection_time', 10)->nullable();
            $table->text('materials_scope')->nullable();
            $table->text('notes_remarks')->nullable();

            // Dynamic checklist rows as JSON
            // Each row: { id, label, yes, no, na, recommendation }
            $table->json('checklist');

            // Before-photo upload
            $table->string('inspection_photo')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_site_inspections');
    }
};
