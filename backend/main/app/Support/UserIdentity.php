<?php

namespace App\Support;

use App\Models\User;

class UserIdentity
{
    public static function existsFor(
        string $firstName,
        ?string $middleName,
        string $lastName,
        ?string $extensionName,
        string $birthdate
    ): bool {
        return User::query()
            ->whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower(trim($firstName))])
            ->whereRaw('LOWER(TRIM(COALESCE(middle_name, ?))) = ?', [
                '',
                mb_strtolower(trim($middleName ?? '')),
            ])
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower(trim($lastName))])
            ->whereRaw('LOWER(TRIM(COALESCE(extension_name, ?))) = ?', [
                '',
                mb_strtolower(trim($extensionName ?? '')),
            ])
            ->exists();
    }
}
