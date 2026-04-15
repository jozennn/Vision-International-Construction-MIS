<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Add shipment_purpose after origin_type
            if (!Schema::hasColumn('shipments', 'shipment_purpose')) {
                $table->string('shipment_purpose')->nullable()->after('origin_type');
            }
            // Add added_to_inventory flag
            if (!Schema::hasColumn('shipments', 'added_to_inventory')) {
                $table->boolean('added_to_inventory')->default(false)->after('shipment_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['shipment_purpose', 'added_to_inventory']);
        });
    }
};