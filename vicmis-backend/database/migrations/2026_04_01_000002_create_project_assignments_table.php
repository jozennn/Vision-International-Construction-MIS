<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * project_assignments
 *
 * Replaces: sales_agent_id, engineer_id, ops_ass_id on projects table.
 *
 * WHY: A project can have multiple engineers assigned over its lifetime.
 *      A single FK column loses that history and limits to one person.
 *      This table supports N users per project, each with a role.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_assignments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                  ->constrained('projects')
                  ->onDelete('cascade');

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // Role of this person on the project
            // Possible values: 'sales', 'lead_engineer', 'support_engineer', 'ops', 'management'
            $table->string('role');

            // Who assigned this person and when
            $table->foreignId('assigned_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamp('assigned_at')->useCurrent();

            // Soft-removal: when they were removed from the project
            $table->timestamp('removed_at')->nullable();

            $table->timestamps();

            // Prevent duplicate active assignments (same user + same role on same project)
            $table->unique(['project_id', 'user_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_assignments');
    }
};
