<?php

namespace App\Support;

final class EventParticularType
{
    public static function isHeadcount(string $name): bool
    {
        $name = mb_strtolower(trim($name));
        if (preg_match('/\b(attendance|attending|attendees|participants?|headcount)\b/u', $name)) {
            return true;
        }

        if (! preg_match('/\b(?:number|no\.?)\s+of\s+(.+)/u', $name, $matches)) {
            return false;
        }

        return (bool) preg_match(
            '/\b(?:people|persons|children|youth|women|men|members|students|visitors|leaders|workers|souls|baptisms)\b/u',
            $matches[1]
        );
    }

    public static function isEventPurpose(string $name): bool
    {
        return (bool) preg_match(
            '/\b(?:camping|camporee|retreats?|conventions?|festivals?|seminars?|trainings?|fellowships?|meetings?|evangelism|bible studies)\b/iu',
            trim($name)
        );
    }
}
