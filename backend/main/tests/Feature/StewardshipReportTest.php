<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function stewardshipReportFixture(string $role = 'representative'): array
{
    $districtId = DB::table('churches')->insertGetId([
        'name' => 'North District',
        'address' => 'North',
        'parent_id' => null,
    ]);
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Local Church',
        'address' => 'North District',
        'parent_id' => $districtId,
    ]);
    $departmentId = 14;
    DB::table('departments')->insert([
        'department_id' => $departmentId,
        'department_name' => 'Stewardship Ministries',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'Stewardship Quarterly Report',
        'parent_id' => null,
    ]);
    $sectionId = DB::table('programs')->insertGetId([
        'department_id' => $departmentId,
        'program_name' => 'STEWARDSHIP',
        'parent_id' => $programId,
    ]);
    $particularIds = [];

    foreach ([
        'No. of Church Members',
        'No. of Tithe Giving Units',
        'Offering',
        'Tithes',
    ] as $name) {
        $particularIds[$name] = DB::table('particulars')->insertGetId([
            'program_id' => $sectionId,
            'particular_name' => $name,
        ]);
    }

    $user = User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Church',
        'middle_name' => null,
        'last_name' => 'Representative',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => $role,
        'email' => 'stewardship-'.str_replace(' ', '-', $role).'@example.com',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);

    return compact('user', 'churchId', 'districtId', 'programId', 'particularIds');
}

function stewardshipReportPayload(array $particularIds, int $year, int $quarter): array
{
    return [
        'year' => $year,
        'quarter' => $quarter,
        'values' => [
            ['particular_id' => $particularIds['No. of Church Members'], 'value' => 120],
            ['particular_id' => $particularIds['No. of Tithe Giving Units'], 'value' => 30],
        ],
        'monthly' => [
            ['particular_id' => $particularIds['Offering'], 'values' => [100.25, 200, 300]],
            ['particular_id' => $particularIds['Tithes'], 'values' => [50, 75.50, 100]],
        ],
    ];
}

it('loads the signed-in representative church report and quarterly catalog', function () {
    $fixture = stewardshipReportFixture();

    $this->actingAs($fixture['user'], 'sanctum')
        ->getJson('/api/stewardship/report?year='.now()->year.'&quarter=1')
        ->assertOk()
        ->assertJsonPath('church.church_id', $fixture['churchId'])
        ->assertJsonPath('church.name', 'Local Church')
        ->assertJsonPath('church.district', 'North District')
        ->assertJsonPath('report.status', 'Draft')
        ->assertJsonPath('report.monthly.'.$fixture['particularIds']['Offering'].'.0', null);
});

it('saves monthly decimal amounts, submits the report, and allows reopening before endorsement', function () {
    $fixture = stewardshipReportFixture();
    $payload = stewardshipReportPayload($fixture['particularIds'], now()->year, 1);

    $this->actingAs($fixture['user'], 'sanctum')
        ->putJson('/api/stewardship/report', $payload)
        ->assertOk()
        ->assertJsonPath('status', 'Draft');

    $this->assertDatabaseHas('stewardships', [
        'type' => 'Offering',
        'month' => 'January',
        'value' => 100.25,
    ]);

    $this->actingAs($fixture['user'], 'sanctum')
        ->getJson('/api/stewardship/report?year='.now()->year.'&quarter=1')
        ->assertOk()
        ->assertJsonPath('report.values.'.$fixture['particularIds']['No. of Church Members'], 120)
        ->assertJsonPath('report.monthly.'.$fixture['particularIds']['Offering'].'.0', 100.25);

    $this->actingAs($fixture['user'], 'sanctum')
        ->getJson('/api/stewardship/report?year='.now()->year.'&quarter=0')
        ->assertOk()
        ->assertJsonPath('reports.1.values.'.$fixture['particularIds']['No. of Church Members'], 120)
        ->assertJsonPath('reports.2.values.'.$fixture['particularIds']['No. of Church Members'], null);

    $this->actingAs($fixture['user'], 'sanctum')
        ->postJson('/api/stewardship/report/submit', $payload)
        ->assertOk()
        ->assertJsonPath('status', 'Submitted');

    $this->actingAs($fixture['user'], 'sanctum')
        ->putJson('/api/stewardship/report', $payload)
        ->assertStatus(409);

    $this->actingAs($fixture['user'], 'sanctum')
        ->postJson('/api/stewardship/report/reopen', [
            'year' => now()->year,
            'quarter' => 1,
        ])
        ->assertOk()
        ->assertJsonPath('status', 'Draft');

    $this->actingAs($fixture['user'], 'sanctum')
        ->putJson('/api/stewardship/report', $payload)
        ->assertOk();
});

it('restricts stewardship report access to authenticated church representatives', function () {
    $fixture = stewardshipReportFixture('pastor');

    $this->getJson('/api/stewardship/report?year='.now()->year.'&quarter=1')
        ->assertUnauthorized();

    $this->actingAs($fixture['user'], 'sanctum')
        ->getJson('/api/stewardship/report?year='.now()->year.'&quarter=1')
        ->assertForbidden();
});
