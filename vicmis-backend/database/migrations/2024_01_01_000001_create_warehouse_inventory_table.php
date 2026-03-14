<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_inventory', function (Blueprint $table) {
            $table->id();

            // Product category (the "Product" column in the spreadsheet)
            $table->string('product_category');

            // The specific code/variant under that category (e.g. 182062, F6015, COVE FORMER)
            $table->string('product_code');

            // Unit of measurement (Rolls, Pcs, Bags, Gals, etc.)
            $table->string('unit')->default('Rolls');

            // Stock tracking
            $table->integer('current_stock')->default(0);
            $table->integer('reserve')->default(0);

            // Availability status — computed but can be stored for quick filtering
            // 'ON STOCK' | 'LOW STOCK' | 'NO STOCK'
            $table->enum('availability', ['ON STOCK', 'LOW STOCK', 'NO STOCK'])->default('NO STOCK');

            // Whether this is a consumable or main product
            $table->boolean('is_consumable')->default(false);

            // Condition
            $table->enum('condition', ['Good', 'Damaged', 'Returned'])->default('Good');

            // Optional notes
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_inventory');
    }
};
