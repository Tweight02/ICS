<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function missionReportSummaryUser(int $churchId, ?int $departmentId, string $role): User
{
    return User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Mission',
        'last_name' => 'Summary',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => $role,
        'email' => "mission-summary-{$role}@example.test",
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}

test('directors get submitted report counts and value totals for their assigned department', function () {
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Summary District',
        'address' => 'Summary District',
        'parent_id' => null,
    ]);
    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Summary Department',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Attendance Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Attendance',
        'parent_id' => $programId,
    ]);
    $particularIds = [];
    foreach (['Present', 'Visitors'] as $name) {
        $particularIds[] = DB::table('particulars')->insertGetId([
            'program_id' => $sectionId,
            'particular_name' => $name,
        ]);
    }

    $currentYear = (string) now()->year;
    $reportSubmissionDate = now()->startOfYear()->addMonths(3)->toDateString();
    foreach ([
        ['Q1', $reportSubmissionDate, [10, 5]],
        ['Q2', now()->startOfYear()->addMonths(6)->toDateString(), [4]],
        ['Q3', null, [9]],
    ] as [$quarterName, $submittedAt, $values]) {
        $quarterId = DB::table('quarters')->insertGetId([
            'program_id' => $programId,
            'church_id' => $churchId,
            'quarter' => $quarterName,
            'year' => $currentYear,
            'date_submitted' => $submittedAt,
        ]);

        foreach ($values as $index => $value) {
            DB::table('particular_items')->insert([
                'particular_id' => $particularIds[$index],
                'quarter_id' => $quarterId,
                'value' => $value,
                'manual_value' => $value,
            ]);
        }
    }

    $otherProgramId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Membership Report',
        'parent_id' => null,
    ]);
    DB::table('quarters')->insert([
        'program_id' => $otherProgramId,
        'church_id' => $churchId,
        'quarter' => 'Q1',
        'year' => $currentYear,
        'date_submitted' => $reportSubmissionDate,
    ]);
    $otherDepartmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Zulu Other Summary Department',
    ]);
    $otherDepartmentProgramId = DB::table('programs')->insertGetId([
        'department_id' => $otherDepartmentId,
        'program_name' => 'Other Department Report',
        'parent_id' => null,
    ]);
    $otherDepartmentSectionId = DB::table('programs')->insertGetId([
        'department_id' => $otherDepartmentId,
        'program_name' => 'Other Department Section',
        'parent_id' => $otherDepartmentProgramId,
    ]);
    $otherDepartmentParticularId = DB::table('particulars')->insertGetId([
        'program_id' => $otherDepartmentSectionId,
        'particular_name' => 'Other Department Entry',
    ]);
    $otherDepartmentQuarterId = DB::table('quarters')->insertGetId([
        'program_id' => $otherDepartmentProgramId,
        'church_id' => $churchId,
        'quarter' => 'Q1',
        'year' => $currentYear,
        'date_submitted' => $reportSubmissionDate,
    ]);
    DB::table('particular_items')->insert([
        'particular_id' => $otherDepartmentParticularId,
        'quarter_id' => $otherDepartmentQuarterId,
        'value' => 100,
        'manual_value' => 100,
    ]);
    DB::table('quarters')->insert([
        'program_id' => $programId,
        'church_id' => $churchId,
        'quarter' => 'Q4',
        'year' => (string) now()->subYear()->year,
        'date_submitted' => now()->subYear()->startOfYear()->addDay()->toDateString(),
    ]);

    $director = missionReportSummaryUser($churchId, $departmentId, 'director');
    $response = $this->actingAs($director, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.now()->year.'&department_id='.$otherDepartmentId);

    $response->assertOk()
        ->assertJsonPath('data.total_submitted_reports', 3)
        ->assertJsonPath('data.total_report_value', 19)
        ->assertJsonPath('data.quarter_totals.q1', 15)
        ->assertJsonPath('data.quarter_totals.q2', 4)
        ->assertJsonPath('data.quarter_totals.q3', 0)
        ->assertJsonPath('data.quarter_totals.q4', 0)
        ->assertJsonPath('data.departments.0.submitted_reports', 3)
        ->assertJsonPath('data.departments.0.total_report_value', 19)
        ->assertJsonCount(1, 'data.departments')
        ->assertJsonPath('data.departments.0.department_id', $departmentId)
        ->assertJsonPath('data.departments.0.quarter_totals.q1', 15)
        ->assertJsonPath('data.departments.0.quarter_totals.q2', 4)
        ->assertJsonPath('data.departments.0.reports.0.report_name', 'Attendance Report')
        ->assertJsonPath('data.departments.0.reports.0.submitted_reports', 2)
        ->assertJsonPath('data.departments.0.reports.0.total_report_value', 19)
        ->assertJsonPath('data.departments.0.reports.0.quarter_totals.q1', 15)
        ->assertJsonPath('data.departments.0.reports.0.quarter_totals.q2', 4)
        ->assertJsonPath('data.departments.0.reports.0.quarter_totals.q3', 0)
        ->assertJsonPath('data.departments.0.reports.0.quarter_totals.q4', 0)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.particular_name', 'Present')
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.total_report_value', 14)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.quarter_totals.q1', 10)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.quarter_totals.q2', 4)
        ->assertJsonPath('data.departments.0.reports.0.particulars.1.particular_name', 'Visitors')
        ->assertJsonPath('data.departments.0.reports.0.particulars.1.total_report_value', 5)
        ->assertJsonPath('data.departments.0.reports.1.report_name', 'Membership Report')
        ->assertJsonPath('data.departments.0.reports.1.total_report_value', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q1', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q2', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q3', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q4', 0);

    foreach (['assistant', 'administrative assistant', 'head assistant'] as $role) {
        $assistant = missionReportSummaryUser($churchId, null, $role);
        $this->actingAs($assistant, 'sanctum')
            ->getJson('/api/reports/mission-summary?year='.now()->year)
            ->assertOk()
            ->assertJsonPath('data.total_submitted_reports', 4)
            ->assertJsonPath('data.total_report_value', 119)
            ->assertJsonCount(2, 'data.departments');
    }

    $this->actingAs($assistant, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.now()->year.'&department_id='.$departmentId)
        ->assertOk()
        ->assertJsonCount(1, 'data.departments')
        ->assertJsonPath('data.departments.0.department_id', $departmentId)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.particular_name', 'Present')
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.total_report_value', 14)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.quarter_totals.q1', 10)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.quarter_totals.q2', 4)
        ->assertJsonPath('data.departments.0.reports.0.particulars.1.particular_name', 'Visitors')
        ->assertJsonPath('data.departments.0.reports.0.particulars.1.total_report_value', 5);

    $directorWithoutDepartment = missionReportSummaryUser($churchId, null, 'head director');
    $this->actingAs($directorWithoutDepartment, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.now()->year)
        ->assertForbidden()
        ->assertJsonPath('message', 'A department must be assigned to your Director account.');
});

