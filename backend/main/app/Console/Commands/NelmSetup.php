<?php

namespace App\Console\Commands;

use App\Services\ReportingSetupService;
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

            if ($database !== 'ics') {
                $this->error(
                    'Setup stopped. Expected database ics; no changes were made.'
                );

                return self::FAILURE;
            }

            // 2. Validate reporting year.
            $year = (string) ($this->option('year') ?: now()->year);

            if (! preg_match('/^\d{4}$/', $year)) {
                $this->error('Invalid year. Use a four-digit year, such as 2026.');

                return self::FAILURE;
            }

            // 3. Run pending migrations unless quarters-only mode is selected.
            if (! $this->option('quarters')) {
                $this->call('migrate', [
                    '--force' => true,
                ]);

                $this->info('[OK] Database migrations checked.');
            }

            // 4. Restore particulars and initialize missing quarterly reports.
            $result = app(ReportingSetupService::class)->initialize($year);

            if ($result['particulars_restored']) {
                $this->warn('No particulars found. Restoring from SQL backup...');
                $this->info("Particulars restored: {$result['particulars']}");
            } else {
                $this->info("Existing particulars preserved: {$result['particulars']}");
            }

            // 5. Display results.
            $this->newLine();
            $this->info('DATABASE SETUP COMPLETED');
            $this->line("Database: {$database}");
            $this->line('Departments: '.DB::table('departments')->count());
            $this->line('Programs: '.DB::table('programs')->count());
            $this->line('Particulars: '.DB::table('particulars')->count());
            $this->line('Churches: '.DB::table('churches')->count());
            $this->line("Reporting year: {$year}");
            $this->line("New quarter records created: {$result['quarters_created']}");
            $this->line("Existing quarter records preserved: {$result['quarters_existing']}");

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
