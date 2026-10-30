<?php

use App\Models\User;
use App\Services\ReportMonitoringService;
use App\Support\ReportParticipantCoverage;
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

    return compact('churchId', 'departmentId', 'programId', 'sectionId', 'particularIds', 'quarterId');
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

test('completed event purposes add one report count per event instead of per participant', function () {
    $fixture = reportSubmissionFixture();
    $assistant = createReportAssistant($fixture['churchId'], $fixture['departmentId']);
    $campingId = DB::table('particulars')->insertGetId([
        'program_id' => $fixture['sectionId'],
        'particular_name' => 'Camping',
    ]);

    $createCompletedCampingEvent = function (string $title) use ($fixture, $campingId): int {
        $eventId = DB::table('events')->insertGetId([
            'quarter_id' => $fixture['quarterId'],
            'church_id' => $fixture['churchId'],
            'title' => $title,
            'date_start' => now('Asia/Manila')->subDays(2)->toDateString(),
            'date_end' => now('Asia/Manila')->subDay()->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '10:00:00',
            'details' => '',
            'status' => 'completed',
            'location' => 'Church',
        ], 'event_id');
        DB::table('event_particular')->insert([
            'event_id' => $eventId,
            'particular_id' => $campingId,
        ]);

        return $eventId;
    };

    $firstEventId = $createCompletedCampingEvent('Youth Camping');
    foreach (['One', 'Two'] as $lastName) {
        DB::table('participants')->insert([
            'event_id' => $firstEventId,
            'church_id' => $fixture['churchId'],
            'first_name' => 'Youth',
            'middle_name' => '',
            'last_name' => $lastName,
            'extension_name' => null,
            'age' => '20',
            'gender' => 'other',
            'registration_status' => 'confirmed',
        ]);
    }

    $this->actingAs($assistant, 'sanctum');
    $reportUrl = "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report";
    $particulars = $this->getJson($reportUrl)->assertOk()->json('programs.0.sections.0.particulars');
    expect($particulars[2]['quarters'][0]['participant_count'])->toBe(0)
        ->and($particulars[2]['quarters'][0]['completed_event_count'])->toBe(1)
        ->and($particulars[2]['quarters'][0]['combined_value'])->toBe(1.0);

    $createCompletedCampingEvent('Another Youth Camping');
    $this->postJson($reportUrl.'/save', [
        'items' => [[
            'particular_id' => $campingId,
            'quarter_id' => $fixture['quarterId'],
            'value' => 5,
            'value_includes_participants' => true,
        ]],
    ])->assertOk();
    $this->assertDatabaseHas('particular_items', [
        'particular_id' => $campingId,
        'quarter_id' => $fixture['quarterId'],
        'manual_value' => 3,
        'value' => 5,
    ]);
});

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
    $this->assertDatabaseCount('event_participant_contributions', 1);

    $particulars = $getReport();
    $quarterData = $particulars[0]['quarters'][0];
    expect((float) $quarterData['value'])->toBe(5.0)
        ->and($quarterData['participant_count'])->toBe(1)
        ->and((float) $quarterData['combined_value'])->toBe(6.0)
        ->and($particulars[1]['quarters'][0]['participant_count'])->toBe(0)
        ->and(app(ReportMonitoringService::class)
            ->departmentApprovals($fixture['churchId'])[$fixture['departmentId']]['q1_data_progress'])
        ->toBe(50);

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
        ->and($withLegacyConfirmed[1]['quarters'][0]['participant_count'])->toBe(0);

    $this->patchJson($participantUrl, ['status' => 'pending'])->assertOk();
    $pendingAgain = $getReport();
    expect($pendingAgain[0]['quarters'][0]['participant_count'])->toBe(1)
        ->and((float) $pendingAgain[0]['quarters'][0]['combined_value'])->toBe(7.0)
        ->and($pendingAgain[1]['quarters'][0]['participant_count'])->toBe(0);
    $this->assertDatabaseCount('event_participant_contributions', 0);

    $this->deleteJson($participantUrl)->assertNoContent();

    $retainedParticulars = $getReport();
    $retainedQuarterData = $retainedParticulars[0]['quarters'][0];
    expect($retainedQuarterData['participant_count'])->toBe(1)
        ->and((float) $retainedQuarterData['combined_value'])->toBe(7.0)
        ->and($retainedParticulars[1]['quarters'][0]['participant_count'])->toBe(0);
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
    $this->assertDatabaseCount('event_participant_contributions', 0);
});

