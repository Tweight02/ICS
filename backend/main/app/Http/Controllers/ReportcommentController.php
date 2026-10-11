<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class ReportCommentController extends Controller
{
    /**
     * GET /api/churches/{church}/departments/{department}/comments
     *
     * Comments written by a pastor/assistant of the SAME district as the church.
     * Adjust table/column names marked "adjust" to match your schema.
     */
    public function index(int $church, int $department)
    {
        $districtId = DB::table('churches')                                  // adjust
            ->where('church_id', $church)
            ->value('district_id');

        $comments = DB::table('comments as c')
            ->join('users as u', 'u.user_id', '=', 'c.commented_by')         // adjust
            ->leftJoin('quarters as q', 'q.quarter_id', '=', 'c.quarter_id') // adjust
            ->where('c.church_id', $church)
            ->where('c.department_id', $department)
            ->where('u.district_id', $districtId)
            ->whereIn('u.role', ['pastor', 'assistant'])                     // adjust role values
            ->orderByDesc('c.date_commented')
            ->orderByDesc('c.comment_id')
            ->get([
                'c.comment_id',
                'c.quarter_id',
                'c.commented_by',
                'c.details',
                'c.status',
                'c.date_commented',
                'u.name as commenter_name',                                  // adjust
                'u.role as commenter_role',                                  // adjust
                'q.quarter',                                                 // adjust
                'q.year',                                                    // adjust
            ]);

        return response()->json(['data' => $comments]);
    }
}