<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_boq_plans
 *
 * Replaces: plan_measurement, plan_boq on projects table.
 * Phase   : "Measurement Based on Plan"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_boq_plans', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->unique()                   // one plan BOQ per project
                  ->constrained('projects')
                  ->onDelete('cascade');

            $table->foreignId('submitted_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            // Measurement notes and sqm
            $table->text('plan_measurement')->nullable();
            $table->decimal('plan_sqm', 10, 2)->nullable();

            // Full BOQ rows stored as JSON array
            // Each row: { product_category, product_code, description, unit, qty, unitCost, total }
            $table->json('boq_rows');

            $table->decimal('grand_total', 15, 2)->default(0);

            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_boq_plans');
    }
};
