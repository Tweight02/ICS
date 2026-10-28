<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function districtPastorAssignmentFixture(): array
{
    $firstDistrictId = DB::table('churches')->insertGetId([
        'name' => 'North District',
        'address' => 'North region',
        'parent_id' => null,
    ]);
    $secondDistrictId = DB::table('churches')->insertGetId([
        'name' => 'South District',
        'address' => 'South region',
        'parent_id' => null,
    ]);
    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Ministerial & Evangelism',
    ]);
    $assistant = districtPastorAssignmentUser(
        $firstDistrictId,
        $departmentId,
        'assistant',
        'active',
        'assignment-assistant@example.com'
    );

    return compact('firstDistrictId', 'secondDistrictId', 'departmentId', 'assistant');
}

function districtPastorAssignmentUser(
    int $churchId,
    int $departmentId,
    string $role,
    string $status,
    string $email
): User {
    return User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Test',
        'middle_name' => '',
        'last_name' => ucfirst($role),
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => $role,
        'email' => $email,
        'password' => Hash::make('password'),
        'status' => $status,
    ]);
}

test('assignment data is available only to authenticated assistants', function () {
    $this->getJson('/api/assistant/district-pastor-assignments')
        ->assertUnauthorized();

    $fixture = districtPastorAssignmentFixture();
    $pastor = districtPastorAssignmentUser(
        $fixture['firstDistrictId'],
        $fixture['departmentId'],
        'pastor',
        'active',
        'assignment-pastor@example.com'
    );

    $this->actingAs($pastor, 'sanctum')
        ->getJson('/api/assistant/district-pastor-assignments')
        ->assertForbidden();

    $this->actingAs($fixture['assistant'], 'sanctum')
        ->getJson('/api/assistant/district-pastor-assignments')
        ->assertOk()
        ->assertJsonPath('assignments.0.district_name', 'North District')
        ->assertJsonPath('assignments.0.pastor_name', 'Test Pastor')
        ->assertJsonPath('assignments.1.district_name', 'South District')
        ->assertJsonPath('assignments.1.pastor_name', null);
});

test('assistant can assign an active pastor to a vacant district', function () {
    $fixture = districtPastorAssignmentFixture();
    $pastor = districtPastorAssignmentUser(
        $fixture['firstDistrictId'],
        $fixture['departmentId'],
        'pastor',
        'active',
        'assignment-movable-pastor@example.com'
    );

    $this->actingAs($fixture['assistant'], 'sanctum')
        ->putJson("/api/assistant/district-pastor-assignments/{$fixture['secondDistrictId']}", [
            'user_id' => $pastor->user_id,
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Pastor assigned to the district successfully.');

    $this->assertDatabaseHas('users', [
        'user_id' => $pastor->user_id,
        'church_id' => $fixture['secondDistrictId'],
    ]);
});

test('assignment writes require an authenticated assistant', function () {
    $fixture = districtPastorAssignmentFixture();
    $pastor = districtPastorAssignmentUser(
        $fixture['firstDistrictId'],
        $fixture['departmentId'],
        'pastor',
        'active',
        'assignment-auth-pastor@example.com'
    );
    $payload = ['user_id' => $pastor->user_id];
    $url = "/api/assistant/district-pastor-assignments/{$fixture['secondDistrictId']}";

    $this->putJson($url, $payload)->assertUnauthorized();

    $this->actingAs($pastor, 'sanctum')
        ->putJson($url, $payload)
        ->assertForbidden();

    $this->assertDatabaseHas('users', [
        'user_id' => $pastor->user_id,
        'church_id' => $fixture['firstDistrictId'],
    ]);
});

test('assistant swaps pastors when assigning to an occupied district', function () {
    $fixture = districtPastorAssignmentFixture();
    $movingPastor = districtPastorAssignmentUser(
        $fixture['firstDistrictId'],
        $fixture['departmentId'],
        'pastor',
        'active',
        'assignment-moving-pastor@example.com'
    );
    $currentPastor = districtPastorAssignmentUser(
        $fixture['secondDistrictId'],
        $fixture['departmentId'],
        'pastor',
        'active',
        'assignment-target-pastor@example.com'
    );

    $this->actingAs($fixture['assistant'], 'sanctum')
        ->putJson("/api/assistant/district-pastor-assignments/{$fixture['secondDistrictId']}", [
            'user_id' => $movingPastor->user_id,
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Pastor assigned to the district successfully.');

    $this->assertDatabaseHas('users', [
        'user_id' => $movingPastor->user_id,
        'church_id' => $fixture['secondDistrictId'],
    ]);
    $this->assertDatabaseHas('users', [
        'user_id' => $currentPastor->user_id,
        'church_id' => $fixture['firstDistrictId'],
    ]);
});

test('assignment rejects inactive pastors and non-district churches', function () {
    $fixture = districtPastorAssignmentFixture();
    $inactivePastor = districtPastorAssignmentUser(
        $fixture['firstDistrictId'],
        $fixture['departmentId'],
        'pastor',
        'inactive',
        'assignment-inactive-pastor@example.com'
    );
    $representative = districtPastorAssignmentUser(
        $fixture['firstDistrictId'],
        $fixture['departmentId'],
        'representative',
        'active',
        'assignment-representative@example.com'
    );
    $localChurchId = DB::table('churches')->insertGetId([
        'name' => 'Local Church',
        'address' => 'North District',
        'parent_id' => $fixture['firstDistrictId'],
    ]);

    $this->actingAs($fixture['assistant'], 'sanctum')
        ->putJson("/api/assistant/district-pastor-assignments/{$fixture['secondDistrictId']}", [
            'user_id' => $inactivePastor->user_id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('user_id');

    $this->putJson("/api/assistant/district-pastor-assignments/{$fixture['secondDistrictId']}", [
        'user_id' => $representative->user_id,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('user_id');

    $this->putJson("/api/assistant/district-pastor-assignments/{$localChurchId}", [
        'user_id' => $inactivePastor->user_id,
    ])->assertNotFound();
});

test('profile updates cannot change a pastor district', function () {
    $fixture = districtPastorAssignmentFixture();
    $pastor = districtPastorAssignmentUser(
        $fixture['firstDistrictId'],
        $fixture['departmentId'],
        'pastor',
        'active',
        'assignment-profile-pastor@example.com'
    );

    $this->putJson("/api/assistant/pastors/{$pastor->user_id}", [
        'department_id' => $fixture['departmentId'],
        'church_id' => $fixture['secondDistrictId'],
        'first_name' => 'Updated',
        'middle_name' => '',
        'last_name' => 'Pastor',
        'extension_name' => null,
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'email' => $pastor->email,
    ])->assertOk();

    $this->assertDatabaseHas('users', [
        'user_id' => $pastor->user_id,
        'church_id' => $fixture['firstDistrictId'],
        'first_name' => 'Updated',
    ]);
});
