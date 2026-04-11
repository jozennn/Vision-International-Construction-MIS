<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reorder_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_inventory_id')->constrained('warehouse_inventory')->onDelete('cascade');
            $table->string('product_category');
            $table->string('product_code');
            $table->integer('current_stock');
            $table->string('unit');
            $table->string('availability'); // LOW STOCK or NO STOCK
            $table->enum('status', ['pending', 'acknowledged', 'ordered'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reorder_requests');
    }
};
