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
        'status' => 'active',
    ]);
}

function createRepresentative(int $churchId, int $departmentId): User
{
    return User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Church',
        'middle_name' => '',
        'last_name' => 'Representative',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => 'representative',
        'email' => 'representative-comments@example.com',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}

function createReportAssistant(int $churchId, int $departmentId): User
{
    return User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Report',
        'middle_name' => '',
        'last_name' => 'Assistant',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => 'assistant',
        'email' => 'report-assistant@example.com',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}

test('reverting a confirmed event participant to pending removes their report counts', function () {
    $fixture = reportSubmissionFixture();
    $assistant = createReportAssistant($fixture['churchId'], $fixture['departmentId']);
    $particularId = $fixture['particularIds'][0];

    DB::table('particular_items')->insert([
        'particular_id' => $particularId,
        'quarter_id' => $fixture['quarterId'],
        'value' => 5,
        'manual_value' => 5,
    ]);

    $eventId = DB::table('events')->insertGetId([
        'quarter_id' => $fixture['quarterId'],
        'church_id' => $fixture['churchId'],
        'title' => 'Report-linked event',
        'date_start' => '2026-10-26',
        'date_end' => '2026-10-26',
        'time_start' => '09:00:00',
        'time_end' => '10:00:00',
        'details' => '',
        'status' => 'upcoming',
        'location' => 'Church',
    ], 'event_id');
    DB::table('event_particular')->insert([
        [
            'event_id' => $eventId,
            'particular_id' => $particularId,
        ],
        [
            'event_id' => $eventId,
            'particular_id' => $fixture['particularIds'][1],
        ],
    ]);
    DB::table('event_creator')->insert([
        'event_id' => $eventId,
        'user_id' => $assistant->user_id,
    ]);
    $participantId = DB::table('participants')->insertGetId([
        'event_id' => $eventId,
        'church_id' => $fixture['churchId'],
        'first_name' => 'Report',
        'middle_name' => '',
        'last_name' => 'Participant',
        'extension_name' => null,
        'age' => '25',
        'gender' => 'other',
        'registration_status' => 'pending',
    ], 'participant_id');

    $this->actingAs($assistant, 'sanctum');
    $participantUrl = "/api/participants/{$participantId}";
    $reportUrl = "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report";
    $getReport = fn () => $this->getJson($reportUrl)->assertOk()->json('programs.0.sections.0.particulars');
    $pendingParticulars = $getReport();
    expect($pendingParticulars[0]['participant_count'])->toBe(0)
        ->and($pendingParticulars[0]['combined_value'])->toBe(5)
        ->and($pendingParticulars[1]['participant_count'])->toBe(0)
        ->and(app(ReportMonitoringService::class)
            ->departmentApprovals($fixture['churchId'])[$fixture['departmentId']]['q1_data_progress'])
        ->toBe(50);

    $this->patchJson($participantUrl, ['status' => 'confirmed'])
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed');
    $this->patchJson($participantUrl, ['status' => 'confirmed'])->assertOk();
    $this->assertDatabaseCount('event_participant_contributions', 2);

    $particulars = $getReport();
    $quarterData = $particulars[0]['quarters'][0];
    expect((float) $quarterData['value'])->toBe(5.0)
        ->and($quarterData['participant_count'])->toBe(1)
        ->and((float) $quarterData['combined_value'])->toBe(6.0)
        ->and($particulars[1]['quarters'][0]['participant_count'])->toBe(1)
        ->and(app(ReportMonitoringService::class)
            ->departmentApprovals($fixture['churchId'])[$fixture['departmentId']]['q1_data_progress'])
        ->toBe(100);

    $this->postJson($reportUrl.'/save', [
        'items' => [[
            'particular_id' => $particularId,
            'quarter_id' => $fixture['quarterId'],
            'value' => 7,
            'value_includes_participants' => true,
        ]],
    ])->assertOk();
    $this->assertDatabaseHas('particular_items', [
        'particular_id' => $particularId,
        'quarter_id' => $fixture['quarterId'],
        'manual_value' => 6,
        'value' => 7,
    ]);

    DB::table('participants')->insert([
        'event_id' => $eventId,
        'church_id' => $fixture['churchId'],
        'first_name' => 'Legacy',
        'middle_name' => '',
        'last_name' => 'Confirmed',
        'extension_name' => null,
        'age' => '26',
        'gender' => 'other',
        'registration_status' => 'confirmed',
    ]);
    $withLegacyConfirmed = $getReport();
    expect($withLegacyConfirmed[0]['quarters'][0]['participant_count'])->toBe(2)
        ->and((float) $withLegacyConfirmed[0]['quarters'][0]['combined_value'])->toBe(8.0)
        ->and($withLegacyConfirmed[1]['quarters'][0]['participant_count'])->toBe(2);

    $this->patchJson($participantUrl, ['status' => 'pending'])->assertOk();
    $pendingAgain = $getReport();
    expect($pendingAgain[0]['quarters'][0]['participant_count'])->toBe(1)
        ->and((float) $pendingAgain[0]['quarters'][0]['combined_value'])->toBe(7.0)
        ->and($pendingAgain[1]['quarters'][0]['participant_count'])->toBe(1);
    $this->assertDatabaseCount('event_participant_contributions', 0);

    $this->deleteJson($participantUrl)->assertNoContent();

    $retainedParticulars = $getReport();
    $retainedQuarterData = $retainedParticulars[0]['quarters'][0];
    expect($retainedQuarterData['participant_count'])->toBe(1)
        ->and((float) $retainedQuarterData['combined_value'])->toBe(7.0)
        ->and($retainedParticulars[1]['quarters'][0]['participant_count'])->toBe(1);
    $this->assertDatabaseCount('event_participant_contributions', 0);
    $this->assertDatabaseHas('particular_items', [
        'particular_id' => $particularId,
        'quarter_id' => $fixture['quarterId'],
        'value' => 7,
        'manual_value' => 6,
    ]);

    DB::table('quarters')
        ->where('quarter_id', $fixture['quarterId'])
        ->update(['mission_approve' => '2026-11-01']);
    $lateParticipantId = DB::table('participants')->insertGetId([
        'event_id' => $eventId,
        'church_id' => $fixture['churchId'],
        'first_name' => 'Late',
        'middle_name' => '',
        'last_name' => 'Participant',
        'extension_name' => null,
        'age' => '26',
        'gender' => 'other',
        'registration_status' => 'pending',
    ], 'participant_id');

    $this->patchJson("/api/participants/{$lateParticipantId}", ['status' => 'confirmed'])
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'Participants cannot be confirmed because this reporting quarter is already approved.'
        );
    $this->assertDatabaseHas('participants', [
        'participant_id' => $lateParticipantId,
        'registration_status' => 'pending',
    ]);
    $this->assertDatabaseCount('event_participant_contributions', 2);
});

