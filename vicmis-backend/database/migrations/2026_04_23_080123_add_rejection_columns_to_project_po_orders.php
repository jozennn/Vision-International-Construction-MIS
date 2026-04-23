<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_po_orders', function (Blueprint $table) {
            $table->foreignId('rejected_by')
                  ->nullable()
                  ->after('verified_at')
                  ->constrained('users')
                  ->onDelete('set null');

            $table->timestamp('rejected_at')
                  ->nullable()
                  ->after('rejected_by');

            $table->text('rejection_notes')
                  ->nullable()
                  ->after('rejected_at');
        });
    }

    public function down(): void
    {
        Schema::table('project_po_orders', function (Blueprint $table) {
            $table->dropForeign(['rejected_by']);
            $table->dropColumn(['rejected_by', 'rejected_at', 'rejection_notes']);
        });
    }
};