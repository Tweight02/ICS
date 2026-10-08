<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('users')->insert([
            [
                'department_id'  => 1, // Change to an existing department ID
                'church_id'      => 1, // Change to an existing church ID
                'first_name'     => 'Juan',
                'middle_name'    => 'Santos',
                'last_name'      => 'Dela Cruz',
                'extension_name' => null,
                'birthdate'      => '1980-05-15',
                'gender'         => 'Male',
                'role'           => 'District Pastor',
                'email'          => 'district.pastor@example.com',
                'password'       => Hash::make('password123'),
                'remember_token' => null,
            ],
            [
                'department_id'  => 1, // Change to an existing department ID
                'church_id'      => 1, // Change to an existing church ID
                'first_name'     => 'Maria',
                'middle_name'    => 'Reyes',
                'last_name'      => 'Santos',
                'extension_name' => 'Jr.',
                'birthdate'      => '1985-08-22',
                'gender'         => 'Female',
                'role'           => 'Administration and Director',
                'email'          => 'admin.director@example.com',
                'password'       => Hash::make('password123'),
                'remember_token' => null,
            ],
        ]);
    }
}