test('assistant can comment on baptism and death reports when no quarter exists yet', function () {
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Personal Report Church',
        'address' => 'Personal Report District',
        'parent_id' => null,
    ]);

    foreach ([22 => 'Baptism Record', 23 => 'Death Record'] as $departmentId => $name) {
        DB::table('departments')->insert([
            'department_id' => $departmentId,
            'department_name' => $name,
        ]);
        DB::table('programs')->insert([
            'department_id' => $departmentId,
            'program_name' => $name,
            'parent_id' => null,
        ]);
    }

    $assistant = User::query()->create([
        'department_id' => 22,
        'church_id' => $churchId,
        'first_name' => 'Report',
        'middle_name' => '',
        'last_name' => 'Assistant',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => 'assistant',
        'email' => 'personal-report-assistant@example.com',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);

    foreach ([22 => 'Baptism Record', 23 => 'Death Record'] as $departmentId => $name) {
        $response = $this->actingAs($assistant, 'sanctum')
            ->postJson('/api/comments', [
                'church_id' => $churchId,
                'department_id' => $departmentId,
                'year' => 2026,
                'quarter' => 'Q1',
                'details' => "Comment for {$name}.",
            ])
            ->assertCreated()
            ->assertJsonPath('data.details', "Comment for {$name}.");

        $quarterId = $response->json('data.quarter_id');

        $this->assertDatabaseHas('quarters', [
            'quarter_id' => $quarterId,
            'church_id' => $churchId,
            'quarter' => 'Q1',
            'year' => '2026',
        ]);

        $this->assertDatabaseHas('comments', [
            'quarter_id' => $quarterId,
            'church_id' => $churchId,
            'department_id' => $departmentId,
            'details' => "Comment for {$name}.",
        ]);
    }
});

