<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the report side of the ERD:
 * Departments, Programs, Particulars, Particular_Items, Quarters,
 * Churches, Stewardship, Baptism_Record, Death_Record.
 *
 * Structure:  Department -> Programs (report form, parent_id = null)
 *                        -> Programs (section of the form, parent_id = form)
 *                        -> Particulars (the rows of that section)
 * Data:       Quarters (one per church + form + quarter) -> Particular_Items (the values)
 */
class ReportSeeder extends Seeder
{
    /** Churches in this district get quarterly report data. */
    private const REPORT_DISTRICT = 'Eastern Nueva Vizcaya';

    /** The sample baptism and death records on the page belong to this district. */
    private const RECORDS_DISTRICT = 'Eastern Nueva Vizcaya';

    private const YEAR = 2026;

    private const STEWARDSHIP_FORM = 'Stewardship Quarterly Report';

    /** Q3 completion per department (Q1 and Q2 are complete, Q4 is empty). */
    private const Q3_PROGRESS = [
        'Children and Family Ministries' => 0.50,
        'Stewardship Ministries' => 0.40,
        'Sabbath School & Personal Ministries' => 0.50,
        'Ministerial & Evangelism' => 0.60,
        'Youth Ministries' => 0.53,
        'Womens Ministries' => 0.63,
        'Communication' => 0.60,
        'Adventist Mission' => 0.53,
        'Secretariat' => 0.67,
        'Baptism Record' => 0.50,
        'Death Record' => 0.40,
    ];

    /** @var array<string,int> "district|church" => church_id */
    private array $churchIds = [];

    /** @var array<string,int> report form name => program_id */
    private array $formIds = [];

    /** @var array<string,string> report form name => department name */
    private array $formDepartments = [];

    /** @var array<string,array<int,array{id:int,name:string}>> report form name => particulars, in order */
    private array $particulars = [];

    public function run(): void
    {
        if (DB::table('departments')->exists()) {
            $this->command?->warn('ReportSeeder: the departments table already has rows, skipping.');

            return;
        }

        DB::transaction(function () {
            $this->seedChurches();
            $this->seedReportStructure();
            $counts = $this->seedBaptismAndDeathRecords();
            $this->seedQuarterlyReports($counts);
        });
    }

    /* ---------------------------------------------------------------
     | Churches (districts are parents, churches/companies are children)
     * ------------------------------------------------------------- */

    private function seedChurches(): void
    {
        foreach ($this->roster() as $district => $names) {
            $districtId = DB::table('churches')->insertGetId([
                'name' => $district,
                'address' => $district.' District',
                'parent_id' => null,
            ], 'church_id');

            foreach ($names as $name) {
                $this->churchIds["$district|$name"] = DB::table('churches')->insertGetId([
                    'name' => $name,
                    'address' => $name.', '.$district,
                    'parent_id' => $districtId,
                ], 'church_id');
            }
        }
    }

    /* ---------------------------------------------------------------
     | Department -> Programs -> Particulars
     * ------------------------------------------------------------- */

    private function seedReportStructure(): void
    {
        foreach ($this->forms() as $department => $forms) {
            $departmentId = DB::table('departments')->insertGetId([
                'department_name' => $department,
            ], 'department_id');

            foreach ($forms as $form => $sections) {
                $formId = DB::table('programs')->insertGetId([
                    'department_id' => $departmentId,
                    'program_name' => $form,
                    'parent_id' => null,
                ], 'program_id');

                $this->formIds[$form] = $formId;
                $this->formDepartments[$form] = $department;

                foreach ($sections as $section => $rows) {
                    $sectionId = DB::table('programs')->insertGetId([
                        'department_id' => $departmentId,
                        'program_name' => $section,
                        'parent_id' => $formId,
                    ], 'program_id');

                    foreach ($rows as $row) {
                        $this->particulars[$form][] = [
                            'id' => DB::table('particulars')->insertGetId([
                                'program_id' => $sectionId,
                                'particular_name' => $row,
                            ], 'particular_id'),
                            'name' => $row,
                        ];
                    }
                }
            }
        }
    }

    /* ---------------------------------------------------------------
     | Baptism_Record and Death_Record
     | Returns per-church, per-quarter counts for the two "record" forms.
     * ------------------------------------------------------------- */

