<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UserSeeder extends Seeder
{
    private const SEEDED_PASSWORD = '12345678';

    public function run(): void
    {
        $departments = DB::table('departments')
            ->orderBy('department_id')
            ->get(['department_id', 'department_name']);
        $districts = DB::table('churches')
            ->whereNull('parent_id')
            ->orderBy('church_id')
            ->get(['church_id', 'name']);
        $churches = DB::table('churches')
            ->whereNotNull('parent_id')
            ->orderBy('church_id')
            ->get(['church_id', 'name']);

        if ($departments->isEmpty()) {
            throw new RuntimeException('No departments are available. Run DepartmentSeeder first.');
        }

        if ($departments->count() < 10) {
            throw new RuntimeException('At least 10 departments are required to seed church users across departments.');
        }

        if ($districts->isEmpty()) {
            throw new RuntimeException('No districts are available. Run ChurchSeeder first.');
        }

        if ($churches->isEmpty()) {
            throw new RuntimeException('No churches are available. Run ChurchSeeder first.');
        }

        $primaryDepartmentId = (int) (
            $departments->firstWhere('department_id', 16)?->department_id
            ?? $departments->first()->department_id
        );
        $adminChurchId = (int) $districts->first()->church_id;
        $passwordHash = Hash::make(self::SEEDED_PASSWORD);

        $this->seedUser(
            $this->user(
                $primaryDepartmentId,
                $adminChurchId,
                'Head',
                'Assistant',
                'head assistant',
                'seed.head-assistant@example.com',
                $passwordHash
            )
        );
        $this->seedUser(
            $this->user(
                $primaryDepartmentId,
                $adminChurchId,
                'Head',
                'Director',
                'head director',
                'seed.head-director@example.com',
                $passwordHash
            )
        );

        foreach ($departments as $department) {
            $departmentId = (int) $department->department_id;
            $departmentTag = "department-{$departmentId}";

            $this->seedUser(
                $this->user(
                    $departmentId,
                    $adminChurchId,
                    'Department',
                    'Assistant',
                    'assistant',
                    "seed.assistant.{$departmentTag}@example.com",
                    $passwordHash
                )
            );
            $this->seedUser(
                $this->user(
                    $departmentId,
                    $adminChurchId,
                    'Department',
                    'Director',
                    'director',
                    "seed.director.{$departmentTag}@example.com",
                    $passwordHash
                )
            );

            $church = $churches[($departmentId - (int) $departments->first()->department_id)
                % $churches->count()];
            $this->seedUser(
                $this->user(
                    $departmentId,
                    (int) $church->church_id,
                    'Church',
                    'Representative',
                    'representative',
                    "seed.church-user.{$departmentTag}@example.com",
                    $passwordHash
                )
            );
        }

        foreach ($districts as $district) {
            $this->seedUser(
                $this->user(
                    $primaryDepartmentId,
                    (int) $district->church_id,
                    (string) $district->name,
                    'Pastor',
                    'pastor',
                    "seed.pastor.district-{$district->church_id}@example.com",
                    $passwordHash
                )
            );
        }

        $this->command?->info(sprintf(
            'Seeded %d department assistants, %d department directors, %d church users, and %d district pastors, plus Head Assistant and Head Director.',
            $departments->count(),
            $departments->count(),
            $departments->count(),
            $districts->count()
        ));
    }

    /**
     * @return array<string, int|string|null>
     */
    private function user(
        int $departmentId,
        int $churchId,
        string $firstName,
        string $lastName,
        string $role,
        string $email,
        string $passwordHash
    ): array {
        return [
            'department_id' => $departmentId,
            'church_id' => $churchId,
            'first_name' => $firstName,
            'middle_name' => null,
            'last_name' => $lastName,
            'extension_name' => null,
            'birthdate' => '1990-01-01',
            'gender' => 'other',
            'role' => $role,
            'email' => $email,
            'password' => $passwordHash,
            'remember_token' => null,
            'status' => 'active',
        ];
    }

    /**
     * @param  array<string, int|string|null>  $user
     */
    private function seedUser(array $user): void
    {
        DB::table('users')->updateOrInsert(
            ['email' => $user['email']],
            $user
        );
    }
}
