<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('database_backups', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->enum('type', ['manual', 'scheduled'])->default('manual');
            $table->enum('status', ['success', 'failed', 'running', 'pending'])->default('pending');
            $table->unsignedBigInteger('size')->nullable();   // file size in bytes
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('backup_schedule_id')->nullable()->constrained('backup_schedules')->nullOnDelete();
            $table->timestamps();
        });
    }
 
    public function down(): void
    {
        Schema::dropIfExists('database_backups');
    }
};