test('mission summary counts baptism and death records from their database tables', function () {
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Personal Records District',
        'address' => 'Personal Records District',
        'parent_id' => null,
    ]);

    foreach ([
        22 => ['Baptism Record', 'Baptisms Reported'],
        23 => ['Death Record', 'Deaths Reported'],
    ] as $departmentId => [$departmentName, $particularName]) {
        DB::table('departments')->insert([
            'department_id' => $departmentId,
            'department_name' => $departmentName,
        ]);
        $reportProgramId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => $departmentName,
            'parent_id' => null,
        ]);
        $sectionId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => strtoupper($departmentName),
            'parent_id' => $reportProgramId,
        ]);
        DB::table('particulars')->insert([
            'program_id' => $sectionId,
            'particular_name' => $particularName,
        ]);
    }

    $currentYear = (string) now()->year;
    $currentQ1 = now()->startOfYear()->addMonth()->toDateString();
    $currentQ2 = now()->startOfYear()->addMonths(4)->toDateString();
    $currentQ3 = now()->startOfYear()->addMonths(7)->toDateString();
    $previousYear = now()->subYear()->toDateString();
    $baptismId = DB::table('baptisms')->insertGetId([
        'church_id' => $churchId,
        'quarter' => 'Q1',
        'first_name' => 'Baptized',
        'middle_name' => '',
        'last_name' => 'Member',
        'extension_name' => null,
        'birthdate' => '1990-01-01',
        'gender' => 'other',
        'address' => 'Example Address',
        'officiating_minister' => 'Example Pastor',
        'place_of_baptism' => 'Example Church',
        'date_of_baptism' => $currentQ1,
        'marital_status' => 'single',
        'is_reclaimed' => false,
    ]);
    DB::table('baptisms')->insert([
        'church_id' => $churchId,
        'quarter' => 'Q2',
        'first_name' => 'Another',
        'middle_name' => '',
        'last_name' => 'Member',
        'extension_name' => null,
        'birthdate' => '1990-01-01',
        'gender' => 'other',
        'address' => 'Example Address',
        'officiating_minister' => 'Example Pastor',
        'place_of_baptism' => 'Example Church',
        'date_of_baptism' => $currentQ2,
        'marital_status' => 'single',
        'is_reclaimed' => false,
    ]);
    DB::table('baptisms')->insert([
        'church_id' => $churchId,
        'quarter' => 'Q4',
        'first_name' => 'Previous',
        'middle_name' => '',
        'last_name' => 'Member',
        'extension_name' => null,
        'birthdate' => '1990-01-01',
        'gender' => 'other',
        'address' => 'Example Address',
        'officiating_minister' => 'Example Pastor',
        'place_of_baptism' => 'Example Church',
        'date_of_baptism' => $previousYear,
        'marital_status' => 'single',
        'is_reclaimed' => false,
    ]);

    $manualDeathRecordId = DB::table('baptisms')->insertGetId([
        'church_id' => $churchId,
        'quarter' => 'Q3',
        'first_name' => 'Deceased',
        'middle_name' => '',
        'last_name' => 'Member',
        'extension_name' => null,
        'birthdate' => '1990-01-01',
        'gender' => 'other',
        'address' => '',
        'officiating_minister' => '',
        'place_of_baptism' => '',
        'date_of_baptism' => null,
        'marital_status' => 'single',
        'is_reclaimed' => false,
    ]);
    DB::table('deaths')->insert([
        ['baptism_id' => $baptismId, 'quarter' => 'Q1', 'date_of_death' => $currentQ1],
        ['baptism_id' => $manualDeathRecordId, 'quarter' => 'Q3', 'date_of_death' => $currentQ3],
    ]);

    $assistant = missionReportSummaryUser($churchId, null, 'assistant');
    $this->actingAs($assistant, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.$currentYear)
        ->assertOk()
        ->assertJsonPath('data.departments.0.department_id', 22)
        ->assertJsonPath('data.departments.0.total_report_value', 2)
        ->assertJsonPath('data.departments.0.quarter_totals.q1', 1)
        ->assertJsonPath('data.departments.0.quarter_totals.q2', 1)
        ->assertJsonPath('data.departments.0.reports.0.total_report_value', 2)
        ->assertJsonPath('data.departments.1.department_id', 23)
        ->assertJsonPath('data.departments.1.total_report_value', 2)
        ->assertJsonPath('data.departments.1.quarter_totals.q1', 1)
        ->assertJsonPath('data.departments.1.quarter_totals.q3', 1)
        ->assertJsonPath('data.departments.1.reports.0.total_report_value', 2);

    $this->actingAs($assistant, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.$currentYear.'&department_id=22')
        ->assertOk()
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.particular_name', 'Baptisms Reported')
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.total_report_value', 2)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.quarter_totals.q2', 1);

    $this->actingAs($assistant, 'sanctum')
        ->getJson('/api/reports/mission-summary/baptisms?year='.$currentYear.'&quarter=Q2')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.first_name', 'Another')
        ->assertJsonPath('data.0.church_name', 'Personal Records District');

    $this->actingAs($assistant, 'sanctum')
        ->getJson('/api/reports/mission-summary/deaths?year='.$currentYear.'&quarter=Q3')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.first_name', 'Deceased')
        ->assertJsonPath('data.0.date_of_death', $currentQ3)
        ->assertJsonPath('data.0.church_name', 'Personal Records District');

    $this->actingAs($assistant, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.$currentYear.'&department_id=23')
        ->assertOk()
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.particular_name', 'Deaths Reported')
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.total_report_value', 2)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.quarter_totals.q3', 1);

    $director = missionReportSummaryUser($churchId, 22, 'head director');
    $this->actingAs($director, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.$currentYear.'&department_id=23')
        ->assertOk()
        ->assertJsonPath('data.departments.0.department_id', 22)
        ->assertJsonPath('data.departments.0.total_report_value', 2)
        ->assertJsonPath('data.departments.0.quarter_totals.q1', 1);

    $deathDirector = missionReportSummaryUser($churchId, 23, 'head director');
    $this->actingAs($deathDirector, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.$currentYear.'&department_id=22')
        ->assertOk()
        ->assertJsonCount(1, 'data.departments')
        ->assertJsonPath('data.departments.0.department_id', 23)
        ->assertJsonPath('data.departments.0.total_report_value', 2)
        ->assertJsonPath('data.departments.0.quarter_totals.q1', 1)
        ->assertJsonPath('data.departments.0.quarter_totals.q3', 1)
        ->assertJsonPath('data.departments.0.reports.0.particulars.0.total_report_value', 2);

    $this->actingAs($director, 'sanctum')
        ->getJson('/api/reports/mission-summary/baptisms?year='.$currentYear.'&quarter=Q2')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.first_name', 'Another');

    $this->actingAs($deathDirector, 'sanctum')
        ->getJson('/api/reports/mission-summary/baptisms?year='.$currentYear.'&quarter=Q2')
        ->assertForbidden();

    $this->actingAs($deathDirector, 'sanctum')
        ->getJson('/api/reports/mission-summary/deaths?year='.$currentYear.'&quarter=Q3')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.first_name', 'Deceased');

    $this->actingAs($director, 'sanctum')
        ->getJson('/api/reports/mission-summary/deaths?year='.$currentYear.'&quarter=Q3')
        ->assertForbidden();
});
