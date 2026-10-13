<?php

use App\Models\User;
use App\Services\ReportMonitoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function reportSubmissionFixture(): array
{
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Pasuc',
        'address' => 'Batanes',
        'parent_id' => null,
    ]);

    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Youth',
    ]);

    $programId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Youth Program',
        'parent_id' => null,
    ]);

    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Activities',
        'parent_id' => $programId,
    ]);

    $particularIds = [];
    foreach (['Attendance', 'Outreach'] as $name) {
        $particularIds[] = DB::table('particulars')->insertGetId([
            'program_id' => $sectionId,
            'particular_name' => $name,
        ]);
    }

    $quarterId = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $churchId,
        'quarter' => 'Q1',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);

    return compact('churchId', 'departmentId', 'particularIds', 'quarterId');
}

function createDistrictPastor(int $churchId, int $departmentId): User
{
    return User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'District',
        'middle_name' => '',
        'last_name' => 'Pastor',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => 'pastor',
        'email' => 'pastor@example.com',
        'password' => Hash::make('password'),
    ]);
}

test('submitting report values stores blank entries as zero and marks the quarter submitted', function () {
    $fixture = reportSubmissionFixture();

    $response = $this->postJson(
        "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/save",
        [
            'submitted' => true,
            'items' => [
                [
                    'particular_id' => $fixture['particularIds'][0],
                    'quarter_id' => $fixture['quarterId'],
                    'value' => 12,
                ],
                [
                    'particular_id' => $fixture['particularIds'][1],
                    'quarter_id' => $fixture['quarterId'],
                    'value' => null,
                ],
            ],
        ]
    );

    $response->assertOk()->assertJsonPath('saved_count', 2);

    $this->assertDatabaseHas('particular_items', [
        'particular_id' => $fixture['particularIds'][0],
        'quarter_id' => $fixture['quarterId'],
        'value' => 12,
    ]);
    $this->assertDatabaseHas('particular_items', [
        'particular_id' => $fixture['particularIds'][1],
        'quarter_id' => $fixture['quarterId'],
        'value' => 0,
    ]);
    $this->assertNotNull(
        DB::table('quarters')
            ->where('quarter_id', $fixture['quarterId'])
            ->value('date_submitted')
    );
});

test('submitting a completely blank report stores every entry as zero', function () {
    $fixture = reportSubmissionFixture();

    $this->postJson(
        "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/save",
        [
            'submitted' => true,
            'items' => array_map(
                fn (int $particularId) => [
                    'particular_id' => $particularId,
                    'quarter_id' => $fixture['quarterId'],
                    'value' => null,
                ],
                $fixture['particularIds']
            ),
        ]
    )->assertOk();

    foreach ($fixture['particularIds'] as $particularId) {
        $this->assertDatabaseHas('particular_items', [
            'particular_id' => $particularId,
            'quarter_id' => $fixture['quarterId'],
            'value' => 0,
        ]);
    }
});

test('endorsement is rejected until every report quarter has been submitted', function () {
    $fixture = reportSubmissionFixture();
    $pastor = createDistrictPastor(
        $fixture['churchId'],
        $fixture['departmentId']
    );

    $this->actingAs($pastor, 'sanctum')
        ->postJson(
            "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/endorse",
            ['year' => 2026, 'quarter' => 'Q1']
        )
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'The representative must submit all report data before endorsement.'
        );
});

test('approved report values cannot be changed', function () {
    $fixture = reportSubmissionFixture();
    DB::table('quarters')
        ->where('quarter_id', $fixture['quarterId'])
        ->update(['mission_approve' => '2026-10-01']);

    DB::table('particular_items')->insert([
        'particular_id' => $fixture['particularIds'][0],
        'quarter_id' => $fixture['quarterId'],
        'value' => 12,
    ]);

    $this->postJson(
        "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/save",
        [
            'items' => [[
                'particular_id' => $fixture['particularIds'][0],
                'quarter_id' => $fixture['quarterId'],
                'value' => 99,
            ]],
        ]
    )->assertUnprocessable();

    $this->assertDatabaseHas('particular_items', [
        'particular_id' => $fixture['particularIds'][0],
        'quarter_id' => $fixture['quarterId'],
        'value' => 12,
    ]);
});

test('department monitoring returns data completion before approval', function () {
    $fixture = reportSubmissionFixture();
    DB::table('particular_items')->insert([
        'particular_id' => $fixture['particularIds'][0],
        'quarter_id' => $fixture['quarterId'],
        'value' => 12,
    ]);

    $this->getJson(
        "/api/churches/{$fixture['churchId']}/departments"
    )->assertOk()
        ->assertJsonPath('0.q1_approved', false)
        ->assertJsonPath('0.q1_submitted', false)
        ->assertJsonPath('0.q1_data_progress', 50);
});

test('church monitoring returns data completion and approval separately', function () {
    $fixture = reportSubmissionFixture();
    DB::table('particular_items')->insert([
        'particular_id' => $fixture['particularIds'][0],
        'quarter_id' => $fixture['quarterId'],
        'value' => 12,
    ]);

    $monitoring = app(ReportMonitoringService::class)
        ->forChurches([$fixture['churchId']])[$fixture['churchId']];

    expect($monitoring['q1'])->toBe(50)
        ->and($monitoring['q1_approved'])->toBeFalse()
        ->and($monitoring['q1_submitted'])->toBeFalse()
        ->and($monitoring['q1_submitted_data_progress'])->toBeNull();

    DB::table('quarters')
        ->where('quarter_id', $fixture['quarterId'])
        ->update(['date_submitted' => '2026-10-13']);

    $submittedMonitoring = app(ReportMonitoringService::class)
        ->forChurches([$fixture['churchId']])[$fixture['churchId']];

    expect($submittedMonitoring['q1_submitted'])->toBeTrue()
        ->and($submittedMonitoring['q1_submitted_data_progress'])->toBe(50);
});
