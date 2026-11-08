<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('host_church_id')
                ->nullable()
                ->constrained('churches', 'church_id')
                ->nullOnDelete();
            $table->longText('details')->change();
        });

        DB::table('events')->orderBy('event_id')->chunkById(100, function ($events): void {
            foreach ($events as $event) {
                $hostChurchId = DB::table('event_church')
                    ->where('event_id', $event->event_id)
                    ->whereIn('church_id', DB::table('churches')
                        ->select('church_id')
                        ->whereNotNull('parent_id'))
                    ->orderBy('church_id')
                    ->value('church_id');

                if (! $hostChurchId) {
                    $districtIds = DB::table('event_district')
                        ->where('event_id', $event->event_id)
                        ->orderBy('district_id')
                        ->pluck('district_id');

                    foreach ($districtIds as $districtId) {
                        $hostChurchId = DB::table('churches')
                            ->where('parent_id', $districtId)
                            ->orderBy('church_id')
                            ->value('church_id');
                        if ($hostChurchId) {
                            break;
                        }
                    }
                }

                if (! $hostChurchId) {
                    $church = DB::table('churches')
                        ->where('church_id', $event->church_id)
                        ->first(['church_id', 'parent_id']);
                    $hostChurchId = $church?->parent_id
                        ? $church->church_id
                        : DB::table('churches')
                            ->where('parent_id', $event->church_id)
                            ->orderBy('church_id')
                            ->value('church_id');
                }

                DB::table('events')
                    ->where('event_id', $event->event_id)
                    ->update(['host_church_id' => $hostChurchId]);
            }
        }, 'event_id');
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['host_church_id']);
            $table->dropColumn('host_church_id');
            $table->string('details')->change();
        });
    }
};
