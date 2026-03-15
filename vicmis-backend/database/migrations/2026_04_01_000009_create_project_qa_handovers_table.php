<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_qa_handovers
 *
 * Replaces: qa_photo, client_walkthrough_doc, coc_document on projects table.
 * Phases  : "Site Inspection & Quality Checking" → "Pending QA Verification"
 *           → "Final Site Inspection with the Client" → "Signing of COC"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_qa_handovers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->unique()
                  ->constrained('projects')
                  ->onDelete('cascade');

            // ── Internal QA ───────────────────────────────────────────────
            $table->string('qa_photo')->nullable();
            $table->foreignId('qa_submitted_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('qa_submitted_at')->nullable();

            // ── QA Verification (Engineering Head) ────────────────────────
            $table->foreignId('qa_verified_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->enum('qa_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('qa_verified_at')->nullable();

            // ── Client Walkthrough ────────────────────────────────────────
            $table->string('client_walkthrough_doc')->nullable();
            $table->timestamp('walkthrough_completed_at')->nullable();

            // ── Certificate of Completion ─────────────────────────────────
            $table->string('coc_document')->nullable();
            $table->foreignId('coc_uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('coc_signed_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_qa_handovers');
    }
};
