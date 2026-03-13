<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type'); 
            $table->text('reason');
            $table->string('status')->default('pending');
            $table->date('date')->nullable();
            $table->date('start_date')->nullable(); 
            $table->date('end_date')->nullable();   
            $table->decimal('hours', 5, 2)->nullable();
            $table->timestamps();
        });
    }
};
