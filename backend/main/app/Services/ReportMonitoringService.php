<?php

namespace App\Services;

use App\Support\ReportParticipantCoverage;
use Illuminate\Support\Facades\DB;

class ReportMonitoringService
{
    /**
     * @param  list<int>  $churchIds
     * @return array<int, array<string, int|bool|null>>
     */
    public function forChurches(array $churchIds): array
    {
        $stats = $this->departmentQuarterStats($churchIds);
        $monitoring = [];

        foreach ($stats as $churchId => $departments) {
            $monitoring[$churchId] = [];

            foreach (range(1, 4) as $quarterNumber) {
                $approvedReports = 0;
                $submittedReports = 0;
                $reported = 0;
                $expectedItems = 0;
                $enteredItems = 0;
                $submittedExpectedItems = 0;
                $submittedEnteredItems = 0;

                foreach ($departments as $quarters) {
                    $quarter = $quarters[$quarterNumber] ?? null;

                    if ($quarter === null) {
                        continue;
                    }

                    $reported += $quarter['total'];
                    $approvedReports += $quarter['approved'];
                    $submittedReports += $quarter['submitted'];
                    $expectedItems += $quarter['expected'];
                    $enteredItems += $quarter['entered'];
                    $submittedExpectedItems += $quarter['submitted_expected'];
                    $submittedEnteredItems += $quarter['submitted_entered'];
                }

                $monitoring[$churchId]['q'.$quarterNumber] = $reported === 0 || $expectedItems === 0
                    ? null
                    : (int) round(($enteredItems / $expectedItems) * 100);
                $monitoring[$churchId]['q'.$quarterNumber.'_approved'] = $reported > 0
                    && $approvedReports === $reported;
                $monitoring[$churchId]['q'.$quarterNumber.'_submitted'] = $reported > 0
                    && $submittedReports > 0;
                $monitoring[$churchId]['q'.$quarterNumber.'_submitted_data_progress'] =
                    $submittedExpectedItems === 0
                        ? null
                        : (int) round(($submittedEnteredItems / $submittedExpectedItems) * 100);
            }
        }

        return $monitoring;
    }

    /**
     * @return array<int, array<string, bool|int|null>>
     */
    public function departmentApprovals(int $churchId): array
    {
        $stats = $this->departmentQuarterStats([$churchId])[$churchId] ?? [];
        $approvals = [];

        foreach ($stats as $departmentId => $quarters) {
            $approvals[$departmentId] = [];

            foreach (range(1, 4) as $quarterNumber) {
                $quarter = $quarters[$quarterNumber] ?? null;
                $approvals[$departmentId]['q'.$quarterNumber.'_approved'] =
                    $quarter !== null && $quarter['approved'] === $quarter['total'];
                $approvals[$departmentId]['q'.$quarterNumber.'_submitted'] =
                    $quarter !== null && $quarter['submitted'] > 0;
                $approvals[$departmentId]['q'.$quarterNumber.'_data_progress'] =
                    $quarter === null || $quarter['expected'] === 0
                        ? null
                        : (int) round(($quarter['entered'] / $quarter['expected']) * 100);
                $approvals[$departmentId]['q'.$quarterNumber.'_submitted_data_progress'] =
                    $quarter === null || $quarter['submitted_expected'] === 0
                        ? null
                        : (int) round(($quarter['submitted_entered'] / $quarter['submitted_expected']) * 100);
            }
        }

        return $approvals;
    }

