<?php

use App\Services\ReportMonitoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('report monitoring is scoped to the requested reporting year', function () {
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Year Filter Church',
        'address' => 'Year Filter District',
        'parent_id' => null,
    ]);
    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Year Filter Department',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Year Filter Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Year Filter Section',
        'parent_id' => $programId,
    ]);
    $particularIds = [];
    foreach (['First item', 'Second item'] as $name) {
        $particularIds[] = DB::table('particulars')->insertGetId([
            'program_id' => $sectionId,
            'particular_name' => $name,
        ]);
    }

    foreach (['2025', '2026'] as $year) {
        $quarterId = DB::table('quarters')->insertGetId([
            'program_id' => $programId,
            'church_id' => $churchId,
            'quarter' => 'Q1',
            'year' => $year,
            'date_submitted' => $year === '2025' ? '2025-04-03' : null,
            'district_endorse' => $year === '2025' ? '2025-04-05' : null,
            'mission_approve' => $year === '2025' ? '2025-04-10' : null,
        ]);

        DB::table('particular_items')->insert([
            [
                'particular_id' => $particularIds[0],
                'quarter_id' => $quarterId,
                'value' => 10,
                'manual_value' => 10,
            ],
            ...($year === '2025' ? [[
                'particular_id' => $particularIds[1],
                'quarter_id' => $quarterId,
                'value' => 20,
                'manual_value' => 20,
            ]] : []),
        ]);
    }

    $monitoring = app(ReportMonitoringService::class);
    $lastYear = $monitoring->forChurches([$churchId], $departmentId, '2025')[$churchId];
    $thisYear = $monitoring->forChurches([$churchId], $departmentId, '2026')[$churchId];
    $departmentApprovals = $monitoring->departmentApprovals($churchId, '2025')[$departmentId];

    expect($lastYear['q1'])->toBe(100)
        ->and($lastYear['q1_approved'])->toBeTrue()
        ->and($thisYear['q1'])->toBe(50)
        ->and($thisYear['q1_approved'])->toBeFalse()
        ->and($departmentApprovals['q1_approved'])->toBeTrue();
});
