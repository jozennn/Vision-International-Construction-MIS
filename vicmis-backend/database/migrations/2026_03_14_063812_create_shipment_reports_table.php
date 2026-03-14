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
        Schema::create('shipment_reports', function (Blueprint $table) {
        $table->id();
        $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();
        $table->string('shipment_number');
        $table->json('items');          // [{product_category, product_code, issue, condition}]
        $table->unsignedBigInteger('filed_by')->nullable();
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_reports');
    }
};
