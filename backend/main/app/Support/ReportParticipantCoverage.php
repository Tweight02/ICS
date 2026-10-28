<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ReportParticipantCoverage
{
    public static function headcountParticularIds(): array
    {
        return DB::table('particulars')
            ->get(['particular_id', 'particular_name'])
            ->filter(fn ($particular) => EventParticularType::isHeadcount((string) $particular->particular_name))
            ->pluck('particular_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public static function contributions(): Builder
    {
        $headcountParticularIds = self::headcountParticularIds();
        $recorded = DB::table('event_participant_contributions')
            ->whereIn('particular_id', $headcountParticularIds)
            ->select('event_id', 'participant_id', 'quarter_id', 'particular_id');

        $confirmedWithoutContribution = DB::table('participants')
            ->join('events', 'events.event_id', '=', 'participants.event_id')
            ->join('event_particular', 'event_particular.event_id', '=', 'events.event_id')
            ->whereIn('event_particular.particular_id', $headcountParticularIds)
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

    /**
     * Completed purposes are counted once per event and reporting church, not once per participant.
     *
     * @return array<string, int>
     */
    public static function completedEventCounts(int $churchId, int $departmentId): array
    {
        $church = DB::table('churches')->where('church_id', $churchId)->first(['parent_id']);
        if (! $church) {
            return [];
        }

        $now = now('Asia/Manila');
        $query = DB::table('events')
            ->join('event_particular', 'event_particular.event_id', '=', 'events.event_id')
            ->join('particulars', 'particulars.particular_id', '=', 'event_particular.particular_id')
            ->join('quarters as event_quarters', 'event_quarters.quarter_id', '=', 'events.quarter_id')
            ->join('quarters as report_quarters', function ($join) {
                $join->on('report_quarters.program_id', '=', 'event_quarters.program_id')
                    ->on('report_quarters.year', '=', 'event_quarters.year')
                    ->on('report_quarters.quarter', '=', 'event_quarters.quarter');
            })
            ->join('programs as report_programs', 'report_programs.program_id', '=', 'report_quarters.program_id')
            ->where('report_quarters.church_id', $churchId)
            ->where('report_programs.department_id', $departmentId)
            ->where(function ($scope) use ($churchId, $church) {
                $scope->where('events.church_id', $churchId);
                if ($church->parent_id !== null) {
                    $scope->orWhere('events.church_id', $church->parent_id)
                        ->orWhereExists(function ($districts) use ($church) {
                            $districts->selectRaw('1')
                                ->from('event_district')
                                ->whereColumn('event_district.event_id', 'events.event_id')
                                ->where('event_district.district_id', $church->parent_id);
                        });
                }
            })
            ->where(function ($completed) use ($now) {
                $completed->where('events.date_end', '<', $now->toDateString())
                    ->orWhere(function ($today) use ($now) {
                        $today->where('events.date_end', $now->toDateString())
                            ->where('events.time_end', '<=', $now->format('H:i:s'));
                    });
            })
            ->select([
                'events.event_id',
                'report_quarters.quarter_id',
                'event_particular.particular_id',
                'particulars.particular_name',
            ])
            ->distinct()
            ->get()
            ->filter(fn ($row) => EventParticularType::isEventPurpose((string) $row->particular_name));

        return $query
            ->groupBy(fn ($row) => $row->quarter_id.':'.$row->particular_id)
            ->map(fn (Collection $events) => $events->pluck('event_id')->unique()->count())
            ->all();
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
