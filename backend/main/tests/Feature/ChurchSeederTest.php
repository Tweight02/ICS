<?php

use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('church seeder creates the spreadsheet districts and church entries idempotently', function () {
    $this->seed(ChurchSeeder::class);

    $districtCount = DB::table('churches')->whereNull('parent_id')->count();
    $churchCount = DB::table('churches')->whereNotNull('parent_id')->count();

    expect($districtCount)->toBe(32);

    $this->assertDatabaseHas('churches', [
        'name' => 'Metro Ilagan 2',
        'parent_id' => null,
    ]);

    $districtId = DB::table('churches')
        ->where('name', 'Metro Ilagan 2')
        ->whereNull('parent_id')
        ->value('church_id');

    $this->assertDatabaseHas('churches', [
        'name' => 'Sta. Catalina Company',
        'parent_id' => $districtId,
    ]);

    $this->assertDatabaseMissing('churches', [
        'name' => 'Catuguran Worship Group',
    ]);

    $this->seed(ChurchSeeder::class);

    expect(DB::table('churches')->whereNull('parent_id')->count())->toBe($districtCount)
        ->and(DB::table('churches')->whereNotNull('parent_id')->count())->toBe($churchCount);
});
