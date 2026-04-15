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
        Schema::table('shipment_projects', function (Blueprint $table) {
            // Add product_code after product_category
            $table->string('product_code')->nullable()->after('product_category');
            // Add unit after product_code
            $table->string('unit')->nullable()->after('product_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipment_projects', function (Blueprint $table) {
            $table->dropColumn(['product_code', 'unit']);
        });
    }
};