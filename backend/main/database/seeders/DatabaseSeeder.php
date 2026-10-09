<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            ChurchSeeder::class,
            DepartmentSeeder::class,
            ProgramSeeder::class,
            ParticularSeeder::class,
            ReportSeeder::class,
            UserSeeder::class,
        ]);
    }
}