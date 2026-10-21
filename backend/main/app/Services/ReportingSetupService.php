<?php

namespace App\Services;

use App\Models\Church;
use App\Models\Program;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ReportingSetupService
{
    /**
     * @return array{
     *     particulars: int,
     *     particulars_restored: bool,
     *     quarters_created: int,
     *     quarters_existing: int
     * }
     */
    public function initialize(string $year): array
    {
        if (! preg_match('/^\d{4}$/', $year)) {
            throw new RuntimeException('Invalid year. Use a four-digit year, such as 2026.');
        }

        $particularsRestored = false;
        $particularCount = DB::table('particulars')->count();

        if ($particularCount === 0) {
            $sqlFile = base_path('restore_particulars.sql');

            if (! file_exists($sqlFile)) {
                throw new RuntimeException(
                    'restore_particulars.sql was not found in the backend directory.'
                );
            }

            $sql = file_get_contents($sqlFile);

            if ($sql === false || trim($sql) === '') {
                throw new RuntimeException('The particulars SQL backup is empty or unreadable.');
            }

            if (! preg_match('/INSERT\s+INTO\s+`?particulars`?/i', $sql)) {
                throw new RuntimeException(
                    'The SQL file does not contain an INSERT statement for particulars.'
                );
            }

            DB::unprepared($sql);
            $particularCount = DB::table('particulars')->count();
            $particularsRestored = true;
        }

        $created = 0;
        $existing = 0;

        DB::transaction(function () use ($year, &$created, &$existing): void {
            $churches = Church::query()->get();
            $programs = Program::query()
                ->whereNull('parent_id')
                ->whereBetween('department_id', [13, 21])
                ->get();

            if ($churches->isEmpty()) {
                throw new RuntimeException('No churches found. Check the churches table.');
            }

            if ($programs->isEmpty()) {
                throw new RuntimeException('No main reporting programs found.');
            }

            foreach ($churches as $church) {
                foreach ($programs as $program) {
                    foreach (['Q1', 'Q2', 'Q3', 'Q4'] as $quarter) {
                        $exists = DB::table('quarters')
                            ->where('church_id', $church->church_id)
                            ->where('program_id', $program->program_id)
                            ->where('quarter', $quarter)
                            ->where('year', $year)
                            ->exists();

                        if ($exists) {
                            $existing++;

                            continue;
                        }

                        DB::table('quarters')->insert([
                            'church_id' => $church->church_id,
                            'program_id' => $program->program_id,
                            'quarter' => $quarter,
                            'year' => $year,
                            'date_submitted' => null,
                            'district_endorse' => null,
                            'mission_approve' => null,
                        ]);

                        $created++;
                    }
                }
            }
        });

        return [
            'particulars' => $particularCount,
            'particulars_restored' => $particularsRestored,
            'quarters_created' => $created,
            'quarters_existing' => $existing,
        ];
    }
}
