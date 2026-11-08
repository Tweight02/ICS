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
        $particulars = DB::table('particulars')
            ->whereIn('particular_id', $headcountParticularIds)
            ->select(['particular_id', 'particular_name'])
            ->get();

        $recorded = DB::table('event_participant_contributions')
            ->join('participants', 'participants.participant_id', '=', 'event_participant_contributions.participant_id')
            ->join('events', 'events.event_id', '=', 'event_participant_contributions.event_id')
            ->join('quarters as event_quarters', 'event_quarters.quarter_id', '=', 'events.quarter_id')
            ->join('churches as event_churches', 'event_churches.church_id', '=', 'event_quarters.church_id')
            ->join('churches as participant_churches', 'participant_churches.church_id', '=', 'participants.church_id')
            ->join('particulars', 'particulars.particular_id', '=', 'event_participant_contributions.particular_id')
            ->join('programs as particular_sections', 'particular_sections.program_id', '=', 'particulars.program_id')
            ->join('programs as particular_programs', 'particular_programs.program_id', '=', 'particular_sections.parent_id')
            ->whereIn('event_participant_contributions.particular_id', $headcountParticularIds)
            ->select([
                'event_participant_contributions.quarter_id',
                'event_participant_contributions.event_id',
                'event_participant_contributions.participant_id',
            ])
            ->addSelect([
                'event_participant_contributions.particular_id',
            ]);
        self::whereParticipantAgeMatches($recorded, $particulars);

        $districtRecorded = DB::table('event_participant_contributions')
            ->join('participants', 'participants.participant_id', '=', 'event_participant_contributions.participant_id')
            ->join('events', 'events.event_id', '=', 'event_participant_contributions.event_id')
            ->join('quarters as event_quarters', 'event_quarters.quarter_id', '=', 'events.quarter_id')
            ->join('churches as event_churches', 'event_churches.church_id', '=', 'event_quarters.church_id')
            ->join('churches as participant_churches', 'participant_churches.church_id', '=', 'participants.church_id')
            ->join('particulars', 'particulars.particular_id', '=', 'event_participant_contributions.particular_id')
            ->join('programs as particular_sections', 'particular_sections.program_id', '=', 'particulars.program_id')
            ->join('programs as particular_programs', 'particular_programs.program_id', '=', 'particular_sections.parent_id')
            ->join('quarters as district_report_quarters', function ($join) {
                $join->on('district_report_quarters.year', '=', 'event_quarters.year')
                    ->on('district_report_quarters.quarter', '=', 'event_quarters.quarter')
                    ->on('district_report_quarters.program_id', '=', 'particular_programs.program_id')
                    ->whereRaw(
                        'district_report_quarters.church_id = CASE WHEN participant_churches.parent_id IS NULL THEN participant_churches.church_id ELSE participant_churches.parent_id END'
                    );
            })
            ->whereIn('event_participant_contributions.particular_id', $headcountParticularIds)
            ->where(function ($scope) {
                $scope->whereNull('event_churches.parent_id')
                    ->orWhereIn('particular_programs.department_id', [16, 20]);
            })
            ->whereColumn('district_report_quarters.quarter_id', '<>', 'event_participant_contributions.quarter_id')
            ->select([
                'district_report_quarters.quarter_id',
                'event_participant_contributions.event_id',
                'event_participant_contributions.participant_id',
                'event_participant_contributions.particular_id',
            ]);
        self::whereParticipantAgeMatches($districtRecorded, $particulars);

        $localPersonalReport = DB::table('event_participant_contributions')
            ->join('participants', 'participants.participant_id', '=', 'event_participant_contributions.participant_id')
            ->join('events', 'events.event_id', '=', 'event_participant_contributions.event_id')
            ->join('quarters as event_quarters', 'event_quarters.quarter_id', '=', 'events.quarter_id')
            ->join('churches as participant_churches', 'participant_churches.church_id', '=', 'participants.church_id')
            ->join('particulars', 'particulars.particular_id', '=', 'event_participant_contributions.particular_id')
            ->join('programs as particular_sections', 'particular_sections.program_id', '=', 'particulars.program_id')
            ->join('programs as particular_programs', 'particular_programs.program_id', '=', 'particular_sections.parent_id')
            ->join('quarters as participant_report_quarters', function ($join) {
                $join->on('participant_report_quarters.year', '=', 'event_quarters.year')
                    ->on('participant_report_quarters.quarter', '=', 'event_quarters.quarter')
                    ->on('participant_report_quarters.program_id', '=', 'particular_programs.program_id')
                    ->on('participant_report_quarters.church_id', '=', 'participants.church_id');
            })
            ->whereIn('event_participant_contributions.particular_id', $headcountParticularIds)
            ->whereIn('particular_programs.department_id', [16, 20])
            ->whereColumn('participant_report_quarters.quarter_id', '<>', 'event_participant_contributions.quarter_id')
            ->select([
                'participant_report_quarters.quarter_id',
                'event_participant_contributions.event_id',
                'event_participant_contributions.participant_id',
                'event_participant_contributions.particular_id',
            ]);
        self::whereParticipantAgeMatches($localPersonalReport, $particulars);

        $confirmedWithoutContribution = DB::table('participants')
            ->join('events', 'events.event_id', '=', 'participants.event_id')
            ->join('event_particular', 'event_particular.event_id', '=', 'events.event_id')
            ->join('particulars', 'particulars.particular_id', '=', 'event_particular.particular_id')
            ->join('programs as particular_sections', 'particular_sections.program_id', '=', 'particulars.program_id')
            ->join('programs as particular_programs', 'particular_programs.program_id', '=', 'particular_sections.parent_id')
            ->join('quarters as event_quarters', 'event_quarters.quarter_id', '=', 'events.quarter_id')
            ->join('churches as event_churches', 'event_churches.church_id', '=', 'event_quarters.church_id')
            ->join('churches as participant_churches', 'participant_churches.church_id', '=', 'participants.church_id')
            ->join('quarters as participant_quarters', function ($join) {
                $join->on('participant_quarters.year', '=', 'event_quarters.year')
                    ->on('participant_quarters.quarter', '=', 'event_quarters.quarter')
                    ->on('participant_quarters.program_id', '=', 'particular_programs.program_id')
                    ->on('participant_quarters.church_id', '=', 'participants.church_id');
            })
            ->leftJoin('quarters as district_report_quarters', function ($join) {
                $join->on('district_report_quarters.year', '=', 'event_quarters.year')
                    ->on('district_report_quarters.quarter', '=', 'event_quarters.quarter')
                    ->on('district_report_quarters.program_id', '=', 'particular_programs.program_id')
                    ->whereRaw(
                        'district_report_quarters.church_id = CASE WHEN participant_churches.parent_id IS NULL THEN participant_churches.church_id ELSE participant_churches.parent_id END'
                    );
            })
            ->leftJoin('event_participant_contributions as recorded', function ($join) {
                $join->on('recorded.event_id', '=', 'events.event_id')
                    ->on('recorded.participant_id', '=', 'participants.participant_id')
                    ->on('recorded.particular_id', '=', 'event_particular.particular_id');
            })
            ->whereIn('event_particular.particular_id', $headcountParticularIds)
            ->whereRaw('LOWER(participants.registration_status) = ?', ['confirmed'])
            ->whereNull('recorded.id')
            ->select([
                'events.event_id',
                'participants.participant_id',
                'participant_quarters.quarter_id',
                'event_particular.particular_id as particular_id',
            ]);
        self::whereParticipantAgeMatches($confirmedWithoutContribution, $particulars);

        $districtWithoutContribution = clone $confirmedWithoutContribution;
        $districtWithoutContribution
            ->where(function ($scope) {
                $scope->whereNull('event_churches.parent_id')
                    ->orWhereIn('particular_programs.department_id', [16, 20]);
            })
            ->whereNotNull('district_report_quarters.quarter_id')
            ->whereColumn('district_report_quarters.quarter_id', '<>', 'participant_quarters.quarter_id')
            ->select([
                'events.event_id',
                'participants.participant_id',
                'district_report_quarters.quarter_id',
                'event_particular.particular_id as particular_id',
            ]);

        return $recorded
            ->unionAll($districtRecorded)
            ->unionAll($localPersonalReport)
            ->unionAll($confirmedWithoutContribution)
            ->unionAll($districtWithoutContribution);
    }

    private static function whereParticipantAgeMatches(Builder $query, Collection $particulars): void
    {
        $query->where(function ($scope) use ($particulars) {
            foreach ($particulars as $particular) {
                $range = EventParticularType::ageRange((string) $particular->particular_name);

                $scope->orWhere(function ($particularScope) use ($particular, $range) {
                    $particularScope->where('particulars.particular_id', (int) $particular->particular_id);

                    if ($range !== null) {
                        $particularScope->where('participants.age', '>=', $range['min']);
                        $particularScope->where('participants.age', '<=', $range['max']);
                    }
                });
            }
        });
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
        return (int) DB::query()
            ->fromSub(self::contributions(), 'participant_coverage')
            ->where('participant_coverage.quarter_id', $quarterId)
            ->where('participant_coverage.particular_id', $particularId)
            ->count();
    }
}
