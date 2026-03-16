<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_qa_handovers', function (Blueprint $table) {
            $table->boolean('qa_check_boq')->default(false)->after('qa_photo');
            $table->boolean('qa_check_debris')->default(false)->after('qa_check_boq');
            $table->boolean('qa_check_defect')->default(false)->after('qa_check_debris');
        });
    }

    public function down(): void
    {
        Schema::table('project_qa_handovers', function (Blueprint $table) {
            $table->dropColumn(['qa_check_boq', 'qa_check_debris', 'qa_check_defect']);
        });
    }
};
