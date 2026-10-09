<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\Program;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class NelmSetup extends Command
{
    protected $signature = 'nelm:setup
                            {--year= : Reporting year, for example 2026}
                            {--quarters : Initialize missing quarterly report records only}';

    protected $description = 'Initialize the NELM reporting system safely';

    public function handle(): int
    {
        $this->info('========================================');
        $this->info(' NELM INTEGRATED COMMUNICATION SYSTEM');
        $this->info(' DATABASE SETUP');
        $this->info('========================================');

        try {
            // 1. Verify database connection.
            DB::connection()->getPdo();

            $database = DB::connection()->getDatabaseName();

            $this->info("[OK] Connected to database: {$database}");

            if ($database !== 'ICS') {
                $this->error(
                    'Setup stopped. Expected database ICS; no changes were made.'
                );

                return self::FAILURE;
            }

            // 2. Validate reporting year.
            $year = (string) ($this->option('year') ?: now()->year);

            if (!preg_match('/^\d{4}$/', $year)) {
                $this->error('Invalid year. Use a four-digit year, such as 2026.');

                return self::FAILURE;
            }

            // 3. Run pending migrations unless quarters-only mode is selected.
            if (!$this->option('quarters')) {
                $this->call('migrate', [
                    '--force' => true,
                ]);

                $this->info('[OK] Database migrations checked.');
            }

            // 4. Restore particulars only when the table is empty.
            $particularCount = DB::table('particulars')->count();

            if ($particularCount === 0) {
                $sqlFile = base_path('restore_particulars.sql');

                if (!file_exists($sqlFile)) {
                    $this->error(
                        'restore_particulars.sql was not found in the backend directory.'
                    );

                    return self::FAILURE;
                }

                $this->warn('No particulars found. Restoring from SQL backup...');

                $sql = file_get_contents($sqlFile);

                if ($sql === false || trim($sql) === '') {
                    $this->error('The particulars SQL backup is empty or unreadable.');

                    return self::FAILURE;
                }

                /*
                 * This file should contain the INSERT statement for particulars.
                 * Do not use a complete database dump here.
                 */
                if (!preg_match('/INSERT\s+INTO\s+`?particulars`?/i', $sql)) {
                    $this->error(
                        'The SQL file does not contain an INSERT statement for particulars.'
                    );

                    return self::FAILURE;
                }

                DB::unprepared($sql);

                $particularCount = DB::table('particulars')->count();

                $this->info(
                    "Particulars restored: {$particularCount}"
                );
            } else {
                $this->info(
                    "Existing particulars preserved: {$particularCount}"
                );
            }

            // 5. Initialize missing quarterly report records.
            $created = 0;
            $existing = 0;

            DB::transaction(function () use (
                $year,
                &$created,
                &$existing
            ) {
                $churches = Church::query()->get();

                $programs = Program::query()
                    ->whereNull('parent_id')
                    ->whereBetween('department_id', [13, 21])
                    ->get();

                if ($churches->isEmpty()) {
                    throw new \RuntimeException(
                        'No churches found. Check the churches table.'
                    );
                }

                if ($programs->isEmpty()) {
                    throw new \RuntimeException(
                        'No main reporting programs found.'
                    );
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

            // 6. Display results.
            $this->newLine();
            $this->info('DATABASE SETUP COMPLETED');
            $this->line("Database: {$database}");
            $this->line('Departments: ' . DB::table('departments')->count());
            $this->line('Programs: ' . DB::table('programs')->count());
            $this->line('Particulars: ' . DB::table('particulars')->count());
            $this->line('Churches: ' . DB::table('churches')->count());
            $this->line("Reporting year: {$year}");
            $this->line("New quarter records created: {$created}");
            $this->line("Existing quarter records preserved: {$existing}");

            $this->newLine();
            $this->info('NELM setup completed successfully.');

            return self::SUCCESS;

        } catch (Throwable $e) {
            $this->error('NELM setup failed.');
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }
}