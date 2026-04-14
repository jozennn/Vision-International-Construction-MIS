<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_request_items', function (Blueprint $table) {
            if (!Schema::hasColumn('material_request_items', 'unit_cost')) {
                $table->decimal('unit_cost', 15, 2)->nullable()->after('requested_qty');
            }
            if (!Schema::hasColumn('material_request_items', 'total_cost')) {
                $table->decimal('total_cost', 15, 2)->nullable()->after('unit_cost');
            }
        });
    }

    public function down(): void
    {
        Schema::table('material_request_items', function (Blueprint $table) {
            $table->dropColumn(['unit_cost', 'total_cost']);
        });
    }
};