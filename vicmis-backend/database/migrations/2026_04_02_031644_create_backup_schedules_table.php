<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
 
return new class extends Migration {
    public function up(): void
    {
        Schema::create('backup_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('cron');          // cron expression e.g. "0 2 * * *"
            $table->unsignedInteger('retention')->default(7); // days
            $table->boolean('enabled')->default(true);
            $table->timestamp('last_run')->nullable();
            $table->timestamp('next_run')->nullable();
            $table->timestamps();
        });
    }
 
    public function down(): void
    {
        Schema::dropIfExists('backup_schedules');
    }
};