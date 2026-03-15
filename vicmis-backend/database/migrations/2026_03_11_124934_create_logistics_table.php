<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logistics', function (Blueprint $table) {
            $table->id();

            $table->string('trucking_service')->nullable();
            $table->string('product_category')->nullable();
            $table->string('product_code')->nullable();     // ← was missing
            $table->boolean('is_consumable')->default(false); // ← was 'consumables' string, no default
            $table->string('project_name');
            $table->string('driver_name');
            $table->string('destination');
            $table->integer('quantity')->default(1);        // ← was missing

            $table->date('date_of_delivery');
            $table->timestamp('date_delivered')->nullable();
            $table->string('status')->default('In Transit');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logistics');
    }
};