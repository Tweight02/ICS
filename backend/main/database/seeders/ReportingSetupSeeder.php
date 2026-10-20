<?php

namespace Database\Seeders;

use App\Services\ReportingSetupService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReportingSetupSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ChurchSeeder::class,
            DepartmentSeeder::class,
            ProgramSeeder::class,
            ParticularSeeder::class,
        ]);

        $year = (string) config('app.reporting_year', now()->year);
        $result = app(ReportingSetupService::class)->initialize($year);

        if ($result['particulars_restored']) {
            $this->command?->warn('No particulars found. Restoring from SQL backup...');
            $this->command?->info("Particulars restored: {$result['particulars']}");
        } else {
            $this->command?->info("Existing particulars preserved: {$result['particulars']}");
        }

        $this->command?->newLine();
        $this->command?->info('DATABASE SETUP COMPLETED');
        $this->command?->line('Database: '.DB::connection()->getDatabaseName());
        $this->command?->line('Departments: '.DB::table('departments')->count());
        $this->command?->line('Programs: '.DB::table('programs')->count());
        $this->command?->line('Particulars: '.DB::table('particulars')->count());
        $this->command?->line('Churches: '.DB::table('churches')->count());
        $this->command?->line('Reporting year: '.$year);
        $this->command?->line('New quarter records created: '.$result['quarters_created']);
        $this->command?->line('Existing quarter records preserved: '.$result['quarters_existing']);
        $this->command?->newLine();
        $this->command?->info('NELM setup completed successfully.');
    }
}
