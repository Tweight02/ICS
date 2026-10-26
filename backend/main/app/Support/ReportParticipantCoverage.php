<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class ReportParticipantCoverage
{
    public static function contributions(): Builder
    {
        $recorded = DB::table('event_participant_contributions')
            ->select('event_id', 'participant_id', 'quarter_id', 'particular_id');

        $confirmedWithoutContribution = DB::table('participants')
            ->join('events', 'events.event_id', '=', 'participants.event_id')
            ->join('event_particular', 'event_particular.event_id', '=', 'events.event_id')
            ->leftJoin('event_participant_contributions as recorded', function ($join) {
                $join->on('recorded.event_id', '=', 'events.event_id')
                    ->on('recorded.participant_id', '=', 'participants.participant_id')
                    ->on('recorded.particular_id', '=', 'event_particular.particular_id');
            })
            ->whereNull('recorded.id')
            ->whereRaw('LOWER(participants.registration_status) = ?', ['confirmed'])
            ->select([
                'events.event_id as event_id',
                'participants.participant_id as participant_id',
                'events.quarter_id as quarter_id',
                'event_particular.particular_id as particular_id',
            ]);

        return $recorded->unionAll($confirmedWithoutContribution);
    }

    public static function counts(): Builder
    {
        return DB::query()
            ->fromSub(self::contributions(), 'participant_coverage')
            ->select('quarter_id', 'particular_id')
            ->selectRaw('COUNT(*) AS participant_count')
            ->groupBy('quarter_id', 'particular_id');
    }

    public static function countFor(int $quarterId, int $particularId): int
    {
        return (int) (self::counts()
            ->where('quarter_id', $quarterId)
            ->where('particular_id', $particularId)
            ->value('participant_count') ?? 0);
    }
}
