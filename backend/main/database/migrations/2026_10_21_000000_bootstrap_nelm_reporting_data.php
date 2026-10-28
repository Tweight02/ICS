<?php

use Database\Seeders\ReportingSetupSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        $hasExistingSetup = DB::table('churches')->exists()
            && DB::table('departments')->exists()
            && DB::table('programs')->exists()
            && DB::table('particulars')->exists()
            && DB::table('quarters')->exists();

        if ($hasExistingSetup) {
            return;
        }

        $exitCode = Artisan::call('db:seed', [
            '--class' => ReportingSetupSeeder::class,
            '--force' => true,
        ]);

        $output = Artisan::output();

        if ($exitCode !== 0) {
            throw new RuntimeException('NELM initial data setup failed: '.trim($output));
        }

        echo $output;
    }

    public function down(): void
    {
        // Seeded reference and report data is intentionally retained on rollback.
    }
};
