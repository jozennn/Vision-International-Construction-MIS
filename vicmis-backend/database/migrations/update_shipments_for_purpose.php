<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// php artisan make:migration update_shipments_and_projects_for_purpose
// Then paste this content and run: php artisan migrate

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
        $table->boolean('added_to_inventory')->default(false)->after('shipment_status');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('added_to_inventory');
        });
        Schema::table('shipment_projects', function (Blueprint $table) {
            $table->dropColumn(['product_code', 'unit']);
        });
    }
};
