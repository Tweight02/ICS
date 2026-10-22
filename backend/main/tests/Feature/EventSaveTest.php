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
            'department_id' => $departmentId,
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
            ->assertJsonPath('data.abilities.manage_participants', true);
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
            'department_id' => $departmentId,
            'particular_ids' => [$particularId],
            'district_ids' => $districtIds,
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertForbidden();
        $this->deleteJson('/api/events/'.$eventId)->assertForbidden();
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
        $otherProgramId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => 'Other Youth Program',
            'parent_id' => null,
        ], 'program_id');
        $otherParticularId = DB::table('particulars')->insertGetId([
            'program_id' => $otherProgramId,
            'particular_name' => 'Other Activity',
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
            ->assertJsonPath('data.user_id', $user->user_id);

        Sanctum::actingAs($user);

        $this->postJson('/api/events', [
            'title' => 'Invalid Mixed Particulars',
            'location' => 'Central Church',
            'department_id' => $departmentId,
            'particular_ids' => [$particularId, $otherParticularId],
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ])->assertUnprocessable()->assertJsonValidationErrors('particular_ids');

        $response = $this->postJson('/api/events', [
            'title' => 'Youth Gathering',
            'location' => 'Central Church',
            'department_id' => $departmentId,
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
            ->assertJsonPath('data.scope.churches.0.name', 'Central Church');

        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonFragment(['id' => $eventId, 'title' => 'Youth Gathering']);

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
}