test('representative can reply to an existing unapproved report conversation', function () {
    $fixture = reportSubmissionFixture();
    $pastor = createDistrictPastor(
        $fixture['churchId'],
        $fixture['departmentId']
    );
    $representative = createRepresentative(
        $fixture['churchId'],
        $fixture['departmentId']
    );

    $this->actingAs($pastor, 'sanctum')
        ->postJson('/api/comments', [
            'quarter_id' => $fixture['quarterId'],
            'church_id' => $fixture['churchId'],
            'department_id' => $fixture['departmentId'],
            'details' => 'Please finish the remaining report items.',
        ])
        ->assertCreated();

    $this->actingAs($representative, 'sanctum')
        ->postJson('/api/comments', [
            'quarter_id' => $fixture['quarterId'],
            'church_id' => $fixture['churchId'],
            'department_id' => $fixture['departmentId'],
            'details' => 'I will complete the remaining items.',
        ])
        ->assertCreated()
        ->assertJsonPath('data.details', 'I will complete the remaining items.')
        ->assertJsonPath('data.commenter_role', 'representative');

    $this->assertDatabaseHas('comments', [
        'quarter_id' => $fixture['quarterId'],
        'commented_by' => $representative->user_id,
        'details' => 'I will complete the remaining items.',
    ]);
});

test('representative cannot start a report conversation without a previous comment', function () {
    $fixture = reportSubmissionFixture();
    $representative = createRepresentative(
        $fixture['churchId'],
        $fixture['departmentId']
    );

    $this->actingAs($representative, 'sanctum')
        ->postJson('/api/comments', [
            'quarter_id' => $fixture['quarterId'],
            'church_id' => $fixture['churchId'],
            'department_id' => $fixture['departmentId'],
            'details' => 'Starting a new conversation.',
        ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'You can only reply to an existing conversation.');
});

test('submitting report values stores blank entries as zero and marks the quarter submitted', function () {
    $fixture = reportSubmissionFixture();

    $response = $this->actingAs(
        createDistrictPastor($fixture['churchId'], $fixture['departmentId']),
        'sanctum'
    )->postJson(
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

    $this->actingAs(
        createDistrictPastor($fixture['churchId'], $fixture['departmentId']),
        'sanctum'
    )->postJson(
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

test('a later quarter cannot be approved until the first quarter is approved', function () {
    $fixture = reportSubmissionFixture();
    $q2Id = DB::table('quarters')->insertGetId([
        'program_id' => DB::table('programs')
            ->where('department_id', $fixture['departmentId'])
            ->whereNull('parent_id')
            ->value('program_id'),
        'church_id' => $fixture['churchId'],
        'quarter' => 'Q2',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $pastor = createDistrictPastor($fixture['churchId'], $fixture['departmentId']);

    $this->actingAs($pastor, 'sanctum')
        ->postJson(
            "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/save",
            [
                'submitted' => true,
                'items' => array_map(
                    fn (int $particularId) => [
                        'particular_id' => $particularId,
                        'quarter_id' => $q2Id,
                        'value' => 10,
                    ],
                    $fixture['particularIds']
                ),
            ]
        )
        ->assertOk();

    $this->actingAs($pastor, 'sanctum')
        ->postJson(
            "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/endorse",
            ['year' => 2026, 'quarter' => 'Q2']
        )
        ->assertOk();

    $assistant = createReportAssistant($fixture['churchId'], $fixture['departmentId']);
    $approvalUrl = "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/approve";

    $this->actingAs($assistant, 'sanctum')
        ->postJson($approvalUrl, ['year' => 2026, 'quarter' => 'Q2'])
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'All previous quarters must be approved before this report can be approved.'
        );

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $fixture['quarterId'],
        'mission_approve' => null,
    ]);
    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $q2Id,
        'mission_approve' => null,
    ]);

    DB::table('quarters')
        ->where('quarter_id', $fixture['quarterId'])
        ->update([
            'date_submitted' => '2026-03-01',
            'district_endorse' => '2026-03-02',
            'mission_approve' => '2026-03-03',
        ]);

    $this->actingAs($assistant, 'sanctum')
        ->postJson($approvalUrl, ['year' => 2026, 'quarter' => 'Q2'])
        ->assertOk();

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $q2Id,
        'mission_approve' => now()->toDateString(),
    ]);
});

