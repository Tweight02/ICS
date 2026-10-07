<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Get all departments available for a church.
     */
    public function departmentsByChurch($churchId)
    {
        $departments = DB::table('departments')
            ->orderBy('department_name')
            ->get([
                'department_id',
                'department_name',
            ]);

        return response()->json($departments);
    }

    /**
     * Get the selected department report for the selected church.
     */
    public function departmentReport($churchId, $departmentId)
    {
        $department = DB::table('departments')
            ->where('department_id', $departmentId)
            ->first();

        if (!$department) {
            return response()->json([
                'message' => 'Department not found.'
            ], 404);
        }

        $programs = DB::table('programs')
            ->where('department_id', $departmentId)
            ->whereNull('parent_id')
            ->orderBy('program_id')
            ->get();

        $result = [];

        foreach ($programs as $program) {

            $sections = DB::table('programs')
                ->where('parent_id', $program->program_id)
                ->orderBy('program_id')
                ->get();

            $programData = [
                'program_id' => $program->program_id,
                'program_name' => $program->program_name,
                'sections' => [],
            ];

            foreach ($sections as $section) {

                $particulars = DB::table('particulars')
                    ->where('program_id', $section->program_id)
                    ->orderBy('particular_id')
                    ->get();

                $particularData = [];

                foreach ($particulars as $particular) {

                    $items = DB::table('particular_items')
                        ->join(
                            'quarters',
                            'particular_items.quarter_id',
                            '=',
                            'quarters.quarter_id'
                        )
                        ->where(
                            'particular_items.particular_id',
                            $particular->particular_id
                        )
                        ->where('quarters.church_id', $churchId)
                        ->select(
                            'quarters.quarter',
                            'quarters.year',
                            'quarters.date_submitted',
                            'quarters.district_endorse',
                            'quarters.mission_approve',
                            'particular_items.value'
                        )
                        ->orderBy('quarters.quarter')
                        ->get();

                    $particularData[] = [
                        'particular_id' => $particular->particular_id,
                        'particular_name' => $particular->particular_name,
                        'quarters' => $items,
                    ];
                }

                $programData['sections'][] = [
                    'program_id' => $section->program_id,
                    'program_name' => $section->program_name,
                    'particulars' => $particularData,
                ];
            }

            $result[] = $programData;
        }

        return response()->json([
            'church_id' => (int) $churchId,
            'department' => [
                'department_id' => $department->department_id,
                'department_name' => $department->department_name,
            ],
            'programs' => $result,
        ]);
    }
}