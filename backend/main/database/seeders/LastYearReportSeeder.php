<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class LastYearReportSeeder extends Seeder
{
    public function run(): void
    {
        $year = now()->subYear()->year;
        $programs = DB::table('programs')
            ->whereNull('parent_id')
            ->whereBetween('department_id', [13, 21])
            ->orderBy('program_id')
            ->get(['program_id', 'program_name']);
        $churches = DB::table('churches')
            ->whereNotNull('parent_id')
            ->orderBy('church_id')
            ->get(['church_id']);

        if ($programs->isEmpty() || $churches->isEmpty()) {
            throw new RuntimeException('Reporting programs or local churches are missing. Run the reporting setup seeders first.');
        }

        $programIds = $programs->pluck('program_id')->all();
        $particularsByProgram = [];
        DB::table('programs as sections')
            ->join('particulars', 'particulars.program_id', '=', 'sections.program_id')
            ->whereIn('sections.parent_id', $programIds)
            ->orderBy('particulars.particular_id')
            ->select('sections.parent_id', 'particulars.particular_id', 'particulars.particular_name')
            ->get()
            ->each(function (object $particular) use (&$particularsByProgram): void {
                $particularsByProgram[$particular->parent_id][] = $particular;
            });

        $missingPrograms = $programs
            ->filter(fn (object $program) => empty($particularsByProgram[$program->program_id]))
            ->pluck('program_name')
            ->all();

        if ($missingPrograms !== []) {
            throw new RuntimeException('Reporting programs are missing particulars: '.implode(', ', $missingPrograms));
        }

        $seeded = 0;
        DB::transaction(function () use ($year, $programs, $churches, $particularsByProgram, &$seeded): void {
            foreach ($churches as $church) {
                foreach ($programs as $program) {
                    for ($quarterNumber = 1; $quarterNumber <= 4; $quarterNumber++) {
                        $quarterName = 'Q'.$quarterNumber;
                        $quarter = DB::table('quarters')
                            ->where('church_id', $church->church_id)
                            ->where('program_id', $program->program_id)
                            ->where('year', (string) $year)
                            ->where('quarter', $quarterName)
                            ->first();

                        if (! $quarter) {
                            $quarterId = DB::table('quarters')->insertGetId([
                                'church_id' => $church->church_id,
                                'program_id' => $program->program_id,
                                'year' => (string) $year,
                                'quarter' => $quarterName,
                                'date_submitted' => null,
                                'district_endorse' => null,
                                'mission_approve' => null,
                            ], 'quarter_id');
                        } else {
                            $quarterId = (int) $quarter->quarter_id;
                            $hasReportData = DB::table('particular_items')
                                ->where('quarter_id', $quarterId)
                                ->exists();

                            if (
                                $hasReportData
                                || $quarter->date_submitted !== null
                                || $quarter->district_endorse !== null
                                || $quarter->mission_approve !== null
                            ) {
                                continue;
                            }
                        }

                        $key = "{$church->church_id}|{$program->program_id}|{$year}|{$quarterNumber}";
                        $quarterEnd = Carbon::create($year, $quarterNumber * 3, 1)->endOfMonth();
                        $submitted = $quarterEnd->copy()->addDays(3 + $this->number("{$key}|submit-date", 0, 9));
                        $endorsed = $submitted->copy()->addDays(1 + $this->number("{$key}|endorse-date", 0, 4));
                        $approved = $endorsed->copy()->addDays(1 + $this->number("{$key}|approve-date", 0, 7));

                        DB::table('quarters')
                            ->where('quarter_id', $quarterId)
                            ->update([
                                'date_submitted' => $submitted->toDateString(),
                                'district_endorse' => $endorsed->toDateString(),
                                'mission_approve' => $approved->toDateString(),
                            ]);

                        $membership = $this->membershipForQuarter(
                            (int) $church->church_id,
                            $year,
                            $quarterNumber
                        );
                        $items = [];

                        foreach ($particularsByProgram[$program->program_id] as $particular) {
                            $name = (string) $particular->particular_name;
                            if ($this->isStewardshipItem($name)) {
                                $this->seedStewardship(
                                    (int) $particular->particular_id,
                                    $quarterId,
                                    $name,
                                    $key,
                                    $quarterNumber,
                                    $year,
                                    $membership,
                                    $items
                                );

                                continue;
                            }

                            $value = $this->valueFor($name, $key, $membership);
                            $items[] = [
                                'particular_id' => $particular->particular_id,
                                'quarter_id' => $quarterId,
                                'value' => $value,
                                'manual_value' => $value,
                            ];
                        }

                        if ($items !== []) {
                            DB::table('particular_items')->insert($items);
                        }

                        $seeded++;
                    }
                }
            }
        });

        $this->command?->info("Historical sample reports created: {$seeded} for {$year}.");
    }

    /**
     * @return array{beginning:int,added:int,removed:int,ending:int}
     */
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

    /**
     * @param array{beginning:int,added:int,removed:int,ending:int} $membership
     */
    private function valueFor(string $name, string $key, array $membership): int
    {
        $normalized = strtolower($name);

        if (str_contains($normalized, 'membership at beginning')) {
            return $membership['beginning'];
        }

        if (str_contains($normalized, 'members added during')) {
            return $membership['added'];
        }

        if (str_contains($normalized, 'members subtracted during')) {
            return $membership['removed'];
        }

        if (str_contains($normalized, 'membership at end')
            || str_contains($normalized, 'no. of church members')
            || str_contains($normalized, 'total church membership')) {
            return $membership['ending'];
        }

        if (str_contains($normalized, 'attendance')) {
            return (int) round($membership['ending'] * $this->number("{$key}|{$name}|attendance", 35, 70) / 100);
        }

        if (str_contains($normalized, 'baptism') || str_contains($normalized, 'souls baptized')) {
            return $this->number("{$key}|{$name}|baptisms", 0, 3);
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

    /**
     * @param array<int,array{particular_id:int,quarter_id:int,value:int,manual_value:int}> $items
     */
    private function seedStewardship(
        int $particularId,
        int $quarterId,
        string $type,
        string $key,
        int $quarter,
        int $year,
        array $membership,
        array &$items
    ): void {
        $firstMonth = (($quarter - 1) * 3) + 1;
        $total = 0;
        $months = [];

        for ($monthNumber = $firstMonth; $monthNumber < $firstMonth + 3; $monthNumber++) {
            $perMember = str_contains(strtolower($type), 'offering')
                ? $this->number("{$key}|{$type}|{$monthNumber}", 180, 440)
                : $this->number("{$key}|{$type}|{$monthNumber}", 650, 1400);
            $value = $membership['ending'] * $perMember;
            $months[] = [
                'month' => Carbon::create($year, $monthNumber, 1)->format('F'),
                'value' => $value,
            ];
            $total += $value;
        }

        $itemId = DB::table('particular_items')->insertGetId([
            'particular_id' => $particularId,
            'quarter_id' => $quarterId,
            'value' => $total,
            'manual_value' => $total,
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

    private function isStewardshipItem(string $name): bool
    {
        $normalized = strtolower($name);

        return str_contains($normalized, 'offering') || str_contains($normalized, 'tithe');
    }

    private function number(string $key, int $minimum, int $maximum): int
    {
        return $minimum + ((int) hexdec(substr(hash('sha256', $key), 0, 7)) % ($maximum - $minimum + 1));
    }
}
