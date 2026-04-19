<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::table('app_notifications', function (Blueprint $table) {
        $table->unsignedBigInteger('target_user_id')->nullable()->after('target_role');
        $table->foreign('target_user_id')->references('id')->on('users')->onDelete('cascade');
    });
}

public function down(): void
{
    Schema::table('app_notifications', function (Blueprint $table) {
        $table->dropForeign(['target_user_id']);
        $table->dropColumn('target_user_id');
    });
}
};
