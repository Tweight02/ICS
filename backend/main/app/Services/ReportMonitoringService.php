<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ReportMonitoringService
{
    /**
     * @param list<int> $churchIds
     * @return array<int, array{q1: int|null, q2: int|null, q3: int|null, q4: int|null}>
     */
    public function forChurches(array $churchIds): array
    {
        $stats = $this->departmentQuarterStats($churchIds);
        $monitoring = [];

        foreach ($stats as $churchId => $departments) {
            $monitoring[$churchId] = [];

            foreach (range(1, 4) as $quarterNumber) {
                $approved = 0;
                $reported = 0;

                foreach ($departments as $quarters) {
                    $quarter = $quarters[$quarterNumber] ?? null;

                    if ($quarter === null) {
                        continue;
                    }

                    $reported++;
                    $approved += $quarter['approved'] === $quarter['total'] ? 1 : 0;
                }

                $monitoring[$churchId]['q' . $quarterNumber] = $reported === 0
                    ? null
                    : (int) round(($approved / $reported) * 100);
            }
        }

        return $monitoring;
    }

    /**
     * @return array<int, array{q1_approved: bool, q2_approved: bool, q3_approved: bool, q4_approved: bool}>
     */
    public function departmentApprovals(int $churchId): array
    {
        $stats = $this->departmentQuarterStats([$churchId])[$churchId] ?? [];
        $approvals = [];

        foreach ($stats as $departmentId => $quarters) {
            $approvals[$departmentId] = [];

            foreach (range(1, 4) as $quarterNumber) {
                $quarter = $quarters[$quarterNumber] ?? null;
                $approvals[$departmentId]['q' . $quarterNumber . '_approved'] =
                    $quarter !== null && $quarter['approved'] === $quarter['total'];
            }
        }

        return $approvals;
    }

    /**
     * @param list<int> $churchIds
     * @return array<int, array<int, array<int, array{total: int, approved: int}>>>
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

        $rows = DB::table('quarters')
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
            ->selectRaw(
                'SUM(CASE WHEN quarters.mission_approve IS NOT NULL THEN 1 ELSE 0 END) AS approved_count'
            )
            ->groupBy(
                'quarters.church_id',
                'programs.department_id',
                'quarters.year',
                'quarters.quarter'
            )
            ->get();

        $latestYears = [];

        foreach ($rows as $row) {
            $churchId = (int) $row->church_id;
            $departmentId = (int) $row->department_id;
            $year = (float) $row->year;
            $currentYear = $latestYears[$churchId][$departmentId] ?? null;

            if ($currentYear === null || $year > $currentYear) {
                $latestYears[$churchId][$departmentId] = $year;
            }
        }

        $stats = [];

        foreach ($rows as $row) {
            $churchId = (int) $row->church_id;
            $departmentId = (int) $row->department_id;

            if ((float) $row->year !== $latestYears[$churchId][$departmentId]) {
                continue;
            }

            $quarterNumber = $this->quarterNumber((string) $row->quarter);

            if ($quarterNumber === null) {
                continue;
            }

            $quarter = &$stats[$churchId][$departmentId][$quarterNumber];
            $quarter ??= ['total' => 0, 'approved' => 0];
            $quarter['total'] += (int) $row->report_count;
            $quarter['approved'] += (int) $row->approved_count;
            unset($quarter);
        }

        return $stats;
    }

    private function quarterNumber(string $quarter): ?int
    {
        if (!preg_match('/(?:Q|QUARTER\s*)?([1-4])/i', $quarter, $matches)) {
            return null;
        }

        return (int) $matches[1];
    }
}
