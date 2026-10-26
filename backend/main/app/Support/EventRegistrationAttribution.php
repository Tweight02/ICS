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

    public static function quarterId(int $eventQuarterId, int $churchId): int
    {
        $eventQuarter = DB::table('quarters')
            ->where('quarter_id', $eventQuarterId)
            ->first(['program_id', 'year', 'quarter']);
        abort_unless($eventQuarter, 422, 'The event reporting quarter could not be found.');

        $quarterId = DB::table('quarters')
            ->where('church_id', $churchId)
            ->where('program_id', $eventQuarter->program_id)
            ->where('year', $eventQuarter->year)
            ->where('quarter', $eventQuarter->quarter)
            ->value('quarter_id');
        abort_unless($quarterId, 422, 'No matching reporting quarter exists for this church and event.');

        return (int) $quarterId;
    }
}
