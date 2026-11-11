<?php

namespace Database\Seeders;

use App\Support\EventParticularType;
use App\Support\EventUser;
use App\Support\ReportParticipantCoverage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SampleEventSeeder extends Seeder
{
    public function run(): void
    {
        $year = (string) config('app.reporting_year', now()->year);
        $now = now('Asia/Manila');
        $today = $now->copy()->startOfDay();
        $quarterNumber = (int) ceil($now->month / 3);
        $quarter = 'Q'.$quarterNumber;
        $candidates = DB::table('churches')
            ->join('quarters', function ($join) use ($year, $quarter): void {
                $join->on('quarters.church_id', '=', 'churches.church_id')
                    ->where('quarters.year', '=', $year)
                    ->where('quarters.quarter', '=', $quarter);
            })
            ->join('programs as report_programs', 'report_programs.program_id', '=', 'quarters.program_id')
            ->join('programs as sections', 'sections.parent_id', '=', 'report_programs.program_id')
            ->join('particulars', 'particulars.program_id', '=', 'sections.program_id')
            ->leftJoin('users as representatives', function ($join): void {
                $join->on('representatives.church_id', '=', 'churches.church_id')
                    ->on('representatives.department_id', '=', 'report_programs.department_id')
                    ->where('representatives.role', '=', 'representative');
            })
            ->whereNotNull('churches.parent_id')
            ->whereNull('report_programs.parent_id')
            ->whereBetween('report_programs.department_id', [13, 21])
            ->select([
                'representatives.user_id',
                'representatives.role as creator_role',
                'churches.church_id',
                'churches.parent_id',
                'report_programs.department_id',
                'report_programs.program_id',
                'quarters.quarter_id',
                'particulars.particular_id',
                'particulars.particular_name',
            ])
            ->orderByRaw('CASE WHEN representatives.user_id IS NULL THEN 1 ELSE 0 END')
            ->orderBy('representatives.user_id')
            ->orderBy('particulars.particular_id')
            ->get()
            ->groupBy(fn ($row): string => "{$row->church_id}|{$row->program_id}|{$row->quarter_id}");

        $candidate = $candidates->first(function ($rows): bool {
            return $rows->contains(fn ($row): bool => EventParticularType::isEventPurpose((string) $row->particular_name))
                && $rows->contains(fn ($row): bool => EventParticularType::isHeadcount((string) $row->particular_name));
        });

        if ($candidate === null) {
            throw new RuntimeException(
                "No reporting quarter with event-purpose and headcount particulars is available for {$year} {$quarter}. Run ReportingSetupSeeder and check the report particulars."
            );
        }

        $creator = $candidate->first();

        if ($creator->user_id === null) {
            $churchUser = DB::table('users')
                ->where('church_id', $creator->church_id)
                ->orderByRaw('CASE WHEN department_id = ? THEN 0 ELSE 1 END', [$creator->department_id])
                ->orderBy('user_id')
                ->first(['user_id', 'role']);

            if ($churchUser === null) {
                throw new RuntimeException(
                    "No user is assigned to the church selected for the {$year} {$quarter} sample event. Run UserSeeder first."
                );
            }

            $creator->user_id = $churchUser->user_id;
            $creator->creator_role = $churchUser->role;
        }
        $purposeParticular = $candidate->first(
            fn ($row): bool => EventParticularType::isEventPurpose((string) $row->particular_name)
        );
        $headcountParticular = $candidate->first(
            fn ($row): bool => EventParticularType::isHeadcount((string) $row->particular_name)
        );
        $particularIds = array_values(array_unique([
            (int) $purposeParticular->particular_id,
            (int) $headcountParticular->particular_id,
        ]));
        $eventDefinitions = [
            [
                'title' => 'Sample Community Outreach',
                'details' => 'Sample outreach program with confirmed participants.',
                'location' => 'Community Hall',
                'day' => 8,
            ],
            [
                'title' => 'Sample Youth Skills Workshop',
                'details' => 'Sample skills workshop with confirmed participants.',
                'location' => 'Church Activity Center',
                'day' => 15,
            ],
            [
                'title' => 'Sample Family Wellness Retreat',
                'details' => 'Sample family retreat with confirmed participants.',
                'location' => 'District Campgrounds',
                'day' => 22,
            ],
            [
                'title' => 'Sample Community Bible Seminar',
                'details' => 'Sample Bible seminar with confirmed participants.',
                'location' => 'Community Hall',
                'day' => 29,
            ],
        ];
        $participants = [
            ['Amelia', 'Mae', 'Santos', 'Female', 34],
            ['Benjamin', 'Luis', 'Reyes', 'Male', 42],
            ['Camila', 'Joy', 'Cruz', 'Female', 27],
            ['Daniel', 'James', 'Garcia', 'Male', 31],
            ['Elena', 'Grace', 'Mendoza', 'Female', 39],
            ['Francis', 'John', 'Dela Cruz', 'Male', 24],
            ['Gabriella', 'Rose', 'Bautista', 'Female', 46],
            ['Hector', 'Paul', 'Aquino', 'Male', 52],
            ['Isabella', 'Faith', 'Ramos', 'Female', 29],
            ['Joseph', 'Mark', 'Villanueva', 'Male', 36],
            ['Katherine', 'Anne', 'Castillo', 'Female', 33],
            ['Nathan', 'Lee', 'Domingo', 'Male', 41],
        ];

        DB::transaction(function () use (
            $eventDefinitions,
            $year,
            $quarterNumber,
            $creator,
            $particularIds,
            $headcountParticular,
            $participants,
            $now
        ): void {
            $role = EventUser::normalize((string) $creator->creator_role);
            $districtId = $creator->parent_id
                ? (int) $creator->parent_id
                : (int) $creator->church_id;
            $scopeType = match ($role) {
                'assistant' => 'MISSION',
                'district_pastor' => 'DISTRICT',
                default => 'CHURCH',
            };
            $scopeId = match ($scopeType) {
                'MISSION' => 1,
                'DISTRICT' => $districtId,
                default => (int) $creator->church_id,
            };
            foreach ($eventDefinitions as $definition) {
                $eventDate = $now->copy()
                    ->setDate((int) $year, (($quarterNumber - 1) * 3) + 1, $definition['day'])
                    ->toDateString();
                $eventData = [
                    'quarter_id' => (int) $creator->quarter_id,
                    'church_id' => (int) $creator->church_id,
                    'title' => $definition['title'],
                    'date_start' => $eventDate,
                    'date_end' => $eventDate,
                    'time_start' => '09:00:00',
                    'time_end' => '16:00:00',
                    'details' => $definition['details'],
                    'status' => 'ACTIVE',
                    'location' => $definition['location'],
                    'created_by' => (int) $creator->user_id,
                    'creator_role' => strtoupper(str_replace('-', '_', $role)),
                    'scope_type' => $scopeType,
                    'scope_id' => $scopeId,
                    'district_id' => $scopeType === 'MISSION' ? null : $districtId,
                    'department_id' => (int) $creator->department_id,
                ];
                $existingEvent = DB::table('events')
                    ->where('church_id', $creator->church_id)
                    ->where('title', $eventData['title'])
                    ->first(['event_id']);

                if ($existingEvent === null) {
                    $eventId = (int) DB::table('events')->insertGetId($eventData, 'event_id');
                } else {
                    $eventId = (int) $existingEvent->event_id;
                    DB::table('events')->where('event_id', $eventId)->update($eventData);
                }

                DB::table('event_creator')->updateOrInsert(
                    ['event_id' => $eventId],
                    ['user_id' => (int) $creator->user_id]
                );
                if ($scopeType === 'MISSION') {
                    $districtIds = DB::table('churches')
                        ->whereNull('parent_id')
                        ->pluck('church_id');
                    foreach ($districtIds as $missionDistrictId) {
                        DB::table('event_district')->insertOrIgnore([
                            'event_id' => $eventId,
                            'district_id' => $missionDistrictId,
                        ]);
                    }
                } elseif ($scopeType === 'DISTRICT') {
                    DB::table('event_district')->insertOrIgnore([
                        'event_id' => $eventId,
                        'district_id' => $districtId,
                    ]);
                }

                foreach ($particularIds as $particularId) {
                    DB::table('event_particular')->insertOrIgnore([
                        'event_id' => $eventId,
                        'particular_id' => $particularId,
                    ]);
                }

                foreach ($participants as [$firstName, $middleName, $lastName, $gender, $age]) {
                    $participantData = [
                        'event_id' => $eventId,
                        'church_id' => (int) $creator->church_id,
                        'first_name' => $firstName,
                        'middle_name' => $middleName,
                        'last_name' => $lastName,
                        'extension_name' => null,
                        'age' => (string) $age,
                        'gender' => $gender,
                        'registration_status' => 'confirmed',
                    ];

                    DB::table('participants')->updateOrInsert(
                        [
                            'event_id' => $eventId,
                            'church_id' => (int) $creator->church_id,
                            'first_name' => $firstName,
                            'last_name' => $lastName,
                        ],
                        $participantData
                    );

                    $participantId = (int) DB::table('participants')
                        ->where('event_id', $eventId)
                        ->where('church_id', $creator->church_id)
                        ->where('first_name', $firstName)
                        ->where('last_name', $lastName)
                        ->value('participant_id');

                    DB::table('event_participant_contributions')->insertOrIgnore([
                        'event_id' => $eventId,
                        'participant_id' => $participantId,
                        'quarter_id' => (int) $creator->quarter_id,
                        'particular_id' => (int) $headcountParticular->particular_id,
                        'contributed_at' => $now->toDateTimeString(),
                    ]);
                }

                $this->syncHeadcountReportValue((int) $creator->quarter_id, (int) $headcountParticular->particular_id);

                $this->command?->info(
                    "Sample event created or updated: {$eventData['title']} ({$eventId}) with ".count($participants).' confirmed participants.'
                );
            }
        });
    }

    private function syncHeadcountReportValue(int $quarterId, int $particularId): void
    {
        $participantCount = ReportParticipantCoverage::countFor($quarterId, $particularId);
        $item = DB::table('particular_items')
            ->where('quarter_id', $quarterId)
            ->where('particular_id', $particularId)
            ->lockForUpdate()
            ->first();

        if ($item !== null) {
            DB::table('particular_items')
                ->where('item_id', $item->item_id)
                ->update([
                    'value' => $item->manual_value === null && $participantCount === 0
                        ? null
                        : ($item->manual_value ?? 0) + $participantCount,
                ]);

            return;
        }

        DB::table('particular_items')->insert([
            'quarter_id' => $quarterId,
            'particular_id' => $particularId,
            'manual_value' => null,
            'value' => $participantCount,
        ]);
    }
}
