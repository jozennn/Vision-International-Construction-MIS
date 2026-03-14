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
    Schema::create('shipments', function (Blueprint $table) {
        $table->id();
        $table->string('origin_type');     // INTERNATIONAL or LOCAL
        $table->string('shipment_number')->unique();
        $table->string('container_type'); // 20 FOOTER or 40 FOOTER
        $table->date('tentative_arrival')->nullable();
        $table->string('status');          // Production status
        $table->string('location')->nullable();
        $table->string('shipment_status')->default('WAITING');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
