<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ReportMonitoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private const PERSONAL_REPORT_DEPARTMENT_IDS = [16, 20, 22, 23];

    public function createReportTemplate(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'You must log in to create a report template.',
            ], 401);
        }

        if (! $this->isAssistantRole($this->normalizeRole($user->role ?? ''))) {
            return response()->json([
                'message' => 'Only the administrative assistant can create report templates.',
            ], 403);
        }

        $data = $request->validate([
            'department_id' => ['required', 'integer', 'exists:departments,department_id'],
            'program_name' => ['required', 'string', 'max:255'],
            'section_name' => ['required', 'string', 'max:255'],
            'particular_items' => ['required', 'array', 'min:1'],
            'particular_items.*' => ['required', 'string', 'max:255', 'distinct:ignore_case'],
        ]);

        if ($denied = $this->departmentAccessDenied(
            $request,
            (int) $data['department_id']
        )) {
            return $denied;
        }

        $normalizedItems = array_map(
            static fn (string $name) => mb_strtolower(trim($name)),
            $data['particular_items']
        );

        if (count(array_unique($normalizedItems)) !== count($normalizedItems)) {
            return response()->json([
                'message' => 'Each particular item must have a unique name.',
                'errors' => [
                    'particular_items' => ['Duplicate report item names are not allowed.'],
                ],
            ], 422);
        }

        $created = DB::transaction(function () use ($data) {
            $programId = DB::table('programs')->insertGetId([
                'department_id' => $data['department_id'],
                'program_name' => trim($data['program_name']),
                'parent_id' => null,
            ], 'program_id');

            $sectionId = DB::table('programs')->insertGetId([
                'department_id' => $data['department_id'],
                'program_name' => trim($data['section_name']),
                'parent_id' => $programId,
            ], 'program_id');

            $particulars = [];
            foreach ($data['particular_items'] as $name) {
                $particulars[] = [
                    'particular_id' => DB::table('particulars')->insertGetId([
                        'program_id' => $sectionId,
                        'particular_name' => trim($name),
                    ], 'particular_id'),
                    'particular_name' => trim($name),
                ];
            }

            $churchIds = DB::table('churches')
                ->whereNotNull('parent_id')
                ->pluck('church_id');
            $quarters = [];
            foreach ($churchIds as $churchId) {
                foreach (['Q1', 'Q2', 'Q3', 'Q4'] as $quarterName) {
                    $quarters[] = [
                        'program_id' => $programId,
                        'church_id' => $churchId,
                        'quarter' => $quarterName,
                        'year' => (string) now()->year,
                        'date_submitted' => null,
                        'district_endorse' => null,
                        'mission_approve' => null,
                    ];
                }
            }

            if ($quarters !== []) {
                DB::table('quarters')->insert($quarters);
            }

            return [
                'program_id' => $programId,
                'section_id' => $sectionId,
                'particulars' => $particulars,
                'quarters_created' => count($quarters),
            ];
        });

        return response()->json([
            'message' => 'Report template created successfully.',
            'data' => $created,
        ], 201);
    }

    /* =========================================================
       GET DEPARTMENTS
    ========================================================= */

    public function getDepartments(
        Request $request,
        $churchId,
        ReportMonitoringService $monitoring
    ) {
        $user = $request->user();

        $church = DB::table('churches')
            ->where('church_id', $churchId)
            ->first();

        if (! $church) {
            return response()->json([
                'message' => 'Church not found.',
            ], 404);
        }

        $departments = DB::table('departments')
            ->where(function ($query) use ($user) {
                if ($this->isRepresentativeRole($user)) {
                    $query->whereNotIn(
                        'department_id',
                        self::PERSONAL_REPORT_DEPARTMENT_IDS
                    );

                    return;
                }

                if ($this->isPastorRole(
                    $this->normalizeRole((string) ($user->role ?? ''))
                )) {
                    return;
                }

                $query->where('department_id', $user->department_id);

                if ($this->isDirectorOrAssistant($user)) {
                    $query->orWhereIn(
                        'department_id',
                        self::PERSONAL_REPORT_DEPARTMENT_IDS
                    );
                }
            })
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

    public function departmentReport(
        Request $request,
        $churchId,
        $departmentId
    ) {
        if ($denied = $this->departmentAccessDenied(
            $request,
            (int) $departmentId
        )) {
            return $denied;
        }

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
                    $supportsMonthlyValues = $this->supportsMonthlyStewardshipValues(
                        (int) $departmentId,
                        (string) $section->program_name,
                        (string) $particular->particular_name
                    );
                    $particularQuarters = $quarters->map(
                        function ($quarter) use ($particular, $supportsMonthlyValues) {
                            $savedItem = DB::table('particular_items')
                                ->where('particular_id', $particular->particular_id)
                                ->where('quarter_id', $quarter->quarter_id)
                                ->first();
                            $quarterData = [
                                'quarter_id' => (int) $quarter->quarter_id,
                                'quarter' => $quarter->quarter,
                                'year' => $quarter->year,
                                'date_submitted' => $quarter->date_submitted,
                                'district_endorse' => $quarter->district_endorse,
                                'mission_approve' => $quarter->mission_approve,
                                'value' => $savedItem ? $savedItem->value : null,
                            ];

                            if ($supportsMonthlyValues) {
                                $quarterData['monthly_values'] = [];

                                if ($savedItem) {
                                    $quarterData['monthly_values'] = DB::table('stewardships')
                                        ->where('item_id', $savedItem->item_id)
                                        ->pluck('value', 'month')
                                        ->all();
                                }
                            }

                            return $quarterData;
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
        if ($denied = $this->departmentAccessDenied(
            $request,
            (int) $departmentId
        )) {
            return $denied;
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.particular_id' => ['required', 'integer'],
            'items.*.quarter_id' => ['required', 'integer'],
            'items.*.value' => ['nullable', 'numeric', 'min:0'],
            'items.*.monthly_values' => ['sometimes', 'array'],
            'items.*.monthly_values.*' => ['nullable', 'numeric', 'min:0'],
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
                        'p.particular_name',
                        'section.program_id as section_program_id',
                        'section.program_name as section_name',
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

                $monthlyValues = $item['monthly_values'] ?? null;

                if ($monthlyValues !== null) {
                    if (! $this->supportsMonthlyStewardshipValues(
                        (int) $departmentId,
                        (string) $particular->section_name,
                        (string) $particular->particular_name
                    )) {
                        throw new \Exception(
                            'Monthly values are only supported for Stewardship offering and tithe reports.'
                        );
                    }

                    $quarterNumber = $this->getQuarterNumber($quarter->quarter);

                    if ($quarterNumber === null) {
                        throw new \Exception('Invalid quarter for monthly report values.');
                    }

                    $firstMonth = (($quarterNumber - 1) * 3) + 1;
                    $monthNames = collect(range($firstMonth, $firstMonth + 2))
                        ->map(fn (int $month) => now()
                            ->setDate((int) $quarter->year, $month, 1)
                            ->format('F'))
                        ->all();
                    $invalidMonths = array_diff(array_keys($monthlyValues), $monthNames);

                    if ($invalidMonths !== []) {
                        throw new \Exception(
                            'Monthly values must match the selected reporting quarter.'
                        );
                    }

                    $monthlyValues = array_replace(
                        array_fill_keys($monthNames, null),
                        $monthlyValues
                    );

                    if ($submitted) {
                        $monthlyValues = array_map(
                            fn ($value) => $value ?? 0,
                            $monthlyValues
                        );
                    }

                    $item['value'] = count(array_filter(
                        $monthlyValues,
                        fn ($value) => $value !== null
                    )) > 0
                        ? array_sum(array_map(
                            fn ($value) => $value ?? 0,
                            $monthlyValues
                        ))
                        : null;
                }

                $existing = DB::table('particular_items')
                    ->where('particular_id', $item['particular_id'])
                    ->where('quarter_id', $item['quarter_id'])
                    ->first();

                if ($existing) {
                    $itemId = $existing->item_id;
                    DB::table('particular_items')
                        ->where('item_id', $existing->item_id)
                        ->update([
                            'value' => $submitted && $item['value'] === null
                                ? 0
                                : $item['value'],
                        ]);
                } else {
                    $itemId = DB::table('particular_items')->insertGetId([
                        'particular_id' => $item['particular_id'],
                        'quarter_id' => $item['quarter_id'],
                        'value' => $submitted && $item['value'] === null
                            ? 0
                            : $item['value'],
                    ]);
                }

                if ($monthlyValues !== null) {
                    DB::table('stewardships')
                        ->where('item_id', $itemId)
                        ->whereIn('month', $monthNames)
                        ->delete();

                    foreach ($monthlyValues as $month => $value) {
                        DB::table('stewardships')->insert([
                            'item_id' => $itemId,
                            'type' => str_contains(
                                strtolower($particular->particular_name),
                                'tithe'
                            ) ? 'tithes' : 'offering',
                            'month' => $month,
                            'value' => $value,
                        ]);
                    }
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

    private function supportsMonthlyStewardshipValues(
        int $departmentId,
        string $sectionName,
        string $particularName
    ): bool {
        $sectionName = strtolower($sectionName);
        $particularName = strtolower($particularName);

        return $departmentId === 14
            && (str_contains($sectionName, 'offering') || str_contains($sectionName, 'tithe'))
            && (str_contains($particularName, 'offering') || str_contains($particularName, 'tithe'));
    }

    private function isApproved($value): bool
    {
        return $value !== null && trim((string) $value) !== '';
    }

    /* =========================================================
       GET DEPARTMENT COMMENTS
    ========================================================= */

    public function departmentComments(
        Request $request,
        int $churchId,
        int $departmentId
    ) {
        if (
            ! $this->pastorPersonalCommentAccess($request, $churchId, $departmentId) &&
            ($denied = $this->departmentAccessDenied($request, $departmentId))
        ) {
            return $denied;
        }

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
            'representative',
        ];

        if (! in_array($role, $allowedRoles, true)) {
            return response()->json([
                'message' => 'You are not authorized to add comments.',
            ], 403);
        }

        $data = $request->validate([
            'quarter_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:quarters,quarter_id',
            ],
            'year' => [
                'required_without:quarter_id',
                'integer',
                'min:2000',
                'max:2100',
            ],
            'quarter' => [
                'required_without:quarter_id',
                'string',
                'in:Q1,Q2,Q3,Q4',
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

        $pastorPersonalCommentAccess = $this->pastorPersonalCommentAccess(
            $request,
            (int) $data['church_id'],
            (int) $data['department_id']
        );

        if (
            ! $pastorPersonalCommentAccess &&
            ($denied = $this->departmentAccessDenied(
                $request,
                (int) $data['department_id']
            ))
        ) {
            return $denied;
        }

        if (empty($data['quarter_id'])) {
            if (! in_array((int) $data['department_id'], [22, 23], true)) {
                return response()->json([
                    'message' => 'A report quarter is required to add this comment.',
                ], 422);
            }

            $programId = DB::table('programs')
                ->where('department_id', $data['department_id'])
                ->whereNull('parent_id')
                ->orderBy('program_id')
                ->value('program_id');

            if (! $programId) {
                return response()->json([
                    'message' => 'No report program is available for this department.',
                ], 422);
            }

            $quarter = DB::table('quarters')
                ->where('church_id', $data['church_id'])
                ->where('program_id', $programId)
                ->where('year', (string) $data['year'])
                ->where('quarter', $data['quarter'])
                ->first();

            if (! $quarter) {
                $data['quarter_id'] = DB::table('quarters')->insertGetId([
                    'church_id' => $data['church_id'],
                    'program_id' => $programId,
                    'year' => (string) $data['year'],
                    'quarter' => $data['quarter'],
                    'date_submitted' => null,
                    'district_endorse' => null,
                    'mission_approve' => null,
                ]);
            } else {
                $data['quarter_id'] = (int) $quarter->quarter_id;
            }
        }

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

        if (
            $role === 'representative'
            && ! DB::table('comments')
                ->where('church_id', $data['church_id'])
                ->where('department_id', $data['department_id'])
                ->where('quarter_id', $data['quarter_id'])
                ->exists()
        ) {
            return response()->json([
                'message' => 'You can only reply to an existing conversation.',
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

    public function comments(Request $request, int $quarterId)
    {
        $departmentId = DB::table('quarters as q')
            ->join('programs as p', 'p.program_id', '=', 'q.program_id')
            ->where('q.quarter_id', $quarterId)
            ->value('p.department_id');

        if ($departmentId === null) {
            return response()->json([
                'message' => 'Quarter not found.',
            ], 404);
        }

        if ($denied = $this->departmentAccessDenied($request, (int) $departmentId)) {
            return $denied;
        }

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

        if ($denied = $this->departmentAccessDenied($request, $departmentId)) {
            return $denied;
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

        if ($denied = $this->departmentAccessDenied($request, $departmentId)) {
            return $denied;
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

        $programCount = DB::table('programs')
            ->where('department_id', $departmentId)
            ->whereNull('parent_id')
            ->count();

        for ($previousQuarterNumber = 1; $previousQuarterNumber < $quarterNumber; $previousQuarterNumber++) {
            $previousQuarterIds = $this->departmentQuarterIds(
                $churchId,
                $departmentId,
                $data['year'],
                $previousQuarterNumber
            );

            if (
                count($previousQuarterIds) !== $programCount ||
                DB::table('quarters')
                    ->whereIn('quarter_id', $previousQuarterIds)
                    ->whereNull('mission_approve')
                    ->exists()
            ) {
                return response()->json([
                    'message' => 'All previous quarters must be approved before this report can be approved.',
                ], 422);
            }
        }

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

    private function departmentAccessDenied(
        Request $request,
        int $departmentId
    ): ?JsonResponse {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'You must log in to access reports.',
            ], 401);
        }

        if ($this->isRepresentativeRole($user)) {
            if (in_array($departmentId, self::PERSONAL_REPORT_DEPARTMENT_IDS, true)) {
                return response()->json([
                    'message' => 'Representatives cannot access pastor personal report departments.',
                ], 403);
            }

            return null;
        }

        if ($this->isPastorRole(
            $this->normalizeRole((string) ($user->role ?? ''))
        )) {
            if (in_array($departmentId, [22, 23], true)) {
                return response()->json([
                    'message' => 'Baptism and death records must be accessed through the personal records page.',
                ], 403);
            }

            return null;
        }

        if ((int) $user->department_id === $departmentId) {
            return null;
        }

        if (
            $this->isDirectorOrAssistant($user)
            && in_array($departmentId, self::PERSONAL_REPORT_DEPARTMENT_IDS, true)
        ) {
            return null;
        }

        return response()->json([
            'message' => 'You can only access reports for your own department.',
        ], 403);
    }

    private function isDirectorOrAssistant(User $user): bool
    {
        $role = $this->normalizeRole((string) ($user->role ?? ''));

        return $role === 'director' || $this->isAssistantRole($role);
    }

    private function pastorPersonalCommentAccess(
        Request $request,
        int $churchId,
        int $departmentId
    ): bool {
        $user = $request->user();

        if (
            ! $user ||
            ! $this->isPastorRole($this->normalizeRole((string) ($user->role ?? ''))) ||
            ! in_array($departmentId, [22, 23], true)
        ) {
            return false;
        }

        $assignedChurch = DB::table('churches')
            ->where('church_id', $user->church_id)
            ->first(['church_id', 'parent_id']);

        if (! $assignedChurch) {
            return false;
        }

        $districtId = $assignedChurch->parent_id ?? $assignedChurch->church_id;

        return DB::table('churches')
            ->where('church_id', $churchId)
            ->where('parent_id', $districtId)
            ->exists();
    }

    private function isRepresentativeRole(User $user): bool
    {
        return $this->normalizeRole((string) ($user->role ?? '')) === 'representative';
    }
}
