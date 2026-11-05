<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class CompletedEventSeeder extends Seeder
{
    private const REPRESENTATIVE_EMAIL = 'seed.church-user.department-13@example.com';

    private const EVENT_TITLE = 'Seeded Completed Event';

    private const PARTICIPANT_COUNT = 50;

    private const SELECTED_PARTICULAR_COUNT = 2;

    public function run(): void
    {
        $eventDate = Carbon::now('Asia/Manila')->subDays(7);
        $quarter = 'Q'.(int) ceil($eventDate->month / 3);
        $representative = DB::table('users')
            ->where('email', self::REPRESENTATIVE_EMAIL)
            ->first(['user_id', 'department_id', 'church_id']);

        if (! $representative) {
            $quarterRecord = DB::table('quarters')
                ->join('programs', 'programs.program_id', '=', 'quarters.program_id')
                ->where('programs.department_id', 13)
                ->whereNull('programs.parent_id')
                ->where('quarters.year', (string) $eventDate->year)
                ->where('quarters.quarter', $quarter)
                ->orderBy('quarters.church_id')
                ->first(['quarters.church_id']);

            if (! $quarterRecord) {
                throw new RuntimeException('Run ReportingSetupSeeder before CompletedEventSeeder.');
            }

            $representativeId = DB::table('users')->insertGetId([
                'department_id' => 13,
                'church_id' => $quarterRecord->church_id,
                'first_name' => 'Church',
                'middle_name' => null,
                'last_name' => 'Representative',
                'extension_name' => null,
                'birthdate' => '1990-01-01',
                'gender' => 'other',
                'role' => 'representative',
                'email' => self::REPRESENTATIVE_EMAIL,
                'password' => Hash::make('12345678'),
                'remember_token' => null,
                'status' => 'active',
            ], 'user_id');

            $representative = DB::table('users')
                ->where('user_id', $representativeId)
                ->first(['user_id', 'department_id', 'church_id']);
        }

        if (! $representative) {
            throw new RuntimeException('Could not create the demo representative required for the completed event.');
        }

        $quarterId = DB::table('quarters')
            ->join('programs', 'programs.program_id', '=', 'quarters.program_id')
            ->where('quarters.church_id', $representative->church_id)
            ->where('programs.department_id', $representative->department_id)
            ->whereNull('programs.parent_id')
            ->where('quarters.year', (string) $eventDate->year)
            ->where('quarters.quarter', $quarter)
            ->value('quarters.quarter_id');

        if (! $quarterId) {
            throw new RuntimeException('No reporting quarter exists for the seeded representative and event date.');
        }

        $particularIds = DB::table('particulars')
            ->join('programs', 'programs.program_id', '=', 'particulars.program_id')
            ->where('programs.department_id', $representative->department_id)
            ->orderBy('particulars.particular_id')
            ->limit(self::SELECTED_PARTICULAR_COUNT)
            ->pluck('particulars.particular_id')
            ->all();

        if (count($particularIds) !== self::SELECTED_PARTICULAR_COUNT) {
            throw new RuntimeException('At least two department particulars are required to seed the completed event.');
        }

        $event = [
            'quarter_id' => $quarterId,
            'church_id' => $representative->church_id,
            'title' => self::EVENT_TITLE,
            'date_start' => $eventDate->toDateString(),
            'date_end' => $eventDate->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '12:00:00',
            'details' => 'Seed data for completed-event testing.',
            'status' => 'completed',
            'location' => 'Church Community Center',
        ];

        DB::transaction(function () use ($representative, $event, $particularIds): void {
            $eventId = DB::table('events')
                ->join('event_creator', 'event_creator.event_id', '=', 'events.event_id')
                ->where('event_creator.user_id', $representative->user_id)
                ->where('events.title', self::EVENT_TITLE)
                ->value('events.event_id');

            if ($eventId) {
                DB::table('events')->where('event_id', $eventId)->update($event);
            } else {
                $eventId = DB::table('events')->insertGetId($event, 'event_id');
            }

            DB::table('event_creator')->updateOrInsert(
                ['event_id' => $eventId],
                ['user_id' => $representative->user_id]
            );

            DB::table('event_particular')
                ->where('event_id', $eventId)
                ->whereNotIn('particular_id', $particularIds)
                ->delete();

            foreach ($particularIds as $particularId) {
                DB::table('event_particular')->insertOrIgnore([
                    'event_id' => $eventId,
                    'particular_id' => $particularId,
                ]);
            }

            for ($number = 1; $number <= self::PARTICIPANT_COUNT; $number++) {
                $firstName = sprintf('Demo %03d', $number);

                DB::table('participants')->updateOrInsert(
                    [
                        'event_id' => $eventId,
                        'first_name' => $firstName,
                        'last_name' => 'Participant',
                    ],
                    [
                        'church_id' => $representative->church_id,
                        'middle_name' => '',
                        'extension_name' => null,
                        'age' => 17 + $number,
                        'gender' => match (($number - 1) % 3) {
                            0 => 'female',
                            1 => 'male',
                            default => 'other',
                        },
                        'registration_status' => 'confirmed',
                    ]
                );
            }
        });

        $this->command?->info(
            'Seeded a completed event and 50 confirmed demo participants for the demo church representative.'
        );
    }
}