test('confirmed participants from district churches roll up to district age-group reports', function () {
    $fixture = reportSubmissionFixture();
    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Youth Ministries District',
        'address' => 'Youth Ministries District',
        'parent_id' => null,
    ]);
    DB::table('churches')
        ->where('church_id', $fixture['churchId'])
        ->update(['parent_id' => $districtId]);
    $eventQuarterId = DB::table('quarters')->insertGetId([
        'program_id' => $fixture['programId'],
        'church_id' => $districtId,
        'quarter' => 'Q1',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $districtReportQuarterId = $eventQuarterId;
    $secondChurchId = DB::table('churches')->insertGetId([
        'name' => 'Second Youth Church',
        'address' => 'District Address',
        'parent_id' => $districtId,
    ]);
    DB::table('quarters')->insert([
        'program_id' => $fixture['programId'],
        'church_id' => $secondChurchId,
        'quarter' => 'Q1',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $representative = createRepresentative($fixture['churchId'], $fixture['departmentId']);
    $secondRepresentative = User::query()->create([
        'department_id' => $fixture['departmentId'],
        'church_id' => $secondChurchId,
        'first_name' => 'Second',
        'middle_name' => '',
        'last_name' => 'Representative',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => 'representative',
        'email' => 'second-youth-representative@example.com',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
    $eventId = DB::table('events')->insertGetId([
        'quarter_id' => $eventQuarterId,
        'church_id' => $districtId,
        'title' => 'Youth age groups',
        'date_start' => '2026-10-26',
        'date_end' => '2026-10-26',
        'time_start' => '09:00:00',
        'time_end' => '10:00:00',
        'details' => '',
        'status' => 'upcoming',
        'location' => 'Church',
    ], 'event_id');
    DB::table('event_creator')->insert([
        'event_id' => $eventId,
        'user_id' => $representative->user_id,
    ]);

    $particularIds = [
        'Estimated number of SDA youth ages 6-14 years',
        'Estimated number of SDA youth ages 15-21 years',
    ];
    foreach ($particularIds as $name) {
        DB::table('event_particular')->insert([
            'event_id' => $eventId,
            'particular_id' => DB::table('particulars')->insertGetId([
                'program_id' => $fixture['sectionId'],
                'particular_name' => $name,
            ]),
        ]);
    }

    foreach (
        [[12, $fixture['churchId']], [14, $secondChurchId], [17, $secondChurchId], [22, $fixture['churchId']]] as [$age, $participantChurchId]
    ) {
        $participantId = DB::table('participants')->insertGetId([
            'event_id' => $eventId,
            'church_id' => $participantChurchId,
            'first_name' => 'Youth',
            'middle_name' => '',
            'last_name' => 'Age '.$age,
            'extension_name' => null,
            'age' => (string) $age,
            'gender' => 'other',
            'registration_status' => 'pending',
        ], 'participant_id');

        $confirmingRepresentative = $participantChurchId === $secondChurchId
            ? $secondRepresentative
            : $representative;
        $this->actingAs($confirmingRepresentative, 'sanctum')
            ->patchJson('/api/participants/'.$participantId, ['status' => 'confirmed'])
            ->assertOk();
    }

    $age6To14Id = DB::table('particulars')->where('particular_name', 'Estimated number of SDA youth ages 6-14 years')->value('particular_id');
    $age15To21Id = DB::table('particulars')->where('particular_name', 'Estimated number of SDA youth ages 15-21 years')->value('particular_id');

    expect(ReportParticipantCoverage::countFor($districtReportQuarterId, (int) $age6To14Id))->toBe(2)
        ->and(ReportParticipantCoverage::countFor($districtReportQuarterId, (int) $age15To21Id))->toBe(1)
        ->and(DB::table('event_participant_contributions')->count())->toBe(3);
    expect(DB::table('particular_items')
        ->where('quarter_id', $districtReportQuarterId)
        ->where('particular_id', $age6To14Id)
        ->value('value'))->toBe(2)
        ->and(DB::table('particular_items')
            ->where('quarter_id', $districtReportQuarterId)
            ->where('particular_id', $age15To21Id)
            ->value('value'))->toBe(1);

    DB::table('event_participant_contributions')->delete();

    expect(ReportParticipantCoverage::countFor($districtReportQuarterId, (int) $age6To14Id))->toBe(2)
        ->and(ReportParticipantCoverage::countFor($districtReportQuarterId, (int) $age15To21Id))->toBe(1);
});

test('confirmed participants in church events update the pastor district personal report', function () {
    $fixture = reportSubmissionFixture();
    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Personal Report District',
        'address' => 'District Address',
        'parent_id' => null,
    ]);
    DB::table('churches')
        ->where('church_id', $fixture['churchId'])
        ->update(['parent_id' => $districtId]);

    $department = DB::table('departments')->where('department_id', 16)->first();
    if (! $department) {
        DB::table('departments')->insert([
            'department_id' => 16,
            'department_name' => 'Ministerial & Evangelism',
        ]);
    }

    $programId = DB::table('programs')->insertGetId([
        'department_id' => 16,
        'program_name' => 'Ministerial Personal Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => 16,
        'program_name' => 'Demographic Profile',
        'parent_id' => $programId,
    ]);
    $particularId = DB::table('particulars')->insertGetId([
        'program_id' => $sectionId,
        'particular_name' => 'Attendance on 2nd Sabbath',
    ]);
    $localQuarterId = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $fixture['churchId'],
        'quarter' => 'Q4',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $districtQuarterId = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $districtId,
        'quarter' => 'Q4',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $representative = createRepresentative($fixture['churchId'], $fixture['departmentId']);
    $eventId = DB::table('events')->insertGetId([
        'quarter_id' => $localQuarterId,
        'church_id' => $fixture['churchId'],
        'title' => 'Church ministerial event',
        'date_start' => '2026-10-29',
        'date_end' => '2026-10-29',
        'time_start' => '09:00:00',
        'time_end' => '10:00:00',
        'details' => '',
        'status' => 'upcoming',
        'location' => 'Church',
    ], 'event_id');
    DB::table('event_particular')->insert([
        'event_id' => $eventId,
        'particular_id' => $particularId,
    ]);
    DB::table('event_creator')->insert([
        'event_id' => $eventId,
        'user_id' => $representative->user_id,
    ]);
    $participantId = DB::table('participants')->insertGetId([
        'event_id' => $eventId,
        'church_id' => $fixture['churchId'],
        'first_name' => 'Personal',
        'middle_name' => '',
        'last_name' => 'Report Participant',
        'extension_name' => null,
        'age' => '20',
        'gender' => 'other',
        'registration_status' => 'pending',
    ], 'participant_id');

    $this->actingAs($representative, 'sanctum')
        ->patchJson('/api/participants/'.$participantId, ['status' => 'confirmed'])
        ->assertOk();

    $this->assertDatabaseHas('event_participant_contributions', [
        'event_id' => $eventId,
        'participant_id' => $participantId,
        'quarter_id' => $localQuarterId,
        'particular_id' => $particularId,
    ]);
    $this->assertDatabaseHas('particular_items', [
        'quarter_id' => $localQuarterId,
        'particular_id' => $particularId,
        'value' => 1,
    ]);
    $this->assertDatabaseHas('particular_items', [
        'quarter_id' => $districtQuarterId,
        'particular_id' => $particularId,
        'value' => 1,
    ]);

    $pastor = createDistrictPastor($districtId, 16);
    $report = $this->actingAs($pastor, 'sanctum')
        ->getJson("/api/churches/{$districtId}/departments/16/report")
        ->assertOk()
        ->json();
    $particular = collect($report['programs'])
        ->flatMap(fn ($program) => $program['sections'])
        ->flatMap(fn ($section) => $section['particulars'])
        ->firstWhere('particular_id', $particularId);
    $quarter = collect($particular['quarters'])
        ->firstWhere('quarter_id', $districtQuarterId);

    expect($quarter['participant_count'])->toBe(1)
        ->and($quarter['combined_value'])->toBe(1.0);
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

    foreach (['assistant', 'head assistant'] as $role) {
        $assistant = User::query()->create([
            'department_id' => 16,
            'church_id' => $churchId,
            'first_name' => 'Report',
            'middle_name' => '',
            'last_name' => ucfirst($role),
            'birthdate' => '1980-01-01',
            'gender' => 'other',
            'role' => $role,
            'email' => "personal-report-{$role}@example.com",
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
                    'details' => "{$role} comment for {$name}.",
                ])
                ->assertCreated()
                ->assertJsonPath('data.details', "{$role} comment for {$name}.");

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
                'details' => "{$role} comment for {$name}.",
            ]);
        }
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

test('representative cannot submit a quarter until the previous quarter is approved', function () {
    $fixture = reportSubmissionFixture();
    $programId = DB::table('programs')
        ->where('department_id', $fixture['departmentId'])
        ->whereNull('parent_id')
        ->value('program_id');
    $q2Id = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $fixture['churchId'],
        'quarter' => 'Q2',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $representative = createRepresentative(
        $fixture['churchId'],
        $fixture['departmentId']
    );
    $url = "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/save";
    $payload = [
        'submitted' => true,
        'items' => array_map(
            fn (int $particularId) => [
                'particular_id' => $particularId,
                'quarter_id' => $q2Id,
                'value' => 10,
            ],
            $fixture['particularIds']
        ),
    ];

    $this->actingAs($representative, 'sanctum')
        ->postJson($url, $payload)
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'The previous quarter must be approved before submitting this report.'
        );

    $this->assertDatabaseMissing('comments', [
        'quarter_id' => $q2Id,
        'details' => 'Report submitted.',
    ]);

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $q2Id,
        'date_submitted' => null,
    ]);

    DB::table('quarters')
        ->where('quarter_id', $fixture['quarterId'])
        ->update(['mission_approve' => '2026-03-01']);

    $this->actingAs($representative, 'sanctum')
        ->postJson($url, $payload)
        ->assertOk();

    $this->assertDatabaseHas('comments', [
        'quarter_id' => $q2Id,
        'commented_by' => $representative->user_id,
        'details' => 'Report submitted.',
    ]);

    $this->actingAs($representative, 'sanctum')
        ->postJson($url, $payload)
        ->assertOk();

    $this->assertDatabaseHas('comments', [
        'quarter_id' => $q2Id,
        'commented_by' => $representative->user_id,
        'details' => 'Report resubmitted.',
    ]);

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $q2Id,
        'date_submitted' => now()->toDateString(),
    ]);
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
            ['program_id' => $fixture['programId'], 'year' => 2026, 'quarter' => 'Q2']
        )
        ->assertOk();
    $this->assertDatabaseHas('comments', [
        'quarter_id' => $q2Id,
        'commented_by' => $pastor->user_id,
        'details' => 'Report endorsed.',
    ]);

    $assistant = createReportAssistant($fixture['churchId'], $fixture['departmentId']);
    $approvalUrl = "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report/approve";

    $this->actingAs($assistant, 'sanctum')
        ->postJson($approvalUrl, [
            'program_id' => $fixture['programId'],
            'year' => 2026,
            'quarter' => 'Q2',
        ])
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
        ->postJson($approvalUrl, [
            'program_id' => $fixture['programId'],
            'year' => 2026,
            'quarter' => 'Q2',
        ])
        ->assertOk();
    $this->assertDatabaseHas('comments', [
        'quarter_id' => $q2Id,
        'commented_by' => $assistant->user_id,
        'details' => 'Report approved.',
    ]);

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $q2Id,
        'mission_approve' => now()->toDateString(),
    ]);
});

