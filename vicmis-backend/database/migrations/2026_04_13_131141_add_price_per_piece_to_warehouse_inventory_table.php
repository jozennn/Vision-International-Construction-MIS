<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_inventory', function (Blueprint $table) {
            $table->decimal('price_per_piece', 12, 2)->default(0)->after('unit');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_inventory', function (Blueprint $table) {
            $table->dropColumn('price_per_piece');
        });
    }
};