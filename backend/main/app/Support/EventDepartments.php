<?php

namespace App\Support;

use App\Models\Department;
use Illuminate\Database\Eloquent\Builder;

final class EventDepartments
{
    private const PERSONAL_REPORT_NAMES = ['baptism record', 'death record'];

    public static function selectableFor(string $role): Builder
    {
        return Department::query()
            ->select(['department_id', 'department_name'])
            ->when($role !== 'district_pastor', function (Builder $query) {
                $query->whereNotIn(
                    \Illuminate\Support\Facades\DB::raw('LOWER(TRIM(department_name))'),
                    self::PERSONAL_REPORT_NAMES
                );
            })
            ->orderBy('department_name');
    }

    public static function isPersonalReport(int $departmentId): bool
    {
        return Department::query()
            ->where('department_id', $departmentId)
            ->whereIn(
                \Illuminate\Support\Facades\DB::raw('LOWER(TRIM(department_name))'),
                self::PERSONAL_REPORT_NAMES
            )
            ->exists();
    }
}
