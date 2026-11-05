<?php

use App\Support\EventParticularType;
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
            ->join('particulars', 'particulars.particular_id', '=', 'event_particular.particular_id')
            ->join('programs as particular_sections', 'particular_sections.program_id', '=', 'particulars.program_id')
            ->join('programs as particular_programs', 'particular_programs.program_id', '=', 'particular_sections.parent_id')
            ->join('quarters as event_quarters', 'event_quarters.quarter_id', '=', 'events.quarter_id')
            ->join('quarters as participant_quarters', function ($join) {
                $join->on('participant_quarters.program_id', '=', 'particular_programs.program_id')
                    ->on('participant_quarters.year', '=', 'event_quarters.year')
                    ->on('participant_quarters.quarter', '=', 'event_quarters.quarter')
                    ->on('participant_quarters.church_id', '=', 'participants.church_id');
            })
            ->whereRaw('LOWER(participants.registration_status) = ?', ['confirmed'])
            ->select([
                'events.event_id',
                'participants.participant_id',
                'participant_quarters.quarter_id',
                'event_particular.particular_id',
                'participants.age',
                'particulars.particular_name',
            ])
            ->selectRaw('CURRENT_TIMESTAMP AS contributed_at')
            ->orderBy('participants.participant_id')
            ->orderBy('event_particular.particular_id')
            ->chunk(500, function ($participants) {
                $rows = $participants
                    ->filter(fn ($participant) => EventParticularType::matchesParticipantAge(
                        (string) $participant->particular_name,
                        (int) $participant->age
                    ))
                    ->map(fn ($participant) => [
                        'event_id' => $participant->event_id,
                        'participant_id' => $participant->participant_id,
                        'quarter_id' => $participant->quarter_id,
                        'particular_id' => $participant->particular_id,
                        'contributed_at' => $participant->contributed_at,
                    ])
                    ->all();

                if ($rows !== []) {
                    DB::table('event_participant_contributions')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_participant_contributions');
    }
};
