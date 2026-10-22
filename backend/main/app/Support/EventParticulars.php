<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class EventParticulars
{
    public static function rootProgramId(array $particularIds, int $departmentId): ?int
    {
        if ($particularIds === []) {
            return null;
        }

        $particulars = DB::table('particulars')
            ->join('programs', 'programs.program_id', '=', 'particulars.program_id')
            ->whereIn('particulars.particular_id', $particularIds)
            ->where('programs.department_id', $departmentId)
            ->get(['particulars.particular_id', 'programs.program_id']);

        if ($particulars->count() !== count(array_unique($particularIds))) {
            return null;
        }

        $programIds = $particulars
            ->pluck('program_id')
            ->unique()
            ->all();

        $programs = DB::table('programs')
            ->where('department_id', $departmentId)
            ->get(['program_id', 'parent_id'])
            ->keyBy('program_id');
        $rootIds = [];

        foreach ($programIds as $programId) {
            $seen = [];
            $program = $programs->get($programId);

            while ($program && $program->parent_id !== null) {
                if (isset($seen[$program->program_id])) {
                    return null;
                }
                $seen[$program->program_id] = true;
                $program = $programs->get($program->parent_id);
            }

            if (! $program) {
                return null;
            }

            $rootIds[] = (int) $program->program_id;
        }

        $rootIds = array_values(array_unique($rootIds));

        return count($rootIds) === 1 ? $rootIds[0] : null;
    }
}
