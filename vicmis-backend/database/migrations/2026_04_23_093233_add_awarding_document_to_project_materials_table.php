<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds awarding_document + awarding_submitted_at to project_materials.
     *
     * Existing layout (relevant columns):
     *   bidding_document | bidding_submitted_at | subcontractor_name | ...
     *
     * New layout:
     *   bidding_document | bidding_submitted_at | awarding_document | awarding_submitted_at | subcontractor_name | ...
     *
     * The subcontractor_agreement_document stays in project_mobilizations
     * (already handled by PhaseBiddingAwardingContract → saveBiddingAwardingContract).
     */
    public function up(): void
    {
        Schema::table('project_materials', function (Blueprint $table) {
            $table->string('awarding_document')->nullable()->after('bidding_submitted_at');
            $table->timestamp('awarding_submitted_at')->nullable()->after('awarding_document');
        });
    }

    public function down(): void
    {
        Schema::table('project_materials', function (Blueprint $table) {
            $table->dropColumn(['awarding_document', 'awarding_submitted_at']);
        });
    }
};