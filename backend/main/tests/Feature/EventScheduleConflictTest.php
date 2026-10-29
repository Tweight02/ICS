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

    public function test_an_event_cannot_overlap_for_the_same_church_or_district_target(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['user']);

        $this->postJson('/api/events', $context['payload'])->assertCreated();
        Sanctum::actingAs($context['sameChurchUser']);
        $this->postJson('/api/events', $context['payload'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('start_date');

        $this->assertDatabaseCount('events', 1);
    }

    public function test_a_different_user_can_create_the_overlapping_event_with_a_private_warning(): void
    {
        $context = $this->eventContext();
        Sanctum::actingAs($context['user']);
        $this->postJson('/api/events', $context['payload'])->assertCreated();

        Sanctum::actingAs($context['otherUser']);
        $response = $this->postJson('/api/events', $context['payload'])
            ->assertCreated()
            ->assertJsonPath(
                'warning',
                "Another user's event is scheduled at a different church during this time. Your event was created."
            );

        $this->assertDatabaseCount('events', 2);
        $this->assertSame((int) $context['otherUser']->church_id, $response->json('data.church_id'));
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
