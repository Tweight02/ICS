<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class EventRegistrationAttribution
{
    public static function token(int $eventId, int $churchId): string
    {
        return hash_hmac(
            'sha256',
            $eventId.':'.$churchId,
            (string) config('app.key')
        );
    }

    public static function quarterId(int $eventQuarterId, int $churchId, ?int $particularId = null): int
    {
        return self::quarterIds($eventQuarterId, $churchId, $particularId)[0];
    }

    public static function quarterIds(int $eventQuarterId, int $churchId, ?int $particularId = null): array
    {
        $eventQuarter = DB::table('quarters')
            ->join('churches as event_churches', 'event_churches.church_id', '=', 'quarters.church_id')
            ->where('quarters.quarter_id', $eventQuarterId)
            ->first([
                'quarters.program_id',
                'quarters.year',
                'quarters.quarter',
                'event_churches.parent_id as event_church_parent_id',
            ]);
        abort_unless($eventQuarter, 422, 'The event reporting quarter could not be found.');

        $particularProgram = $particularId !== null ? DB::table('particulars')
            ->join('programs as sections', 'sections.program_id', '=', 'particulars.program_id')
            ->join('programs as programs', 'programs.program_id', '=', 'sections.parent_id')
            ->where('particulars.particular_id', $particularId)
            ->first(['programs.program_id', 'programs.department_id']) : null;

        $targetProgramId = (int) ($particularProgram->program_id ?? $eventQuarter->program_id);

        $localQuarterId = DB::table('quarters')
            ->where('church_id', $churchId)
            ->where('program_id', $targetProgramId)
            ->where('year', $eventQuarter->year)
            ->where('quarter', $eventQuarter->quarter)
            ->value('quarter_id');
        abort_unless($localQuarterId, 422, 'No matching reporting quarter exists for this participant and event.');

        $quarterIds = [(int) $localQuarterId];
        $includeDistrict = $eventQuarter->event_church_parent_id === null ||
            in_array((int) ($particularProgram->department_id ?? 0), [16, 20], true);
        if ($includeDistrict) {
            $participantChurch = DB::table('churches')
                ->where('church_id', $churchId)
                ->first(['parent_id']);
            abort_unless($participantChurch, 422, 'The participant church could not be found.');
            $districtId = (int) ($participantChurch->parent_id ?? $churchId);
            $districtQuarterId = DB::table('quarters')
                ->where('church_id', $districtId)
                ->where('program_id', $targetProgramId)
                ->where('year', $eventQuarter->year)
                ->where('quarter', $eventQuarter->quarter)
                ->value('quarter_id');
            if ($districtQuarterId && (int) $districtQuarterId !== (int) $localQuarterId) {
                $quarterIds[] = (int) $districtQuarterId;
            }
        }

        return $quarterIds;
    }
}
