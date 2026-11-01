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
        ->assertJsonPath('data.departments.0.reports.1.report_name', 'Membership Report')
        ->assertJsonPath('data.departments.0.reports.1.total_report_value', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q1', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q2', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q3', 0)
        ->assertJsonPath('data.departments.0.reports.1.quarter_totals.q4', 0);

    $assistant = missionReportSummaryUser($churchId, null, 'assistant');
    $this->actingAs($assistant, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.now()->year)
        ->assertForbidden();

    $directorWithoutDepartment = missionReportSummaryUser($churchId, null, 'head director');
    $this->actingAs($directorWithoutDepartment, 'sanctum')
        ->getJson('/api/reports/mission-summary?year='.now()->year)
        ->assertForbidden()
        ->assertJsonPath('message', 'A department must be assigned to your Director account.');
});