    /**
     * @param  list<int>  $churchIds
     * @return array<int, array<int, array<int, array{total: int, approved: int, submitted: int, expected: int, entered: int, submitted_expected: int, submitted_entered: int}>>>
     */
    private function departmentQuarterStats(array $churchIds): array
    {
        $churchIds = array_values(array_unique(array_filter(
            array_map('intval', $churchIds),
            static fn (int $churchId): bool => $churchId > 0
        )));

        if ($churchIds === []) {
            return [];
        }

        $reportRows = DB::table('quarters')
            ->join('programs', 'quarters.program_id', '=', 'programs.program_id')
            ->whereIn('quarters.church_id', $churchIds)
            ->whereNull('programs.parent_id')
            ->select(
                'quarters.church_id',
                'programs.department_id',
                'quarters.year',
                'quarters.quarter'
            )
            ->selectRaw('COUNT(*) AS report_count')
            ->selectRaw('SUM(CASE WHEN quarters.mission_approve IS NOT NULL THEN 1 ELSE 0 END) AS approved_count')
            ->selectRaw('SUM(CASE WHEN quarters.date_submitted IS NOT NULL THEN 1 ELSE 0 END) AS submitted_count')
            ->groupBy(
                'quarters.church_id',
                'programs.department_id',
                'quarters.year',
                'quarters.quarter'
            )
            ->get();

        $participantCoverage = ReportParticipantCoverage::counts();

        $coverageRows = DB::table('quarters')
            ->join('programs', 'quarters.program_id', '=', 'programs.program_id')
            ->leftJoin('programs as sections', 'sections.parent_id', '=', 'programs.program_id')
            ->leftJoin('particulars', 'particulars.program_id', '=', 'sections.program_id')
            ->leftJoin('particular_items', function ($join) {
                $join->on('particular_items.quarter_id', '=', 'quarters.quarter_id')
                    ->on('particular_items.particular_id', '=', 'particulars.particular_id');
            })
            ->leftJoinSub($participantCoverage, 'participant_coverage', function ($join) {
                $join->on('participant_coverage.quarter_id', '=', 'quarters.quarter_id')
                    ->on('participant_coverage.particular_id', '=', 'particulars.particular_id');
            })
            ->whereIn('quarters.church_id', $churchIds)
            ->whereNull('programs.parent_id')
            ->select(
                'quarters.church_id',
                'programs.department_id',
                'quarters.year',
                'quarters.quarter'
            )
            ->selectRaw('COUNT(particulars.particular_id) AS expected_count')
            ->selectRaw('COUNT(CASE WHEN particular_items.value IS NOT NULL OR participant_coverage.participant_count IS NOT NULL THEN particular_items.particular_id END) AS entered_count')
            ->selectRaw('COUNT(CASE WHEN quarters.date_submitted IS NOT NULL THEN particulars.particular_id END) AS submitted_expected_count')
            ->selectRaw('COUNT(CASE WHEN quarters.date_submitted IS NOT NULL AND (particular_items.value IS NOT NULL OR participant_coverage.participant_count IS NOT NULL) THEN particular_items.particular_id END) AS submitted_entered_count')
            ->groupBy(
                'quarters.church_id',
                'programs.department_id',
                'quarters.year',
                'quarters.quarter'
            )
            ->get();

        $coverageByGroup = [];
        foreach ($coverageRows as $row) {
            $key = implode('|', [
                $row->church_id,
                $row->department_id,
                $row->year,
                $row->quarter,
            ]);
            $coverageByGroup[$key] = $row;
        }

        $latestYears = [];

        foreach ($reportRows as $row) {
            $churchId = (int) $row->church_id;
            $departmentId = (int) $row->department_id;
            $year = (float) $row->year;
            $currentYear = $latestYears[$churchId][$departmentId] ?? null;

            if ($currentYear === null || $year > $currentYear) {
                $latestYears[$churchId][$departmentId] = $year;
            }
        }

        $stats = [];

        foreach ($reportRows as $row) {
            $churchId = (int) $row->church_id;
            $departmentId = (int) $row->department_id;

            if ((float) $row->year !== $latestYears[$churchId][$departmentId]) {
                continue;
            }

            $quarterNumber = $this->quarterNumber((string) $row->quarter);

            if ($quarterNumber === null) {
                continue;
            }

            $key = implode('|', [
                $row->church_id,
                $row->department_id,
                $row->year,
                $row->quarter,
            ]);
            $coverage = $coverageByGroup[$key] ?? null;
            $quarter = &$stats[$churchId][$departmentId][$quarterNumber];
            $quarter ??= [
                'total' => 0,
                'approved' => 0,
                'submitted' => 0,
                'expected' => 0,
                'entered' => 0,
                'submitted_expected' => 0,
                'submitted_entered' => 0,
            ];
            $quarter['total'] += (int) $row->report_count;
            $quarter['approved'] += (int) $row->approved_count;
            $quarter['submitted'] += (int) $row->submitted_count;
            $quarter['expected'] += (int) ($coverage->expected_count ?? 0);
            $quarter['entered'] += (int) ($coverage->entered_count ?? 0);
            $quarter['submitted_expected'] += (int) ($coverage->submitted_expected_count ?? 0);
            $quarter['submitted_entered'] += (int) ($coverage->submitted_entered_count ?? 0);
            unset($quarter);
        }

        return $stats;
    }

    private function quarterNumber(string $quarter): ?int
    {
        if (! preg_match('/(?:Q|QUARTER\s*)?([1-4])/i', $quarter, $matches)) {
            return null;
        }

        return (int) $matches[1];
    }
}
