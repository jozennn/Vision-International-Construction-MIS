<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds material_request_id to the existing logistics table.
     * NULL  = delivery was created manually by logistics
     * Filled = delivery was created by dispatching a material request
     */
    public function up(): void
    {
        Schema::table('logistics', function (Blueprint $table) {
            $table->unsignedBigInteger('material_request_id')
                  ->nullable()
                  ->after('id');

            $table->foreign('material_request_id')
                  ->references('id')
                  ->on('material_requests')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('logistics', function (Blueprint $table) {
            $table->dropForeign(['material_request_id']);
            $table->dropColumn('material_request_id');
        });
    }
};