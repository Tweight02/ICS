<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventSaveTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_assistant_can_save_an_event_for_multiple_districts(): void
    {
        $departmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Youth'],
            'department_id'
        );
        $districtIds = [];
        foreach (['North District', 'South District'] as $name) {
            $districtIds[] = DB::table('churches')->insertGetId([
                'name' => $name,
                'address' => $name,
                'parent_id' => null,
            ], 'church_id');
        }
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => 'Youth Program',
            'parent_id' => null,
        ], 'program_id');
        $particularId = DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Youth Gathering',
        ], 'particular_id');
        DB::table('quarters')->insert([
            'program_id' => $programId,
            'church_id' => $districtIds[0],
            'quarter' => 'Q4',
            'year' => '2026',
        ]);
        $assistant = User::create([
            'department_id' => $departmentId,
            'church_id' => $districtIds[0],
            'first_name' => 'Alex',
            'last_name' => 'Assistant',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'assistant',
            'email' => 'assistant@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);

        Sanctum::actingAs($assistant);
        $response = $this->postJson('/api/events', [
            'title' => 'Multi-district Youth Gathering',
            'location' => 'North District',
            'particular_ids' => [$particularId],
            'district_ids' => $districtIds,
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.scope.districts.0.id', $districtIds[0])
            ->assertJsonPath('data.scope.districts.1.id', $districtIds[1])
            ->assertJsonPath('data.abilities.update', true)
            ->assertJsonPath('data.abilities.manage_participants', true)
            ->assertJsonPath('data.abilities.confirm_participants', false);
        $eventId = $response->json('data.id');
        $this->assertDatabaseHas('events', [
            'event_id' => $eventId,
            'church_id' => $districtIds[0],
        ]);

        foreach ($districtIds as $districtId) {
            $this->assertDatabaseHas('event_district', [
                'event_id' => $eventId,
                'district_id' => $districtId,
            ]);
        }

        $representativeChurchId = DB::table('churches')->insertGetId([
            'name' => 'North Local Church',
            'address' => 'North',
            'parent_id' => $districtIds[0],
        ], 'church_id');
        $representativeQuarterId = DB::table('quarters')->insertGetId([
            'program_id' => $programId,
            'church_id' => $representativeChurchId,
            'quarter' => 'Q4',
            'year' => '2026',
        ], 'quarter_id');
        $outsideDistrictId = DB::table('churches')->insertGetId([
            'name' => 'Outside District',
            'address' => 'Outside',
            'parent_id' => null,
        ], 'church_id');
        foreach ([
            [
                'district_id' => $districtIds[0],
                'church_id' => $representativeChurchId,
                'email' => 'north-rep@example.test',
            ],
            [
                'district_id' => $outsideDistrictId,
                'church_id' => $outsideDistrictId,
                'email' => 'outside-rep@example.test',
            ],
        ] as $index => $assignment) {
            $representative = User::create([
                'department_id' => $departmentId,
                'church_id' => $assignment['church_id'],
                'first_name' => 'Representative '.$index,
                'last_name' => 'Church',
                'birthdate' => '1990-01-01',
                'gender' => 'Other',
                'role' => 'representative',
                'email' => $assignment['email'],
                'password' => Hash::make('password'),
                'status' => 'active',
            ]);
            Sanctum::actingAs($representative);
            $events = $this->getJson('/api/events?status=all')->assertOk();
            if ($assignment['district_id'] === $districtIds[0]) {
                $events->assertJsonFragment(['id' => $eventId, 'title' => 'Multi-district Youth Gathering']);

                $link = $this->postJson('/api/events/'.$eventId.'/registration-link')
                    ->assertOk()
                    ->assertJsonPath('data.church_id', $representativeChurchId)
                    ->json('data');
                $registration = $this->postJson(
                    '/api/public/events/'.$eventId.'/participants?church_id='.$link['church_id']
                        .'&registration_token='.$link['registration_token'],
                    [
                        'first_name' => 'Church',
                        'last_name' => 'Registrant',
                        'age' => 25,
                        'gender' => 'other',
                    ]
                )->assertCreated();
                $this->assertDatabaseHas('participants', [
                    'participant_id' => $registration->json('data.id'),
                    'event_id' => $eventId,
                    'church_id' => $representativeChurchId,
                ]);
                $this->patchJson('/api/participants/'.$registration->json('data.id'), [
                    'status' => 'confirmed',
                ])->assertOk();
                $this->assertDatabaseHas('event_participant_contributions', [
                    'event_id' => $eventId,
                    'participant_id' => $registration->json('data.id'),
                    'quarter_id' => $representativeQuarterId,
                    'particular_id' => $particularId,
                ]);
                $this->assertDatabaseHas('particular_items', [
                    'quarter_id' => $representativeQuarterId,
                    'particular_id' => $particularId,
                    'manual_value' => null,
                    'value' => 1,
                ]);
            } else {
                $events->assertJsonMissing(['id' => $eventId, 'title' => 'Multi-district Youth Gathering']);
            }
        }
        Sanctum::actingAs($assistant);

        $this->getJson('/api/public/events')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $eventId,
                'title' => 'Multi-district Youth Gathering',
            ]);
        $registration = $this->postJson('/api/public/events/'.$eventId.'/participants', [
            'first_name' => 'Public',
            'middle_name' => 'Event',
            'last_name' => 'Registrant',
            'age' => 25,
            'gender' => 'other',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');
        $this->assertDatabaseHas('participants', [
            'participant_id' => $registration->json('data.id'),
            'event_id' => $eventId,
            'church_id' => $districtIds[0],
            'first_name' => 'Public',
            'last_name' => 'Registrant',
        ]);

        Sanctum::actingAs($assistant);
        $this->postJson('/api/events/'.$eventId.'/participants', [
            'first_name' => 'Assistant',
            'last_name' => 'Confirmation',
            'age' => 25,
            'gender' => 'Other',
            'registration_status' => 'confirmed',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('registration_status');
        $this->patchJson('/api/participants/'.$registration->json('data.id'), [
            'status' => 'confirmed',
        ])->assertForbidden();

        $participantId = $this->postJson('/api/events/'.$eventId.'/participants', [
            'first_name' => 'Taylor',
            'last_name' => 'Member',
            'age' => 24,
            'gender' => 'Other',
        ])->assertCreated()->json('data.id');
        for ($index = 1; $index <= 9; $index++) {
            DB::table('participants')->insert([
                'event_id' => $eventId,
                'church_id' => $districtIds[0],
                'first_name' => 'Participant '.$index,
                'middle_name' => '',
                'last_name' => 'Member',
                'age' => '20',
                'gender' => 'Other',
                'registration_status' => 'pending',
            ]);
        }

        $southPastor = User::create([
            'department_id' => $departmentId,
            'church_id' => $districtIds[1],
            'first_name' => 'Sam',
            'last_name' => 'Pastor',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'pastor',
            'email' => 'pastor@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        Sanctum::actingAs($southPastor);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonFragment(['id' => $eventId, 'title' => 'Multi-district Youth Gathering']);
        $this->getJson('/api/events/'.$eventId)
            ->assertOk()
            ->assertJsonPath('data.scope.districts.1.id', $districtIds[1])
            ->assertJsonPath('data.abilities.update', false)
            ->assertJsonPath('data.abilities.delete', false)
            ->assertJsonPath('data.abilities.manage_participants', false);
        $this->getJson('/api/events/'.$eventId.'/participants')
            ->assertOk()
            ->assertJsonFragment(['id' => $participantId])
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 11)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonCount(10, 'data');
        $this->getJson('/api/events/'.$eventId.'/participants?page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.current_page', 2);
        $this->postJson('/api/events/'.$eventId.'/participants', [
            'first_name' => 'Unauthorized',
            'last_name' => 'Participant',
            'age' => 20,
            'gender' => 'Other',
        ])->assertForbidden();
        $this->patchJson('/api/participants/'.$participantId, [
            'status' => 'confirmed',
        ])->assertForbidden();
        $this->deleteJson('/api/participants/'.$participantId)->assertForbidden();
        $this->deleteJson('/api/events/'.$eventId)->assertForbidden();

        $anotherAssistant = User::create([
            'department_id' => $departmentId,
            'church_id' => $districtIds[0],
            'first_name' => 'Jamie',
            'last_name' => 'Assistant',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'assistant',
            'email' => 'another-assistant@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        Sanctum::actingAs($anotherAssistant);
        $this->putJson('/api/events/'.$eventId, [
            'title' => 'Changed by another user',
            'location' => 'South District',
            'particular_ids' => [$particularId],
            'district_ids' => $districtIds,
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertForbidden();
        $this->deleteJson('/api/events/'.$eventId)->assertForbidden();

        DB::table('events')->where('event_id', $eventId)->update([
            'date_start' => '2026-10-01',
            'date_end' => '2026-10-02',
        ]);
        $this->getJson('/api/public/events')
            ->assertOk()
            ->assertJsonPath('data.0.id', $eventId)
            ->assertJsonPath('data.0.registration_open', false);
        $this->postJson('/api/public/events/'.$eventId.'/participants', [
            'first_name' => 'Late',
            'last_name' => 'Registrant',
            'age' => 25,
            'gender' => 'other',
        ])->assertNotFound();
    }

    public function test_a_church_representative_saves_an_event_using_the_final_erd_columns(): void
    {
        $departmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Youth'],
            'department_id'
        );
        $districtId = DB::table('churches')->insertGetId([
            'name' => 'North District',
            'address' => 'North',
            'parent_id' => null,
        ], 'church_id');
        $churchId = DB::table('churches')->insertGetId([
            'name' => 'Central Church',
            'address' => 'Central',
            'parent_id' => $districtId,
        ], 'church_id');
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => 'Youth Program',
            'parent_id' => null,
        ], 'program_id');
        $particularId = DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Youth Gathering',
        ], 'particular_id');
        $quarterId = DB::table('quarters')->insertGetId([
            'program_id' => $programId,
            'church_id' => $churchId,
            'quarter' => 'Q4',
            'year' => '2026',
        ], 'quarter_id');
        DB::table('quarters')->insert([
            'program_id' => $programId,
            'church_id' => $districtId,
            'quarter' => 'Q4',
            'year' => '2026',
        ]);
        $otherProgramId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => 'Other Youth Program',
            'parent_id' => null,
        ], 'program_id');
        $otherParticularId = DB::table('particulars')->insertGetId([
            'program_id' => $otherProgramId,
            'particular_name' => 'Other Activity',
        ], 'particular_id');
        $otherDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Family Life'],
            'department_id'
        );
        $foreignProgramId = DB::table('programs')->insertGetId([
            'department_id' => $otherDepartmentId,
            'program_name' => 'Family Life Program',
            'parent_id' => null,
        ], 'program_id');
        $foreignParticularId = DB::table('particulars')->insertGetId([
            'program_id' => $foreignProgramId,
            'particular_name' => 'Family Life Activity',
        ], 'particular_id');

        $user = User::create([
            'department_id' => $departmentId,
            'church_id' => $churchId,
            'first_name' => 'Casey',
            'last_name' => 'Representative',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'representative',
            'email' => 'representative@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);

        $this->getJson('/api/users/'.$user->user_id)
            ->assertOk()
            ->assertJsonPath('data.user_id', $user->user_id)
            ->assertJsonPath('data.department.department_name', 'Youth');

        Sanctum::actingAs($user);

        $this->postJson('/api/events', [
            'title' => 'Foreign Department Particular',
            'location' => 'Central Church',
            'department_id' => $otherDepartmentId,
            'particular_ids' => [$foreignParticularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertUnprocessable()->assertJsonValidationErrors('particular_ids');

        $this->postJson('/api/events', [
            'title' => 'Invalid Mixed Particulars',
            'location' => 'Central Church',
            'particular_ids' => [$particularId, $otherParticularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertUnprocessable()->assertJsonValidationErrors('particular_ids');

        $response = $this->postJson('/api/events', [
            'title' => 'Youth Gathering',
            'location' => 'Central Church',
            'particular_ids' => [$particularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
            'notes' => 'Test event',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Youth Gathering')
            ->assertJsonPath('data.quarter', 4)
            ->assertJsonPath('data.particular_ids.0', $particularId);

        $eventId = $response->json('data.id');
        $this->assertDatabaseHas('events', [
            'event_id' => $eventId,
            'quarter_id' => $quarterId,
            'church_id' => $churchId,
            'title' => 'Youth Gathering',
            'details' => 'Test event',
        ]);

        $this->getJson('/api/events/'.$eventId)
            ->assertOk()
            ->assertJsonPath('data.title', 'Youth Gathering')
            ->assertJsonPath('data.id', $eventId)
            ->assertJsonPath('data.department.name', 'Youth')
            ->assertJsonPath('data.programs.0.name', 'Youth Program')
            ->assertJsonPath('data.programs.0.particulars.0.particular_name', 'Youth Gathering')
            ->assertJsonPath('data.scope.churches.0.name', 'Central Church')
            ->assertJsonPath('data.abilities.confirm_participants', true);

        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonFragment(['id' => $eventId, 'title' => 'Youth Gathering']);

        $crossDepartmentRepresentative = User::create([
            'department_id' => $otherDepartmentId,
            'church_id' => $churchId,
            'first_name' => 'Riley',
            'last_name' => 'Representative',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'representative',
            'email' => 'cross-department-rep@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        Sanctum::actingAs($crossDepartmentRepresentative);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonFragment(['id' => $eventId, 'title' => 'Youth Gathering']);

        $publicRegistration = $this->postJson('/api/public/events/'.$eventId.'/participants', [
            'first_name' => 'Public',
            'last_name' => 'Registrant',
            'age' => 25,
            'gender' => 'other',
        ])->assertCreated();
        $this->assertDatabaseHas('participants', [
            'participant_id' => $publicRegistration->json('data.id'),
            'event_id' => $eventId,
            'church_id' => $churchId,
            'first_name' => 'Public',
            'last_name' => 'Registrant',
        ]);

        $otherDepartmentDirector = User::create([
            'department_id' => $otherDepartmentId,
            'church_id' => $districtId,
            'first_name' => 'Morgan',
            'last_name' => 'Director',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'director',
            'email' => 'other-department-director@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        Sanctum::actingAs($otherDepartmentDirector);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonMissing(['id' => $eventId, 'title' => 'Youth Gathering']);
        $this->getJson('/api/events/'.$eventId)->assertNotFound();

        $districtPastor = User::create([
            'department_id' => $departmentId,
            'church_id' => $districtId,
            'first_name' => 'Jordan',
            'last_name' => 'Pastor',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'pastor',
            'email' => 'district-pastor@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        Sanctum::actingAs($districtPastor);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonFragment(['id' => $eventId, 'title' => 'Youth Gathering']);

        $districtEventId = $this->postJson('/api/events', [
            'title' => 'District-wide Pastor Event',
            'location' => 'North District',
            'church_ids' => [$districtId],
            'particular_ids' => [$particularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($user);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonFragment(['id' => $districtEventId, 'title' => 'District-wide Pastor Event']);

        $otherDistrictId = DB::table('churches')->insertGetId([
            'name' => 'South District',
            'address' => 'South',
            'parent_id' => null,
        ], 'church_id');
        $otherDistrictPastor = User::create([
            'department_id' => $departmentId,
            'church_id' => $otherDistrictId,
            'first_name' => 'Taylor',
            'last_name' => 'Pastor',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'pastor',
            'email' => 'other-district-pastor@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        Sanctum::actingAs($otherDistrictPastor);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonMissing(['id' => $eventId, 'title' => 'Youth Gathering']);

        Sanctum::actingAs($user);
        $participant = $this->postJson('/api/events/'.$eventId.'/participants', [
            'first_name' => 'Taylor',
            'last_name' => 'Member',
            'age' => 24,
            'gender' => 'Other',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Taylor Member')
            ->assertJsonPath('data.status', 'pending');

        $this->patchJson('/api/participants/'.$participant->json('data.id'), [
            'status' => 'confirmed',
        ])->assertOk()->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('participants', [
            'event_id' => $eventId,
            'church_id' => $churchId,
            'first_name' => 'Taylor',
            'last_name' => 'Member',
            'registration_status' => 'confirmed',
        ]);
        $this->assertDatabaseHas('event_particular', [
            'event_id' => $eventId,
            'particular_id' => $particularId,
        ]);
        $this->assertTrue(Schema::hasTable('event_particular'));
        $this->assertTrue(Schema::hasTable('event_district'));
        $this->assertTrue(Schema::hasTable('event_creator'));
        $this->assertFalse(Schema::hasTable('church_events'));
        $this->assertFalse(Schema::hasTable('church_event_church'));
        $this->assertFalse(Schema::hasTable('church_event_district'));
        $this->assertFalse(Schema::hasTable('church_event_participants'));
        $this->assertFalse(Schema::hasTable('church_event_particular'));
        $this->assertSame([
            'event_id',
            'quarter_id',
            'church_id',
            'title',
            'date_start',
            'date_end',
            'time_start',
            'time_end',
            'details',
            'status',
            'location',
        ], Schema::getColumnListing('events'));
    }

    public function test_a_church_representative_can_select_the_event_department(): void
    {
        $assignedDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Assigned Department'],
            'department_id'
        );
        $selectedDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Selected Department'],
            'department_id'
        );
        $personalDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Baptism Record'],
            'department_id'
        );
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $selectedDepartmentId,
            'program_name' => 'Selected Program',
            'parent_id' => null,
        ], 'program_id');
        $particularId = DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Selected Particular',
        ], 'particular_id');
        $wrongProgramId = DB::table('programs')->insertGetId([
            'department_id' => $assignedDepartmentId,
            'program_name' => 'Assigned Program',
            'parent_id' => null,
        ], 'program_id');
        $wrongParticularId = DB::table('particulars')->insertGetId([
            'program_id' => $wrongProgramId,
            'particular_name' => 'Assigned Particular',
        ], 'particular_id');
        $churchId = DB::table('churches')->insertGetId([
            'name' => 'Representative Church',
            'address' => 'Town',
            'parent_id' => null,
        ], 'church_id');
        $quarterId = DB::table('quarters')->insertGetId([
            'program_id' => $programId,
            'church_id' => $churchId,
            'quarter' => 'Q4',
            'year' => '2026',
        ], 'quarter_id');
        $representative = User::create([
            'department_id' => $assignedDepartmentId,
            'church_id' => $churchId,
            'first_name' => 'Casey',
            'last_name' => 'Representative',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'representative',
            'email' => 'department-choice-rep@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);

        Sanctum::actingAs($representative);
        $this->getJson('/api/event-departments')
            ->assertOk()
            ->assertJsonFragment(['department_id' => $selectedDepartmentId])
            ->assertJsonMissing(['department_id' => $personalDepartmentId]);
        $response = $this->postJson('/api/events', [
            'title' => 'Selected Department Event',
            'location' => 'Representative Church',
            'department_id' => $selectedDepartmentId,
            'particular_ids' => [$particularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertCreated()
            ->assertJsonPath('data.department.id', $selectedDepartmentId);

        $this->assertDatabaseHas('events', [
            'event_id' => $response->json('data.id'),
            'quarter_id' => $quarterId,
            'church_id' => $churchId,
        ]);

        $this->postJson('/api/events', [
            'title' => 'Mismatched Department Event',
            'location' => 'Representative Church',
            'department_id' => $selectedDepartmentId,
            'particular_ids' => [$wrongParticularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('particular_ids');
    }

    public function test_a_pastor_can_select_personal_report_departments_for_events(): void
    {
        $assignedDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Assigned Department'],
            'department_id'
        );
        $personalDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Baptism Record'],
            'department_id'
        );
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $personalDepartmentId,
            'program_name' => 'Baptism Record',
            'parent_id' => null,
        ], 'program_id');
        $particularId = DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Baptisms Reported',
        ], 'particular_id');
        $districtId = DB::table('churches')->insertGetId([
            'name' => 'Pastor District',
            'address' => 'Town',
            'parent_id' => null,
        ], 'church_id');
        $quarterId = DB::table('quarters')->insertGetId([
            'program_id' => $programId,
            'church_id' => $districtId,
            'quarter' => 'Q4',
            'year' => '2026',
        ], 'quarter_id');
        $pastor = User::create([
            'department_id' => $assignedDepartmentId,
            'church_id' => $districtId,
            'first_name' => 'Jordan',
            'last_name' => 'Pastor',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'pastor',
            'email' => 'personal-report-event-pastor@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);

        Sanctum::actingAs($pastor);
        $this->getJson('/api/event-departments')
            ->assertOk()
            ->assertJsonFragment(['department_id' => $personalDepartmentId]);

        $response = $this->postJson('/api/events', [
            'title' => 'Pastor Baptism Event',
            'location' => 'Pastor District',
            'department_id' => $personalDepartmentId,
            'church_ids' => [$districtId],
            'particular_ids' => [$particularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertCreated()
            ->assertJsonPath('data.department.id', $personalDepartmentId);

        $this->assertDatabaseHas('events', [
            'event_id' => $response->json('data.id'),
            'quarter_id' => $quarterId,
            'church_id' => $districtId,
        ]);
    }
}