test('endorsing and approving one report program leaves other report programs unchanged', function () {
    $fixture = reportSubmissionFixture();
    $otherProgramId = DB::table('programs')->insertGetId([
        'department_id' => $fixture['departmentId'],
        'program_name' => 'Other Report',
        'parent_id' => null,
    ]);

    $selectedQ2Id = DB::table('quarters')->insertGetId([
        'program_id' => $fixture['programId'],
        'church_id' => $fixture['churchId'],
        'quarter' => 'Q2',
        'year' => '2026',
        'date_submitted' => '2026-06-01',
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $otherQ1Id = DB::table('quarters')->insertGetId([
        'program_id' => $otherProgramId,
        'church_id' => $fixture['churchId'],
        'quarter' => 'Q1',
        'year' => '2026',
        'date_submitted' => '2026-03-01',
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $otherQ2Id = DB::table('quarters')->insertGetId([
        'program_id' => $otherProgramId,
        'church_id' => $fixture['churchId'],
        'quarter' => 'Q2',
        'year' => '2026',
        'date_submitted' => '2026-06-01',
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    DB::table('quarters')
        ->where('quarter_id', $fixture['quarterId'])
        ->update(['mission_approve' => '2026-03-03']);

    $pastor = createDistrictPastor($fixture['churchId'], $fixture['departmentId']);
    $baseUrl = "/api/churches/{$fixture['churchId']}/departments/{$fixture['departmentId']}/report";

    $this->actingAs($pastor, 'sanctum')
        ->postJson("{$baseUrl}/endorse", [
            'program_id' => $fixture['programId'],
            'year' => 2026,
            'quarter' => 'Q2',
        ])
        ->assertOk();

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $selectedQ2Id,
        'district_endorse' => now()->toDateString(),
    ]);
    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $otherQ2Id,
        'district_endorse' => null,
    ]);

    $assistant = createReportAssistant($fixture['churchId'], $fixture['departmentId']);
    $this->actingAs($assistant, 'sanctum')
        ->postJson("{$baseUrl}/approve", [
            'program_id' => $fixture['programId'],
            'year' => 2026,
            'quarter' => 'Q2',
        ])
        ->assertOk();

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $selectedQ2Id,
        'mission_approve' => now()->toDateString(),
    ]);
    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $otherQ2Id,
        'mission_approve' => null,
    ]);
    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $otherQ1Id,
        'mission_approve' => null,
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
        ['program_id' => $programId, 'year' => 2026, 'quarter' => 'Q3']
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
            ['program_id' => $fixture['programId'], 'year' => 2026, 'quarter' => 'Q1']
        )
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'The representative must submit all report data before endorsement.'
        );
});

