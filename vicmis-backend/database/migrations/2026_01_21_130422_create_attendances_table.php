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
    Schema::create('attendances', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained('users');
        $table->integer('year');
        $table->integer('month');
        $table->integer('day');
        $table->date('date');
        $table->string('status', 10)->nullable(); // P, A, L, H, OT
        $table->timestamps();
        
        // Prevent duplicate entries for the same employee on the same day
        $table->unique(['user_id', 'year', 'month', 'day']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
