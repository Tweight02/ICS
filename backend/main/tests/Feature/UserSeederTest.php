<?php

use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('user seeder creates all role scopes idempotently', function () {
    $excludedDepartments = [
        20 => 'Adventist Mission',
        22 => 'Baptism Record',
        23 => 'Death Record',
    ];
    foreach (range(13, 23) as $departmentId) {
        DB::table('departments')->insert([
            'department_id' => $departmentId,
            'department_name' => $excludedDepartments[$departmentId] ?? "Department {$departmentId}",
        ]);
    }

    foreach ([1, 2, 210, 214] as $churchId) {
        DB::table('churches')->insert([
            'church_id' => $churchId,
            'name' => "Church {$churchId}",
            'address' => 'Test address',
            'parent_id' => null,
        ]);
    }

    $batanesDistrictId = DB::table('churches')->insertGetId([
        'name' => 'Batanes',
        'address' => 'Batanes, Philippines',
        'parent_id' => null,
    ]);
    $eastCagayanDistrictId = DB::table('churches')->insertGetId([
        'name' => 'East Central Cagayan',
        'address' => 'Cagayan, Philippines',
        'parent_id' => null,
    ]);
    $batanesChurchId = DB::table('churches')->insertGetId([
        'name' => 'Basco',
        'address' => 'Batanes, Philippines',
        'parent_id' => $batanesDistrictId,
    ]);
    $eastCagayanChurchId = DB::table('churches')->insertGetId([
        'name' => 'Cabayabasan',
        'address' => 'Cagayan, Philippines',
        'parent_id' => $eastCagayanDistrictId,
    ]);

    foreach ([
        ['role' => 'assistant', 'email' => 'legacy-assistant@example.com'],
        ['role' => 'head_assistant', 'email' => 'legacy-head-assistant@example.com'],
        ['role' => 'head-director', 'email' => 'legacy-head-director@example.com'],
        ['role' => 'director', 'email' => 'seed.director.department-20@example.com'],
        ['role' => 'representative', 'email' => 'seed.church-user.department-20@example.com'],
    ] as $legacyUser) {
        DB::table('users')->insert([
            'department_id' => in_array($legacyUser['role'], ['director', 'representative'], true) ? 20 : 16,
            'church_id' => $batanesDistrictId,
            'first_name' => 'Legacy',
            'last_name' => 'User',
            'birthdate' => '1990-01-01',
            'gender' => 'other',
            'role' => $legacyUser['role'],
            'email' => $legacyUser['email'],
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
    }

    $this->seed(UserSeeder::class);
    $this->seed(UserSeeder::class);

    $departmentIds = DB::table('departments')
        ->orderBy('department_id')
        ->pluck('department_id')
        ->all();
    $assistant = DB::table('users')
        ->where('role', 'assistant')
        ->first();
    $directorDepartmentIds = DB::table('users')
        ->where('role', 'director')
        ->orderBy('department_id')
        ->pluck('department_id')
        ->all();
    $churchUserCount = DB::table('users')
        ->where('role', 'representative')
        ->count();
    $pastorCount = DB::table('users')->where('role', 'pastor')->count();
    $expectedUserDepartmentIds = array_values(array_diff($departmentIds, array_keys($excludedDepartments)));
    $districtCount = DB::table('churches')->whereNull('parent_id')->count();

    expect($assistant)->not->toBeNull()
        ->and($assistant->department_id)->toBeNull()
        ->and($assistant->email)->toBe('seed.assistant@example.com')
        ->and($directorDepartmentIds)->toBe($expectedUserDepartmentIds)
        ->and($churchUserCount)->toBe(count($expectedUserDepartmentIds))
        ->and(DB::table('users')->where('role', 'assistant')->count())->toBe(1)
        ->and(DB::table('users')->whereRaw("LOWER(REPLACE(REPLACE(role, '_', ' '), '-', ' ')) IN (?, ?, ?, ?)", ['assistant', 'administrative assistant', 'head assistant', 'head director'])->count())->toBe(1)
        ->and($pastorCount)->toBe($districtCount)
        ->and(DB::table('users')->count())->toBe(1 + (2 * count($expectedUserDepartmentIds)) + $districtCount);

    $this->assertSame(0, DB::table('users')->where('role', 'representative')->whereNotNull('department_id')->count());
    $this->assertSame(0, DB::table('users')->where('role', 'pastor')->whereNotNull('department_id')->count());

    foreach (array_keys($excludedDepartments) as $departmentId) {
        $this->assertDatabaseMissing('users', ['department_id' => $departmentId, 'role' => 'director']);
        $this->assertDatabaseMissing('users', ['email' => "seed.church-user.department-{$departmentId}@example.com"]);
        $this->assertDatabaseMissing('users', ['email' => "seed.director.department-{$departmentId}@example.com"]);
    }

    expect(Hash::check('12345678', $assistant->password))->toBeTrue();
    foreach ([
        'legacy-assistant@example.com',
        'legacy-head-assistant@example.com',
        'legacy-head-director@example.com',
    ] as $legacyEmail) {
        $this->assertDatabaseMissing('users', ['email' => $legacyEmail]);
    }

    $this->assertDatabaseHas('users', [
        'church_id' => $batanesDistrictId,
        'role' => 'pastor',
        'email' => "seed.pastor.district-{$batanesDistrictId}@example.com",
    ]);
    $this->assertDatabaseHas('users', [
        'church_id' => $eastCagayanDistrictId,
        'role' => 'pastor',
        'email' => "seed.pastor.district-{$eastCagayanDistrictId}@example.com",
    ]);
    $this->assertDatabaseHas('users', [
        'church_id' => $batanesChurchId,
        'role' => 'representative',
    ]);
    $this->assertDatabaseHas('users', [
        'church_id' => $eastCagayanChurchId,
        'role' => 'representative',
    ]);
});
