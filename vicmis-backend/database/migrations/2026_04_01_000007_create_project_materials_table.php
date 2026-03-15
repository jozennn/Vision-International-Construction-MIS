<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_materials
 *
 * Replaces: delivery_receipt_document, bidding_document on projects table.
 *           Also replaces materials_tracking JSON blob.
 * Phases  : "Checking of Delivery of Materials" → "Pending DR Verification"
 *           → "Bidding of Project" → "Awarding of Project"
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_materials', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->unique()
                  ->constrained('projects')
                  ->onDelete('cascade');

            // ── Delivery Receipt ──────────────────────────────────────────
            $table->string('delivery_receipt_document')->nullable();
            $table->foreignId('dr_uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('dr_uploaded_at')->nullable();

            // ── DR Verification (Engineering Head) ────────────────────────
            $table->foreignId('dr_verified_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->enum('dr_verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('dr_verified_at')->nullable();

            // ── Bidding ───────────────────────────────────────────────────
            $table->string('bidding_document')->nullable();
            $table->timestamp('bidding_submitted_at')->nullable();

            // ── Awarding ──────────────────────────────────────────────────
            $table->string('subcontractor_name')->nullable();
            $table->decimal('awarded_amount', 15, 2)->nullable();
            $table->timestamp('awarded_at')->nullable();

            // ── Tracked material items (replaces JSON blob) ───────────────
            // Each row: { product_code, description, qty_ordered, qty_received, status }
            $table->json('material_items')->nullable();
            $table->json('timeline_tracking')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_materials');
    }
};
