<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_boq_actuals
 *
 * Replaces: actual_measurement, final_boq on projects table.
 * Phase   : "Actual Measurement" → "Pending Head Review"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_boq_actuals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->unique()
                  ->constrained('projects')
                  ->onDelete('cascade');

            $table->foreignId('submitted_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            $table->foreignId('reviewed_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            // Actual site measurement
            $table->text('actual_measurement')->nullable();
            $table->decimal('actual_sqm', 10, 2)->nullable();

            // Final BOQ rows (may differ from plan BOQ after site visit)
            $table->json('boq_rows');

            $table->decimal('grand_total', 15, 2)->default(0);

            // Head review outcome
            $table->enum('review_status', ['pending', 'approved', 'rejected'])->default('pending');

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_boq_actuals');
    }
};
