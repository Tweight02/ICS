<?php

use App\Services\ReportingSetupService;
use Database\Seeders\QuarterlyReportDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('quarterly report seeder creates approved Q1 and Q2, mixed Q3, and empty Q4 reports', function () {
    Carbon::setTestNow('2026-10-26 12:00:00');
    config(['app.reporting_year' => '2026']);

    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Seeder Test District',
        'address' => 'Nueva Vizcaya',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Seeder Test Church',
        'address' => 'Nueva Vizcaya',
        'parent_id' => $districtId,
    ]);
    $secondChurchId = DB::table('churches')->insertGetId([
        'name' => 'Second Seeder Test Church',
        'address' => 'Nueva Vizcaya',
        'parent_id' => $districtId,
    ]);
    DB::table('departments')->insert([
        'department_id' => 13,
        'department_name' => 'Children and Family Ministries',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'AY Quarterly Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => "CHILDREN'S MINISTRIES",
        'parent_id' => $programId,
    ]);
    $particularId = DB::table('particulars')->insertGetId([
        'program_id' => $sectionId,
        'particular_name' => 'No. of Church Members',
    ]);

    app(ReportingSetupService::class)->initialize('2026');

    $this->seed(QuarterlyReportDataSeeder::class);

    $this->assertDatabaseCount('particular_items', 6);
    $this->assertSame(
        6,
        DB::table('quarters')
            ->join('particular_items', 'particular_items.quarter_id', '=', 'quarters.quarter_id')
            ->whereIn('quarters.church_id', [$churchId, $secondChurchId])
            ->distinct()
            ->count('quarters.quarter_id')
    );

    $approvedEarlyQuarters = DB::table('quarters')
        ->whereIn('church_id', [$churchId, $secondChurchId])
        ->whereIn('quarter', ['Q1', 'Q2'])
        ->where('year', '2026');
    $this->assertSame(4, (clone $approvedEarlyQuarters)->whereNotNull('date_submitted')->count());
    $this->assertSame(4, (clone $approvedEarlyQuarters)->whereNotNull('district_endorse')->count());
    $this->assertSame(4, (clone $approvedEarlyQuarters)->whereNotNull('mission_approve')->count());

    $q3Reports = DB::table('quarters')
        ->whereIn('church_id', [$churchId, $secondChurchId])
        ->where('program_id', $programId)
        ->where('quarter', 'Q3')
        ->where('year', '2026');
    $this->assertSame(1, (clone $q3Reports)->whereNotNull('district_endorse')->count());
    $this->assertSame(1, (clone $q3Reports)->whereNull('date_submitted')->count());
    $this->assertSame(2, DB::table('particular_items')
        ->whereIn('quarter_id', (clone $q3Reports)->select('quarter_id'))
        ->count());

    $q4Reports = DB::table('quarters')
        ->whereIn('church_id', [$churchId, $secondChurchId])
        ->where('program_id', $programId)
        ->where('quarter', 'Q4')
        ->where('year', '2026');
    $this->assertSame(2, (clone $q4Reports)
        ->whereNull('date_submitted')
        ->whereNull('district_endorse')
        ->whereNull('mission_approve')
        ->count());
    $this->assertSame(0, DB::table('particular_items')
        ->whereIn('quarter_id', (clone $q4Reports)->select('quarter_id'))
        ->count());
    $this->assertDatabaseHas('quarters', [
        'church_id' => $churchId,
        'program_id' => $programId,
        'quarter' => 'Q1',
        'year' => '2026',
    ]);
    $this->assertDatabaseHas('quarters', [
        'church_id' => $churchId,
        'program_id' => $programId,
        'quarter' => 'Q4',
        'year' => '2026',
        'date_submitted' => null,
    ]);

    $this->seed(QuarterlyReportDataSeeder::class);

    $this->assertDatabaseCount('particular_items', 6);
    $this->assertSame(
        0,
        DB::table('quarters')
            ->where('church_id', $churchId)
            ->where('year', '2026')
            ->where(function ($query) {
                $query->whereDate('date_submitted', '>', '2026-10-26')
                    ->orWhereDate('district_endorse', '>', '2026-10-26')
                    ->orWhereDate('mission_approve', '>', '2026-10-26');
            })
            ->count()
    );

    Carbon::setTestNow();
});
