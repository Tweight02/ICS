<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /* =========================================================
       GET DEPARTMENTS
    ========================================================= */

    public function getDepartments($churchId)
    {
        $departments = DB::table('departments')
            ->orderBy('department_name')
            ->get();

        return response()->json($departments);
    }


    /* =========================================================
       GET DEPARTMENT REPORT
    ========================================================= */

    public function departmentReport($churchId, $departmentId)
    {
        /*
        |--------------------------------------------------------------------------
        | GET DEPARTMENT
        |--------------------------------------------------------------------------
        */

        $department = DB::table('departments')
            ->where('department_id', $departmentId)
            ->first();

        if (!$department) {
            return response()->json([
                'message' => 'Department not found.'
            ], 404);
        }


        /*
        |--------------------------------------------------------------------------
        | GET MAIN PROGRAMS
        |--------------------------------------------------------------------------
        */

        $programs = DB::table('programs')
            ->where('department_id', $departmentId)
            ->whereNull('parent_id')
            ->orderBy('program_id')
            ->get();

        $reportPrograms = [];


        foreach ($programs as $program) {

            /*
            |--------------------------------------------------------------------------
            | GET QUARTERS FROM THE MAIN PROGRAM
            |--------------------------------------------------------------------------
            |
            | Example:
            |
            | Main program: 48
            | Children's Ministries: 49
            | Family Ministries: 50
            |
            | Both sections use quarters belonging to program 48.
            |
            */

            $quarters = DB::table('quarters')
                ->where('church_id', $churchId)
                ->where('program_id', $program->program_id)
                ->orderBy('year')
                ->orderByRaw("
                    CASE
                        WHEN quarter LIKE '%1%' THEN 1
                        WHEN quarter LIKE '%2%' THEN 2
                        WHEN quarter LIKE '%3%' THEN 3
                        WHEN quarter LIKE '%4%' THEN 4
                        ELSE 5
                    END
                ")
                ->get();


            /*
            |--------------------------------------------------------------------------
            | GET PROGRAM SECTIONS
            |--------------------------------------------------------------------------
            */

            $sections = DB::table('programs')
                ->where('parent_id', $program->program_id)
                ->orderBy('program_id')
                ->get();

            $sectionData = [];


            foreach ($sections as $section) {

                /*
                |--------------------------------------------------------------------------
                | GET PARTICULARS
                |--------------------------------------------------------------------------
                */

                $particulars = DB::table('particulars')
                    ->where('program_id', $section->program_id)
                    ->orderBy('particular_id')
                    ->get();

                $particularData = [];


                foreach ($particulars as $particular) {

                    /*
                    |--------------------------------------------------------------------------
                    | ATTACH QUARTERS AND SAVED VALUES
                    |--------------------------------------------------------------------------
                    */

                    $particularQuarters = $quarters->map(
                        function ($quarter) use ($particular) {

                            $savedItem = DB::table('particular_items')
                                ->where(
                                    'particular_id',
                                    $particular->particular_id
                                )
                                ->where(
                                    'quarter_id',
                                    $quarter->quarter_id
                                )
                                ->first();

                            return [
                                'quarter_id' => (int) $quarter->quarter_id,

                                'quarter' => $quarter->quarter,

                                'year' => $quarter->year,

                                'date_submitted' => $quarter->date_submitted,

                                'district_endorse' => $quarter->district_endorse,

                                'mission_approve' => $quarter->mission_approve,

                                'value' => $savedItem
                                    ? $savedItem->value
                                    : null,
                            ];
                        }
                    )->values();


                    $particularData[] = [
                        'particular_id' => (int) $particular->particular_id,

                        'particular_name' => $particular->particular_name,

                        'quarters' => $particularQuarters,
                    ];
                }


                /*
                |--------------------------------------------------------------------------
                | SECTION RESPONSE
                |--------------------------------------------------------------------------
                */

                $sectionData[] = [
                    'program_id' => (int) $section->program_id,

                    'program_name' => $section->program_name,

                    'particulars' => $particularData,
                ];
            }


            /*
            |--------------------------------------------------------------------------
            | MAIN PROGRAM RESPONSE
            |--------------------------------------------------------------------------
            */

            $reportPrograms[] = [
                'program_id' => (int) $program->program_id,

                'program_name' => $program->program_name,

                'sections' => $sectionData,
            ];
        }


        /*
        |--------------------------------------------------------------------------
        | LOG REPORT REQUEST
        |--------------------------------------------------------------------------
        */

        \Log::info('Department Report Loaded', [
            'church_id' => $churchId,

            'department_id' => $departmentId,

            'program_count' => count($reportPrograms),
        ]);


        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'church_id' => (int) $churchId,

            'department' => [
                'department_id' => (int) $department->department_id,

                'department_name' => $department->department_name,
            ],

            'programs' => $reportPrograms,
        ]);
    }


    /* =========================================================
       SAVE DEPARTMENT REPORT
    ========================================================= */

    public function saveDepartmentReport(
        Request $request,
        $churchId,
        $departmentId
    ) {

        /*
        |--------------------------------------------------------------------------
        | VALIDATE REQUEST
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'items' => [
                'required',
                'array',
                'min:1',
            ],

            'items.*.particular_id' => [
                'required',
                'integer',
            ],

            'items.*.quarter_id' => [
                'required',
                'integer',
            ],

            'items.*.value' => [
                'nullable',
                'integer',
                'min:0',
            ],
        ]);


        DB::beginTransaction();

        try {

            $savedCount = 0;


            /*
            |--------------------------------------------------------------------------
            | PROCESS EACH REPORT ITEM
            |--------------------------------------------------------------------------
            */

            foreach ($validated['items'] as $item) {

                /*
                |--------------------------------------------------------------------------
                | FIND PARTICULAR AND ITS MAIN PROGRAM
                |--------------------------------------------------------------------------
                |
                | particular
                |     -> section program
                |     -> main program
                |     -> department
                |
                */

                $particular = DB::table('particulars as p')
                    ->join(
                        'programs as section',
                        'p.program_id',
                        '=',
                        'section.program_id'
                    )
                    ->join(
                        'programs as program',
                        'section.parent_id',
                        '=',
                        'program.program_id'
                    )
                    ->where(
                        'p.particular_id',
                        $item['particular_id']
                    )
                    ->where(
                        'program.department_id',
                        $departmentId
                    )
                    ->whereNull('program.parent_id')
                    ->select([
                        'p.particular_id',
                        'section.program_id as section_program_id',
                        'program.program_id as main_program_id',
                    ])
                    ->first();


                if (!$particular) {
                    throw new \Exception(
                        'Invalid particular for this department.'
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | FIND QUARTER
                |--------------------------------------------------------------------------
                |
                | IMPORTANT:
                |
                | Use main_program_id, NOT section_program_id.
                |
                */

                $quarter = DB::table('quarters')
                    ->where(
                        'quarter_id',
                        $item['quarter_id']
                    )
                    ->where(
                        'church_id',
                        $churchId
                    )
                    ->where(
                        'program_id',
                        $particular->main_program_id
                    )
                    ->lockForUpdate()
                    ->first();


                if (!$quarter) {
                    throw new \Exception(
                        'Invalid quarter for this church or program.'
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | APPROVED QUARTERS CANNOT BE EDITED
                |--------------------------------------------------------------------------
                */

                if (
                    $quarter->mission_approve !== null &&
                    $quarter->mission_approve !== ''
                ) {
                    throw new \Exception(
                        'This quarter has already been approved and cannot be edited.'
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | ENFORCE SEQUENTIAL QUARTER APPROVAL
                |--------------------------------------------------------------------------
                |
                | Q1 can be saved first.
                | Q2 requires Q1 approval.
                | Q3 requires Q2 approval.
                | Q4 requires Q3 approval.
                |
                */

                $quarterNumber = $this->getQuarterNumber(
                    $quarter->quarter
                );

                if ($quarterNumber === null) {
                    throw new \Exception(
                        'Invalid quarter name.'
                    );
                }


                if ($quarterNumber > 1) {

                    $previousQuarterName = 'Q' . ($quarterNumber - 1);

                    $previousQuarter = DB::table('quarters')
                        ->where(
                            'church_id',
                            $churchId
                        )
                        ->where(
                            'program_id',
                            $particular->main_program_id
                        )
                        ->where(
                            'year',
                            $quarter->year
                        )
                        ->where(
                            'quarter',
                            $previousQuarterName
                        )
                        ->first();


                    if (!$previousQuarter) {
                        throw new \Exception(
                            $previousQuarterName .
                            ' must exist before this quarter can be submitted.'
                        );
                    }


                    if (
                        $previousQuarter->mission_approve === null ||
                        $previousQuarter->mission_approve === ''
                    ) {
                        throw new \Exception(
                            $previousQuarterName .
                            ' must be approved before saving ' .
                            $quarter->quarter . '.'
                        );
                    }
                }


                /*
                |--------------------------------------------------------------------------
                | FIND EXISTING PARTICULAR ITEM
                |--------------------------------------------------------------------------
                */

                $existing = DB::table('particular_items')
                    ->where(
                        'particular_id',
                        $item['particular_id']
                    )
                    ->where(
                        'quarter_id',
                        $item['quarter_id']
                    )
                    ->first();


                /*
                |--------------------------------------------------------------------------
                | UPDATE EXISTING ITEM
                |--------------------------------------------------------------------------
                */

                if ($existing) {

                    DB::table('particular_items')
                        ->where(
                            'item_id',
                            $existing->item_id
                        )
                        ->update([
                            'value' => $item['value'],
                        ]);
                }


                /*
                |--------------------------------------------------------------------------
                | INSERT NEW ITEM
                |--------------------------------------------------------------------------
                */

                else {

                    DB::table('particular_items')
                        ->insert([
                            'particular_id' => $item['particular_id'],

                            'quarter_id' => $item['quarter_id'],

                            'value' => $item['value'],
                        ]);
                }


                $savedCount++;
            }


            /*
            |--------------------------------------------------------------------------
            | COMMIT TRANSACTION
            |--------------------------------------------------------------------------
            */

            DB::commit();

            return response()->json([
                'message' => 'Report saved successfully.',

                'saved_count' => $savedCount,
            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            \Log::error('Save Department Report Failed', [
                'church_id' => $churchId,

                'department_id' => $departmentId,

                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to save report.',

                'error' => $e->getMessage(),
            ], 422);
        }
    }


    /* =========================================================
       GET QUARTER NUMBER
    ========================================================= */

    private function getQuarterNumber($quarter)
    {
        $quarter = strtoupper(trim((string) $quarter));

        if (preg_match('/(?:^|[^A-Z0-9])Q([1-4])(?:$|[^A-Z0-9])/', $quarter, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/^Q([1-4])$/', $quarter, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }
}