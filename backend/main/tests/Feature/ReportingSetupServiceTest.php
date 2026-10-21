<?php

use App\Services\ReportingSetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('reporting setup creates quarterly records once per church and main program', function () {
    $churchId = DB::table('churches')->insertGetId([
        'name' => 'Setup Test Church',
        'address' => 'Setup Test District',
        'parent_id' => null,
    ]);
    DB::table('departments')->insert([
        'department_id' => 13,
        'department_name' => 'Setup Test Department',
    ]);
    $programId = DB::table('programs')->insertGetId([
        'department_id' => 13,
        'program_name' => 'Setup Test Program',
        'parent_id' => null,
    ]);
    DB::table('particulars')->insert([
        'program_id' => $programId,
        'particular_name' => 'Setup Test Particular',
    ]);

    $service = app(ReportingSetupService::class);

    $firstRun = $service->initialize('2026');
    $secondRun = $service->initialize('2026');

    expect($firstRun['quarters_created'])->toBe(4)
        ->and($firstRun['quarters_existing'])->toBe(0)
        ->and($secondRun['quarters_created'])->toBe(0)
        ->and($secondRun['quarters_existing'])->toBe(4);

    $this->assertDatabaseCount('quarters', 4);
    $this->assertDatabaseHas('quarters', [
        'church_id' => $churchId,
        'program_id' => $programId,
        'quarter' => 'Q4',
        'year' => '2026',
        'date_submitted' => null,
    ]);
});
