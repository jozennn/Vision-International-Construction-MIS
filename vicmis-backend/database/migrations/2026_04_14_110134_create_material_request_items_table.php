<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_request_items', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('material_request_id');

            // Sourced from the engineer's Final BOQ selection in PhaseCommandCenter
            $table->string('description');
            $table->string('product_code')->nullable(); // matched against warehouse_inventories.product_code
            $table->string('unit')->nullable();
            $table->decimal('requested_qty', 10, 2);

            $table->timestamps();

            $table->foreign('material_request_id')
                  ->references('id')
                  ->on('material_requests')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_request_items');
    }
};