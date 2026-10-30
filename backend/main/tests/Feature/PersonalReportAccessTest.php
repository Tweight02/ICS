<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function personalReportAccessUser(int $churchId, int $departmentId, string $role, string $suffix): User
{
    return User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Personal',
        'middle_name' => '',
        'last_name' => 'Report User',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => $role,
        'email' => "personal-{$suffix}@example.com",
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}

function personalReportAccessFixture(): array
{
    $districtId = DB::table('churches')->insertGetId([
        'name' => 'Assigned District',
        'address' => 'District Address',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Assigned Church',
        'address' => 'Church Address',
        'parent_id' => $districtId,
    ]);
    $otherDistrictId = DB::table('churches')->insertGetId([
        'name' => 'Other District',
        'address' => 'Other District Address',
        'parent_id' => null,
    ]);
    $otherChurchId = DB::table('churches')->insertGetId([
        'name' => 'Other Church',
        'address' => 'Other Church Address',
        'parent_id' => $otherDistrictId,
    ]);
    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Personal Report Test Department',
    ]);

    $baptismIds = [];
    foreach ([$churchId, $otherChurchId] as $recordChurchId) {
        $baptismIds[] = DB::table('baptisms')->insertGetId([
            'church_id' => $recordChurchId,
            'quarter' => 'Q1',
            'first_name' => 'Member',
            'middle_name' => '',
            'last_name' => 'Example',
            'extension_name' => null,
            'birthdate' => '1990-01-01',
            'gender' => 'other',
            'address' => 'Example Address',
            'officiating_minister' => 'Pastor Example',
            'place_of_baptism' => 'Example Church',
            'date_of_baptism' => '2026-01-01',
            'marital_status' => 'single',
            'is_reclaimed' => false,
        ]);
    }

    $deathIds = [];
    foreach ($baptismIds as $baptismId) {
        $deathIds[] = DB::table('deaths')->insertGetId([
            'baptism_id' => $baptismId,
            'quarter' => 'Q1',
            'date_of_death' => '2026-02-01',
        ]);
    }

    return [
        'districtId' => $districtId,
        'churchId' => $churchId,
        'otherChurchId' => $otherChurchId,
        'departmentId' => $departmentId,
        'baptismIds' => $baptismIds,
        'deathIds' => $deathIds,
        'director' => personalReportAccessUser($districtId, 16, 'director', 'director'),
        'headDirector' => personalReportAccessUser($districtId, $departmentId, 'head director', 'head-director'),
        'headAssistant' => personalReportAccessUser($districtId, 16, 'head assistant', 'head-assistant'),
        'assistant' => personalReportAccessUser($districtId, 16, 'assistant', 'assistant'),
        'otherDepartmentDirector' => personalReportAccessUser($districtId, $departmentId, 'director', 'other-director'),
        'otherDepartmentAssistant' => personalReportAccessUser($districtId, $departmentId, 'assistant', 'other-assistant'),
        'representative' => personalReportAccessUser($districtId, $departmentId, 'representative', 'representative'),
    ];
}

test('head directors can access personal records within their assigned district', function () {
    $fixture = personalReportAccessFixture();

    $this->actingAs($fixture['headDirector'], 'sanctum')
        ->getJson('/api/baptisms')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.baptism_id', $fixture['baptismIds'][0]);

    $this->actingAs($fixture['headDirector'], 'sanctum')
        ->getJson('/api/deaths')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.death_id', $fixture['deathIds'][0]);
});

test('head assistants can load personal records for the selected district', function () {
    $fixture = personalReportAccessFixture();

    $this->actingAs($fixture['headAssistant'], 'sanctum')
        ->getJson('/api/baptisms?district_id='.$fixture['otherDistrictId'])
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.baptism_id', $fixture['baptismIds'][1]);

    $this->actingAs($fixture['headAssistant'], 'sanctum')
        ->getJson('/api/deaths?district_id='.$fixture['otherDistrictId'])
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.death_id', $fixture['deathIds'][1]);
});

test('M and E directors and assistants can load personal records for the selected district', function () {
    $fixture = personalReportAccessFixture();

    foreach (['director', 'assistant'] as $role) {
        $user = $fixture[$role];

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/baptisms')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.baptism_id', $fixture['baptismIds'][0]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/deaths')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.death_id', $fixture['deathIds'][0]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/baptisms?district_id='.$fixture['otherDistrictId'])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.baptism_id', $fixture['baptismIds'][1]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/deaths?district_id='.$fixture['otherDistrictId'])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.death_id', $fixture['deathIds'][1]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/baptisms/'.$fixture['baptismIds'][1])
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/deaths/'.$fixture['deathIds'][1])
            ->assertForbidden();
    }
});

test('directors and assistants outside Ministerial and Evangelism cannot access personal records', function () {
    $fixture = personalReportAccessFixture();

    foreach (['otherDepartmentDirector', 'otherDepartmentAssistant'] as $role) {
        $this->actingAs($fixture[$role], 'sanctum')
            ->getJson('/api/baptisms')
            ->assertForbidden();

        $this->actingAs($fixture[$role], 'sanctum')
            ->getJson('/api/deaths')
            ->assertForbidden();

        $this->actingAs($fixture[$role], 'sanctum')
            ->getJson('/api/baptisms?district_id='.$fixture['otherDistrictId'])
            ->assertForbidden();

        $this->actingAs($fixture[$role], 'sanctum')
            ->getJson('/api/deaths?district_id='.$fixture['otherDistrictId'])
            ->assertForbidden();
    }
});

test('users outside pastor, director, and assistant roles cannot access personal reports', function () {
    $fixture = personalReportAccessFixture();

    $this->actingAs($fixture['representative'], 'sanctum')
        ->getJson('/api/baptisms')
        ->assertForbidden();

    $this->actingAs($fixture['representative'], 'sanctum')
        ->getJson('/api/deaths')
        ->assertForbidden();
});
