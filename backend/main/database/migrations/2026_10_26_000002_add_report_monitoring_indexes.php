<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->index('parent_id', 'programs_parent_id_idx');
        });

        Schema::table('quarters', function (Blueprint $table) {
            $table->index(
                ['church_id', 'program_id', 'year', 'quarter'],
                'quarters_monitoring_idx'
            );
        });

        Schema::table('particular_items', function (Blueprint $table) {
            $table->index(
                ['quarter_id', 'particular_id'],
                'particular_items_monitoring_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('particular_items', function (Blueprint $table) {
            $table->dropIndex('particular_items_monitoring_idx');
        });

        Schema::table('quarters', function (Blueprint $table) {
            $table->dropIndex('quarters_monitoring_idx');
        });

        Schema::table('programs', function (Blueprint $table) {
            $table->dropIndex('programs_parent_id_idx');
        });
    }
};
