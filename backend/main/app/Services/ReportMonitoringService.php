<?php

namespace App\Services;

use App\Support\ReportParticipantCoverage;
use Illuminate\Support\Facades\DB;

class ReportMonitoringService
{
    private const BAPTISM_RECORD_DEPARTMENT_ID = 22;

    private const DEATH_RECORD_DEPARTMENT_ID = 23;

    /**
     * @return array{
     *     year: string,
     *     total_submitted_reports: int,
     *     total_report_value: int,
     *     quarter_totals: array{q1: int, q2: int, q3: int, q4: int},
     *     departments: list<array{
     *         department_id: int,
     *         department_name: string,
     *         submitted_reports: int,
     *         total_report_value: int,
     *         quarter_totals: array{q1: int, q2: int, q3: int, q4: int},
     *         reports: list<array{
     *             program_id: int,
     *             report_name: string,
     *             submitted_reports: int,
     *             total_report_value: int,
     *                 quarter_totals: array{q1: int, q2: int, q3: int, q4: int},
     *                 particulars?: list<array{
     *                     particular_id: int,
     *                     particular_name: string,
     *                     submitted_reports: int,
     *                     total_report_value: int,
     *                     quarter_totals: array{q1: int, q2: int, q3: int, q4: int}
     *                 }>
     *             }>
     *     }>
     * }
     */
    public function missionSummary(
        string $year,
        ?int $departmentId = null,
        bool $includeParticulars = false
    ): array
    {
        $rows = DB::table('programs')
            ->join('departments', 'departments.department_id', '=', 'programs.department_id')
            ->leftJoin('quarters', function ($join) use ($year) {
                $join->on('quarters.program_id', '=', 'programs.program_id')
                    ->where('quarters.year', '=', $year);
            })
            ->leftJoin('particular_items', 'particular_items.quarter_id', '=', 'quarters.quarter_id')
            ->whereNull('programs.parent_id')
            ->when(
                $departmentId !== null,
                fn ($query) => $query->where('departments.department_id', $departmentId)
            )
            ->select(
                'departments.department_id',
                'departments.department_name',
                'programs.program_id',
                'programs.program_name'
            )
            ->selectRaw(
                'COUNT(DISTINCT CASE WHEN quarters.date_submitted IS NOT NULL THEN quarters.quarter_id END) AS submitted_report_count'
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL THEN particular_items.value ELSE 0 END), 0) AS total_report_value'
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q1' THEN particular_items.value ELSE 0 END), 0) AS q1_report_value"
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q2' THEN particular_items.value ELSE 0 END), 0) AS q2_report_value"
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q3' THEN particular_items.value ELSE 0 END), 0) AS q3_report_value"
            )
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q4' THEN particular_items.value ELSE 0 END), 0) AS q4_report_value"
            )
            ->groupBy(
                'departments.department_id',
                'departments.department_name',
                'programs.program_id',
                'programs.program_name'
            )
            ->orderBy('departments.department_name')
            ->orderBy('programs.program_name')
            ->get();

        $personalRecordQuarterTotals = [];
        if ($departmentId === null || $departmentId === self::BAPTISM_RECORD_DEPARTMENT_ID) {
            $personalRecordQuarterTotals[self::BAPTISM_RECORD_DEPARTMENT_ID] =
                $this->personalRecordQuarterTotals('baptisms', 'date_of_baptism', $year);
        }
        if ($departmentId === null || $departmentId === self::DEATH_RECORD_DEPARTMENT_ID) {
            $personalRecordQuarterTotals[self::DEATH_RECORD_DEPARTMENT_ID] =
                $this->personalRecordQuarterTotals('deaths', 'date_of_death', $year);
        }

        $particularsByProgram = [];
        if ($includeParticulars && $departmentId !== null) {
            $particularRows = DB::table('programs')
                ->join('departments', 'departments.department_id', '=', 'programs.department_id')
                ->leftJoin('quarters', function ($join) use ($year) {
                    $join->on('quarters.program_id', '=', 'programs.program_id')
                        ->where('quarters.year', '=', $year);
                })
                ->leftJoin('programs as sections', 'sections.parent_id', '=', 'programs.program_id')
                ->leftJoin('particulars', 'particulars.program_id', '=', 'sections.program_id')
                ->leftJoin('particular_items', function ($join) {
                    $join->on('particular_items.quarter_id', '=', 'quarters.quarter_id')
                        ->on('particular_items.particular_id', '=', 'particulars.particular_id');
                })
                ->whereNull('programs.parent_id')
                ->where('departments.department_id', $departmentId)
                ->select(
                    'programs.program_id',
                    'particulars.particular_id',
                    'particulars.particular_name'
                )
                ->selectRaw(
                    'COUNT(DISTINCT CASE WHEN quarters.date_submitted IS NOT NULL THEN quarters.quarter_id END) AS submitted_report_count'
                )
                ->selectRaw(
                    'COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL THEN particular_items.value ELSE 0 END), 0) AS total_report_value'
                )
                ->selectRaw(
                    "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q1' THEN particular_items.value ELSE 0 END), 0) AS q1_report_value"
                )
                ->selectRaw(
                    "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q2' THEN particular_items.value ELSE 0 END), 0) AS q2_report_value"
                )
                ->selectRaw(
                    "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q3' THEN particular_items.value ELSE 0 END), 0) AS q3_report_value"
                )
                ->selectRaw(
                    "COALESCE(SUM(CASE WHEN quarters.date_submitted IS NOT NULL AND UPPER(TRIM(quarters.quarter)) = 'Q4' THEN particular_items.value ELSE 0 END), 0) AS q4_report_value"
                )
                ->groupBy(
                    'programs.program_id',
                    'particulars.particular_id',
                    'particulars.particular_name'
                )
                ->orderBy('programs.program_name')
                ->orderBy('particulars.particular_id')
                ->get();

            foreach ($particularRows as $row) {
                if ($row->particular_id === null) {
                    continue;
                }

                $particularsByProgram[(int) $row->program_id][] = [
                    'particular_id' => (int) $row->particular_id,
                    'particular_name' => (string) $row->particular_name,
                    'submitted_reports' => (int) $row->submitted_report_count,
                    'total_report_value' => (int) $row->total_report_value,
                    'quarter_totals' => [
                        'q1' => (int) $row->q1_report_value,
                        'q2' => (int) $row->q2_report_value,
                        'q3' => (int) $row->q3_report_value,
                        'q4' => (int) $row->q4_report_value,
                    ],
                ];
            }
        }

        $departments = [];
        $totalSubmittedReports = 0;
        $totalReportValue = 0;
        $totalQuarterValues = ['q1' => 0, 'q2' => 0, 'q3' => 0, 'q4' => 0];

        foreach ($rows as $row) {
            $departmentId = (int) $row->department_id;
            $submittedReports = (int) $row->submitted_report_count;
            $reportValue = (int) $row->total_report_value;
            $quarterTotals = [
                'q1' => (int) $row->q1_report_value,
                'q2' => (int) $row->q2_report_value,
                'q3' => (int) $row->q3_report_value,
                'q4' => (int) $row->q4_report_value,
            ];
            if (isset($personalRecordQuarterTotals[$departmentId])) {
                $quarterTotals = $personalRecordQuarterTotals[$departmentId];
                $reportValue = array_sum($quarterTotals);
            }

            $departments[$departmentId] ??= [
                'department_id' => $departmentId,
                'department_name' => (string) $row->department_name,
                'submitted_reports' => 0,
                'total_report_value' => 0,
                'quarter_totals' => ['q1' => 0, 'q2' => 0, 'q3' => 0, 'q4' => 0],
                'reports' => [],
            ];
            $departments[$departmentId]['submitted_reports'] += $submittedReports;
            $departments[$departmentId]['total_report_value'] += $reportValue;
            foreach ($quarterTotals as $quarter => $value) {
                $departments[$departmentId]['quarter_totals'][$quarter] += $value;
                $totalQuarterValues[$quarter] += $value;
            }
            $reportSummary = [
                'program_id' => (int) $row->program_id,
                'report_name' => (string) $row->program_name,
                'submitted_reports' => $submittedReports,
                'total_report_value' => $reportValue,
                'quarter_totals' => $quarterTotals,
            ];
            if ($includeParticulars) {
                $reportSummary['particulars'] = $particularsByProgram[(int) $row->program_id] ?? [];
                if (isset($personalRecordQuarterTotals[$departmentId])) {
                    foreach ($reportSummary['particulars'] as &$particular) {
                        $particular['total_report_value'] = $reportValue;
                        $particular['quarter_totals'] = $quarterTotals;
                    }
                    unset($particular);
                }
            }
            $departments[$departmentId]['reports'][] = $reportSummary;
            $totalSubmittedReports += $submittedReports;
            $totalReportValue += $reportValue;
        }

        return [
            'year' => $year,
            'total_submitted_reports' => $totalSubmittedReports,
            'total_report_value' => $totalReportValue,
            'quarter_totals' => $totalQuarterValues,
            'departments' => array_values($departments),
        ];
    }

    /**
     * @return array{q1: int, q2: int, q3: int, q4: int}
     */
    private function personalRecordQuarterTotals(
        string $table,
        string $dateColumn,
        string $year
    ): array {
        $counts = DB::table($table)
            ->whereYear($dateColumn, $year)
            ->selectRaw('UPPER(TRIM(quarter)) AS normalized_quarter, COUNT(*) AS record_count')
            ->groupByRaw('UPPER(TRIM(quarter))')
            ->pluck('record_count', 'normalized_quarter');

        return [
            'q1' => (int) ($counts['Q1'] ?? 0),
            'q2' => (int) ($counts['Q2'] ?? 0),
            'q3' => (int) ($counts['Q3'] ?? 0),
            'q4' => (int) ($counts['Q4'] ?? 0),
        ];
    }

    /**
     * @param  list<int>  $churchIds
     * @return array<int, array<string, int|bool|null>>
     */
    public function forChurches(
        array $churchIds,
        ?int $departmentId = null,
        ?string $year = null
    ): array {
        $stats = $this->departmentQuarterStats(
            $churchIds,
            $departmentId,
            $year ?? (string) config('app.reporting_year', now()->year)
        );
        $monitoring = [];

        foreach ($stats as $churchId => $departments) {
            $monitoring[$churchId] = [];

            foreach (range(1, 4) as $quarterNumber) {
                $approvedReports = 0;
                $endorsedReports = 0;
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
                    $endorsedReports += $quarter['endorsed'];
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
                $monitoring[$churchId]['q'.$quarterNumber.'_endorsed'] = $reported > 0
                    && $endorsedReports === $reported;
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
     * @param  list<int>  $churchIds
     * @return array<int, array<int, array<string, bool|int|null>>>
     */
    public function forChurchesByDepartment(
        array $churchIds,
        ?string $year = null
    ): array {
        $stats = $this->departmentQuarterStats(
            $churchIds,
            null,
            $year ?? (string) config('app.reporting_year', now()->year)
        );
        $monitoring = [];

        foreach ($stats as $churchId => $departments) {
            foreach ($departments as $departmentId => $quarters) {
                $monitoring[$churchId][$departmentId] = [];

                foreach (range(1, 4) as $quarterNumber) {
                    $quarter = $quarters[$quarterNumber] ?? null;
                    $reported = $quarter['total'] ?? 0;
                    $expected = $quarter['expected'] ?? 0;
                    $submittedExpected = $quarter['submitted_expected'] ?? 0;

                    $monitoring[$churchId][$departmentId]['q'.$quarterNumber] =
                        $reported === 0 || $expected === 0
                            ? null
                            : (int) round(($quarter['entered'] / $expected) * 100);
                    $monitoring[$churchId][$departmentId]['q'.$quarterNumber.'_approved'] =
                        $reported > 0 && $quarter['approved'] === $reported;
                    $monitoring[$churchId][$departmentId]['q'.$quarterNumber.'_endorsed'] =
                        $reported > 0 && $quarter['endorsed'] === $reported;
                    $monitoring[$churchId][$departmentId]['q'.$quarterNumber.'_submitted'] =
                        $reported > 0 && $quarter['submitted'] > 0;
                    $monitoring[$churchId][$departmentId]['q'.$quarterNumber.'_submitted_data_progress'] =
                        $submittedExpected === 0
                            ? null
                            : (int) round(($quarter['submitted_entered'] / $submittedExpected) * 100);
                }
            }
        }

        return $monitoring;
    }

    /**
     * @return array<int, array<string, bool|int|null>>
     */
    public function departmentApprovals(int $churchId, ?string $year = null): array
    {
        $stats = $this->departmentQuarterStats(
            [$churchId],
            null,
            $year ?? (string) config('app.reporting_year', now()->year)
        )[$churchId] ?? [];
        $approvals = [];

        foreach ($stats as $departmentId => $quarters) {
            $approvals[$departmentId] = [];

            foreach (range(1, 4) as $quarterNumber) {
                $quarter = $quarters[$quarterNumber] ?? null;
                $approvals[$departmentId]['q'.$quarterNumber.'_approved'] =
                    $quarter !== null && $quarter['approved'] === $quarter['total'];
                $approvals[$departmentId]['q'.$quarterNumber.'_submitted'] =
                    $quarter !== null && $quarter['submitted'] > 0;
                $approvals[$departmentId]['q'.$quarterNumber.'_endorsed'] =
                    $quarter !== null && $quarter['endorsed'] === $quarter['total'];
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
     * @return array<int, array<int, array<int, array{total: int, approved: int, endorsed: int, submitted: int, expected: int, entered: int, submitted_expected: int, submitted_entered: int}>>>
     */
    private function departmentQuarterStats(
        array $churchIds,
        ?int $departmentId,
        string $year
    ): array {
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
            ->where('quarters.year', $year)
            ->whereNull('programs.parent_id')
            ->when($departmentId !== null, fn ($query) => $query->where('programs.department_id', $departmentId))
            ->select(
                'quarters.church_id',
                'programs.department_id',
                'quarters.year',
                'quarters.quarter'
            )
            ->selectRaw('COUNT(*) AS report_count')
            ->selectRaw('SUM(CASE WHEN quarters.mission_approve IS NOT NULL THEN 1 ELSE 0 END) AS approved_count')
            ->selectRaw('SUM(CASE WHEN quarters.district_endorse IS NOT NULL THEN 1 ELSE 0 END) AS endorsed_count')
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
            ->where('quarters.year', $year)
            ->whereNull('programs.parent_id')
            ->when($departmentId !== null, fn ($query) => $query->where('programs.department_id', $departmentId))
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
                'endorsed' => 0,
                'submitted' => 0,
                'expected' => 0,
                'entered' => 0,
                'submitted_expected' => 0,
                'submitted_entered' => 0,
            ];
            $quarter['total'] += (int) $row->report_count;
            $quarter['approved'] += (int) $row->approved_count;
            $quarter['endorsed'] += (int) $row->endorsed_count;
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
