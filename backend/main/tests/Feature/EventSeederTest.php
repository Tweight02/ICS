<?php

use Database\Seeders\EventSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('event seeder creates three church events plus pastor and assistant events idempotently', function () {
    DB::table('departments')->insert([
        'department_id' => 13,
        'department_name' => 'Children and Family Ministries',
    ]);

    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Seed District',
        'address' => 'Seed District',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Seed Church',
        'address' => 'Seed District',
        'parent_id' => $districtId,
    ]);

    $programId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Sample Quarterly Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Sample Section',
        'parent_id' => $programId,
    ]);
    $particularId = DB::table('particulars')->insertGetId([
        'program_id' => $sectionId,
        'particular_name' => 'Sample Particular',
    ]);

    foreach ([
        ['role' => 'pastor', 'church_id' => $districtId, 'email' => 'seed.pastor@example.com'],
        ['role' => 'assistant', 'church_id' => $districtId, 'email' => 'seed.assistant.department-13@example.com'],
        ['role' => 'representative', 'church_id' => $churchId, 'email' => 'seed.church-user.department-13@example.com'],
    ] as $account) {
        DB::table('users')->insert([
            'department_id' => 13,
            'church_id' => $account['church_id'],
            'first_name' => 'Seed',
            'middle_name' => null,
            'last_name' => ucfirst($account['role']),
            'extension_name' => null,
            'birthdate' => '1990-01-01',
            'gender' => 'other',
            'role' => $account['role'],
            'email' => $account['email'],
            'password' => Hash::make('password'),
            'remember_token' => null,
            'status' => 'active',
        ]);
    }

    $this->seed(EventSeeder::class);
    $this->seed(EventSeeder::class);

    $events = DB::table('events')
        ->join('event_creator', 'event_creator.event_id', '=', 'events.event_id')
        ->join('users', 'users.user_id', '=', 'event_creator.user_id')
        ->where('events.title', 'like', 'Seeded | Children and Family Ministries |%')
        ->select('events.event_id', 'events.title', 'users.role')
        ->get();

    expect($events)->toHaveCount(5)
        ->and($events->where('role', 'representative'))->toHaveCount(3)
        ->and($events->where('role', 'pastor'))->toHaveCount(1)
        ->and($events->where('role', 'assistant'))->toHaveCount(1);

    $assistantEventId = $events->firstWhere('role', 'assistant')->event_id;
    $this->assertDatabaseHas('event_district', [
        'event_id' => $assistantEventId,
        'district_id' => $districtId,
    ]);

    $this->assertDatabaseHas('event_particular', [
        'event_id' => $assistantEventId,
        'particular_id' => $particularId,
    ]);
});
