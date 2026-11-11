<?php

use Database\Seeders\CompletedEventSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('completed event seeder creates the demo representative when missing', function () {
    Carbon::setTestNow('2026-10-29 12:00:00');
    config(['app.reporting_year' => '2026']);

    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Seeder Test District',
        'address' => 'Test District',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Seeder Test Church',
        'address' => 'Test District',
        'parent_id' => $districtId,
    ]);
    DB::table('departments')->insert([
        'department_id' => 13,
        'department_name' => 'Children and Family Ministries',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Children and Family Ministries Quarterly Report',
        'parent_id' => null,
    ]);
    $particularIds = [
        DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Number of children in the congregation under age 15',
        ]),
        DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Number of Vacation Bible Schools conducted',
        ]),
    ];
    $quarterId = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $churchId,
        'quarter' => 'Q4',
        'year' => '2026',
    ]);
    DB::table('users')->insert([
        'department_id' => null,
        'church_id' => $churchId,
        'first_name' => 'Church',
        'last_name' => 'Representative',
        'birthdate' => '1990-01-01',
        'gender' => 'other',
        'role' => 'representative',
        'email' => 'seed.church-user.department-13@example.com',
        'password' => 'password',
        'status' => 'active',
    ]);

    $this->seed(CompletedEventSeeder::class);
    $this->seed(CompletedEventSeeder::class);

    $representativeId = DB::table('users')
        ->where('email', 'seed.completed-event.representative@example.com')
        ->value('user_id');
    $event = DB::table('events')
        ->where('title', 'Seeded Completed Event')
        ->first();

    expect(DB::table('events')->where('title', 'Seeded Completed Event')->count())->toBe(1)
        ->and($representativeId)->not->toBeNull()
        ->and(DB::table('users')->where('user_id', $representativeId)->value('church_id'))->toBe($churchId)
        ->and(DB::table('users')->where('email', 'seed.church-user.department-13@example.com')
            ->value('department_id'))->toBeNull()
        ->and($event)->not->toBeNull()
        ->and($event->quarter_id)->toBe($quarterId)
        ->and($event->status)->toBe('completed')
        ->and(DB::table('event_creator')->where('event_id', $event->event_id)->value('user_id'))
        ->toBe($representativeId)
        ->and(DB::table('participants')->where('event_id', $event->event_id)->count())
        ->toBe(50)
        ->and(DB::table('participants')
            ->where('event_id', $event->event_id)
            ->where('registration_status', 'confirmed')
            ->count())
        ->toBe(50)
        ->and(DB::table('participants')
            ->where('event_id', $event->event_id)
            ->where('church_id', $churchId)
            ->count())
        ->toBe(50)
        ->and(DB::table('event_particular')
            ->where('event_id', $event->event_id)
            ->pluck('particular_id')
            ->all())
        ->toBe($particularIds);

    Carbon::setTestNow();
});

test('completed event seeder creates an idempotent past event for the demo representative', function () {
    Carbon::setTestNow('2026-10-29 12:00:00');
    config(['app.reporting_year' => '2026']);

    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Seeder Test District',
        'address' => 'Test District',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Seeder Test Church',
        'address' => 'Test District',
        'parent_id' => $districtId,
    ]);
    DB::table('departments')->insert([
        'department_id' => 13,
        'department_name' => 'Children and Family Ministries',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Children and Family Ministries Quarterly Report',
        'parent_id' => null,
    ]);
    $particularIds = [
        DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Number of children in the congregation under age 15',
        ]),
        DB::table('particulars')->insertGetId([
            'program_id' => $programId,
            'particular_name' => 'Number of Vacation Bible Schools conducted',
        ]),
    ];
    $quarterId = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $churchId,
        'quarter' => 'Q4',
        'year' => '2026',
    ]);
    $representativeId = DB::table('users')->insertGetId([
        'department_id' => 13,
        'church_id' => $churchId,
        'first_name' => 'Demo',
        'last_name' => 'Representative',
        'birthdate' => '1990-01-01',
        'gender' => 'other',
        'role' => 'representative',
        'email' => 'seed.completed-event.representative@example.com',
        'password' => 'password',
        'status' => 'active',
    ]);

    $this->seed(CompletedEventSeeder::class);
    $this->seed(CompletedEventSeeder::class);

    $event = DB::table('events')
        ->where('title', 'Seeded Completed Event')
        ->first();

    expect(DB::table('events')->where('title', 'Seeded Completed Event')->count())->toBe(1)
        ->and($event->quarter_id)->toBe($quarterId)
        ->and($event->church_id)->toBe($churchId)
        ->and($event->date_end)->toBe('2026-10-22')
        ->and($event->status)->toBe('completed')
        ->and(DB::table('event_creator')->where('event_id', $event->event_id)->value('user_id'))
        ->toBe($representativeId)
        ->and(DB::table('event_particular')
            ->where('event_id', $event->event_id)
            ->pluck('particular_id')
            ->all())
        ->toBe($particularIds);

    Carbon::setTestNow();
});
