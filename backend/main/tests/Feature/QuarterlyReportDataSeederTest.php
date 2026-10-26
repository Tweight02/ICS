<?php

use App\Services\ReportingSetupService;
use Database\Seeders\QuarterlyReportDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('quarterly report seeder creates reports through the current quarter and is idempotent', function () {
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
    DB::table('departments')->insert([
        'department_id' => 13,
        'department_name' => 'Children and Family Ministries',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Children and Family Ministries Quarterly Report',
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

    $this->assertDatabaseCount('particular_items', 4);
    $this->assertSame(
        4,
        DB::table('quarters')
            ->join('particular_items', 'particular_items.quarter_id', '=', 'quarters.quarter_id')
            ->where('quarters.church_id', $churchId)
            ->distinct()
            ->count('quarters.quarter_id')
    );
    $q4Id = DB::table('quarters')
        ->where('church_id', $churchId)
        ->where('program_id', $programId)
        ->where('quarter', 'Q4')
        ->value('quarter_id');
    $q4Value = DB::table('particular_items')
        ->where('quarter_id', $q4Id)
        ->where('particular_id', $particularId)
        ->value('value');

    expect($q4Value)->toBeGreaterThan(0);
    $this->assertDatabaseHas('quarters', [
        'church_id' => $churchId,
        'program_id' => $programId,
        'quarter' => 'Q4',
        'year' => '2026',
        'date_submitted' => null,
    ]);

    $this->seed(QuarterlyReportDataSeeder::class);

    $this->assertDatabaseCount('particular_items', 4);
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
