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
        Schema::table('projects', function (Blueprint $blueprint) {
            // Add a text column to store WHY a project was rejected.
            $blueprint->text('rejection_notes')->nullable()->after('coc_document');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $blueprint) {
            $blueprint->dropColumn('rejection_notes');
        });
    }
};