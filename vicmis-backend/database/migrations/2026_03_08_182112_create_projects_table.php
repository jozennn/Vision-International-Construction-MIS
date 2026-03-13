<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            
            $table->string('project_name');
            $table->string('client_name');
            $table->string('location');
            $table->string('project_type')->nullable();
            $table->string('status')->default('Floor Plan');

            // Tracking roles
            $table->foreignId('sales_agent_id')->nullable()->constrained('users');
            $table->foreignId('engineer_id')->nullable()->constrained('users');
            $table->foreignId('ops_ass_id')->nullable()->constrained('users');

            // Workflow fields 
            $table->text('plan_measurement')->nullable();
            $table->longText('plan_boq')->nullable(); 
            $table->text('actual_measurement')->nullable();
            $table->longText('final_boq')->nullable(); 
            $table->json('completed_tasks')->nullable();
            $table->boolean('is_phase1_approved')->default(false);
            
            // 🚨 ALL DOCUMENT POCKETS (Original + New Upgrades) 🚨
            $table->string('floor_plan_image')->nullable();
            $table->string('po_document')->nullable();
            $table->string('work_order_document')->nullable();
            $table->string('site_inspection_photo')->nullable();
            $table->string('delivery_receipt_document')->nullable();
            $table->string('bidding_document')->nullable();
            $table->string('subcontractor_agreement_document')->nullable();
            $table->string('coc_document')->nullable();
            // Subcontractor Award Details
            $table->string('subcontractor_name')->nullable();
            $table->decimal('contract_amount', 15, 2)->nullable();
            
            $table->boolean('is_completed')->default(false);
            $table->timestamps(); 
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};