test('approving a quarter requires every earlier quarter to be approved', function () {
    $fixture = reportSubmissionFixture();
    $programId = DB::table('programs')
        ->where('department_id', $fixture['departmentId'])
        ->whereNull('parent_id')
        ->value('program_id');

    DB::table('quarters')->insert([
        [
            'program_id' => $programId,
            'church_id' => $fixture['churchId'],
            'quarter' => 'Q2',
            'year' => '2026',
            'date_submitted' => '2026-06-01',
            'district_endorse' => '2026-06-02',
            'mission_approve' => '2026-06-03',
        ],
        [
            'program_id' => $programId,
            'church_id' => $fixture['churchId'],
            'quarter' => 'Q3',
            'year' => '2026',
            'date_submitted' => '2026-09-01',
            'district_endorse' => '2026-09-02',
            'mission_approve' => null,
        ],
    ]);

    $this->actingAs(
        createReportAssistant($fixture['churchId'], $fixture['departmentId']),
        'sanctum'
    )->postJson(
        "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/approve",
        ['year' => 2026, 'quarter' => 'Q3']
    )->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'All previous quarters must be approved before this report can be approved.'
        );

    $this->assertDatabaseHas('quarters', [
        'church_id' => $fixture['churchId'],
        'program_id' => $programId,
        'quarter' => 'Q3',
        'year' => '2026',
        'mission_approve' => null,
    ]);
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
        'manual_value' => 12,
    ]);

    $this->actingAs(
        createDistrictPastor($fixture['churchId'], $fixture['departmentId']),
        'sanctum'
    )->postJson(
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
        'manual_value' => 12,
    ]);

    $this->actingAs(
        createDistrictPastor($fixture['churchId'], $fixture['departmentId']),
        'sanctum'
    )->getJson(
        "/api/churches/{$fixture['churchId']}/departments"
    )->assertOk()
        ->assertJsonPath('0.q1_approved', false)
        ->assertJsonPath('0.q1_submitted', false)
        ->assertJsonPath('0.q1_data_progress', 50);
});

test('department report omits monthly values for ordinary report items', function () {
    $fixture = reportSubmissionFixture();
    DB::table('particular_items')->insert([
        'particular_id' => $fixture['particularIds'][0],
        'quarter_id' => $fixture['quarterId'],
        'value' => 12,
        'manual_value' => 12,
    ]);

    $this->actingAs(
        createDistrictPastor($fixture['churchId'], $fixture['departmentId']),
        'sanctum'
    )->getJson(
        "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report"
    )->assertOk()
        ->assertJsonMissingPath(
            'programs.0.sections.0.particulars.0.quarters.0.monthly_values'
        );
});

test('church monitoring returns data completion and approval separately', function () {
    $fixture = reportSubmissionFixture();
    DB::table('particular_items')->insert([
        'particular_id' => $fixture['particularIds'][0],
        'quarter_id' => $fixture['quarterId'],
        'value' => 12,
        'manual_value' => 12,
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
