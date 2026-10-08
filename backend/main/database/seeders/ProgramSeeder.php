<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        $programs = [
            [
                'program_id' => 48,
                'department_id' => 13,
                'program_name' => 'Children and Family Ministries Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 51,
                'department_id' => 14,
                'program_name' => 'Stewardship Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 54,
                'department_id' => 15,
                'program_name' => 'Sabbath School & Personal Ministries Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 63,
                'department_id' => 16,
                'program_name' => 'Ministerial & Evangelism Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 70,
                'department_id' => 17,
                'program_name' => 'AY Quarterly Statistics',
                'parent_id' => null,
            ],
            [
                'program_id' => 72,
                'department_id' => 17,
                'program_name' => 'AY Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 80,
                'department_id' => 18,
                'program_name' => 'Womens Ministries Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 83,
                'department_id' => 19,
                'program_name' => 'Communication Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 85,
                'department_id' => 20,
                'program_name' => 'Adventist Mission Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 87,
                'department_id' => 21,
                'program_name' => 'Secretariat Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 89,
                'department_id' => 22,
                'program_name' => 'Baptism Record',
                'parent_id' => null,
            ],
            [
                'program_id' => 91,
                'department_id' => 23,
                'program_name' => 'Death Record',
                'parent_id' => null,
            ],
        ];

        foreach ($programs as $program) {
            DB::table('programs')->updateOrInsert(
                ['program_id' => $program['program_id']],
                [
                    'department_id' => $program['department_id'],
                    'program_name' => $program['program_name'],
                    'parent_id' => $program['parent_id'],
                ]
            );
        }

        $this->command?->info('Main programs seeded successfully.');
    }
}