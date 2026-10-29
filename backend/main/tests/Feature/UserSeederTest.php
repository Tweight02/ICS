<?php

use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('user seeder creates all role scopes idempotently', function () {
    foreach (range(13, 23) as $departmentId) {
        DB::table('departments')->insert([
            'department_id' => $departmentId,
            'department_name' => "Department {$departmentId}",
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

    $this->seed(UserSeeder::class);
    $this->seed(UserSeeder::class);

    $departmentIds = DB::table('departments')
        ->orderBy('department_id')
        ->pluck('department_id')
        ->all();
    $assistantDepartmentIds = DB::table('users')
        ->where('role', 'assistant')
        ->orderBy('department_id')
        ->pluck('department_id')
        ->all();
    $directorDepartmentIds = DB::table('users')
        ->where('role', 'director')
        ->orderBy('department_id')
        ->pluck('department_id')
        ->all();
    $churchUserDepartmentIds = DB::table('users')
        ->where('role', 'representative')
        ->distinct()
        ->orderBy('department_id')
        ->pluck('department_id')
        ->all();
    $districtCount = DB::table('churches')->whereNull('parent_id')->count();

    expect($assistantDepartmentIds)->toBe($departmentIds)
        ->and($directorDepartmentIds)->toBe($departmentIds)
        ->and($churchUserDepartmentIds)->toBe($departmentIds)
        ->and(DB::table('users')->where('role', 'head assistant')->count())->toBe(1)
        ->and(DB::table('users')->where('role', 'head director')->count())->toBe(1)
        ->and(DB::table('users')->where('role', 'pastor')->count())->toBe($districtCount)
        ->and(DB::table('users')->count())->toBe(2 + (3 * count($departmentIds)) + $districtCount);

    $headDirector = DB::table('users')
        ->where('email', 'seed.head-director@example.com')
        ->first();
    expect($headDirector)->not->toBeNull()
        ->and(Hash::check('12345678', $headDirector->password))->toBeTrue();

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
