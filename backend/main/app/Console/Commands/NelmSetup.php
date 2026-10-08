<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\Program;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
            DB::connection()->getPdo();

            $this->info('[OK] Database connection successful.');

            /*
             * Initialize database tables when needed.
             *
             * Existing tables and data are not dropped.
             */
            if (!$this->option('quarters')) {
                $this->call('migrate', [
                    '--force' => true,
                ]);

                $this->info('[OK] Database migrations checked.');
            }

            /*
             * Initialize missing quarterly report records.
             */
            $year = (string) ($this->option('year') ?: now()->year);

            if (!preg_match('/^\d{4}$/', $year)) {
                $this->error('Invalid year. Use a four-digit year, such as 2026.');

                return self::FAILURE;
            }

            $created = 0;
            $existing = 0;

            DB::transaction(function () use ($year, &$created, &$existing) {
                $churches = Church::query()->get();

                /*
                 * Main programs have no parent program.
                 * Child sections are excluded.
                 */
                $programs = Program::query()
                    ->whereNull('parent_id')
                    ->whereBetween('department_id', [13, 21])
                    ->get();

                if ($churches->isEmpty()) {
                    $this->warn(
                        'No churches found. Import or create church records first.'
                    );
                }

                if ($programs->isEmpty()) {
                    $this->warn(
                        'No applicable main programs found. Check your programs table.'
                    );
                }

                foreach ($churches as $church) {
                    foreach ($programs as $program) {
                        foreach (['Q1', 'Q2', 'Q3', 'Q4'] as $quarter) {
                            $record = DB::table('quarters')
                                ->where('church_id', $church->church_id)
                                ->where('program_id', $program->program_id)
                                ->where('quarter', $quarter)
                                ->where('year', $year)
                                ->first();

                            if ($record) {
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

            $this->newLine();
            $this->info('Quarter initialization completed.');
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