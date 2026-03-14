<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Run: php artisan make:migration add_product_code_to_logistics_table
// Then paste this content.
//
// This adds the new columns needed by the redesigned DeliveryMat.
// If you haven't run the original logistics migration yet, just add these
// columns directly to the original create_logistics_table migration instead.

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('logistics', function (Blueprint $table) {
            // product_code = the specific code under the category (e.g. F6015, COVE FORMER)
            $table->string('product_code')->nullable()->after('product_category');

            // Whether this delivery item is a consumable or main product
            $table->boolean('is_consumable')->default(false)->after('product_code');

            // Quantity being delivered (for stock deduction)
            $table->integer('quantity')->default(1)->after('is_consumable');
        });
    }

    public function down(): void
    {
        Schema::table('logistics', function (Blueprint $table) {
            $table->dropColumn(['product_code', 'is_consumable', 'quantity']);
        });
    }
};
