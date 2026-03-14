<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::create('shipment_projects', function (Blueprint $table) {
        $table->id();
        // This links the project to the main shipment
        $table->foreignId('shipment_id')->constrained()->onDelete('cascade');
        $table->string('project_name');
        $table->string('product_category')->nullable();
        $table->integer('quantity')->default(0);
        $table->decimal('coverage_sqm', 12, 2)->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_projects');
    }
};
