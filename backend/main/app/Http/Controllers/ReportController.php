<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;


class ReportController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | CURRENT REPORTING PERIOD
    |--------------------------------------------------------------------------
    |
    | Your organization is currently using Q3 2026
    | as the current reporting quarter.
    |
    */

    private string $currentQuarter = 'Q3';

    private string $currentYear = '2026';


    /*
    |--------------------------------------------------------------------------
    | GET DEPARTMENTS BY CHURCH
    |--------------------------------------------------------------------------
    |
    | GET:
    | /api/churches/{churchId}/departments
    |
    | Returns all departments and their approval status
    | for Q1, Q2, Q3 and Q4.
    |
    */

    public function departmentsByChurch($churchId)
    {
        /*
        |--------------------------------------------------------------------------
        | Check church
        |--------------------------------------------------------------------------
        */

        $church = DB::table('churches')
            ->where(
                'church_id',
                $churchId
            )
            ->first();


        if (!$church) {

            return response()->json([
                'message' => 'Church not found.'
            ], 404);

        }


        /*
        |--------------------------------------------------------------------------
        | Get departments
        |--------------------------------------------------------------------------
        */

        $departments = DB::table('departments')
            ->orderBy('department_name')
            ->get([
                'department_id',
                'department_name',
            ]);


        /*
        |--------------------------------------------------------------------------
        | Build department result
        |--------------------------------------------------------------------------
        */

        $result = $departments->map(
            function ($department) use ($churchId) {

                /*
                |--------------------------------------------------------------------------
                | Get quarter records belonging to this
                | church + department
                |--------------------------------------------------------------------------
                */

                $quarters = DB::table('quarters')
                    ->join(
                        'programs',
                        'quarters.program_id',
                        '=',
                        'programs.program_id'
                    )
                    ->where(
                        'quarters.church_id',
                        $churchId
                    )
                    ->where(
                        'programs.department_id',
                        $department->department_id
                    )
                    ->select(
                        'quarters.quarter',
                        'quarters.year',
                        'quarters.mission_approve'
                    )
                    ->get();


                /*
                |--------------------------------------------------------------------------
                | Return department
                |--------------------------------------------------------------------------
                */

                return [

                    'department_id' =>
                        (int) $department->department_id,

                    'department_name' =>
                        $department->department_name,


                    /*
                    |--------------------------------------------------------------------------
                    | Q1
                    |--------------------------------------------------------------------------
                    */

                    'q1_approved' =>
                        $quarters->contains(
                            function ($quarter) {

                                return
                                    $quarter->quarter === 'Q1'
                                    &&
                                    !empty(
                                        $quarter->mission_approve
                                    );

                            }
                        ),


                    /*
                    |--------------------------------------------------------------------------
                    | Q2
                    |--------------------------------------------------------------------------
                    */

                    'q2_approved' =>
                        $quarters->contains(
                            function ($quarter) {

                                return
                                    $quarter->quarter === 'Q2'
                                    &&
                                    !empty(
                                        $quarter->mission_approve
                                    );

                            }
                        ),


                    /*
                    |--------------------------------------------------------------------------
                    | Q3
                    |--------------------------------------------------------------------------
                    */

                    'q3_approved' =>
                        $quarters->contains(
                            function ($quarter) {

                                return
                                    $quarter->quarter === 'Q3'
                                    &&
                                    !empty(
                                        $quarter->mission_approve
                                    );

                            }
                        ),


                    /*
                    |--------------------------------------------------------------------------
                    | Q4
                    |--------------------------------------------------------------------------
                    */

                    'q4_approved' =>
                        $quarters->contains(
                            function ($quarter) {

                                return
                                    $quarter->quarter === 'Q4'
                                    &&
                                    !empty(
                                        $quarter->mission_approve
                                    );

                            }
                        ),

                ];

            }
        );


        /*
        |--------------------------------------------------------------------------
        | Return JSON
        |--------------------------------------------------------------------------
        */

        return response()->json(
            $result->values()
        );
    }


    /*
    |--------------------------------------------------------------------------
    | GET DEPARTMENT REPORT
    |--------------------------------------------------------------------------
    |
    | GET:
    | /api/churches/{churchId}/departments/{departmentId}/report
    |
    */

    public function departmentReport(
        $churchId,
        $departmentId
    ) {

        /*
        |--------------------------------------------------------------------------
        | Check department
        |--------------------------------------------------------------------------
        */

        $department = DB::table('departments')
            ->where(
                'department_id',
                $departmentId
            )
            ->first();


        if (!$department) {

            return response()->json([
                'message' =>
                    'Department not found.'
            ], 404);

        }


        /*
        |--------------------------------------------------------------------------
        | Get programs
        |--------------------------------------------------------------------------
        |
        | Parent programs only.
        |
        */

        $programs = DB::table('programs')
            ->where(
                'department_id',
                $departmentId
            )
            ->whereNull('parent_id')
            ->orderBy('program_id')
            ->get();


        $result = [];


        /*
        |--------------------------------------------------------------------------
        | Loop programs
        |--------------------------------------------------------------------------
        */

        foreach ($programs as $program) {


            /*
            |--------------------------------------------------------------------------
            | Get sections
            |--------------------------------------------------------------------------
            */

            $sections = DB::table('programs')
                ->where(
                    'parent_id',
                    $program->program_id
                )
                ->orderBy('program_id')
                ->get();


            $programData = [

                'program_id' =>
                    (int) $program->program_id,

                'program_name' =>
                    $program->program_name,

                'sections' => []

            ];


            /*
            |--------------------------------------------------------------------------
            | Loop sections
            |--------------------------------------------------------------------------
            */

            foreach ($sections as $section) {


                /*
                |--------------------------------------------------------------------------
                | Get particulars
                |--------------------------------------------------------------------------
                */

                $particulars = DB::table('particulars')
                    ->where(
                        'program_id',
                        $section->program_id
                    )
                    ->orderBy('particular_id')
                    ->get();


                $particularData = [];


                /*
                |--------------------------------------------------------------------------
                | Loop particulars
                |--------------------------------------------------------------------------
                */

                foreach ($particulars as $particular) {


                    /*
                    |--------------------------------------------------------------------------
                    | Get quarter values
                    |--------------------------------------------------------------------------
                    |
                    | quarter_id is VERY IMPORTANT because comments
                    | are connected to quarters.quarter_id.
                    |
                    */

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
                        ->where(
                            'quarters.church_id',
                            $churchId
                        )
                        ->select(

                            'quarters.quarter_id',

                            'quarters.quarter',

                            'quarters.year',

                            'quarters.date_submitted',

                            'quarters.district_endorse',

                            'quarters.mission_approve',

                            'particular_items.value'

                        )
                        ->orderBy(
                            'quarters.year'
                        )
                        ->orderBy(
                            'quarters.quarter'
                        )
                        ->get();


                    /*
                    |--------------------------------------------------------------------------
                    | Particular
                    |--------------------------------------------------------------------------
                    */

                    $particularData[] = [

                        'particular_id' =>
                            (int)
                            $particular->particular_id,

                        'particular_name' =>
                            $particular->particular_name,

                        'quarters' =>
                            $items

                    ];

                }


                /*
                |--------------------------------------------------------------------------
                | Section
                |--------------------------------------------------------------------------
                */

                $programData['sections'][] = [

                    'program_id' =>
                        (int)
                        $section->program_id,

                    'program_name' =>
                        $section->program_name,

                    'particulars' =>
                        $particularData

                ];

            }


            /*
            |--------------------------------------------------------------------------
            | Program
            |--------------------------------------------------------------------------
            */

            $result[] =
                $programData;

        }


        /*
        |--------------------------------------------------------------------------
        | Return report
        |--------------------------------------------------------------------------
        */

        return response()->json([

            'church_id' =>
                (int) $churchId,

            'department' => [

                'department_id' =>
                    (int)
                    $department->department_id,

                'department_name' =>
                    $department->department_name,

            ],

            'programs' =>
                $result

        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | GET COMMENTS
    |--------------------------------------------------------------------------
    |
    | GET:
    | /api/quarters/{quarterId}/comments
    |
    */

    public function comments($quarterId)
    {
        /*
        |--------------------------------------------------------------------------
        | Check quarter exists
        |--------------------------------------------------------------------------
        */

        $quarter = DB::table('quarters')
            ->where(
                'quarter_id',
                $quarterId
            )
            ->first();


        if (!$quarter) {

            return response()->json([
                'message' =>
                    'Quarter report not found.'
            ], 404);

        }


        /*
        |--------------------------------------------------------------------------
        | Get comments
        |--------------------------------------------------------------------------
        */

        $comments = DB::table('comments')
            ->join(
                'users',
                'comments.commented_by',
                '=',
                'users.user_id'
            )
            ->where(
                'comments.quarter_id',
                $quarterId
            )
            ->orderByDesc(
                'comments.comment_id'
            )
            ->select(

                'comments.comment_id',

                'comments.quarter_id',

                'comments.commented_by',

                'comments.details',

                'comments.date_commented',

                'users.first_name',

                'users.middle_name',

                'users.last_name',

                'users.role'

            )
            ->get();


        /*
        |--------------------------------------------------------------------------
        | Return comments
        |--------------------------------------------------------------------------
        */

        return response()->json(
            $comments
        );
    }


    /*
    |--------------------------------------------------------------------------
    | ADD COMMENT
    |--------------------------------------------------------------------------
    |
    | POST:
    | /api/comments
    |
    | Current reporting period:
    | Q3 2026
    |
    */

    public function addComment(
        Request $request
    ) {

        /*
        |--------------------------------------------------------------------------
        | Validate request
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([

            'quarter_id' => [
                'required',
                'integer',
                'exists:quarters,quarter_id'
            ],

            'commented_by' => [
                'required',
                'integer',
                'exists:users,user_id'
            ],

            'details' => [
                'required',
                'string',
                'max:255'
            ],

        ]);


        /*
        |--------------------------------------------------------------------------
        | Current reporting period
        |--------------------------------------------------------------------------
        */

        $currentQuarter =
            $this->currentQuarter;

        $currentYear =
            $this->currentYear;


        /*
        |--------------------------------------------------------------------------
        | Get quarter
        |--------------------------------------------------------------------------
        */

        $quarter = DB::table('quarters')
            ->where(
                'quarter_id',
                $validated['quarter_id']
            )
            ->first();


        if (!$quarter) {

            return response()->json([
                'message' =>
                    'Quarter report not found.'
            ], 404);

        }


        /*
        |--------------------------------------------------------------------------
        | Only Q3 2026 can receive comments
        |--------------------------------------------------------------------------
        */

        if (
            $quarter->quarter !==
                $currentQuarter
            ||
            (string) $quarter->year !==
                $currentYear
        ) {

            return response()->json([

                'message' =>
                    'Comments can only be added to the current quarter: '
                    . $currentQuarter
                    . ' '
                    . $currentYear

            ], 422);

        }


        /*
        |--------------------------------------------------------------------------
        | Check approval
        |--------------------------------------------------------------------------
        |
        | mission_approve is a DATE field.
        |
        | NULL:
        | Not approved
        |
        | Date:
        | Approved
        |
        */

        if (
            !empty(
                $quarter->mission_approve
            )
        ) {

            return response()->json([

                'message' =>
                    'This report has already been approved. No more comments are allowed.'

            ], 422);

        }


        /*
        |--------------------------------------------------------------------------
        | Clean comment
        |--------------------------------------------------------------------------
        */

        $details =
            trim(
                $validated['details']
            );


        if ($details === '') {

            return response()->json([

                'message' =>
                    'Comment cannot be empty.'

            ], 422);

        }


        /*
        |--------------------------------------------------------------------------
        | Save comment
        |--------------------------------------------------------------------------
        */

        $commentId =
            DB::table('comments')
                ->insertGetId([

                    'quarter_id' =>
                        $validated['quarter_id'],

                    'commented_by' =>
                        $validated['commented_by'],

                    'details' =>
                        $details,

                    'date_commented' =>
                        now()->toDateString(),

                ]);


        /*
        |--------------------------------------------------------------------------
        | Get newly saved comment
        |--------------------------------------------------------------------------
        */

        $comment = DB::table('comments')
            ->join(
                'users',
                'comments.commented_by',
                '=',
                'users.user_id'
            )
            ->where(
                'comments.comment_id',
                $commentId
            )
            ->select(

                'comments.comment_id',

                'comments.quarter_id',

                'comments.commented_by',

                'comments.details',

                'comments.date_commented',

                'users.first_name',

                'users.middle_name',

                'users.last_name',

                'users.role'

            )
            ->first();


        /*
        |--------------------------------------------------------------------------
        | Return saved comment
        |--------------------------------------------------------------------------
        */

        return response()->json(
            $comment,
            201
        );
    }
}