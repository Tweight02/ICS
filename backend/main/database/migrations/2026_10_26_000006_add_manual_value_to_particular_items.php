<?php

use App\Support\ReportParticipantCoverage;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('particular_items', function (Blueprint $table) {
            $table->integer('manual_value')->nullable()->after('value');
        });

        $participantCounts = ReportParticipantCoverage::counts()
            ->get()
            ->keyBy(fn ($count) => $count->quarter_id.':'.$count->particular_id);

        DB::table('particular_items')->orderBy('item_id')->chunkById(500, function ($items) use ($participantCounts) {
            foreach ($items as $item) {
                $participantCount = (int) (
                    $participantCounts[$item->quarter_id.':'.$item->particular_id]->participant_count ?? 0
                );
                DB::table('particular_items')
                    ->where('item_id', $item->item_id)
                    ->update([
                        'manual_value' => $item->value,
                        'value' => $item->value === null && $participantCount === 0
                            ? null
                            : ($item->value ?? 0) + $participantCount,
                    ]);
            }
        }, 'item_id');

        foreach ($participantCounts as $count) {
            $exists = DB::table('particular_items')
                ->where('quarter_id', $count->quarter_id)
                ->where('particular_id', $count->particular_id)
                ->exists();

            if (! $exists) {
                DB::table('particular_items')->insert([
                    'quarter_id' => $count->quarter_id,
                    'particular_id' => $count->particular_id,
                    'manual_value' => null,
                    'value' => $count->participant_count,
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('particular_items')
            ->whereNotNull('manual_value')
            ->update(['value' => DB::raw('manual_value')]);

        DB::table('particular_items')
            ->whereNull('manual_value')
            ->update(['value' => null]);

        Schema::table('particular_items', function (Blueprint $table) {
            $table->dropColumn('manual_value');
        });
    }
};