    private function seedBaptismAndDeathRecords(): array
    {
        $counts = ['Baptism Record' => [], 'Death Record' => []];

        foreach ($this->baptisms() as [$first, $last, $address, $church, $minister, $birthdate, $baptized, $gender, $marital, $reclaimed]) {
            $churchId = $this->recordChurchId($church);

            $this->insertBaptism([
                'church_id' => $churchId, 'first' => $first, 'last' => $last, 'birthdate' => $birthdate,
                'gender' => $gender, 'address' => $address, 'minister' => $minister, 'place' => $church,
                'baptized' => $baptized, 'marital' => $marital, 'reclaimed' => $reclaimed,
            ]);

            $this->tally($counts['Baptism Record'], $churchId, $baptized);
        }

        // Death_Record only points at a Baptism_Record, so each deceased member gets one.
        foreach ($this->deaths() as [$first, $last, $church, $birthdate, $died, $gender, $marital]) {
            $churchId = $this->recordChurchId($church);

            $baptismId = $this->insertBaptism([
                'church_id' => $churchId, 'first' => $first, 'last' => $last, 'birthdate' => $birthdate,
                'gender' => $gender, 'address' => $church, 'minister' => 'N/A', 'place' => $church,
                // Not on the page: placeholder date so the foreign key has a row to point at.
                'baptized' => Carbon::parse($birthdate)->addYears(20)->toDateString(),
                'marital' => $marital, 'reclaimed' => false,
            ]);

            DB::table('deaths')->insert([
                'baptism_id' => $baptismId,
                'date_of_death' => $died,
            ]);

            $this->tally($counts['Death Record'], $churchId, $died);
        }

        return $counts;
    }

    private function insertBaptism(array $r): int
    {
        return DB::table('baptisms')->insertGetId([
            'church_id' => $r['church_id'],
            'first_name' => $r['first'],
            'middle_name' => '',
            'last_name' => $r['last'],
            'extension_name' => '',
            'birthdate' => $r['birthdate'],
            'gender' => $r['gender'],
            'address' => $r['address'],
            'officiating_minister' => $r['minister'],
            'place_of_baptism' => $r['place'],
            'date_of_baptism' => $r['baptized'],
            'marital_status' => $r['marital'],
            'is_reclaimed' => $r['reclaimed'],
        ], 'baptism_id');
    }

    private function tally(array &$bucket, int $churchId, string $date): void
    {
        $when = Carbon::parse($date);

        if ($when->year === self::YEAR) {
            $bucket[$churchId][$when->quarter] = ($bucket[$churchId][$when->quarter] ?? 0) + 1;
        }
    }

    private function recordChurchId(string $church): int
    {
        return $this->churchIds[self::RECORDS_DISTRICT.'|'.$church];
    }

    /* ---------------------------------------------------------------
     | Quarter -> Particular_Items (+ Stewardship for offering / tithes)
     * ------------------------------------------------------------- */

    private function seedQuarterlyReports(array $counts): void
    {
        $prefix = self::REPORT_DISTRICT.'|';

        foreach ($this->churchIds as $key => $churchId) {
            if (! str_starts_with($key, $prefix)) {
                continue;
            }

            $members = 40 + crc32($key) % 220;

            foreach ($this->formIds as $form => $programId) {
                $particulars = $this->particulars[$form];
                $countBased = isset($counts[$form]);

                foreach ([1, 2, 3, 4] as $quarter) {
                    /*
                     * quarters schema:
                     * quarter (string), year (string),
                     * date_submitted (date|null),
                     * district_endorse (date|null),
                     * mission_approve (date|null).
                     *
                     * Q1-Q3 are submitted and endorsed, awaiting mission approval.
                     * Q4 is not submitted yet and has no values.
                     */
                    $submitted = $quarter <= 3;
                    $districtEndorsed = $quarter <= 3;

                    $quarterId = DB::table('quarters')->insertGetId([
                        'program_id' => $programId,
                        'church_id' => $churchId,
                        'quarter' => 'Q'.$quarter,
                        'year' => (string) self::YEAR,
                        'date_submitted' => $submitted
                            ? Carbon::create(self::YEAR, $quarter * 3, 5)->toDateString()
                            : null,
                        'district_endorse' => $districtEndorsed
                            ? Carbon::create(self::YEAR, $quarter * 3, 6)->toDateString()
                            : null,
                        'mission_approve' => null,
                    ], 'quarter_id');

                    // Q3 is still being filled in, so only part of the form has values.
                    // Q4 is intentionally empty.
                    if ($quarter === 4) {
                        $filled = 0;
                    } elseif ($quarter <= 2 || $countBased) {
                        $filled = count($particulars);
                    } else {
                        $filled = (int) round(
                            count($particulars) *
                            self::Q3_PROGRESS[$this->formDepartments[$form]]
                        );
                    }

                    $items = [];

                    foreach (array_slice($particulars, 0, $filled) as $particular) {
                        if ($form === self::STEWARDSHIP_FORM && in_array($particular['name'], ['Offering', 'Tithes'], true)) {
                            $this->seedMoney($particular['id'], $quarterId, $particular['name'], $quarter, $members, $key);

                            continue;
                        }

                        $items[] = [
                            'particular_id' => $particular['id'],
                            'quarter_id' => $quarterId,
                            'value' => $this->valueFor($form, $particular, $churchId, $key, $quarter, $members, $counts),
                        ];
                    }

                    foreach (array_chunk($items, 500) as $chunk) {
                        DB::table('particular_items')->insert($chunk);
                    }
                }
            }
        }
    }

