<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class QuarterlyReportDataSeeder extends Seeder
{
    public function run(): void
    {
        $year = (string) config('app.reporting_year', now()->year);

        if (! preg_match('/^\d{4}$/', $year)) {
            throw new RuntimeException('Invalid reporting year. Use a four-digit year.');
        }

        $today = now()->startOfDay();
        $reportingYear = (int) $year;

        if ($reportingYear > $today->year) {
            throw new RuntimeException('Sample reports cannot be generated for a future reporting year.');
        }

        $lastQuarter = $reportingYear === $today->year
            ? (int) ceil($today->month / 3)
            : 4;
        $programs = DB::table('programs')
            ->whereNull('parent_id')
            ->whereBetween('department_id', [13, 21])
            ->orderBy('program_id')
            ->get();
        $churches = DB::table('churches')
            ->whereNotNull('parent_id')
            ->orderBy('church_id')
            ->get();

        if ($programs->isEmpty() || $churches->isEmpty()) {
            throw new RuntimeException('Reporting programs or local churches are missing. Run ReportingSetupSeeder first.');
        }

        $programIds = $programs->pluck('program_id')->all();
        $churchIds = $churches->pluck('church_id')->all();
        $particularsByProgram = [];

        DB::table('programs as sections')
            ->join('particulars', 'particulars.program_id', '=', 'sections.program_id')
            ->whereIn('sections.parent_id', $programIds)
            ->orderBy('particulars.particular_id')
            ->select('sections.parent_id', 'particulars.particular_id', 'particulars.particular_name')
            ->get()
            ->each(function ($particular) use (&$particularsByProgram): void {
                $particularsByProgram[$particular->parent_id][] = $particular;
            });

        $missingPrograms = $programs
            ->filter(fn ($program) => empty($particularsByProgram[$program->program_id]))
            ->pluck('program_name')
            ->all();

        if ($missingPrograms !== []) {
            throw new RuntimeException(
                'Reporting programs are missing particulars: '.implode(', ', $missingPrograms)
            );
        }

        $quarters = DB::table('quarters')
            ->where('year', $year)
            ->whereIn('program_id', $programIds)
            ->whereIn('church_id', $churchIds)
            ->get()
            ->sortBy(fn ($quarter) => sprintf(
                '%010d|%010d|%d',
                (int) $quarter->church_id,
                (int) $quarter->program_id,
                $this->quarterNumber((string) $quarter->quarter) ?? 5
            ))
            ->values();

        if ($quarters->isEmpty()) {
            throw new RuntimeException("No reporting quarters found for {$year}. Run ReportingSetupSeeder first.");
        }

        $quarterIdsWithItems = DB::table('particular_items')
            ->whereIn('quarter_id', $quarters->pluck('quarter_id'))
            ->distinct()
            ->pluck('quarter_id')
            ->flip();
        $seeded = 0;

        DB::transaction(function () use (
            $quarters,
            $quarterIdsWithItems,
            $particularsByProgram,
            $reportingYear,
            $lastQuarter,
            $today,
            &$seeded
        ): void {
            $q3WorkflowIndex = 0;

            foreach ($quarters as $quarter) {
                $quarterNumber = $this->quarterNumber((string) $quarter->quarter);

                if ($quarterNumber === null || $quarterNumber > $lastQuarter || $quarterNumber === 4) {
                    continue;
                }

                if ($quarterIdsWithItems->has($quarter->quarter_id) || $quarter->date_submitted !== null
                    || $quarter->district_endorse !== null || $quarter->mission_approve !== null) {
                    continue;
                }

                $particulars = $particularsByProgram[$quarter->program_id] ?? [];

                if ($particulars === []) {
                    continue;
                }

                $key = "{$quarter->church_id}|{$quarter->program_id}|{$reportingYear}|{$quarterNumber}";
                $q3IsEndorsed = $quarterNumber === 3 && $q3WorkflowIndex++ % 2 === 0;
                $quarterEnd = Carbon::create($reportingYear, $quarterNumber * 3, 1)->endOfMonth();
                $submitted = $quarterNumber <= 2 || $q3IsEndorsed;
                $endorsed = $quarterNumber <= 2 || $q3IsEndorsed;
                $approved = $quarterNumber <= 2;
                $dates = $this->statusDates($key, $quarterEnd, $today, $submitted, $endorsed, $approved);

                DB::table('quarters')
                    ->where('quarter_id', $quarter->quarter_id)
                    ->update($dates);

                $items = [];
                $moneyItems = [];
                $membership = $this->membershipForQuarter(
                    (int) $quarter->church_id,
                    $reportingYear,
                    $quarterNumber
                );

                foreach ($particulars as $particular) {
                    $name = (string) $particular->particular_name;
                    $value = $this->valueFor($name, $key, $membership);

                    if (in_array(strtolower($name), ['offering', 'tithes'], true)) {
                        $moneyItems[] = $particular;

                        continue;
                    }

                    $items[] = [
                        'particular_id' => $particular->particular_id,
                        'quarter_id' => $quarter->quarter_id,
                        'value' => $value,
                        'manual_value' => $value,
                    ];
                }

                if ($items === [] && $moneyItems === []) {
                    $particular = $particulars[0];
                    $name = (string) $particular->particular_name;

                    if (in_array(strtolower($name), ['offering', 'tithes'], true)) {
                        $moneyItems[] = $particular;
                    } else {
                        $value = $this->valueFor($name, $key, $membership);
                        $items[] = [
                            'particular_id' => $particular->particular_id,
                            'quarter_id' => $quarter->quarter_id,
                            'value' => $value,
                            'manual_value' => $value,
                        ];
                    }
                }

                foreach (array_chunk($items, 500) as $chunk) {
                    DB::table('particular_items')->insert($chunk);
                }

                foreach ($moneyItems as $particular) {
                    $this->seedStewardship(
                        (int) $particular->particular_id,
                        (int) $quarter->quarter_id,
                        (string) $particular->particular_name,
                        $key,
                        $quarterNumber,
                        $reportingYear,
                        $membership,
                        $today
                    );
                }

                $seeded++;
            }
        });

        $this->command?->info("Quarterly sample reports created: {$seeded} for {$year} through Q3.");
    }

    private function quarterNumber(string $quarter): ?int
    {
        return preg_match('/(?:Q|QUARTER\s*)?([1-4])/i', $quarter, $matches)
            ? (int) $matches[1]
            : null;
    }

    /**
     * @return array{date_submitted: string|null, district_endorse: string|null, mission_approve: string|null}
     */
    private function statusDates(
        string $key,
        Carbon $quarterEnd,
        Carbon $today,
        bool $submitted,
        bool $endorsed,
        bool $approved
    ): array {
        $submissionDate = $submitted
            ? $this->cappedDate($quarterEnd->copy()->addDays(3 + ($this->score("{$key}|submit-date") % 22)), $today)
            : null;
        $endorsementDate = $endorsed
            ? $this->cappedDate(
                Carbon::parse($submissionDate)->addDays(1 + ($this->score("{$key}|endorse-date") % 8)),
                $today
            )
            : null;
        $approvalDate = $approved
            ? $this->cappedDate(
                Carbon::parse($endorsementDate)->addDays(1 + ($this->score("{$key}|approve-date") % 12)),
                $today
            )
            : null;

        return [
            'date_submitted' => $submissionDate,
            'district_endorse' => $endorsementDate,
            'mission_approve' => $approvalDate,
        ];
    }

    private function cappedDate(Carbon $date, Carbon $today): string
    {
        return $date->gt($today) ? $today->toDateString() : $date->toDateString();
    }

    private function membershipForQuarter(int $churchId, int $year, int $quarter): array
    {
        $key = "{$churchId}|{$year}";
        $beginning = 60 + $this->number("{$key}|membership", 0, 240);

        for ($previousQuarter = 1; $previousQuarter < $quarter; $previousQuarter++) {
            $beginning += $this->number("{$key}|{$previousQuarter}|added", 0, 4);
            $beginning -= $this->number("{$key}|{$previousQuarter}|removed", 0, 2);
        }

        $added = $this->number("{$key}|{$quarter}|added", 0, 4);
        $removed = $this->number("{$key}|{$quarter}|removed", 0, 2);

        return [
            'beginning' => $beginning,
            'added' => $added,
            'removed' => $removed,
            'ending' => $beginning + $added - $removed,
        ];
    }

    private function valueFor(string $name, string $key, array $membership): int
    {
        $normalized = strtolower($name);
        $sample = $this->number("{$key}|{$name}", 0, 100);

        if (str_contains($normalized, 'membership at beginning')) {
            return $membership['beginning'];
        }

        if (str_contains($normalized, 'members added during')) {
            return $membership['added'];
        }

        if (str_contains($normalized, 'members subtracted during')) {
            return $membership['removed'];
        }

        if (str_contains($normalized, 'membership at end')) {
            return $membership['ending'];
        }

        if (str_contains($normalized, 'no. of church members')
            || str_contains($normalized, 'total church membership')) {
            return $membership['ending'];
        }

        if (str_contains($normalized, 'attendance')) {
            return (int) round($membership['ending'] * $this->number("{$key}|{$name}|attendance", 35, 70) / 100);
        }

        if (str_contains($normalized, 'offering') || str_contains($normalized, 'tithe')) {
            return $membership['ending'] * $this->number("{$key}|{$name}|contribution", 250, 1400);
        }

        if (str_contains($normalized, 'baptism') || str_contains($normalized, 'souls baptized')) {
            return $sample % 4;
        }

        if (str_contains($normalized, 'children')) {
            return (int) round($membership['ending'] * $this->number("{$key}|{$name}|children", 8, 25) / 100);
        }

        if (str_contains($normalized, 'youth')) {
            return (int) round($membership['ending'] * $this->number("{$key}|{$name}|youth", 10, 30) / 100);
        }

        if (str_contains($normalized, 'visit')) {
            return $this->number("{$key}|{$name}|visits", 0, 12);
        }

        if (str_contains($normalized, 'member')) {
            return (int) round($membership['ending'] * $this->number("{$key}|{$name}|participation", 20, 80) / 100);
        }

        if (str_contains($normalized, 'church') || str_contains($normalized, 'company')) {
            return $this->number("{$key}|{$name}|churches", 0, 1);
        }

        return $this->number("{$key}|{$name}|count", 0, 7);
    }

    private function seedStewardship(
        int $particularId,
        int $quarterId,
        string $type,
        string $key,
        int $quarter,
        int $year,
        array $membership,
        Carbon $today
    ): void {
        $quarterItemValue = 0;
        $months = [];
        $firstMonth = (($quarter - 1) * 3) + 1;

        for ($monthNumber = $firstMonth; $monthNumber < $firstMonth + 3; $monthNumber++) {
            $month = Carbon::create($year, $monthNumber, 1);

            if ($month->startOfMonth()->gt($today)) {
                continue;
            }

            $perMember = strtolower($type) === 'offering'
                ? $this->number("{$key}|{$type}|{$monthNumber}", 180, 440)
                : $this->number("{$key}|{$type}|{$monthNumber}", 650, 1400);
            $amount = $membership['ending'] * $perMember;
            $months[] = [
                'month' => $month->format('F'),
                'value' => $amount,
            ];
            $quarterItemValue += $amount;
        }

        if ($months === []) {
            return;
        }

        $itemId = DB::table('particular_items')->insertGetId([
            'particular_id' => $particularId,
            'quarter_id' => $quarterId,
            'value' => $quarterItemValue,
            'manual_value' => $quarterItemValue,
        ], 'item_id');

        foreach ($months as $month) {
            DB::table('stewardships')->insert([
                'item_id' => $itemId,
                'type' => $type,
                'month' => $month['month'],
                'value' => $month['value'],
            ]);
        }
    }

    private function score(string $key): int
    {
        return $this->number($key, 0, 99);
    }

    private function number(string $key, int $minimum, int $maximum): int
    {
        return $minimum + ((int) hexdec(substr(hash('sha256', $key), 0, 7)) % ($maximum - $minimum + 1));
    }
}
