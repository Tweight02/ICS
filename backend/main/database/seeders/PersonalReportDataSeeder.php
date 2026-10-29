<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PersonalReportDataSeeder extends Seeder
{
    /**
     * The per-quarter sample baptism counts are also recorded in the
     * Ministerial & Evangelism "No. of Baptisms Achieved" report item.
     *
     * @var array<int, int>
     */
    private const BAPTISMS_BY_QUARTER = [
        1 => 10,
        2 => 12,
        3 => 25,
    ];

    public function run(): void
    {
        $year = (string) config('app.reporting_year', now()->year);

        if (! preg_match('/^\d{4}$/', $year)) {
            throw new RuntimeException('Invalid reporting year. Use a four-digit year.');
        }

        $churchId = $this->sampleChurchId();

        DB::transaction(function () use ($churchId, $year): void {
            $this->seedBaptisms($churchId, (int) $year);
            $this->seedDepartmentReportItems($churchId, $year);
        });

        $this->command?->info(
            'Personal report sample data seeded: 10 Q1, 12 Q2, and 25 Q3 baptisms; Q4 left blank.'
        );
    }

    private function sampleChurchId(): int
    {
        $districtId = DB::table('users')
            ->where('email', 'seed.head-assistant@example.com')
            ->value('church_id');

        if ($districtId === null) {
            $districtId = DB::table('churches')
                ->whereNull('parent_id')
                ->orderBy('church_id')
                ->value('church_id');
        }

        if ($districtId === null) {
            throw new RuntimeException('No district is available. Run ChurchSeeder first.');
        }

        $churchId = DB::table('churches')
            ->where('parent_id', $districtId)
            ->orderBy('church_id')
            ->value('church_id');

        if ($churchId === null) {
            $churchId = DB::table('churches')
                ->whereNotNull('parent_id')
                ->orderBy('church_id')
                ->value('church_id');
        }

        if ($churchId === null) {
            throw new RuntimeException('No church is available for personal report sample data.');
        }

        return (int) $churchId;
    }

    private function seedBaptisms(int $churchId, int $year): void
    {
        foreach (self::BAPTISMS_BY_QUARTER as $quarter => $count) {
            $firstMonth = (($quarter - 1) * 3) + 1;
            $daysInQuarter = 90;

            for ($number = 1; $number <= $count; $number++) {
                $dateOfBaptism = Carbon::create($year, $firstMonth, 1)
                    ->addDays((int) floor(($number - 1) * $daysInQuarter / $count));
                $firstName = sprintf('Seeded Baptism %02d', $number);
                $lastName = "Q{$quarter} Sample";

                DB::table('baptisms')->updateOrInsert(
                    [
                        'church_id' => $churchId,
                        'quarter' => "Q{$quarter}",
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                    ],
                    [
                        'middle_name' => '',
                        'extension_name' => null,
                        'birthdate' => $dateOfBaptism->copy()->subYears(20)->toDateString(),
                        'gender' => $number % 2 === 0 ? 'Female' : 'Male',
                        'address' => 'Sample address',
                        'officiating_minister' => 'Sample Pastor',
                        'place_of_baptism' => 'Sample Church',
                        'date_of_baptism' => $dateOfBaptism->toDateString(),
                        'marital_status' => 'Single',
                        'is_reclaimed' => false,
                    ]
                );
            }
        }
    }

    private function seedDepartmentReportItems(int $churchId, string $year): void
    {
        $expectedBaptisms = self::BAPTISMS_BY_QUARTER;
        $departments = DB::table('departments')
            ->whereIn('department_name', ['Ministerial & Evangelism', 'Adventist Mission'])
            ->get(['department_id', 'department_name'])
            ->keyBy('department_name');

        foreach (['Ministerial & Evangelism', 'Adventist Mission'] as $departmentName) {
            $department = $departments->get($departmentName);

            if (! $department) {
                throw new RuntimeException("The {$departmentName} department is missing.");
            }

            $programs = DB::table('programs')
                ->where('department_id', $department->department_id)
                ->whereNull('parent_id')
                ->orderBy('program_id')
                ->get(['program_id']);

            if ($programs->isEmpty()) {
                throw new RuntimeException("No report form is configured for {$departmentName}.");
            }

            foreach ($programs as $program) {
                $particulars = DB::table('programs as sections')
                    ->join('particulars', 'particulars.program_id', '=', 'sections.program_id')
                    ->where('sections.parent_id', $program->program_id)
                    ->orderBy('particulars.particular_id')
                    ->get([
                        'particulars.particular_id',
                        'particulars.particular_name',
                    ]);

                if ($particulars->isEmpty()) {
                    throw new RuntimeException("No report items are configured for {$departmentName}.");
                }

                $quarters = DB::table('quarters')
                    ->where('church_id', $churchId)
                    ->where('program_id', $program->program_id)
                    ->where('year', $year)
                    ->whereIn('quarter', ['Q1', 'Q2', 'Q3'])
                    ->get(['quarter_id', 'quarter']);

                if ($quarters->count() !== 3) {
                    throw new RuntimeException(
                        "Q1-Q3 reporting quarters for {$departmentName} are missing. Run ReportingSetupSeeder first."
                    );
                }

                foreach ($quarters as $quarter) {
                    $quarterNumber = (int) substr((string) $quarter->quarter, 1);

                    foreach ($particulars as $particular) {
                        $isBaptismAchievement = $departmentName === 'Ministerial & Evangelism'
                            && strtolower(trim((string) $particular->particular_name)) === 'no. of baptisms achieved';

                        if ($isBaptismAchievement) {
                            $this->saveItem(
                                (int) $quarter->quarter_id,
                                (int) $particular->particular_id,
                                $expectedBaptisms[$quarterNumber],
                                true
                            );

                            continue;
                        }

                        $exists = DB::table('particular_items')
                            ->where('quarter_id', $quarter->quarter_id)
                            ->where('particular_id', $particular->particular_id)
                            ->exists();

                        if (! $exists) {
                            $sampleValue = (($quarterNumber + (int) $particular->particular_id) % 8) + 1;
                            $this->saveItem(
                                (int) $quarter->quarter_id,
                                (int) $particular->particular_id,
                                $sampleValue,
                                false
                            );
                        }
                    }
                }
            }
        }
    }

    private function saveItem(
        int $quarterId,
        int $particularId,
        int $value,
        bool $overwrite
    ): void {
        $query = DB::table('particular_items')
            ->where('quarter_id', $quarterId)
            ->where('particular_id', $particularId);

        $item = $query->first(['item_id']);
        $data = [
            'value' => $value,
            'manual_value' => $value,
        ];

        if ($item) {
            if ($overwrite) {
                DB::table('particular_items')
                    ->where('item_id', $item->item_id)
                    ->update($data);
            }

            return;
        }

        DB::table('particular_items')->insert([
            'quarter_id' => $quarterId,
            'particular_id' => $particularId,
            ...$data,
        ]);
    }
}
