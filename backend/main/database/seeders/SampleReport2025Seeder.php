<?php

namespace Database\Seeders;

use App\Services\ReportingSetupService;
use Illuminate\Database\Seeder;

class SampleReport2025Seeder extends Seeder
{
    public function run(): void
    {
        $year = '2025';

        app(ReportingSetupService::class)->initialize($year);
        app(QuarterlyReportDataSeeder::class)->runForYear($year);
    }
}
