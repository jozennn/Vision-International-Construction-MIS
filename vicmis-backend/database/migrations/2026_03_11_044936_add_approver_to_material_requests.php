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
        Schema::table('material_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('material_requests', 'approver_name')) {
                $table->string('approver_name')->nullable()->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('material_requests', function (Blueprint $table) {
            //
        });
    }
};
