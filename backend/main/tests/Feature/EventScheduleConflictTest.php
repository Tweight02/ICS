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

    public function test_same_target_overlap_requires_confirmation_before_creation(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['user']);

        $this->postJson('/api/events', $context['payload'])->assertCreated();
        Sanctum::actingAs($context['sameChurchUser']);
        $this->postJson('/api/events', $context['payload'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'EVENT_SCHEDULE_OVERLAP');

        $this->assertDatabaseCount('events', 1);
        $this->postJson('/api/events', $context['payload'] + [
            'confirm_overlap' => true,
        ])->assertCreated();
        $this->assertDatabaseCount('events', 2);
    }

    public function test_different_church_overlap_requires_confirmation_before_creation(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['user']);
        $this->postJson('/api/events', $context['payload'])->assertCreated();

        Sanctum::actingAs($context['otherUser']);
        $this->postJson('/api/events', $context['payload'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'EVENT_SCHEDULE_OVERLAP');

        $response = $this->postJson('/api/events', $context['payload'] + [
            'confirm_overlap' => true,
        ])->assertCreated();

        $this->assertDatabaseCount('events', 2);
        $this->assertSame((int) $context['otherUser']->church_id, $response->json('data.church_id'));
    }

    public function test_assistant_events_block_overlapping_events_for_the_same_department_and_district(): void
    {
        $context = $this->eventContext();
        $assistant = User::create([
            'department_id' => $context['user']->department_id,
            'church_id' => $context['user']->church_id,
            'first_name' => 'Alex',
            'last_name' => 'Assistant',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'assistant',
            'email' => 'schedule-assistant@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        $assistantPayload = $context['payload'];
        unset($assistantPayload['department_id']);
        $assistantPayload['district_ids'] = [$context['user']->church_id];

        Sanctum::actingAs($assistant);
        $this->postJson('/api/events', $assistantPayload)->assertCreated();

        $this->postJson('/api/events', $assistantPayload)
            ->assertStatus(409)
            ->assertJsonPath('code', 'EVENT_SCHEDULE_OVERLAP');

        Sanctum::actingAs($context['sameChurchUser']);
        $this->postJson('/api/events', $context['payload'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'EVENT_SCHEDULE_OVERLAP');

        $this->assertDatabaseCount('events', 1);
    }

    public function test_adjacent_event_times_are_not_treated_as_overlapping(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['user']);
        $this->postJson('/api/events', $context['payload'])->assertCreated();

        $context['payload']['start_time'] = '11:00';
        $context['payload']['end_time'] = '12:00';
        $this->postJson('/api/events', $context['payload'])->assertCreated();

        $this->assertDatabaseCount('events', 2);
    }

    public function test_head_assistant_cannot_create_events(): void
    {
        $context = $this->eventContext();
        $headAssistant = User::create([
            'department_id' => DB::table('departments')->value('department_id'),
            'church_id' => $context['user']->church_id,
            'first_name' => 'Head',
            'last_name' => 'Assistant',
            'birthdate' => '1990-01-01',
            'gender' => 'Other',
            'role' => 'head assistant',
            'email' => 'head-assistant@example.test',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        Sanctum::actingAs($headAssistant);

        $this->postJson('/api/events', $context['payload'] + [
            'district_ids' => [$context['user']->church_id],
        ])->assertForbidden();

        $this->assertDatabaseCount('events', 0);
    }

    /**
     * @return array{user: User, otherUser: User, sameChurchUser: User, payload: array<string, mixed>}
     */
    private function eventContext(): array
    {
        $departmentId = DB::table('departments')->insertGetId(
            ['department_name' => 'Youth'],
            'department_id'
        );
        $churchIds = [];
        foreach (['North Church', 'South Church'] as $name) {
            $churchIds[] = DB::table('churches')->insertGetId([
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
        foreach ($churchIds as $churchId) {
            DB::table('quarters')->insert([
                'program_id' => $programId,
                'church_id' => $churchId,
                'quarter' => 'Q4',
                'year' => '2026',
            ]);
        }

        $users = [];
        foreach ([$churchIds[0], $churchIds[1], $churchIds[0]] as $index => $churchId) {
            $users[] = User::create([
                'department_id' => $departmentId,
                'church_id' => $churchId,
                'first_name' => 'Church',
                'last_name' => 'Representative '.$index,
                'birthdate' => '1990-01-01',
                'gender' => 'Other',
                'role' => 'representative',
                'email' => "representative{$index}@example.test",
                'password' => Hash::make('password'),
                'status' => 'active',
            ]);
        }

        return [
            'user' => $users[0],
            'otherUser' => $users[1],
            'sameChurchUser' => $users[2],
            'payload' => [
                'title' => 'Youth Gathering',
                'location' => 'Church Hall',
                'department_id' => $departmentId,
                'particular_ids' => [$particularId],
                'start_date' => '2026-11-10',
                'end_date' => '2026-11-10',
                'start_time' => '09:00',
                'end_time' => '11:00',
            ],
        ];
    }
}
