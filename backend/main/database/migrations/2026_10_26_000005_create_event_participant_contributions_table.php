<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_participant_contributions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('event_id');
            $table->unsignedBigInteger('participant_id');
            $table->unsignedBigInteger('quarter_id');
            $table->unsignedBigInteger('particular_id');
            $table->timestamp('contributed_at')->useCurrent();
            $table->unique(
                ['event_id', 'participant_id', 'particular_id'],
                'event_participant_contributions_unique'
            );
            $table->index(
                ['quarter_id', 'particular_id'],
                'event_participant_contributions_report_index'
            );
        });

        DB::table('participants')
            ->join('events', 'events.event_id', '=', 'participants.event_id')
            ->join('event_particular', 'event_particular.event_id', '=', 'events.event_id')
            ->whereRaw('LOWER(participants.registration_status) = ?', ['confirmed'])
            ->select([
                'events.event_id',
                'participants.participant_id',
                'events.quarter_id',
                'event_particular.particular_id',
            ])
            ->selectRaw('CURRENT_TIMESTAMP AS contributed_at')
            ->orderBy('participants.participant_id')
            ->orderBy('event_particular.particular_id')
            ->chunk(500, function ($participants) {
                DB::table('event_participant_contributions')->insert(
                    $participants->map(fn ($participant) => (array) $participant)->all()
                );
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_participant_contributions');
    }
};
