<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['department_id' => 13, 'department_name' => 'Children and Family Ministries'],
            ['department_id' => 14, 'department_name' => 'Stewardship Ministries'],
            ['department_id' => 15, 'department_name' => 'Sabbath School & Personal Ministries'],
            ['department_id' => 16, 'department_name' => 'Ministerial & Evangelism'],
            ['department_id' => 17, 'department_name' => 'Youth Ministries'],
            ['department_id' => 18, 'department_name' => 'Womens Ministries'],
            ['department_id' => 19, 'department_name' => 'Communication'],
            ['department_id' => 20, 'department_name' => 'Adventist Mission'],
            ['department_id' => 21, 'department_name' => 'Secretariat'],
            ['department_id' => 22, 'department_name' => 'Baptism Record'],
            ['department_id' => 23, 'department_name' => 'Death Record'],
        ];

        foreach ($departments as $department) {
            DB::table('departments')->updateOrInsert(
                ['department_id' => $department['department_id']],
                [
                    'department_name' => $department['department_name'],
                ]
            );
        }

        $this->command?->info('Departments seeded successfully.');
    }
}