test('pastor personal report submission automatically endorses and remains pending assistant approval', function () {
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Personal Report District',
        'address' => 'Test region',
        'parent_id' => null,
    ]);
    $departmentId = 16;
    DB::table('departments')->insert([
        'department_id' => $departmentId,
        'department_name' => 'Ministerial & Evangelism',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Personal Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Activities',
        'parent_id' => $programId,
    ]);
    $particularId = DB::table('particulars')->insertGetId([
        'program_id' => $sectionId,
        'particular_name' => 'Members visited',
    ]);
    $quarterId = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $churchId,
        'quarter' => 'Q1',
        'year' => '2026',
        'date_submitted' => null,
        'district_endorse' => null,
        'mission_approve' => null,
    ]);
    $pastor = createDistrictPastor($churchId, $departmentId);
    $reportUrl = "/api/churches/{$churchId}/departments/{$departmentId}/report";

    $this->actingAs($pastor, 'sanctum')
        ->postJson("{$reportUrl}/save", [
            'items' => [[
                'particular_id' => $particularId,
                'quarter_id' => $quarterId,
                'value' => 12,
            ]],
            'submitted' => true,
        ])
        ->assertOk()
        ->assertJsonPath(
            'message',
            'Personal report submitted and endorsed. The assistant can now review it.'
        );

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $quarterId,
        'date_submitted' => now()->toDateString(),
        'district_endorse' => now()->toDateString(),
        'mission_approve' => null,
    ]);

    $assistant = createReportAssistant($churchId, $departmentId);
    $this->actingAs($assistant, 'sanctum')
        ->postJson("{$reportUrl}/approve", [
            'program_id' => $programId,
            'year' => 2026,
            'quarter' => 'Q1',
        ])
        ->assertOk();

    $this->assertDatabaseHas('quarters', [
        'quarter_id' => $quarterId,
        'mission_approve' => now()->toDateString(),
    ]);
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

