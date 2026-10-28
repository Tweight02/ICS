<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'department_id' => 16, // Ministerial & Evangelism
                'church_id' => 1,
                'first_name' => 'Juan',
                'middle_name' => 'Santos',
                'last_name' => 'Dela Cruz',
                'extension_name' => null,
                'birthdate' => '1980-05-15',
                'gender' => 'Male',
                'role' => 'representative',
                'email' => 'district.representative@example.com',
                'status' => 'active',
            ],
            [
                'department_id' => 16, // Ministerial & Evangelism
                'church_id' => 1,
                'first_name' => 'James',
                'middle_name' => 'Harmes',
                'last_name' => 'Dela Cruz',
                'extension_name' => null,
                'birthdate' => '1980-05-15',
                'gender' => 'Male',
                'role' => 'pastor',
                'email' => 'James.pastor@gmail.com',
                'status' => 'active',
            ],
            [
                'department_id' => 19, // Communication
                'church_id' => 1,
                'first_name' => 'Maria',
                'middle_name' => 'Reyes',
                'last_name' => 'Santos',
                'extension_name' => 'Jr.',
                'birthdate' => '1985-08-22',
                'gender' => 'Female',
                'role' => 'director',
                'email' => 'admin.director@example.com',
                'status' => 'active',
            ],
            [
                'department_id' => 19, // assistant
                'church_id' => 1,
                'first_name' => 'Maria',
                'middle_name' => 'Reyes',
                'last_name' => 'Santos',
                'extension_name' => 'Jr.',
                'birthdate' => '1985-08-22',
                'gender' => 'Female',
                'role' => 'assistant',
                'email' => 'assistant.e@example.com',
                'status' => 'active',
            ],
            [
                'department_id' => 16,
                'church_id' => 2,
                'first_name' => 'Andrie',
                'middle_name' => null,
                'last_name' => 'Aquino',
                'extension_name' => null,
                'birthdate' => '1998-12-10',
                'gender' => 'male',
                'role' => 'representative',
                'email' => 'representative@example.com',
                'status' => 'active',
            ],
            [
                'department_id' => 16,
                'church_id' => 210,
                'first_name' => 'Ross',
                'middle_name' => null,
                'last_name' => 'Butobara',
                'extension_name' => null,
                'birthdate' => '2006-08-12',
                'gender' => 'male',
                'role' => 'pastor',
                'email' => 'pastorRoss@gmail.com',
                'status' => 'active',
            ],
            [
                'department_id' => 16,
                'church_id' => 214,
                'first_name' => 'Nico',
                'middle_name' => null,
                'last_name' => 'Pugoy',
                'extension_name' => null,
                'birthdate' => '1984-05-23',
                'gender' => 'male',
                'role' => 'representative',
                'email' => 'church@gamil.com',
                'status' => 'active',
            ],
        ];

        $assistantDepartments = [
            13 => 'children-family-ministries',
            14 => 'stewardship-ministries',
            15 => 'sabbath-school-personal-ministries',
            17 => 'youth-ministries',
            18 => 'womens-ministries',
            21 => 'secretariat',
        ];

        foreach ($assistantDepartments as $departmentId => $emailSlug) {
            $users[] = [
                'department_id' => $departmentId,
                'church_id' => 1,
                'first_name' => 'Department',
                'middle_name' => null,
                'last_name' => 'Assistant',
                'extension_name' => null,
                'birthdate' => '1990-01-01',
                'gender' => 'other',
                'role' => 'assistant',
                'email' => "assistant.{$emailSlug}@example.com",
                'status' => 'active',
            ];
        }

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                array_merge($user, [
                    'password' => Hash::make('password123'),
                    'remember_token' => null,
                ])
            );
        }

        $this->command?->info(count($users).' test users processed.');
    }
}
