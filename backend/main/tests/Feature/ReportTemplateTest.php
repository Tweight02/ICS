<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function reportTemplateAssistant(): array
{
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Template Test Church',
        'address' => 'Test District',
        'parent_id' => null,
    ]);
    DB::table('churches')->insert([
        'name' => 'Template Test Local Church',
        'address' => 'Template Test Church',
        'parent_id' => $churchId,
    ]);

    $departmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Template Test Department',
    ]);

    $assistant = User::query()->create([
        'department_id' => $departmentId,
        'church_id' => $churchId,
        'first_name' => 'Test',
        'middle_name' => '',
        'last_name' => 'Assistant',
        'birthdate' => '1980-01-01',
        'gender' => 'other',
        'role' => 'assistant',
        'email' => 'template-assistant@example.com',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);

    return compact('departmentId', 'assistant');
}

test('assistant can create a reusable report template and its items', function () {
    $fixture = reportTemplateAssistant();

    $response = $this->actingAs($fixture['assistant'], 'sanctum')
        ->postJson('/api/assistant/report-templates', [
            'department_id' => $fixture['departmentId'],
            'program_name' => 'Youth Quarterly Report',
            'section_name' => 'Community Activities',
            'particular_items' => ['Attendance', 'Outreach'],
        ]);

    $response->assertCreated()
        ->assertJsonPath('message', 'Report template created successfully.')
        ->assertJsonPath('data.quarters_created', 4)
        ->assertJsonCount(2, 'data.particulars');

    $programId = $response->json('data.program_id');
    $sectionId = $response->json('data.section_id');

    $this->assertDatabaseHas('programs', [
        'program_id' => $programId,
        'department_id' => $fixture['departmentId'],
        'program_name' => 'Youth Quarterly Report',
        'parent_id' => null,
    ]);
    $this->assertDatabaseHas('programs', [
        'program_id' => $sectionId,
        'department_id' => $fixture['departmentId'],
        'program_name' => 'Community Activities',
        'parent_id' => $programId,
    ]);
    $this->assertDatabaseHas('particulars', [
        'program_id' => $sectionId,
        'particular_name' => 'Attendance',
    ]);
    $this->assertDatabaseHas('particulars', [
        'program_id' => $sectionId,
        'particular_name' => 'Outreach',
    ]);
    $this->assertDatabaseHas('quarters', [
        'program_id' => $programId,
        'quarter' => 'Q1',
        'year' => (string) now()->year,
        'date_submitted' => null,
    ]);
    $this->assertDatabaseCount('quarters', 4);
    $this->assertDatabaseCount('particular_items', 0);
});

test('only assistants can create report templates', function () {
    $fixture = reportTemplateAssistant();
    $fixture['assistant']->forceFill(['role' => 'pastor'])->save();

    $this->actingAs($fixture['assistant'], 'sanctum')
        ->postJson('/api/assistant/report-templates', [
            'department_id' => $fixture['departmentId'],
            'program_name' => 'Youth Quarterly Report',
            'section_name' => 'Community Activities',
            'particular_items' => ['Attendance'],
        ])
        ->assertForbidden();

    $this->assertDatabaseCount('programs', 0);
    $this->assertDatabaseCount('particulars', 0);
});

test('assistant cannot create a report template for another department', function () {
    $fixture = reportTemplateAssistant();
    $otherDepartmentId = DB::table('departments')->insertGetId([
        'department_name' => 'Another Department',
    ]);

    $this->actingAs($fixture['assistant'], 'sanctum')
        ->postJson('/api/assistant/report-templates', [
            'department_id' => $otherDepartmentId,
            'program_name' => 'Other Department Report',
            'section_name' => 'Activities',
            'particular_items' => ['Attendance'],
        ])
        ->assertForbidden()
        ->assertJsonPath(
            'message',
            'You can only create report templates for your assigned department.'
        );

    $this->assertDatabaseCount('programs', 0);
    $this->assertDatabaseCount('particulars', 0);
});

test('report template creation rejects missing items without partial records', function () {
    $fixture = reportTemplateAssistant();

    $this->actingAs($fixture['assistant'], 'sanctum')
        ->postJson('/api/assistant/report-templates', [
            'department_id' => $fixture['departmentId'],
            'program_name' => 'Youth Quarterly Report',
            'section_name' => 'Community Activities',
            'particular_items' => [],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('particular_items');

    $this->assertDatabaseCount('programs', 0);
    $this->assertDatabaseCount('particulars', 0);
});
