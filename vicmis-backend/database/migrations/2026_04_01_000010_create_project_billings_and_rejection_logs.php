<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_billings
 *
 * Replaces: final_invoice_document on projects table.
 * Phases  : "Request Billing" → "Request Final Billing"
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Billings ──────────────────────────────────────────────────────
        Schema::create('project_billings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->constrained('projects')
                  ->onDelete('cascade');

            // 'progress' = interim billing, 'final' = final billing
            $table->enum('billing_type', ['progress', 'final']);

            $table->string('invoice_document')->nullable();
            $table->decimal('amount', 15, 2)->nullable();

            $table->foreignId('submitted_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            $table->enum('status', ['pending', 'paid', 'disputed'])->default('pending');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();

            // A project can have at most one of each type
            $table->unique(['project_id', 'billing_type']);
        });

        // ── Rejection Logs ────────────────────────────────────────────────
        // Replaces: rejection_notes (single column) on projects table.
        // WHY: Projects can be rejected multiple times across phases.
        //      A single column overwrites history. This table keeps a full log.
        Schema::create('project_rejection_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->constrained('projects')
                  ->onDelete('cascade');

            // Which phase was rejected (e.g. 'Actual Measurement', 'P.O & Work Order')
            $table->string('rejected_phase');

            // The phase it was sent back to
            $table->string('returned_to_phase');

            $table->text('reason');

            $table->foreignId('rejected_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            $table->timestamp('rejected_at')->useCurrent();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_rejection_logs');
        Schema::dropIfExists('project_billings');
    }
};