test('church monitoring can be scoped to one department and exposes report workflow stages', function () {
    $fixture = reportSubmissionFixture();
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Bayombong',
        'address' => 'Nueva Vizcaya',
        'parent_id' => $fixture['churchId'],
    ]);

    DB::table('quarters')
        ->where('quarter_id', $fixture['quarterId'])
        ->update([
            'church_id' => $churchId,
            'date_submitted' => '2026-10-13',
            'district_endorse' => '2026-10-14',
            'mission_approve' => '2026-10-15',
        ]);

    $otherDepartmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Stewardship',
    ]);
    $otherProgramId = DB::table('programs')->insertGetId([
        'department_id' => $otherDepartmentId,
        'program_name' => 'Stewardship Program',
        'parent_id' => null,
    ]);
    DB::table('quarters')->insert([
        'program_id' => $otherProgramId,
        'church_id' => $churchId,
        'quarter' => 'Q1',
        'year' => '2026',
        'date_submitted' => '2026-10-13',
        'district_endorse' => null,
        'mission_approve' => null,
    ]);

    $url = "/api/districts/{$fixture['churchId']}/churches";

    $this->getJson("{$url}?department_id={$fixture['departmentId']}")
        ->assertOk()
        ->assertJsonPath('data.0.monitoring.q1_submitted', true)
        ->assertJsonPath('data.0.monitoring.q1_endorsed', true)
        ->assertJsonPath('data.0.monitoring.q1_approved', true);

    $this->getJson($url)
        ->assertOk()
        ->assertJsonPath('data.0.monitoring.q1_submitted', true)
        ->assertJsonPath('data.0.monitoring.q1_endorsed', false)
        ->assertJsonPath('data.0.monitoring.q1_approved', false);
});

test('district church response includes direct district pastor report monitoring', function () {
    $fixture = reportSubmissionFixture();
    $districtId = $fixture['churchId'];
    $childChurchId = DB::table('churches')->insertGetId([
        'name' => 'District Pastor Monitoring Church',
        'address' => 'District Address',
        'parent_id' => $districtId,
    ]);
    DB::table('departments')->insert([
        'department_id' => 16,
        'department_name' => 'Ministerial & Evangelism',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => 16,
        'program_name' => 'Ministerial Personal Report',
        'parent_id' => null,
    ]);

    foreach ([[$districtId, '2026-10-13'], [$childChurchId, null]] as [$churchId, $submittedAt]) {
        DB::table('quarters')->insert([
            'program_id' => $programId,
            'church_id' => $churchId,
            'quarter' => 'Q1',
            'year' => '2026',
            'date_submitted' => $submittedAt,
            'district_endorse' => null,
            'mission_approve' => null,
        ]);
    }

    $this->getJson("/api/districts/{$districtId}/churches?department_id=16")
        ->assertOk()
        ->assertJsonPath('district.monitoring.q1_submitted', true)
        ->assertJsonPath('data.0.monitoring.q1_submitted', false);
});
