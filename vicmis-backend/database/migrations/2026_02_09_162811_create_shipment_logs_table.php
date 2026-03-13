<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up() {
    Schema::create('shipment_logs', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        // Column order is determined by line order here
        $table->text('description')->nullable(); 
        $table->string('supplier');
        $table->integer('quantity');
        $table->decimal('unit_price', 10, 2);
        $table->string('unit')->default('pcs');
        $table->string('status')->default('On the Way');
        $table->timestamps();
    });
}

public function down() {
    // If you created the whole table in up(), drop the whole table here
    Schema::dropIfExists('shipment_logs');
}
};