    private function valueFor(string $form, array $particular, int $churchId, string $churchKey, int $quarter, int $members, array $counts): int
    {
        if (isset($counts[$form])) {
            return $counts[$form][$churchId][$quarter] ?? 0;
        }

        if ($particular['name'] === 'No. of Church Members') {
            return $members;
        }

        return $this->quarterValues("$churchKey|{$particular['id']}")[$quarter - 1];
    }

    /** Offering / Tithes: one Particular_Item for the quarter, one Stewardship row per month. */
    private function seedMoney(int $particularId, int $quarterId, string $type, int $quarter, int $members, string $churchKey): void
    {
        mt_srand(crc32("$churchKey|$type|$quarter"));

        $months = [];

        for ($i = 0; $i < 3; $i++) {
            $perMember = $type === 'Offering' ? mt_rand(180, 440) : mt_rand(650, 1400);
            $month = Carbon::create(self::YEAR, ($quarter - 1) * 3 + $i + 1, 1)->format('F');

            $months[$month] = $members * $perMember;
        }

        $itemId = DB::table('particular_items')->insertGetId([
            'particular_id' => $particularId,
            'quarter_id' => $quarterId,
            'value' => array_sum($months),
        ], 'item_id');

        foreach ($months as $month => $amount) {
            DB::table('stewardships')->insert([
                'item_id' => $itemId,
                'type' => $type,
                'month' => $month,
                'value' => $amount,
            ]);
        }
    }

    /** Q1 >= Q2 >= Q3, same rule the page uses for its demo figures. */
    private function quarterValues(string $seed): array
    {
        mt_srand(crc32($seed));

        $q1 = mt_rand(8, 25);
        $q2 = max(2, $q1 - mt_rand(1, max(2, (int) ceil($q1 * 0.28))));
        $q3 = max(1, $q2 - mt_rand(1, max(2, (int) ceil($q2 * 0.24))));

        return [$q1, $q2, $q3, 0];
    }

    /* ---------------------------------------------------------------
     | Data
     * ------------------------------------------------------------- */

    /** [first, last, address, church, officiating minister, birthdate, date baptized, gender, marital status, reclaimed] */
    private function baptisms(): array
    {
        return [
            ['Maria', 'Santos', 'Purok 2, Poblacion', 'Kinogkiran Company', 'Pastor J. L. Reyes', '1998-05-14', '2026-01-04', 'Female', 'Single', false],
            ['Juan', 'Dela Cruz', 'Purok 4, Canamasi', 'Canamasi Company', 'Pastor A. Dela Cruz', '1992-02-18', '2026-01-07', 'Male', 'Married', false],
            ['Angelica', 'Reyes', 'Zone 2, Cordon', 'Cordon', 'Pastor L. Ramirez', '2007-09-02', '2026-02-10', 'Female', 'Single', false],
            ['Mark Anthony', 'Torres', 'Purok 1, Macalong', 'Macalong', 'Pastor S. Cortez', '1985-03-22', '2026-03-13', 'Male', 'Married', false],
            ['Grace', 'Villanueva', 'Purok 5, Kongkong', 'Kongkong Company', 'Pastor M. Villanueva', '2004-11-05', '2026-04-16', 'Female', 'Single', true],
            ['Ronnie', 'Bautista', 'Purok 3, Paqui', 'Paqui', 'Pastor R. Bautista', '1989-06-17', '2026-05-19', 'Male', 'Married', false],
            ['Christine', 'Domingo', 'Purok 2, Moya', 'Moya Company', 'Pastor J. Domingo', '2010-01-11', '2026-06-22', 'Female', 'Single', false],
            ['Ferdinand', 'Ocampo', 'Purok 1, Maglan', 'Maglan', 'Pastor F. Ocampo', '1974-08-29', '2026-07-25', 'Male', 'Widowed', false],
            ['Josephine', 'Aquino', 'Purok 4, Palia', 'Palia', 'Pastor J. Aquino', '2002-12-03', '2026-08-04', 'Female', 'Single', false],
            ['Michael', 'Fontanilla', 'Purok 6, Poblacion', 'Poblacion', 'Pastor M. Fontanilla', '1995-04-09', '2026-09-07', 'Male', 'Married', false],
        ];
    }

