<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicateQuarters = DB::table('quarters')
            ->select('church_id', 'program_id', 'year', 'quarter')
            ->groupBy('church_id', 'program_id', 'year', 'quarter')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        $duplicateItems = DB::table('particular_items')
            ->select('quarter_id', 'particular_id')
            ->groupBy('quarter_id', 'particular_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($duplicateQuarters || $duplicateItems) {
            throw new RuntimeException(
                'Cannot optimize report monitoring while duplicate quarter or particular-item records exist.'
            );
        }

        Schema::table('quarters', function (Blueprint $table) {
            $table->unique(
                ['church_id', 'program_id', 'year', 'quarter'],
                'quarters_natural_key_unique'
            );
        });

        Schema::table('particular_items', function (Blueprint $table) {
            $table->unique(
                ['quarter_id', 'particular_id'],
                'particular_items_quarter_particular_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('particular_items', function (Blueprint $table) {
            $table->dropUnique('particular_items_quarter_particular_unique');
        });

        Schema::table('quarters', function (Blueprint $table) {
            $table->dropUnique('quarters_natural_key_unique');
        });
    }
};
