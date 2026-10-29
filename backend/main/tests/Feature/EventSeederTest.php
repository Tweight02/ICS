<?php

use Database\Seeders\SampleEventSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('sample event seeder falls back to a church user and creates at least ten confirmed participants', function () {
    Carbon::setTestNow('2026-10-29 12:00:00');
    config(['app.reporting_year' => '2026']);

    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Sample Event District',
        'address' => 'Nueva Vizcaya',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Sample Event Church',
        'address' => 'Nueva Vizcaya',
        'parent_id' => $districtId,
    ]);
    DB::table('departments')->insert([
        'department_id' => 13,
        'department_name' => 'Children and Family Ministries',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Children Quarterly Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Sample Event Metrics',
        'parent_id' => $programId,
    ]);
    $purposeParticularId = DB::table('particulars')->insertGetId([
        'program_id' => $sectionId,
        'particular_name' => 'Number of retreats conducted',
    ]);
    $headcountParticularId = DB::table('particulars')->insertGetId([
        'program_id' => $sectionId,
        'particular_name' => 'Number of participants',
    ]);
    $quarterId = DB::table('quarters')->insertGetId([
        'program_id' => $programId,
        'church_id' => $churchId,
        'quarter' => 'Q4',
        'year' => '2026',
    ]);
    DB::table('users')->insert([
        'department_id' => 13,
        'church_id' => $churchId,
        'first_name' => 'Sample',
        'middle_name' => null,
        'last_name' => 'Representative',
        'extension_name' => null,
        'birthdate' => '1990-01-01',
        'gender' => 'Other',
        'role' => 'assistant',
        'email' => 'sample.event.representative@example.com',
        'password' => 'password',
        'remember_token' => null,
        'status' => 'active',
    ]);

    $this->seed(SampleEventSeeder::class);

    $eventIds = DB::table('events')
        ->where('church_id', $churchId)
        ->whereIn('title', [
            'Sample Community Outreach',
            'Sample Youth Skills Workshop',
            'Sample Family Wellness Retreat',
            'Sample Community Bible Seminar',
        ])
        ->pluck('event_id');

    $this->assertCount(4, $eventIds);
    $this->assertSame(4, DB::table('events')
        ->whereIn('event_id', $eventIds)
        ->where('quarter_id', $quarterId)
        ->where('status', 'completed')
        ->count());
    $this->assertSame(4, DB::table('events')
        ->whereIn('event_id', $eventIds)
        ->distinct()
        ->count('date_start'));
    $this->assertSame(4, DB::table('event_creator')->whereIn('event_id', $eventIds)->count());
    $this->assertSame(4, DB::table('event_particular')
        ->whereIn('event_id', $eventIds)
        ->where('particular_id', $purposeParticularId)
        ->count());
    $this->assertSame(4, DB::table('event_particular')
        ->whereIn('event_id', $eventIds)
        ->where('particular_id', $headcountParticularId)
        ->count());
    $this->assertSame(48, DB::table('participants')
        ->whereIn('event_id', $eventIds)
        ->where('registration_status', 'confirmed')
        ->count());
    $this->assertSame(48, DB::table('event_participant_contributions')
        ->whereIn('event_id', $eventIds)
        ->where('quarter_id', $quarterId)
        ->where('particular_id', $headcountParticularId)
        ->count());
    $this->assertDatabaseHas('particular_items', [
        'quarter_id' => $quarterId,
        'particular_id' => $headcountParticularId,
        'manual_value' => null,
        'value' => 48,
    ]);

    $this->seed(SampleEventSeeder::class);

    $this->assertSame(4, DB::table('events')
        ->where('church_id', $churchId)
        ->count());
    $this->assertSame(48, DB::table('participants')->whereIn('event_id', $eventIds)->count());

    Carbon::setTestNow();
});
