<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ParticularSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * Add the existing 222 particulars here.
         *
         * Preserve the original:
         * - particular_id
         * - program_id
         * - particular name
         *
         * Do not generate new IDs for existing particulars.
         */

        $particulars = [
            // Example structure only:
            // [
            //     'particular_id' => 223,
            //     'program_id' => 49,
            //     'particular_name' => 'EXACT EXISTING PARTICULAR NAME',
            // ],
        ];

        foreach ($particulars as $particular) {
            DB::table('particulars')->updateOrInsert(
                [
                    'particular_id' => $particular['particular_id'],
                ],
                [
                    'program_id' => $particular['program_id'],
                    'particular_name' => $particular['particular_name'],
                ]
            );
        }

        $this->command?->info(
            count($particulars) . ' particulars processed.'
        );
    }
}