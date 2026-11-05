<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function representativeTransferFixture(): array
{
    $districtId = DB::table('churches')->insertGetId([
        'name' => 'North District',
        'address' => 'North region',
        'parent_id' => null,
    ]);
    $sourceChurchId = DB::table('churches')->insertGetId([
        'name' => 'Source Church',
        'address' => 'North District',
        'parent_id' => $districtId,
    ]);
    $destinationChurchId = DB::table('churches')->insertGetId([
        'name' => 'Destination Church',
        'address' => 'North District',
        'parent_id' => $districtId,
    ]);
    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Ministerial & Evangelism',
    ]);

    $pastor = representativeTransferUser(
        $districtId,
        $departmentId,
        'pastor',
        'active',
        'transfer-pastor@example.com'
    );
    $movingRepresentative = representativeTransferUser(
        $sourceChurchId,
        $departmentId,
        'representative',
        'active',
        'moving-representative@example.com'
    );
    $currentRepresentative = representativeTransferUser(
        $destinationChurchId,
        $departmentId,
        'representative',
        'active',
        'current-representative@example.com'
    );

    return compact(
        'pastor',
        'movingRepresentative',
        'currentRepresentative',
        'destinationChurchId'
    );
}

function representativeTransferUser(
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

test('bulk transfer deactivates the destination representative and moves the existing user record', function () {
    $fixture = representativeTransferFixture();

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->postJson('/api/pastor/representatives/bulk-transfer', [
            'transfers' => [[
                'user_id' => $fixture['movingRepresentative']->user_id,
                'church_id' => $fixture['destinationChurchId'],
            ]],
        ])
        ->assertOk()
        ->assertJsonPath('transferred_count', 1);

    $this->assertDatabaseHas('users', [
        'user_id' => $fixture['movingRepresentative']->user_id,
        'church_id' => $fixture['destinationChurchId'],
        'status' => 'active',
    ]);
    $this->assertDatabaseHas('users', [
        'user_id' => $fixture['currentRepresentative']->user_id,
        'church_id' => $fixture['destinationChurchId'],
        'status' => 'inactive',
    ]);
    expect(DB::table('users')
        ->where('email', $fixture['movingRepresentative']->email)
        ->count())->toBe(1);
});

test('bulk transfer activates an inactive representative when assigning them', function () {
    $fixture = representativeTransferFixture();
    $fixture['movingRepresentative']->update(['status' => 'inactive']);

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->postJson('/api/pastor/representatives/bulk-transfer', [
            'transfers' => [[
                'user_id' => $fixture['movingRepresentative']->user_id,
                'church_id' => $fixture['destinationChurchId'],
            ]],
        ])
        ->assertOk()
        ->assertJsonPath('transferred_count', 1);

    $this->assertDatabaseHas('users', [
        'user_id' => $fixture['movingRepresentative']->user_id,
        'church_id' => $fixture['destinationChurchId'],
        'status' => 'active',
    ]);
    $this->assertDatabaseHas('users', [
        'user_id' => $fixture['currentRepresentative']->user_id,
        'status' => 'inactive',
    ]);
});

test('editing a representative transfer keeps their user record and deactivates the destination representative', function () {
    $fixture = representativeTransferFixture();
    $representative = $fixture['movingRepresentative'];

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->putJson("/api/pastor/representatives/{$representative->user_id}", [
            'church_id' => $fixture['destinationChurchId'],
            'department_id' => $representative->department_id,
            'first_name' => $representative->first_name,
            'middle_name' => $representative->middle_name,
            'last_name' => $representative->last_name,
            'extension_name' => $representative->extension_name,
            'birthdate' => $representative->birthdate,
            'gender' => $representative->gender,
            'email' => $representative->email,
        ])
        ->assertOk()
        ->assertJsonPath('user.user_id', $representative->user_id);

    $this->assertDatabaseHas('users', [
        'user_id' => $representative->user_id,
        'church_id' => $fixture['destinationChurchId'],
        'status' => 'active',
    ]);
    $this->assertDatabaseHas('users', [
        'user_id' => $fixture['currentRepresentative']->user_id,
        'church_id' => $fixture['destinationChurchId'],
        'status' => 'inactive',
    ]);
    expect(DB::table('users')->where('email', $representative->email)->count())->toBe(1);
});
