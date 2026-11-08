<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UserSeeder extends Seeder
{
    private const SEEDED_PASSWORD = '12345678';

    private const GLOBAL_ASSISTANT_EMAIL = 'seed.assistant@example.com';

    private const DEPARTMENTS_WITHOUT_SEEDED_USERS = [
        'Adventist Mission',
        'Baptism Record',
        'Death Record',
    ];

    public function run(): void
    {
        $departments = DB::table('departments')
            ->orderBy('department_id')
            ->get(['department_id', 'department_name']);
        $userDepartments = $departments
            ->reject(fn ($department) => in_array(
                $department->department_name,
                self::DEPARTMENTS_WITHOUT_SEEDED_USERS,
                true
            ))
            ->values();
        $obsoleteSeedEmails = $departments
            ->filter(fn ($department) => in_array(
                $department->department_name,
                self::DEPARTMENTS_WITHOUT_SEEDED_USERS,
                true
            ))
            ->flatMap(fn ($department) => [
                'seed.director.department-'.$department->department_id.'@example.com',
                'seed.church-user.department-'.$department->department_id.'@example.com',
            ])
            ->all();
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

        if ($userDepartments->isEmpty()) {
            throw new RuntimeException('No departments are eligible for seeded directors and representatives.');
        }

        if ($districts->isEmpty()) {
            throw new RuntimeException('No districts are available. Run ChurchSeeder first.');
        }

        if ($churches->isEmpty()) {
            throw new RuntimeException('No churches are available. Run ChurchSeeder first.');
        }

        $adminChurchId = (int) $districts->first()->church_id;
        $passwordHash = Hash::make(self::SEEDED_PASSWORD);

        DB::transaction(function () use ($adminChurchId, $passwordHash, $obsoleteSeedEmails): void {
            DB::table('users')
                ->whereRaw(
                    "LOWER(REPLACE(REPLACE(role, '_', ' '), '-', ' ')) IN (?, ?, ?, ?)",
                    ['assistant', 'administrative assistant', 'head assistant', 'head director']
                )
                ->where('email', '!=', self::GLOBAL_ASSISTANT_EMAIL)
                ->delete();

            if ($obsoleteSeedEmails !== []) {
                DB::table('users')->whereIn('email', $obsoleteSeedEmails)->delete();
            }

            $this->seedUser(
                $this->user(
                    null,
                    $adminChurchId,
                    'Administrative',
                    'Assistant',
                    'assistant',
                    self::GLOBAL_ASSISTANT_EMAIL,
                    $passwordHash
                )
            );
        });

        foreach ($userDepartments as $department) {
            $departmentId = (int) $department->department_id;
            $departmentTag = "department-{$departmentId}";

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
                    null,
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
                    null,
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
            'Seeded one mission-wide assistant, %d department directors, %d church users, and %d district pastors.',
            $userDepartments->count(),
            $userDepartments->count(),
            $districts->count()
        ));
    }

    /**
     * @return array<string, int|string|null>
     */
    private function user(
        ?int $departmentId,
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