    /** [first, last, church, birthdate, date of death, gender, marital status] */
    private function deaths(): array
    {
        return [
            ['Sample Deceased', 'Member', 'Poblacion', '1952-04-12', '2026-02-14', 'Male', 'Married'],
            ['Sample Deceased', 'Member 2', 'Cordon', '1947-09-08', '2026-06-18', 'Female', 'Widowed'],
        ];
    }

    /** Northeast Luzon Mission districts and their churches / companies. */
    private function roster(): array
    {
        $raw = [
            'Batanes' => 'Pasuc',
            'Northwestern Cagayan (NWC)' => 'Calayan, San Antonio, Claveria Centro, Namuac, Sanchez Mira, Buguey, San Julian, Guzman Company',
            'North Central Cagayan (NCG)' => 'Cabaruan, Centro Ballesteros, Payagan, Annafunan, Linao, Navagan, Sta. Cruz, Mabutag, San Agustin',
            'West Central Cagayan' => 'Pugod, Carbonan, Bangag, Caunayan, Matucay, Cabarauan',
            'Eastern Cagayan' => 'San Vicente, Aparri, Caroan, Paytao, Lafu, Minanga Company',
            'East Central Cagayan' => 'Logac, Cabanaban, Lasam, Ufan, Tagao',
            'Northeastern Cagayan 1' => 'Dummun, Ogging, Ganzano, Calamagui, Matalao Company',
            'Northeastern Cagayan 2' => 'Capirayan, T. Putagan, Tagumay Company, Bunnayan, Agaman Company',
            'Southern Cagayan' => 'Anuling Church, Caguiwan Church, Calantan, Nanungaran Church, Sampaguita Church, Catabagan Company, Sto. Niño Nueve Company',
            'Metro Tuguegarao' => 'Tuguegarao Central, Libag Company, Cabbo Company, Namnama',
            'Mallig' => 'Quiling, Rizal, Cullalabo, Mabini, Furao, Daug, Aurora',
            'Metro Ilagan' => 'Sipay, Malalam, Rang-ayan, Bliss, Cabisera 14 Cataguan, Namnama, Cabisera 9/11, Cabisera 7, Palucpuc',
            'Northwestern Isabela' => 'Guzon, Bimoton, Villa Corazon, Carmencita, Villa Ganzo, Sta. Catalina, Santiago, San Ramon Company',
            'Northern Isabela 1' => 'Balembong, Cauayan, Antatan, San Juan, Baybay, Aneg, San Antonio, Rasan Almacen',
            'Northern Isabela 2' => 'Minano, Lanna, San Mateo Tumauini, Antagan, Cumabao, Lapogan',
            'Northeastern Isabela' => 'Maguilan, Reina Mercedes, Sta. Cruz, Placer, Disulap, Dingasnan, Turod',
            'West Central Isabela' => 'Laing, Dadap, Marana, Cauayan Center, Villa Luna, Villa Concepcion, Minante, Naganacan, Naguilian, San Isidro',
            'Western Isabela' => 'Namnama, Recarona, Malasin, Salinungan, Villa Cruz, Nagsabaran, Sinamar, Aguinaldo Company',
            'North Central Isabela' => 'Dr. Pilar, Burgos, Mabini, Villa Domingo, Vega, Dipalua, San Ambrocio',
            'South Central Isabela' => 'Alicia, Villa Flor, Naguilian, Gomez, Angoleon, Doña Faustina, Castillo Company, Loida, Reserva Company, San Guillermo',
            'Southeastern Isabela' => 'San Manuel, Sta. Maria, Villa Marina, San Isidro, San Antonio, Sto. Niño, Mapalad Company, Sta. Ana',
            'Southern Isabela' => 'Divisoria, Ahso, Santiago, Cordon, Sta. Rosa Company',
            'Quirino West' => 'Salvacion, Saguday, Bangar, Sta. An, Cabbaga, Diffun, La Paz Company',
            'Quirino East' => 'Diobol Company, Dumbo Company, Diguyon, Diffun Company, Puagbo',
            'Northern Nueva Vizcaya' => 'Namanparan, Sinuhan Company, Sta. Cruz, Bagabag, Solano, Aggub, Communal',
            'Southwestern Nueva Vizcaya' => 'Kirapa Company, Indiana, Alimaguio, Tucanon, Alibao, Bone, Ilaan Company, Comon',
            'Southeastern Nueva Vizcaya' => 'Ramang, Paungan, Abinganan, Malasin, Belance, Manakka',
            'Eastern Nueva Vizcaya' => 'Kinogkiran Company, Canamasi Company, Cordon, Macalong, Kongkong Company, Paqui, Moya Company, Maglan, Palia, Poblacion',
            'Central Nueva Vizcaya' => 'La Torre, Masoc, Pinket Company, Ramabong, Busilac, Paitan, Sto. Domingo, Palaran Company',
        ];

        return array_map(fn ($names) => array_map('trim', explode(',', $names)), $raw);
    }

