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

    public static function matchesParticipantAge(string $name, int $age): bool
    {
        $range = self::ageRange($name);

        return $range === null || ($age >= $range['min'] && $age <= $range['max']);
    }

    public static function ageRange(string $name): ?array
    {
        $name = trim($name);
        if (preg_match('/under\s+age\s*(\d+)/iu', $name, $matches)) {
            return [
                'min' => 0,
                'max' => max(0, (int) $matches[1] - 1),
            ];
        }

        foreach ([
            '/ages?\s*(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)?/iu',
            '/age\s*(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)?/iu',
            '/\((\d+)\s*-\s*(\d+)\)\s*(?:years?|yrs?)?(?:\s*old)?/iu',
            '/\b(\d+)\s*-\s*(\d+)\b.*(?:years?|yrs?)\b/iu',
        ] as $pattern) {
            if (preg_match($pattern, $name, $matches)) {
                $min = (int) $matches[1];
                $max = (int) $matches[2];

                return [
                    'min' => min($min, $max),
                    'max' => max($min, $max),
                ];
            }
        }

        return null;
    }
}
