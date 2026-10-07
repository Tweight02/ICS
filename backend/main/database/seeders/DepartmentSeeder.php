<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
        $departments = [
            'Children and Family Ministries',
            'Stewardship Ministries',
            'Sabbath School & Personal Ministries',
            'Ministerial & Evangelism',
            'Youth Ministries',
            'Womens Ministries',
        ];

        foreach ($departments as $name) {
            Department::create([
                'department_name' => $name,
            ]);
        }
    }
}
