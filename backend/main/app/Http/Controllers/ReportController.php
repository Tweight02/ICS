<?php

namespace App\Http\Controllers;

use App\Services\ReportMonitoringService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /* =========================================================
       GET DEPARTMENTS
    ========================================================= */

    public function getDepartments($churchId, ReportMonitoringService $monitoring)
    {
        $church = DB::table('churches')
            ->where('church_id', $churchId)
            ->first();

        if (! $church) {
            return response()->json([
                'message' => 'Church not found.',
            ], 404);
        }

        $departments = DB::table('departments')
            ->orderBy('department_name')
            ->get();

        $approvals = $monitoring->departmentApprovals((int) $churchId);

        $result = $departments->map(function ($department) use ($approvals) {
            return [
                'department_id' => (int) $department->department_id,
                'department_name' => $department->department_name,
                'q1_approved' => $approvals[$department->department_id]['q1_approved'] ?? false,
                'q2_approved' => $approvals[$department->department_id]['q2_approved'] ?? false,
                'q3_approved' => $approvals[$department->department_id]['q3_approved'] ?? false,
                'q4_approved' => $approvals[$department->department_id]['q4_approved'] ?? false,
                'q1_submitted' => $approvals[$department->department_id]['q1_submitted'] ?? false,
                'q2_submitted' => $approvals[$department->department_id]['q2_submitted'] ?? false,
                'q3_submitted' => $approvals[$department->department_id]['q3_submitted'] ?? false,
                'q4_submitted' => $approvals[$department->department_id]['q4_submitted'] ?? false,
                'q1_data_progress' => $approvals[$department->department_id]['q1_data_progress'] ?? null,
                'q2_data_progress' => $approvals[$department->department_id]['q2_data_progress'] ?? null,
                'q3_data_progress' => $approvals[$department->department_id]['q3_data_progress'] ?? null,
                'q4_data_progress' => $approvals[$department->department_id]['q4_data_progress'] ?? null,
                'q1_submitted_data_progress' => $approvals[$department->department_id]['q1_submitted_data_progress'] ?? null,
                'q2_submitted_data_progress' => $approvals[$department->department_id]['q2_submitted_data_progress'] ?? null,
                'q3_submitted_data_progress' => $approvals[$department->department_id]['q3_submitted_data_progress'] ?? null,
                'q4_submitted_data_progress' => $approvals[$department->department_id]['q4_submitted_data_progress'] ?? null,
            ];
        });

        return response()->json($result->values());
    }

    /* =========================================================
       GET DEPARTMENT REPORT
    ========================================================= */

    public function departmentReport($churchId, $departmentId)
    {
        $church = DB::table('churches')
            ->where('church_id', $churchId)
            ->first();

        if (! $church) {
            return response()->json([
                'message' => 'Church not found.',
            ], 404);
        }

        $department = DB::table('departments')
            ->where('department_id', $departmentId)
            ->first();

        if (! $department) {
            return response()->json([
                'message' => 'Department not found.',
            ], 404);
        }

        $programs = DB::table('programs')
            ->where('department_id', $departmentId)
            ->whereNull('parent_id')
            ->orderBy('program_id')
            ->get();

        $reportPrograms = [];

        foreach ($programs as $program) {
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

            $sections = DB::table('programs')
                ->where('parent_id', $program->program_id)
                ->orderBy('program_id')
                ->get();

            $sectionData = [];

            foreach ($sections as $section) {
                $particulars = DB::table('particulars')
                    ->where('program_id', $section->program_id)
                    ->orderBy('particular_id')
                    ->get();

                $particularData = [];

                foreach ($particulars as $particular) {
                    $particularQuarters = $quarters->map(
                        function ($quarter) use ($particular) {
                            $savedItem = DB::table('particular_items')
                                ->where('particular_id', $particular->particular_id)
                                ->where('quarter_id', $quarter->quarter_id)
                                ->first();

                            return [
                                'quarter_id' => (int) $quarter->quarter_id,
                                'quarter' => $quarter->quarter,
                                'year' => $quarter->year,
                                'date_submitted' => $quarter->date_submitted,
                                'district_endorse' => $quarter->district_endorse,
                                'mission_approve' => $quarter->mission_approve,
                                'value' => $savedItem ? $savedItem->value : null,
                            ];
                        }
                    )->values();

                    $particularData[] = [
                        'particular_id' => (int) $particular->particular_id,
                        'particular_name' => $particular->particular_name,
                        'quarters' => $particularQuarters,
                    ];
                }

                $sectionData[] = [
                    'program_id' => (int) $section->program_id,
                    'program_name' => $section->program_name,
                    'particulars' => $particularData,
                ];
            }

            $reportPrograms[] = [
                'program_id' => (int) $program->program_id,
                'program_name' => $program->program_name,
                'sections' => $sectionData,
            ];
        }

        \Log::info('Department Report Loaded', [
            'church_id' => $churchId,
            'department_id' => $departmentId,
            'program_count' => count($reportPrograms),
        ]);

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
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.particular_id' => ['required', 'integer'],
            'items.*.quarter_id' => ['required', 'integer'],
            'items.*.value' => ['nullable', 'numeric', 'min:0'],
            'submitted' => ['sometimes', 'boolean'],
        ]);

        $submitted = (bool) ($validated['submitted'] ?? false);

        DB::beginTransaction();

        try {
            $savedCount = 0;

            foreach ($validated['items'] as $item) {
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
                    ->where('p.particular_id', $item['particular_id'])
                    ->where('program.department_id', $departmentId)
                    ->whereNull('program.parent_id')
                    ->select([
                        'p.particular_id',
                        'section.program_id as section_program_id',
                        'program.program_id as main_program_id',
                    ])
                    ->first();

                if (! $particular) {
                    throw new \Exception(
                        'Invalid particular for this department.'
                    );
                }

                $quarter = DB::table('quarters')
                    ->where('quarter_id', $item['quarter_id'])
                    ->where('church_id', $churchId)
                    ->where('program_id', $particular->main_program_id)
                    ->lockForUpdate()
                    ->first();

                if (! $quarter) {
                    throw new \Exception(
                        'Invalid quarter for this church or program.'
                    );
                }

                if ($this->isApproved($quarter->mission_approve)) {
                    throw new \Exception(
                        'This quarter has already been approved and cannot be edited.'
                    );
                }

                $quarterNumber = $this->getQuarterNumber($quarter->quarter);

                if ($quarterNumber === null) {
                    throw new \Exception('Invalid quarter name.');
                }

                if ($quarterNumber > 1) {
                    $previousQuarterName = 'Q'.($quarterNumber - 1);

                    $previousQuarter = DB::table('quarters')
                        ->where('church_id', $churchId)
                        ->where('program_id', $particular->main_program_id)
                        ->where('year', $quarter->year)
                        ->where('quarter', $previousQuarterName)
                        ->first();

                    if (! $previousQuarter) {
                        throw new \Exception(
                            $previousQuarterName.
                            ' must exist before this quarter can be submitted.'
                        );
                    }

                    if (! $this->isApproved($previousQuarter->mission_approve)) {
                        throw new \Exception(
                            $previousQuarterName.
                            ' must be approved before saving '.
                            $quarter->quarter.'.'
                        );
                    }
                }

                $existing = DB::table('particular_items')
                    ->where('particular_id', $item['particular_id'])
                    ->where('quarter_id', $item['quarter_id'])
                    ->first();

                if ($existing) {
                    DB::table('particular_items')
                        ->where('item_id', $existing->item_id)
                        ->update([
                            'value' => $submitted && $item['value'] === null
                                ? 0
                                : $item['value'],
                        ]);
                } else {
                    DB::table('particular_items')->insert([
                        'particular_id' => $item['particular_id'],
                        'quarter_id' => $item['quarter_id'],
                        'value' => $submitted && $item['value'] === null
                            ? 0
                            : $item['value'],
                    ]);
                }

                $savedCount++;
            }

            if ($submitted) {
                $quarterIds = collect($validated['items'])
                    ->pluck('quarter_id')
                    ->unique()
                    ->values();

                DB::table('quarters')
                    ->whereIn('quarter_id', $quarterIds)
                    ->update([
                        'date_submitted' => now()->toDateString(),
                    ]);
            }

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
       QUARTER HELPERS
    ========================================================= */

    private function getQuarterNumber($quarter): ?int
    {
        $quarter = strtoupper(trim((string) $quarter));

        if (preg_match('/Q\s*([1-4])/', $quarter, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/^([1-4])$/', $quarter, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    private function isApproved($value): bool
    {
        return $value !== null && trim((string) $value) !== '';
    }

    /* =========================================================
       GET DEPARTMENT COMMENTS
    ========================================================= */

    public function departmentComments(int $churchId, int $departmentId)
    {
        $church = DB::table('churches')
            ->where('church_id', $churchId)
            ->first(['church_id', 'parent_id']);

        if (! $church) {
            return response()->json([
                'message' => 'Church not found.',
            ], 404);
        }

        $department = DB::table('departments')
            ->where('department_id', $departmentId)
            ->first();

        if (! $department) {
            return response()->json([
                'message' => 'Department not found.',
            ], 404);
        }

        $comments = DB::table('comments as c')
            ->join('users as u', 'u.user_id', '=', 'c.commented_by')
            ->leftJoin('quarters as q', 'q.quarter_id', '=', 'c.quarter_id')
            ->where('c.church_id', $churchId)
            ->where('c.department_id', $departmentId)
            ->orderByDesc('c.date_commented')
            ->orderByDesc('c.comment_id')
            ->get([
                'c.comment_id',
                'c.quarter_id',
                'c.church_id',
                'c.department_id',
                'c.commented_by',
                'c.details',
                'c.status',
                'c.date_commented',
                DB::raw("
                    CONCAT_WS(' ',
                        NULLIF(u.first_name, ''),
                        NULLIF(u.middle_name, ''),
                        NULLIF(u.last_name, ''),
                        NULLIF(u.extension_name, '')
                    ) AS commenter_name
                "),
                'u.role as commenter_role',
                'q.quarter',
                'q.year',
            ]);

        return response()->json([
            'data' => $comments,
        ]);
    }

    /* =========================================================
       ADD DEPARTMENT COMMENT
    ========================================================= */

    public function addComment(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'You must log in to comment.',
            ], 401);
        }

        $role = strtolower(trim(str_replace(
            ['_', '-'],
            ' ',
            (string) ($user->role ?? '')
        )));

        $allowedRoles = [
            'pastor',
            'district pastor',
            'administrative assistant',
            'assistant',
        ];

        if (! in_array($role, $allowedRoles, true)) {
            return response()->json([
                'message' => 'You are not authorized to add comments.',
            ], 403);
        }

        $data = $request->validate([
            'quarter_id' => [
                'required',
                'integer',
                'exists:quarters,quarter_id',
            ],
            'church_id' => [
                'required',
                'integer',
                'exists:churches,church_id',
            ],
            'department_id' => [
                'required',
                'integer',
                'exists:departments,department_id',
            ],
            'details' => [
                'required',
                'string',
                'max:255',
            ],
        ]);

        $quarter = DB::table('quarters')
            ->where('quarter_id', $data['quarter_id'])
            ->where('church_id', $data['church_id'])
            ->first();

        if (! $quarter) {
            return response()->json([
                'message' => 'The selected quarter does not belong to this church.',
            ], 422);
        }

        $quarterBelongsToDepartment = DB::table('quarters as q')
            ->join('programs as p', 'p.program_id', '=', 'q.program_id')
            ->where('q.quarter_id', $data['quarter_id'])
            ->where('q.church_id', $data['church_id'])
            ->where('p.department_id', $data['department_id'])
            ->exists();

        if (! $quarterBelongsToDepartment) {
            return response()->json([
                'message' => 'The selected quarter does not belong to this department.',
            ], 422);
        }

        if ($this->isApproved($quarter->mission_approve)) {
            return response()->json([
                'message' => 'This report has been approved. Comments are closed.',
            ], 422);
        }

        $commentId = DB::table('comments')->insertGetId([
            'quarter_id' => $data['quarter_id'],
            'church_id' => $data['church_id'],
            'department_id' => $data['department_id'],
            'commented_by' => $user->user_id,
            'details' => trim($data['details']),
            'status' => 'commented',
            'date_commented' => now()->toDateString(),
        ]);

        $comment = DB::table('comments as c')
            ->join('users as u', 'u.user_id', '=', 'c.commented_by')
            ->leftJoin('quarters as q', 'q.quarter_id', '=', 'c.quarter_id')
            ->where('c.comment_id', $commentId)
            ->first([
                'c.comment_id',
                'c.quarter_id',
                'c.church_id',
                'c.department_id',
                'c.commented_by',
                'c.details',
                'c.status',
                'c.date_commented',
                DB::raw("
                    CONCAT_WS(' ',
                        NULLIF(u.first_name, ''),
                        NULLIF(u.middle_name, ''),
                        NULLIF(u.last_name, ''),
                        NULLIF(u.extension_name, '')
                    ) AS commenter_name
                "),
                'u.role as commenter_role',
                'q.quarter',
                'q.year',
            ]);

        return response()->json([
            'message' => 'Comment added successfully.',
            'data' => $comment,
        ], 201);
    }

    /* =========================================================
       GET COMMENTS BY QUARTER
    ========================================================= */

    public function comments(int $quarterId)
    {
        $comments = DB::table('comments as c')
            ->join('users as u', 'u.user_id', '=', 'c.commented_by')
            ->leftJoin('quarters as q', 'q.quarter_id', '=', 'c.quarter_id')
            ->where('c.quarter_id', $quarterId)
            ->orderByDesc('c.date_commented')
            ->orderByDesc('c.comment_id')
            ->get([
                'c.comment_id',
                'c.quarter_id',
                'c.church_id',
                'c.department_id',
                'c.commented_by',
                'c.details',
                'c.status',
                'c.date_commented',
                DB::raw("
                    CONCAT_WS(' ',
                        NULLIF(u.first_name, ''),
                        NULLIF(u.middle_name, ''),
                        NULLIF(u.last_name, ''),
                        NULLIF(u.extension_name, '')
                    ) AS commenter_name
                "),
                'u.role as commenter_role',
                'q.quarter',
                'q.year',
            ]);

        return response()->json([
            'data' => $comments,
        ]);
    }

    /* =========================================================
       PASTOR ENDORSE DEPARTMENT REPORT
    ========================================================= */

    public function endorseDepartmentReport(
        Request $request,
        int $churchId,
        int $departmentId
    ) {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'You must log in to endorse a report.',
            ], 401);
        }

        if (! $this->isPastorRole($this->normalizeRole($user->role ?? ''))) {
            return response()->json([
                'message' => 'Only the district pastor can endorse this report.',
            ], 403);
        }

        $data = $request->validate([
            'year' => ['required'],
            'quarter' => ['required', 'string'],
        ]);

        $quarterNumber = $this->getQuarterNumber($data['quarter']);

        if ($quarterNumber === null) {
            return response()->json([
                'message' => 'Invalid quarter.',
            ], 422);
        }

        $quarterIds = $this->departmentQuarterIds(
            $churchId,
            $departmentId,
            $data['year'],
            $quarterNumber
        );

        if ($quarterIds === []) {
            return response()->json([
                'message' => 'No report was found for this department and quarter.',
            ], 404);
        }

        $quarters = DB::table('quarters')
            ->whereIn('quarter_id', $quarterIds)
            ->get();

        if ($quarters->contains(
            fn ($quarter) => ! $this->isApproved($quarter->date_submitted)
        )) {
            return response()->json([
                'message' => 'The representative must submit all report data before endorsement.',
            ], 422);
        }

        if ($quarters->contains(fn ($quarter) => $this->isApproved($quarter->mission_approve))) {
            return response()->json([
                'message' => 'This report has already been approved.',
            ], 422);
        }

        if ($quarters->every(fn ($quarter) => $this->isApproved($quarter->district_endorse))) {
            return response()->json([
                'message' => 'This report has already been endorsed.',
            ], 422);
        }

        $today = now()->toDateString();

        DB::table('quarters')
            ->whereIn('quarter_id', $quarterIds)
            ->whereNull('date_submitted')
            ->update([
                'date_submitted' => $today,
            ]);

        DB::table('quarters')
            ->whereIn('quarter_id', $quarterIds)
            ->update([
                'district_endorse' => $today,
            ]);

        return response()->json([
            'message' => 'Report endorsed. The administrative assistant can now review it.',
        ]);
    }

    /* =========================================================
       ASSISTANT APPROVE DEPARTMENT REPORT
    ========================================================= */

    public function approveDepartmentReport(
        Request $request,
        int $churchId,
        int $departmentId
    ) {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'You must log in to approve a report.',
            ], 401);
        }

        if (! $this->isAssistantRole($this->normalizeRole($user->role ?? ''))) {
            return response()->json([
                'message' => 'Only the administrative assistant can approve this report.',
            ], 403);
        }

        $data = $request->validate([
            'year' => ['required'],
            'quarter' => ['required', 'string'],
        ]);

        $quarterNumber = $this->getQuarterNumber($data['quarter']);

        if ($quarterNumber === null) {
            return response()->json([
                'message' => 'Invalid quarter.',
            ], 422);
        }

        $quarterIds = $this->departmentQuarterIds(
            $churchId,
            $departmentId,
            $data['year'],
            $quarterNumber
        );

        if ($quarterIds === []) {
            return response()->json([
                'message' => 'No report was found for this department and quarter.',
            ], 404);
        }

        $quarters = DB::table('quarters')
            ->whereIn('quarter_id', $quarterIds)
            ->get();

        if ($quarters->contains(fn ($quarter) => ! $this->isApproved($quarter->district_endorse))) {
            return response()->json([
                'message' => 'The district pastor must endorse this report before it can be approved.',
            ], 422);
        }

        if ($quarters->every(fn ($quarter) => $this->isApproved($quarter->mission_approve))) {
            return response()->json([
                'message' => 'This report has already been approved.',
            ], 422);
        }

        DB::table('quarters')
            ->whereIn('quarter_id', $quarterIds)
            ->update([
                'mission_approve' => now()->toDateString(),
            ]);

        return response()->json([
            'message' => 'Report approved successfully.',
        ]);
    }

    /**
     * @return list<int>
     */
    private function departmentQuarterIds(
        int $churchId,
        int $departmentId,
        mixed $year,
        int $quarterNumber
    ): array {
        $programIds = DB::table('programs')
            ->where('department_id', $departmentId)
            ->whereNull('parent_id')
            ->pluck('program_id');

        if ($programIds->isEmpty()) {
            return [];
        }

        return DB::table('quarters')
            ->where('church_id', $churchId)
            ->whereIn('program_id', $programIds)
            ->where('year', (string) $year)
            ->get()
            ->filter(function ($quarter) use ($quarterNumber) {
                return $this->getQuarterNumber($quarter->quarter) === $quarterNumber;
            })
            ->pluck('quarter_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function normalizeRole(string $role): string
    {
        return strtolower(trim(str_replace(
            ['_', '-'],
            ' ',
            $role
        )));
    }

    private function isPastorRole(string $role): bool
    {
        return in_array($role, ['pastor', 'district pastor'], true);
    }

    private function isAssistantRole(string $role): bool
    {
        return in_array($role, [
            'assistant',
            'administrative assistant',
        ], true);
    }
}
