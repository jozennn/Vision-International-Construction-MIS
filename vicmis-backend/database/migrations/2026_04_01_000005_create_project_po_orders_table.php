<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_po_orders
 *
 * Replaces: po_document, work_order_document on projects table.
 * Phases  : "Purchase Order" → "P.O & Work Order" → "Pending Work Order Verification"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_po_orders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->unique()
                  ->constrained('projects')
                  ->onDelete('cascade');

            // ── Purchase Order ────────────────────────────────────────────
            $table->string('po_document')->nullable();
            $table->foreignId('po_uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('po_uploaded_at')->nullable();

            // ── Work Order ────────────────────────────────────────────────
            $table->string('work_order_document')->nullable();
            $table->foreignId('wo_uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('wo_uploaded_at')->nullable();

            // ── Sales Head verification ───────────────────────────────────
            $table->foreignId('verified_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_po_orders');
    }
};
