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
        Schema::create('delivery_materials', function (Blueprint $table) {
            $table->id();
            $table->string('item_name');
            $table->string('category')->nullable();
            $table->string('destination');
            $table->integer('quantity');
            $table->string('driver_name');
            $table->string('recipient'); // Corrected from 'recepient'
            $table->string('status')->default('In Transit');
            $table->string('departure_time')->nullable();
            $table->date('expected_delivery_date')->nullable(); // New column added
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_materials');
    }
};
