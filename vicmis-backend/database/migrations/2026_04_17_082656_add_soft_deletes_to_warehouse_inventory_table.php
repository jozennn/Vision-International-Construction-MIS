<?php
// database/migrations/2026_04_17_000001_add_soft_deletes_to_warehouse_inventory.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('warehouse_inventory', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::table('warehouse_inventory', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};