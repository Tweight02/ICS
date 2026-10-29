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
        'headDirector' => departmentReportAccessUser($churchId, 16, 'head director', 'head-director'),
        'assistant' => departmentReportAccessUser($churchId, 16, 'administrative assistant', 'assistant'),
        'otherDepartmentDirector' => departmentReportAccessUser($churchId, $departmentId, 'director', 'other-director'),
        'otherDepartmentAssistant' => departmentReportAccessUser($churchId, $departmentId, 'assistant', 'other-assistant'),
        'pastor' => departmentReportAccessUser($churchId, $departmentId, 'pastor', 'pastor'),
        'representative' => departmentReportAccessUser($churchId, $departmentId, 'representative', 'representative'),
    ];
}

test('head directors can access every department report', function () {
    $fixture = departmentReportAccessFixture();

    $this->actingAs($fixture['headDirector'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments")
        ->assertOk()
        ->assertJsonCount(6);

    $this->actingAs($fixture['headDirector'], 'sanctum')
        ->getJson("/api/churches/{$fixture['churchId']}/departments/30/report")
        ->assertOk();
});

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

test('pastors can load and save district-owned personal reports', function () {
    $fixture = departmentReportAccessFixture();
    $districtId = $fixture['churchId'];
    $childChurchId = DB::table('churches')->insertGetId([
        'name' => 'Personal Report Child Church',
        'address' => 'District Address',
        'parent_id' => $districtId,
    ]);
    $reportDetails = [];

    foreach ([16, 20] as $departmentId) {
        $programId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => "Personal Report Program {$departmentId}",
            'parent_id' => null,
        ]);
        $sectionId = DB::table('programs')->insertGetId([
            'department_id' => $departmentId,
            'program_name' => 'Activities',
            'parent_id' => $programId,
        ]);
        $particularId = DB::table('particulars')->insertGetId([
            'program_id' => $sectionId,
            'particular_name' => 'Attendance',
        ]);
        DB::table('quarters')->insert([
            'church_id' => $childChurchId,
            'program_id' => $programId,
            'year' => '2025',
            'quarter' => 'Q1',
            'date_submitted' => null,
            'district_endorse' => null,
            'mission_approve' => null,
        ]);
        $reportDetails[$departmentId] = compact('programId', 'particularId');
    }

    foreach ([16, 20] as $departmentId) {
        $url = "/api/churches/{$districtId}/departments/{$departmentId}/report";
        $this->actingAs($fixture['pastor'], 'sanctum')
            ->getJson($url)
            ->assertOk();

        $expectedYearCount = collect(['2025', (string) now()->year])
            ->unique()
            ->count();
        expect(DB::table('quarters')
            ->where('church_id', $districtId)
            ->where('program_id', $reportDetails[$departmentId]['programId'])
            ->count())->toBe($expectedYearCount * 4);
    }

    $quarterId = DB::table('quarters')
        ->where('church_id', $districtId)
        ->where('program_id', $reportDetails[16]['programId'])
        ->where('year', (string) now()->year)
        ->where('quarter', 'Q1')
        ->value('quarter_id');
    $this->postJson('/api/churches/'.$districtId.'/departments/16/report/save', [
        'items' => [[
            'particular_id' => $reportDetails[16]['particularId'],
            'quarter_id' => $quarterId,
            'value' => 7,
        ]],
    ])->assertOk();

    $this->assertDatabaseHas('particular_items', [
        'particular_id' => $reportDetails[16]['particularId'],
        'quarter_id' => $quarterId,
        'manual_value' => 7,
        'value' => 7,
    ]);
});

test('only the assigned pastor can access district-owned personal reports', function () {
    $fixture = departmentReportAccessFixture();
    $otherDistrictId = DB::table('churches')->insertGetId([
        'name' => 'Other Report District',
        'address' => 'Other Address',
        'parent_id' => null,
    ]);
    $otherPastor = departmentReportAccessUser(
        $otherDistrictId,
        16,
        'pastor',
        'other-district-pastor'
    );
    $assistant = departmentReportAccessUser(
        $fixture['churchId'],
        16,
        'assistant',
        'district-report-assistant'
    );

    $url = "/api/churches/{$fixture['churchId']}/departments/16/report";
    $saveUrl = $url.'/save';

    $this->actingAs($otherPastor, 'sanctum')
        ->getJson($url)
        ->assertForbidden();
    $this->actingAs($assistant, 'sanctum')
        ->getJson($url)
        ->assertForbidden();
    $this->actingAs($assistant, 'sanctum')
        ->postJson($saveUrl, ['items' => []])
        ->assertForbidden();
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
