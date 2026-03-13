<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logistics', function (Blueprint $table) {
            $table->id();
            
            // Your Specific Columns
            $table->string('trucking_service')->nullable();
            $table->string('product_category')->nullable();
            $table->string('consumables'); // The material name
            $table->string('project_name');
            $table->string('driver_name');
            $table->string('destination');
            
            $table->date('date_of_delivery'); // Expected delivery
            $table->timestamp('date_delivered')->nullable(); // Actual arrival time
            $table->string('status')->default('In Transit');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logistics');
    }
};