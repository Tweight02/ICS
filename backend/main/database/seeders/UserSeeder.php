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
                'department_id'  => 16, // Ministerial & Evangelism
                'church_id'      => 1,
                'first_name'     => 'Juan',
                'middle_name'    => 'Santos',
                'last_name'      => 'Dela Cruz',
                'extension_name' => null,
                'birthdate'      => '1980-05-15',
                'gender'         => 'Male',
                'role'           => 'representative',
                'email'          => 'district.representative@example.com',
                'status'         => 'active'
            ],
              [
                'department_id'  => 16, // Ministerial & Evangelism
                'church_id'      => 1,
                'first_name'     => 'James',
                'middle_name'    => 'Harmes',
                'last_name'      => 'Dela Cruz',
                'extension_name' => null,
                'birthdate'      => '1980-05-15',
                'gender'         => 'Male',
                'role'           => 'pastor',
                'email'          => 'James.pastor@gmail.com',
                'status'         => 'active'
            ],
            [
                'department_id'  => 19, // Communication
                'church_id'      => 1,
                'first_name'     => 'Maria',
                'middle_name'    => 'Reyes',
                'last_name'      => 'Santos',
                'extension_name' => 'Jr.',
                'birthdate'      => '1985-08-22',
                'gender'         => 'Female',
                'role'           => 'director',
                'email'          => 'admin.director@example.com',
                'status'         => 'active'
            ],
                        [
                'department_id'  => 19, // assistant
                'church_id'      => 1,
                'first_name'     => 'Maria',
                'middle_name'    => 'Reyes',
                'last_name'      => 'Santos',
                'extension_name' => 'Jr.',
                'birthdate'      => '1985-08-22',
                'gender'         => 'Female',
                'role'           => 'assistant',
                'email'          => 'assistant.e@example.com',
                'status'         => 'active'
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                array_merge($user, [
                    'password' => Hash::make('password123'),
                    'remember_token' => null,
                ])
            );
        }

        $this->command?->info(count($users) . ' test users processed.');
    }
}