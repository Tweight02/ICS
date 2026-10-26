<?php

use Database\Seeders\ReportSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('report seeder does not approve later quarters when Q1 is pending', function () {
    $this->seed(ReportSeeder::class);

    $pendingQ1 = DB::table('quarters')
        ->where('quarter', 'Q1')
        ->whereNull('mission_approve')
        ->first();

    expect($pendingQ1)->not->toBeNull();

    $laterApprovals = DB::table('quarters as later')
        ->join('quarters as first', function ($join) {
            $join->on('later.church_id', '=', 'first.church_id')
                ->on('later.program_id', '=', 'first.program_id')
                ->on('later.year', '=', 'first.year');
        })
        ->where('first.quarter', 'Q1')
        ->whereNull('first.mission_approve')
        ->whereIn('later.quarter', ['Q2', 'Q3', 'Q4'])
        ->whereNotNull('later.mission_approve')
        ->count();

    $this->assertSame(0, $laterApprovals);
});
