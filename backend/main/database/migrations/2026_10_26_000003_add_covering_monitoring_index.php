<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('particular_items', function (Blueprint $table) {
            $table->index(
                ['quarter_id', 'particular_id', 'value'],
                'particular_items_monitoring_cover_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('particular_items', function (Blueprint $table) {
            $table->dropIndex('particular_items_monitoring_cover_idx');
        });
    }
};
