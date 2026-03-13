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
        Schema::create('leads', function (Blueprint $table) {
        $table->id(); // Primary Key (keep it simply 'id')
        
        // Lead Information
        $table->string('client_name');
        $table->string('project_name');
        $table->string('location');
        $table->string('contact_no');
        $table->string('email')->nullable();
        $table->text('address')->nullable();
        $table->text('notes')->nullable();
        
        // Status tracking
        $table->string('status')->default('To be Contacted');
        $table->string('approval_status')->default('Pending');

        /** * NORMALIZATION: 
         * sales_rep_id links to 'id' on 'users' table.
         * We use user_id because the Name and Email live in the users table.
         */
        $table->foreignId('sales_rep_id')
              ->constrained('users') 
              ->onDelete('cascade');

        $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
