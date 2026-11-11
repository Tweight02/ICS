<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventScheduleConflictTest extends TestCase
{
    use RefreshDatabase;

    public function test_assistant_mission_event_blocks_a_district_event_in_the_same_department(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['assistant']);
        $this->postJson('/api/events', $context['missionPayload'])->assertCreated();

        Sanctum::actingAs($context['pastor']);
        $conflictPayload = $context['districtPayload'];
        $conflictPayload['confirm_overlap'] = true;
        $response = $this->postJson('/api/events', $conflictPayload)
            ->assertStatus(409)
            ->assertJsonPath('code', 'EVENT_SCHEDULE_OVERLAP');
        $this->assertStringContainsString('Mission event', $response->json('message'));

        $this->assertDatabaseCount('events', 1);
    }

    public function test_district_event_blocks_a_church_event_in_the_same_district(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['pastor']);
        $this->postJson('/api/events', $context['districtPayload'])->assertCreated();

        Sanctum::actingAs($context['representativeA']);
        $this->postJson('/api/events', $context['churchPayload'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'EVENT_SCHEDULE_OVERLAP');
    }

    public function test_a_church_event_in_another_district_does_not_conflict(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['representativeA']);
        $this->postJson('/api/events', $context['churchPayload'])->assertCreated();

        Sanctum::actingAs($context['representativeB']);
        $payload = $context['churchPayload'];
        $payload['church_id'] = $context['churchB'];
        $payload['host_church_id'] = $context['churchB'];
        $payload['title'] = 'South District event';

        $this->postJson('/api/events', $payload)->assertCreated();
        $this->assertDatabaseCount('events', 2);
    }

    public function test_church_representatives_only_see_mission_district_and_their_own_church_events(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['representativeA']);
        $this->postJson('/api/events', $context['churchPayload'])->assertCreated();

        $secondChurchPayload = $context['churchPayload'];
        $secondChurchPayload['church_id'] = $context['churchA2'];
        $secondChurchPayload['host_church_id'] = $context['churchA2'];
        $secondChurchPayload['start_time'] = '12:00';
        $secondChurchPayload['end_time'] = '13:00';
        Sanctum::actingAs($context['representativeA2']);
        $this->postJson('/api/events', $secondChurchPayload)->assertCreated();

        Sanctum::actingAs($context['representativeA']);
        $this->getJson('/api/events?status=all')->assertOk()->assertJsonCount(1, 'data');

        Sanctum::actingAs($context['pastor']);
        $this->getJson('/api/events?status=all')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_events_in_different_departments_can_overlap(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['representativeA']);
        $this->postJson('/api/events', $context['churchPayload'])->assertCreated();

        $payload = $context['churchPayload'];
        $payload['department_id'] = $context['musicDepartmentId'];
        $payload['particular_ids'] = [$context['musicParticularId']];
        $payload['title'] = 'Music event';
        $this->postJson('/api/events', $payload)->assertCreated();
        $this->assertDatabaseCount('events', 2);
    }

    public function test_non_overlapping_times_on_the_same_day_are_allowed(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['representativeA']);
        $this->postJson('/api/events', $context['churchPayload'])->assertCreated();

        $payload = $context['churchPayload'];
        $payload['start_time'] = '18:00';
        $payload['end_time'] = '20:00';
        $this->postJson('/api/events', $payload)->assertCreated();
        $this->assertDatabaseCount('events', 2);
    }

    public function test_assistant_event_is_mission_scoped_and_visible_downward(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['assistant']);
        $response = $this->postJson('/api/events', $context['missionPayload'])->assertCreated();
        $response->assertJsonPath('data.scope_type', 'MISSION')
            ->assertJsonPath('data.scope.all_districts', true);
        $this->assertDatabaseHas('events', [
            'event_id' => $response->json('data.id'),
            'created_by' => $context['assistant']->user_id,
            'creator_role' => 'ASSISTANT',
            'scope_type' => 'MISSION',
            'scope_id' => 1,
            'district_id' => null,
            'department_id' => $context['youthDepartmentId'],
            'status' => 'ACTIVE',
        ]);

        Sanctum::actingAs($context['representativeB']);
        $this->getJson('/api/events?status=all')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_directors_only_see_events_for_their_department(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['assistant']);
        $this->postJson('/api/events', $context['missionPayload'])->assertCreated();
        $musicPayload = $context['missionPayload'];
        $musicPayload['department_id'] = $context['musicDepartmentId'];
        $musicPayload['particular_ids'] = [$context['musicParticularId']];
        $musicPayload['title'] = 'Mission music event';
        $this->postJson('/api/events', $musicPayload)->assertCreated();

        Sanctum::actingAs($context['director']);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Mission event');

        Sanctum::actingAs($context['musicDirector']);
        $this->getJson('/api/events?status=all')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Mission music event');
    }

    public function test_district_pastor_cannot_create_an_event_for_another_district(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['pastor']);
        $payload = $context['districtPayload'];
        $payload['church_ids'] = [$context['churchB']];

        $this->postJson('/api/events', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['church_ids']);
        $this->assertDatabaseCount('events', 0);
    }

    public function test_church_representative_cannot_create_an_event_for_another_church(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['representativeA']);
        $payload = $context['churchPayload'];
        $payload['church_id'] = $context['churchB'];

        $this->postJson('/api/events', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['church_id']);
        $this->assertDatabaseCount('events', 0);
    }

    public function test_director_cannot_create_events(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['director']);

        $this->postJson('/api/events', $context['churchPayload'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Directors cannot create or edit events.');
        $this->assertDatabaseCount('events', 0);
    }

    /**
     * @return array<string, mixed>
     */
    private function eventContext(): array
    {
        $youthDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Youth'],
            'department_id'
        );
        $musicDepartmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Music'],
            'department_id'
        );
        $districtA = $this->church('North District');
        $districtB = $this->church('South District');
        $churchA = $this->church('North Church', $districtA);
        $churchA2 = $this->church('Another North Church', $districtA);
        $churchB = $this->church('South Church', $districtB);
        $youthParticularId = $this->particular($youthDepartmentId, 'Youth Gathering');
        $musicParticularId = $this->particular($musicDepartmentId, 'Choir Practice');

        foreach ([$districtA, $districtB, $churchA, $churchA2, $churchB] as $churchId) {
            foreach ([$youthParticularId, $musicParticularId] as $particularId) {
                $programId = DB::table('particulars')
                    ->where('particular_id', $particularId)
                    ->value('program_id');
                DB::table('quarters')->insert([
                    'program_id' => $programId,
                    'church_id' => $churchId,
                    'quarter' => 'Q4',
                    'year' => '2026',
                ]);
            }
        }

        $assistant = $this->user('assistant', $districtA, null, 'scope-assistant@example.test');
        $pastor = $this->user('pastor', $districtA, $youthDepartmentId, 'scope-pastor@example.test');
        $representativeA = $this->user('representative', $churchA, $youthDepartmentId, 'scope-rep-a@example.test');
        $representativeA2 = $this->user('representative', $churchA2, $youthDepartmentId, 'scope-rep-a2@example.test');
        $representativeB = $this->user('representative', $churchB, $youthDepartmentId, 'scope-rep-b@example.test');
        $director = $this->user('director', $districtA, $youthDepartmentId, 'scope-director@example.test');

        $base = [
            'title' => 'Church event',
            'location' => 'Church Hall',
            'department_id' => $youthDepartmentId,
            'particular_ids' => [$youthParticularId],
            'host_church_id' => $churchA,
            'start_date' => '2026-11-10',
            'end_date' => '2026-11-10',
            'start_time' => '09:00',
            'end_time' => '11:00',
        ];

        return [
            'assistant' => $assistant,
            'pastor' => $pastor,
            'representativeA' => $representativeA,
            'representativeA2' => $representativeA2,
            'representativeB' => $representativeB,
            'director' => $director,
            'musicDirector' => $this->user('director', $districtA, $musicDepartmentId, 'scope-music-director@example.test'),
            'churchA' => $churchA,
            'churchA2' => $churchA2,
            'churchB' => $churchB,
            'musicDepartmentId' => $musicDepartmentId,
            'musicParticularId' => $musicParticularId,
            'youthDepartmentId' => $youthDepartmentId,
            'missionPayload' => [...$base, 'title' => 'Mission event'],
            'districtPayload' => [...$base, 'title' => 'District event', 'church_ids' => [$churchA]],
            'churchPayload' => $base + ['church_id' => $churchA],
        ];
    }

    private function church(string $name, ?int $parentId = null): int
    {
        return (int) DB::table('churches')->insertGetId([
            'name' => $name,
            'address' => $name,
            'parent_id' => $parentId,
        ], 'church_id');
    }

    private function particular(int $departmentId, string $name): int
    {
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => $name.' Program',
            'parent_id' => null,
        ], 'program_id');

        return (int) DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => $name,
        ], 'particular_id');
    }

    private function user(string $role, int $churchId, ?int $departmentId, string $email): User
    {
        return User::create([
            'department_id' => $departmentId,
            'church_id' => $churchId,
            'first_name' => 'Test',
            'last_name' => ucfirst($role),
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => $role,
            'email' => $email,
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
    }
}
