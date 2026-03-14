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
       Schema::create('incoming_shipments', function (Blueprint $table) {
        $table->id();
        $table->string('item_name');
        $table->string('supplier');
        $table->integer('quantity');
        $table->date('date_received');
        $table->string('status')->default('Pending'); 
        $table->string('category');// Pending, Received
        $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incoming_shipments');
    }
};
