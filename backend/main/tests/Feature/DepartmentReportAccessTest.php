<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function departmentReportAccessUser(
    int $churchId,
    int $departmentId,
    string $role,
    string $suffix
): User {
    return User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Report',
        'middle_name' => '',
        'last_name' => 'Access User',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => $role,
        'email' => "department-report-{$suffix}@example.com",
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}

function departmentReportAccessFixture(): array
{
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Report Access Church',
        'address' => 'Report Access District',
        'parent_id' => null,
    ]);
    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Assigned Department',
    ]);

    foreach ([16 => 'Ministerial & Evangelism', 20 => 'Adventist Mission', 22 => 'Baptism Record', 23 => 'Death Record', 30 => 'Other Department'] as $id => $name) {
        DB::table('departments')->insert([
            'department_id' => $id,
            'department_name' => $name,
        ]);
    }

    return [
        'churchId' => $churchId,
        'departmentId' => $departmentId,
        'director' => departmentReportAccessUser($churchId, 16, 'director', 'director'),
        'assistant' => departmentReportAccessUser($churchId, 16, 'administrative assistant', 'assistant'),
        'otherDepartmentDirector' => departmentReportAccessUser($churchId, $departmentId, 'director', 'other-director'),
        'otherDepartmentAssistant' => departmentReportAccessUser($churchId, $departmentId, 'assistant', 'other-assistant'),
        'pastor' => departmentReportAccessUser($churchId, $departmentId, 'pastor', 'pastor'),
        'representative' => departmentReportAccessUser($churchId, $departmentId, 'representative', 'representative'),
    ];
}

test('only Ministerial and Evangelism directors and assistants can access personal report departments', function () {
    $fixture = departmentReportAccessFixture();

    foreach (['director', 'assistant'] as $role) {
        $user = $fixture[$role];
        $departments = $this->actingAs($user, 'sanctum')
            ->getJson("/api/churches/{$fixture['churchId']}/departments")
            ->assertOk();

        foreach ([16, 20, 22, 23] as $departmentId) {
            $departments->assertJsonFragment(['department_id' => $departmentId]);
        }

        $departments->assertJsonMissing(['department_id' => 30]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/churches/{$fixture['churchId']}/departments/16/report")
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/churches/{$fixture['churchId']}/departments/30/report")
            ->assertForbidden();
    }

    foreach (['otherDepartmentDirector', 'otherDepartmentAssistant'] as $role) {
        $user = $fixture[$role];
        $departments = $this->actingAs($user, 'sanctum')
            ->getJson("/api/churches/{$fixture['churchId']}/departments")
            ->assertOk();

        $departments->assertJsonFragment(['department_id' => $fixture['departmentId']]);
        foreach ([16, 20, 22, 23] as $departmentId) {
            $departments->assertJsonMissing(['department_id' => $departmentId]);
            $this->actingAs($user, 'sanctum')
                ->getJson("/api/churches/{$fixture['churchId']}/departments/{$departmentId}/report")
                ->assertForbidden();
        }
    }
});

test('representatives can access all departments except pastor personal reports', function () {
    $fixture = departmentReportAccessFixture();

    $departments = $this->actingAs($fixture['representative'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments")
        ->assertOk()
        ->assertJsonCount(2);

    $departments->assertJsonFragment(['department_id' => $fixture['departmentId']]);
    $departments->assertJsonFragment(['department_id' => 30]);

    foreach ([16, 20, 22, 23] as $departmentId) {
        $departments->assertJsonMissing(['department_id' => $departmentId]);
    }

    $this->actingAs($fixture['representative'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/30/report")
        ->assertOk();

    $this->actingAs($fixture['representative'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/16/report")
        ->assertForbidden();

    $this->getJson("/api/churches/{$fixture['churchId']}/departments")
        ->assertUnauthorized();
});

test('pastors can access all department reports and see personal report departments', function () {
    $fixture = departmentReportAccessFixture();

    $departments = $this->actingAs($fixture['pastor'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments")
        ->assertOk()
        ->assertJsonCount(6);

    $departments->assertJsonFragment(['department_id' => $fixture['departmentId']]);
    $departments->assertJsonFragment(['department_id' => 30]);

    foreach ([16, 20, 22, 23] as $departmentId) {
        $departments->assertJsonFragment(['department_id' => $departmentId]);
    }

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/30/report")
        ->assertOk();

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/16/report")
        ->assertOk();

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/20/report")
        ->assertOk();
});

test('baptism and death department rows use the personal records page', function () {
    $fixture = departmentReportAccessFixture();

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/22/report")
        ->assertForbidden();

    $this->actingAs($fixture['pastor'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/23/report")
        ->assertForbidden();
});

test('representatives cannot access personal reports even when assigned to one', function () {
    $fixture = departmentReportAccessFixture();
    $representative = departmentReportAccessUser(
        $fixture['churchId'],
        22,
        'representative',
        'personal-report-representative'
    );

    $this->actingAs($representative, 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/22/report")
        ->assertForbidden();
});
