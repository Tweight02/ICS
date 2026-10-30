<?php

use Database\Seeders\LastYearReportSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('last year report seeder creates complete reports for every local church and report form idempotently', function () {
    $year = (string) now()->subYear()->year;
    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Historical Seeder District',
        'address' => 'Nueva Vizcaya',
        'parent_id' => null,
    ]);
    $churchIds = [];

    foreach (['Historical Seeder Church A', 'Historical Seeder Church B'] as $name) {
        $churchIds[] = DB::table('churches')->insertGetId([
            'name' => $name,
            'address' => 'Nueva Vizcaya',
            'parent_id' => $districtId,
        ]);
    }

    $programIds = [];
    foreach ([13, 21] as $departmentId) {
        DB::table('departments')->insert([
            'department_id' => $departmentId,
            'department_name' => "Historical Department {$departmentId}",
        ]);
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => "Historical Form {$departmentId}",
            'parent_id' => null,
        ]);
        $sectionId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => 'Historical Section',
            'parent_id' => $programId,
        ]);
        DB::table('particulars')->insert([
            'program_id' => $sectionId,
            'particular_name' => 'Number of Members',
        ]);
        $programIds[] = $programId;
    }

    $this->seed(LastYearReportSeeder::class);
    $this->seed(LastYearReportSeeder::class);

    $quarters = DB::table('quarters')
        ->whereIn('church_id', $churchIds)
        ->whereIn('program_id', $programIds)
        ->where('year', $year);
    expect((clone $quarters)->count())->toBe(16)
        ->and((clone $quarters)->whereNotNull('date_submitted')->count())->toBe(16)
        ->and((clone $quarters)->whereNotNull('district_endorse')->count())->toBe(16)
        ->and((clone $quarters)->whereNotNull('mission_approve')->count())->toBe(16)
        ->and(DB::table('particular_items')
            ->whereIn('quarter_id', (clone $quarters)->select('quarter_id'))
            ->count())->toBe(16);
});