    /**
     * department => report form => section => particulars
     * (Baptism Record and Death Record are departments too, as on the dashboard.)
     */
    private function forms(): array
    {
        return [
            'Children and Family Ministries' => [
                'Children and Family Ministries Quarterly Report' => [
                    "CHILDREN'S MINISTRIES" => [
                        "Number of churches that have a Children's Ministries Coordinator",
                        'Number of children in the congregation under age 15',
                        'Number of Vacation Bible Schools conducted',
                        'Number of children attending Vacation Bible Schools',
                        'Number of other evangelistic outreach programs for children',
                        'Number of churches that conducted baptismal classes for children under age 15',
                        'Number of children under age 15 who were baptized this year',
                        'Number of community outreach and service opportunities in which children participated',
                        'Number of churches that implement the Kids in Discipleship Initiative',
                        'Number of leader/teacher training seminars conducted',
                    ],
                    'FAMILY MINISTRIES' => [
                        'Family Health Camps/Retreats held',
                        "Couples' Retreat held",
                        "Couples' Banquet held",
                        "Couples' Night Out held",
                        'Marriage Enrichment Seminars conducted',
                        'Parenting Seminars conducted',
                        'Pre-marriage Education Counseling',
                        'Number of former and inactive family members reclaimed and revived',
                        'Number of families involved in integrated evangelism Lifestyle (Family to Family)',
                        'Number of churches implementing Kids in Discipleship (K.I.D.) Ministry',
                    ],
                ],
            ],

            'Stewardship Ministries' => [
                self::STEWARDSHIP_FORM => [
                    'STEWARDSHIP' => [
                        'No. of Church Members',
                        'No. of STW Seminar conducted',
                        'No. of STW Promotion conducted',
                        'No. of Families visited & given STW awareness program',
                        'No. of Certification Seminars conducted on Basic STW Educator',
                        'No. of Pastors/Local church leaders as basic STW educator',
                        'No. of STW sermons preached on Biblical Stewardship',
                        'No. of Tithe Giving Units',
                        'No. of church members practicing Combine Offering Plan',
                        'Number of members participating in regular giving',
                    ],
                    'OFFERING AND TITHES' => ['Offering', 'Tithes'],
                ],
            ],

            'Sabbath School & Personal Ministries' => [
                'Sabbath School & Personal Ministries Quarterly Report' => [
                    'SABBATH SCHOOL' => ['No. of Sabbath Schools'],
                    'Sabbath School Membership' => [
                        'Cradle Roll (0-4 years old)', 'Kindergarten (5-6)', 'Primary (7-9)', 'Junior (10-13)',
                        'Earliteens (13-15)', 'Youth (16-35)', 'Adult (35 and above)', 'Extension Division',
                        'Total SS Membership', 'Vacation Bible School Enrollment', 'Sabbath School Teachers-Certified',
                    ],
                    'PERSONAL MINISTRIES' => [
                        'No. of members Trained this quarter', 'No. of Members actively Involved in Evangelism',
                        'No. of Churches that participated in evangelism', 'Lay evangelism & Seminars conducted',
                        'Lay Bible Studies', "Baptisms resulting from laymen, pastors, LE's",
                        'Pieces of Literature distributed', 'Community Service Unit', 'ASI Chapters',
                    ],
                    'Bible Correspondence School -VOP' => [
                        'Enrollment', 'Graduates', 'Baptisms', 'Number of ACS Chapters', 'Number of CARE Groups',
                        'Number of CARE group Members', 'Number of Churches with CARE Groups',
                    ],
                    'ACS' => [
                        'Pieces of literature distributed', 'Community Services Units', 'No. of Adopt A Barangay Program',
                        'No. of ACS Trainings', 'No. of disaster response management organization', 'No. of ACS Chapters',
                        'No. of trained members for disaster ready church',
                    ],
                    'Adventist -Laymen Services & Industries' => ['No. of Businessmen & Professionals', 'No. of ASI Chapters'],
                    'Others' => ['Medical/Dental Mission', 'Relief/Gift Distribution'],
                    'ACCOMPLISHMENT ACTIVITIES' => [
                        'Number of local churches engage in 10 Days of Prayer, 777 Prayer Initiative and Bible Studies',
                        'Number of local churches conduct Prayer Walk program in entering unentered places',
                        'Number of organized and functional Care Groups',
                        'Number of churches implemented "Pulpit of Hope" discussing distinctive doctrines in the Hour of Worship',
                        'Number of churches conducting New Members Class for newly baptized members',
                        'Number of churches holding Life Coach Reclaimer Ministry Training',
                        'Number of church members involved in all Mission Reach programs',
                        'People Groups',
                        'Other activities conducted',
                    ],
                ],
            ],

            'Ministerial & Evangelism' => [
                'Ministerial & Evangelism Quarterly Report' => [
                    'DEMOGRAPHIC PROFILE' => [
                        'No. of Organized Churches', 'No. of Companies', 'No. of Ordained Ministers', 'No. of Licensed Ministers',
                        'No. of Elders', 'No. of Deacons', 'No. of Deaconesses', 'Total Church Membership',
                        'Attendance on 2nd Sabbath', 'Attendance on 7th Sabbath',
                    ],
                    'BIBLE WORKERS' => [
                        "Bachelor's Degree in Theology", "Master's Degree in Theology", 'Doctorate Degree in Theology',
                        "Non-Theology Bachelor's Degree", 'Retired Workers',
                    ],
                    'ACTIVITIES — VISITATION' => ['To SDA Members', 'To Non-SDA Members', 'To Clergy of Other Faith'],
                    "ELDERS' TRAINING" => ['By General Conference', 'By Division (SSD)', 'By Union', 'By Conference/Mission/Field'],
                    'EVANGELISM PROGRAMS' => ['By Care Groups', 'By Elders & Deacons', 'By Pastors'],
                    'GOALS & ACHIEVEMENTS' => [
                        'New Church Plant Goal for the Quarter', 'New Church Planted',
                        'Baptismal Goal this Quarter', 'No. of Baptisms Achieved',
                    ],
                ],
            ],

            'Youth Ministries' => [
                'AY Quarterly Statistics' => [
                    'AY QUARTERLY STATISTICS' => [
                        'MG Clubs', 'MG Memberships', 'Pathfinder Clubs', 'Pathfinder Memberships',
                        'Adventurer Clubs', 'Adventurer Memberships', 'SYL Clubs', 'SYL Memberships',
                        'Ambassador Clubs', 'Ambassador Memberships', 'AY Clubs', 'AY Memberships', 'Baptisms',
                        'PCM/AMICUS', 'PCM/AMICUS Memberships', 'VOY Teams', 'VOY Memberships',
                        'OYIM Teams', 'OYIM Memberships', 'Prayer Network', 'Prayer Network Membership',
                    ],
                ],
                'AY Quarterly Report' => [
                    'ADVENTIST YOUTH' => [
                        'No. of AY', 'No. of AY involved in different activities',
                        'Estimated number of SDA youth ages 6-14 years', 'Estimated number of SDA youth ages 15-21 years',
                    ],
                    'AMiCUS/PCM' => [
                        'Training/Seminar', 'Retreat', 'Convention', 'Evangelism', 'Camping', 'Care Group Ministry',
                        'Campus Ministry', 'Fellowship', 'No. of AMiCUS Chapters', 'No. of AMiCUS Members',
                    ],
                    'YOUNG PROFESSIONALS' => [
                        'Training/Seminar', 'Retreat', 'Convention', 'Evangelism', 'Camping', 'Care Group Ministry',
                        'Workplace Ministry', 'Young Professional Fellowship', 'No. of Young Professional Chapters',
                    ],
                    'PATHFINDER CHURCH-BASED' => [
                        'MG Training/Seminar', 'Pathfinder Training Camp', 'Camporee',
                        'No. of Church-based Pathfinder Program', 'No. of Church-based Pathfinder Clubs',
                        'No. of Induction Ceremony/Program', 'No. of Investiture Ceremony/Program',
                        'No. of Invested Master Guides', 'Pathfinder Day Program',
                    ],
                    'SENIOR YOUTH LEADERSHIP' => [
                        'Retreat', 'SYL Training/Seminar', 'No. of Senior Youth Trained',
                        'Youth Festival', 'Sports Festival', 'Youth Alive Program',
                    ],
                    'VOY EXPAND' => [
                        'No. of Churches Involved in VOY', 'No. of Youth Involved in VOY', 'No. of VOY Meetings Held',
                        'No. of Churches Involved in Week of Prayer', 'No. of VOY Teams Organized',
                        'No. of Churches Involved in Global Youth Day', 'No. of Souls Baptized through VOY',
                        'No. of Souls Baptized through other Youth programs', 'No. of Compassion Activities',
                        'No. of Organized Congregations', 'No. of Church Planting',
                    ],
                    'OTHER YOUTH INITIATIVES' => ['Number of Prayer Network', 'Number of bible Reading Project'],
                ],
            ],

            'Womens Ministries' => [
                'Womens Ministries Quarterly Report' => [
                    "WOMEN'S MINISTRIES PROGRAMS" => [
                        'Evangelistic Meetings', 'Other Meetings', 'Scholarships Awarded', 'Retreats/Congresses',
                        'SDA Women Attending WM Program', 'Non-SDA Women Attending WM Program', 'Reclaimed Members',
                        'Baptisms — Direct evangelism done by women', 'Baptisms — Participation/involvement in evangelism',
                    ],
                    'ENRICH FOCUS AREAS' => [
                        'Training Seminars', 'Abuse', 'Health Issues', 'Poverty', 'Illiteracy', 'Workloads',
                        'Lack of Training, Mentoring, Leadership Opportunity',
                    ],
                ],
            ],

            'Communication' => [
                'Communication Quarterly Report' => [
                    'COMMUNICATION' => ['Number of Visited AWR Interests', 'Number of Transistor Radio Given', 'Number of Trained AWR'],
                ],
            ],

            'Adventist Mission' => [
                'Adventist Mission Quarterly Report' => [
                    'GLOBAL MISSION' => [
                        'Number of Bible Studies Given', 'Number of Bible Studies On-going', "Number of Visits to SDA's",
                        "Number of Visits to Non-SDA's", 'Number of Evangelistic Meetings by District Pastor',
                        'Number of On-going Evangelistic Meetings by District Pastor',
                        'Number of Evangelistic Meetings by Visitors/Guests', 'Number of Cottage Meetings Held by Laymen',
                        'Number of Global Mission Pioneers', 'Number of Current Global Mission Project',
                    ],
                ],
            ],

            'Secretariat' => [
                'Secretariat Quarterly Report' => [
                    'CHURCH STATISTICS' => [
                        'Churches', 'Companies/Worship Group', 'Church Attendance Second Sabbath Count',
                        'Church Attendance Seventh Sabbath Count', 'Church Membership at Beginning of the Quarter',
                        'Members Added During Quarter', 'Members Subtracted During Quarter',
                        'Church Membership at End of the Quarter', 'Sabbath School Attendance Second Sabbath Count',
                        'Sabbath School Attendance Seventh Sabbath Count',
                    ],
                ],
            ],

            'Baptism Record' => [
                'Baptism Record' => ['BAPTISM RECORD' => ['Baptisms Reported']],
            ],

            'Death Record' => [
                'Death Record' => ['DEATH RECORD' => ['Deaths Reported']],
            ],
        ];
    }
}
