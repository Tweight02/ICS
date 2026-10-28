<?php

use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('user seeder adds missing users and one assistant per eligible department idempotently', function () {
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

    $this->seed(UserSeeder::class);
    $this->seed(UserSeeder::class);

    $assistantDepartmentIds = DB::table('users')
        ->where('role', 'assistant')
        ->orderBy('department_id')
        ->pluck('department_id')
        ->all();

    expect($assistantDepartmentIds)->toBe([13, 14, 15, 17, 18, 19, 21])
        ->and(DB::table('users')->count())->toBe(13);

    $this->assertDatabaseHas('users', [
        'first_name' => 'Andrie',
        'last_name' => 'Aquino',
        'church_id' => 2,
        'email' => 'representative@example.com',
    ]);
    $this->assertDatabaseHas('users', [
        'first_name' => 'Ross',
        'last_name' => 'Butobara',
        'church_id' => 210,
        'email' => 'pastorRoss@gmail.com',
    ]);
    $this->assertDatabaseHas('users', [
        'first_name' => 'Nico',
        'last_name' => 'Pugoy',
        'church_id' => 214,
        'email' => 'church@gamil.com',
    ]);
});
