<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        $programs = [

            // ==========================================
            // DEPARTMENT 13: CHILDREN AND FAMILY MINISTRIES
            // ==========================================
            [
                'program_id' => 48,
                'department_id' => 13,
                'program_name' => 'Children and Family Ministries Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 49,
                'department_id' => 13,
                'program_name' => "CHILDREN'S MINISTRIES",
                'parent_id' => 48,
            ],
            [
                'program_id' => 50,
                'department_id' => 13,
                'program_name' => 'FAMILY MINISTRIES',
                'parent_id' => 48,
            ],

            // ==========================================
            // DEPARTMENT 14: STEWARDSHIP MINISTRIES
            // ==========================================
            [
                'program_id' => 51,
                'department_id' => 14,
                'program_name' => 'Stewardship Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 52,
                'department_id' => 14,
                'program_name' => 'STEWARDSHIP',
                'parent_id' => 51,
            ],
            [
                'program_id' => 53,
                'department_id' => 14,
                'program_name' => 'OFFERING AND TITHES',
                'parent_id' => 51,
            ],

            // ==========================================
            // DEPARTMENT 15: SABBATH SCHOOL & PERSONAL MINISTRIES
            // ==========================================
            [
                'program_id' => 54,
                'department_id' => 15,
                'program_name' => 'Sabbath School & Personal Ministries Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 55,
                'department_id' => 15,
                'program_name' => 'SABBATH SCHOOL',
                'parent_id' => 54,
            ],
            [
                'program_id' => 56,
                'department_id' => 15,
                'program_name' => 'Sabbath School Membership',
                'parent_id' => 54,
            ],
            [
                'program_id' => 57,
                'department_id' => 15,
                'program_name' => 'PERSONAL MINISTRIES',
                'parent_id' => 54,
            ],
            [
                'program_id' => 58,
                'department_id' => 15,
                'program_name' => 'Bible Correspondence School -VOP',
                'parent_id' => 54,
            ],
            [
                'program_id' => 59,
                'department_id' => 15,
                'program_name' => 'ACS',
                'parent_id' => 54,
            ],
            [
                'program_id' => 60,
                'department_id' => 15,
                'program_name' => 'Adventist -Laymen Services & Industries',
                'parent_id' => 54,
            ],
            [
                'program_id' => 61,
                'department_id' => 15,
                'program_name' => 'Others',
                'parent_id' => 54,
            ],
            [
                'program_id' => 62,
                'department_id' => 15,
                'program_name' => 'ACCOMPLISHMENT ACTIVITIES',
                'parent_id' => 54,
            ],

            // ==========================================
            // DEPARTMENT 16: MINISTERIAL & EVANGELISM
            // ==========================================
            [
                'program_id' => 63,
                'department_id' => 16,
                'program_name' => 'Ministerial & Evangelism Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 64,
                'department_id' => 16,
                'program_name' => 'DEMOGRAPHIC PROFILE',
                'parent_id' => 63,
            ],
            [
                'program_id' => 65,
                'department_id' => 16,
                'program_name' => 'BIBLE WORKERS',
                'parent_id' => 63,
            ],
            [
                'program_id' => 66,
                'department_id' => 16,
                'program_name' => 'ACTIVITIES — VISITATION',
                'parent_id' => 63,
            ],
            [
                'program_id' => 67,
                'department_id' => 16,
                'program_name' => "ELDERS' TRAINING",
                'parent_id' => 63,
            ],
            [
                'program_id' => 68,
                'department_id' => 16,
                'program_name' => 'EVANGELISM PROGRAMS',
                'parent_id' => 63,
            ],
            [
                'program_id' => 69,
                'department_id' => 16,
                'program_name' => 'GOALS & ACHIEVEMENTS',
                'parent_id' => 63,
            ],

            // ==========================================
            // DEPARTMENT 17: AY QUARTERLY STATISTICS
            // ==========================================
            [
                'program_id' => 70,
                'department_id' => 17,
                'program_name' => 'AY Quarterly Statistics',
                'parent_id' => null,
            ],
            [
                'program_id' => 71,
                'department_id' => 17,
                'program_name' => 'AY QUARTERLY STATISTICS',
                'parent_id' => 70,
            ],

            // ==========================================
            // DEPARTMENT 17: AY QUARTERLY REPORT
            // ==========================================
            [
                'program_id' => 72,
                'department_id' => 17,
                'program_name' => 'AY Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 73,
                'department_id' => 17,
                'program_name' => 'ADVENTIST YOUTH',
                'parent_id' => 72,
            ],
            [
                'program_id' => 74,
                'department_id' => 17,
                'program_name' => 'AMiCUS/PCM',
                'parent_id' => 72,
            ],
            [
                'program_id' => 75,
                'department_id' => 17,
                'program_name' => 'YOUNG PROFESSIONALS',
                'parent_id' => 72,
            ],
            [
                'program_id' => 76,
                'department_id' => 17,
                'program_name' => 'PATHFINDER CHURCH-BASED',
                'parent_id' => 72,
            ],
            [
                'program_id' => 77,
                'department_id' => 17,
                'program_name' => 'SENIOR YOUTH LEADERSHIP',
                'parent_id' => 72,
            ],
            [
                'program_id' => 78,
                'department_id' => 17,
                'program_name' => 'VOY EXPAND',
                'parent_id' => 72,
            ],
            [
                'program_id' => 79,
                'department_id' => 17,
                'program_name' => 'OTHER YOUTH INITIATIVES',
                'parent_id' => 72,
            ],

            // ==========================================
            // DEPARTMENT 18: WOMENS MINISTRIES
            // ==========================================
            [
                'program_id' => 80,
                'department_id' => 18,
                'program_name' => 'Womens Ministries Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 81,
                'department_id' => 18,
                'program_name' => "WOMEN'S MINISTRIES PROGRAMS",
                'parent_id' => 80,
            ],
            [
                'program_id' => 82,
                'department_id' => 18,
                'program_name' => 'ENRICH FOCUS AREAS',
                'parent_id' => 80,
            ],

            // ==========================================
            // DEPARTMENT 19: COMMUNICATION
            // ==========================================
            [
                'program_id' => 83,
                'department_id' => 19,
                'program_name' => 'Communication Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 84,
                'department_id' => 19,
                'program_name' => 'COMMUNICATION',
                'parent_id' => 83,
            ],

            // ==========================================
            // DEPARTMENT 20: ADVENTIST MISSION
            // ==========================================
            [
                'program_id' => 85,
                'department_id' => 20,
                'program_name' => 'Adventist Mission Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 86,
                'department_id' => 20,
                'program_name' => 'GLOBAL MISSION',
                'parent_id' => 85,
            ],

            // ==========================================
            // DEPARTMENT 21: SECRETARIAT
            // ==========================================
            [
                'program_id' => 87,
                'department_id' => 21,
                'program_name' => 'Secretariat Quarterly Report',
                'parent_id' => null,
            ],
            [
                'program_id' => 88,
                'department_id' => 21,
                'program_name' => 'CHURCH STATISTICS',
                'parent_id' => 87,
            ],

            // ==========================================
            // DEPARTMENT 22: BAPTISM RECORD
            // ==========================================
            [
                'program_id' => 89,
                'department_id' => 22,
                'program_name' => 'Baptism Record',
                'parent_id' => null,
            ],
            [
                'program_id' => 90,
                'department_id' => 22,
                'program_name' => 'BAPTISM RECORD',
                'parent_id' => 89,
            ],

            // ==========================================
            // DEPARTMENT 23: DEATH RECORD
            // ==========================================
            [
                'program_id' => 91,
                'department_id' => 23,
                'program_name' => 'Death Record',
                'parent_id' => null,
            ],
            [
                'program_id' => 92,
                'department_id' => 23,
                'program_name' => 'DEATH RECORD',
                'parent_id' => 91,
            ],
        ];

        DB::transaction(function () use ($programs) {
            foreach ($programs as $program) {
                DB::table('programs')->updateOrInsert(
                    [
                        'program_id' => $program['program_id'],
                    ],
                    [
                        'department_id' => $program['department_id'],
                        'program_name' => $program['program_name'],
                        'parent_id' => $program['parent_id'],
                    ]
                );
            }
        });

        $this->command?->info(
            count($programs) . ' programs processed successfully.'
        );
    }
}