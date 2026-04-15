<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_requests', function (Blueprint $table) {
            $table->id();

            // Project context
            $table->unsignedBigInteger('project_id');
            $table->string('project_name');
            $table->string('location')->nullable();
            $table->string('destination')->nullable(); // site address — pre-fills the delivery dispatch form

            // Who submitted the request
            $table->unsignedBigInteger('requested_by_id')->nullable();
            $table->string('requested_by_name');
            $table->string('engineer_name')->nullable();

            // Lifecycle:
            // pending    → just submitted by engineer, waiting for logistics review
            // reordering → logistics found no stock, reorder sent to procurement
            // dispatched → logistics confirmed stock and created delivery record(s)
            // rejected   → logistics rejected the request
            $table->enum('status', ['pending', 'reordering', 'dispatched', 'rejected'])
                  ->default('pending');

            $table->text('reject_reason')->nullable();
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_requests');
    }
};