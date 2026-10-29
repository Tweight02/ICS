<?php

use Database\Seeders\PersonalReportDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('personal report seeder creates requested baptism counts and Q1-Q3 department reports idempotently', function () {
    config(['app.reporting_year' => '2026']);

    foreach ([
        16 => 'Ministerial & Evangelism',
        20 => 'Adventist Mission',
    ] as $departmentId => $departmentName) {
        DB::table('departments')->insert([
            'department_id' => $departmentId,
            'department_name' => $departmentName,
        ]);
    }

    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Sample District',
        'address' => 'Sample District',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Sample Church',
        'address' => 'Sample District',
        'parent_id' => $districtId,
    ]);

    $achievementParticularId = null;
    $missionParticularId = null;

    foreach ([
        16 => ['form' => 'Ministerial & Evangelism Quarterly Report', 'particular' => 'No. of Baptisms Achieved'],
        20 => ['form' => 'Adventist Mission Quarterly Report', 'particular' => 'Number of Bible Studies Given'],
    ] as $departmentId => $report) {
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => $report['form'],
            'parent_id' => null,
        ]);
        $sectionId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => 'Sample Section',
            'parent_id' => $programId,
        ]);
        $particularId = DB::table('particulars')->insertGetId([
            'program_id' => $sectionId,
            'particular_name' => $report['particular'],
        ]);

        if ($departmentId === 16) {
            $achievementParticularId = $particularId;
        } else {
            $missionParticularId = $particularId;
        }

        foreach (['Q1', 'Q2', 'Q3', 'Q4'] as $quarter) {
            DB::table('quarters')->insert([
                'program_id' => $programId,
                'church_id' => $churchId,
                'quarter' => $quarter,
                'year' => '2026',
                'date_submitted' => null,
                'district_endorse' => null,
                'mission_approve' => null,
            ]);
        }
    }

    $this->seed(PersonalReportDataSeeder::class);
    $this->seed(PersonalReportDataSeeder::class);

    $baptismCounts = DB::table('baptisms')
        ->where('church_id', $churchId)
        ->select('quarter', DB::raw('COUNT(*) as total'))
        ->groupBy('quarter')
        ->orderBy('quarter')
        ->pluck('total', 'quarter')
        ->all();

    expect($baptismCounts)->toBe(['Q1' => 10, 'Q2' => 12, 'Q3' => 25])
        ->and(DB::table('particular_items')
            ->where('particular_id', $achievementParticularId)
            ->whereIn('quarter_id', DB::table('quarters')->where('church_id', $churchId)->select('quarter_id'))
            ->orderBy('quarter_id')
            ->pluck('manual_value')
            ->all())->toBe([10, 12, 25])
        ->and(DB::table('particular_items')
            ->where('particular_id', $missionParticularId)
            ->whereIn('quarter_id', DB::table('quarters')->where('church_id', $churchId)->whereIn('quarter', ['Q1', 'Q2', 'Q3'])->select('quarter_id'))
            ->count())->toBe(3)
        ->and(DB::table('particular_items')
            ->where('quarter_id', DB::table('quarters')->where('church_id', $churchId)->where('quarter', 'Q4')->value('quarter_id'))
            ->count())->toBe(0);
});
