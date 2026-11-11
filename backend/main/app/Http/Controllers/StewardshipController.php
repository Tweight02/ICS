<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StewardshipController extends Controller
{
    private const DEPARTMENT_ID = 14;

    private const PROGRAM_NAME = 'Stewardship Quarterly Report';

    private const MONTH_NAMES = [
        1 => 'January',
        2 => 'February',
        3 => 'March',
        4 => 'April',
        5 => 'May',
        6 => 'June',
        7 => 'July',
        8 => 'August',
        9 => 'September',
        10 => 'October',
        11 => 'November',
        12 => 'December',
    ];

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRepresentative($user);

        $period = $request->validate([
            'year' => ['required', 'integer', 'between:'.(now()->year - 2).','.now()->year],
            'quarter' => ['required', 'integer', 'between:0,4'],
        ]);

        $church = DB::table('churches')
            ->where('church_id', $user->church_id)
            ->first();

        if (! $church) {
            return response()->json(['message' => 'Your assigned church could not be found.'], 404);
        }

        $program = $this->program();

        if (! $program) {
            return response()->json(['message' => 'The stewardship report template could not be found.'], 404);
        }

        $particulars = $this->particulars((int) $program->program_id);

        if ($particulars->isEmpty()) {
            return response()->json(['message' => 'The stewardship report template has no particulars.'], 404);
        }

        $base = [
            'church' => [
                'church_id' => (int) $church->church_id,
                'name' => $church->name,
                'district' => $church->parent_id
                    ? DB::table('churches')->where('church_id', $church->parent_id)->value('name')
                    : null,
            ],
            'year' => (int) $period['year'],
            'particulars' => $particulars->map(fn ($particular) => [
                'particular_id' => (int) $particular->particular_id,
                'particular_name' => $particular->particular_name,
            ])->values(),
        ];

        if ((int) $period['quarter'] === 0) {
            $reports = [];

            foreach (range(1, 4) as $quarter) {
                $record = $this->quarterRecord(
                    (int) $church->church_id,
                    (int) $program->program_id,
                    (int) $period['year'],
                    $quarter
                );
                $reports[$quarter] = $this->reportData($record, $particulars, $quarter);
            }

            return response()->json($base + ['reports' => $reports]);
        }

        $quarter = (int) $period['quarter'];
        $record = $this->quarterRecord(
            (int) $church->church_id,
            (int) $program->program_id,
            (int) $period['year'],
            $quarter
        );

        return response()->json($base + [
            'quarter' => $quarter,
            'report' => $this->reportData($record, $particulars, $quarter),
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        return $this->persist($request, false);
    }

    public function submit(Request $request): JsonResponse
    {
        return $this->persist($request, true);
    }

    public function reopen(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRepresentative($user);

        $period = $request->validate([
            'year' => ['required', 'integer', 'between:'.(now()->year - 2).','.now()->year],
            'quarter' => ['required', 'integer', 'between:1,4'],
        ]);

        $program = $this->program();

        if (! $program) {
            return response()->json(['message' => 'The stewardship report template could not be found.'], 404);
        }

        return DB::transaction(function () use ($user, $program, $period) {
            $quarter = DB::table('quarters')
                ->where('church_id', $user->church_id)
                ->where('program_id', $program->program_id)
                ->where('year', (string) $period['year'])
                ->where('quarter', 'Q'.$period['quarter'])
                ->lockForUpdate()
                ->first();

            if (! $quarter || ! $quarter->date_submitted) {
                abort(409, 'Only a submitted report can be reopened.');
            }

            if ($quarter->district_endorse || $quarter->mission_approve) {
                abort(409, 'This report can no longer be reopened after it has been endorsed.');
            }

            DB::table('quarters')
                ->where('quarter_id', $quarter->quarter_id)
                ->update(['date_submitted' => null]);

            return response()->json(['message' => 'Report reopened.', 'status' => 'Draft']);
        });
    }

    private function persist(Request $request, bool $submit): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRepresentative($user);

        $period = $request->validate([
            'year' => ['required', 'integer', 'between:'.(now()->year - 2).','.now()->year],
            'quarter' => ['required', 'integer', 'between:1,4'],
        ]);

        $program = $this->program();

        if (! $program) {
            return response()->json(['message' => 'The stewardship report template could not be found.'], 404);
        }

        $particulars = $this->particulars((int) $program->program_id);

        if ($particulars->isEmpty()) {
            return response()->json(['message' => 'The stewardship report template has no particulars.'], 404);
        }

        $singleIds = $particulars
            ->reject(fn ($particular) => $this->isMonthly($particular->particular_name))
            ->pluck('particular_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $monthlyIds = $particulars
            ->filter(fn ($particular) => $this->isMonthly($particular->particular_name))
            ->pluck('particular_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $validated = $request->validate([
            'values' => ['required', 'array', 'size:'.count($singleIds)],
            'values.*.particular_id' => ['required', 'integer', 'distinct', Rule::in($singleIds)],
            'values.*.value' => ['nullable', 'integer', 'min:0'],
            'monthly' => ['required', 'array', 'size:'.count($monthlyIds)],
            'monthly.*.particular_id' => ['required', 'integer', 'distinct', Rule::in($monthlyIds)],
            'monthly.*.values' => ['required', 'array', 'size:3'],
            'monthly.*.values.*' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
        ]);

        $church = DB::table('churches')
            ->where('church_id', $user->church_id)
            ->first();

        if (! $church) {
            return response()->json(['message' => 'Your assigned church could not be found.'], 404);
        }

        return DB::transaction(function () use ($user, $program, $period, $validated, $particulars, $submit) {
            $church = DB::table('churches')
                ->where('church_id', $user->church_id)
                ->lockForUpdate()
                ->first();

            if (! $church) {
                abort(404, 'Your assigned church could not be found.');
            }

            $quarter = $this->findOrCreateQuarter(
                (int) $user->church_id,
                (int) $program->program_id,
                (int) $period['year'],
                (int) $period['quarter']
            );

            if ($quarter->district_endorse || $quarter->mission_approve) {
                abort(409, 'This report can no longer be edited after it has been endorsed.');
            }

            if ($quarter->date_submitted && ! $submit) {
                abort(409, 'Reopen this report before editing it.');
            }

            foreach ($validated['values'] as $item) {
                $this->saveParticularValue(
                    (int) $item['particular_id'],
                    (int) $quarter->quarter_id,
                    $item['value'] ?? ($submit ? 0 : null)
                );
            }

            foreach ($validated['monthly'] as $item) {
                $particular = $particulars->firstWhere('particular_id', (int) $item['particular_id']);
                $itemId = $this->saveParticularValue(
                    (int) $item['particular_id'],
                    (int) $quarter->quarter_id,
                    null
                );
                $startMonth = (((int) $period['quarter']) - 1) * 3 + 1;

                foreach (array_values($item['values']) as $index => $value) {
                    $month = self::MONTH_NAMES[$startMonth + $index];
                    $existing = DB::table('stewardships')
                        ->where('item_id', $itemId)
                        ->where('month', $month)
                        ->first();

                    $attributes = [
                        'value' => $value ?? ($submit ? 0 : null),
                    ];

                    if ($existing) {
                        DB::table('stewardships')
                            ->where('stewardship_id', $existing->stewardship_id)
                            ->update($attributes);
                    } else {
                        DB::table('stewardships')->insert($attributes + [
                            'item_id' => $itemId,
                            'type' => $particular->particular_name,
                            'month' => $month,
                        ]);
                    }
                }
            }

            if ($submit) {
                DB::table('quarters')
                    ->where('quarter_id', $quarter->quarter_id)
                    ->update(['date_submitted' => now()->toDateString()]);
            }

            return response()->json([
                'message' => $submit ? 'Report submitted.' : 'Report saved.',
                'status' => $submit ? 'Submitted' : 'Draft',
                'dateSubmitted' => $submit ? now()->toDateString() : null,
            ]);
        });
    }

    private function authorizeRepresentative($user): void
    {
        if (! $user || $this->normalizeRole((string) $user->role) !== 'representative') {
            abort(403, 'Only church representatives can access this stewardship report.');
        }

        if (! $user->church_id) {
            abort(403, 'Your account is not assigned to a church.');
        }
    }

    private function program(): ?object
    {
        return DB::table('programs')
            ->where('department_id', self::DEPARTMENT_ID)
            ->whereNull('parent_id')
            ->where('program_name', self::PROGRAM_NAME)
            ->first();
    }

    private function particulars(int $programId)
    {
        return DB::table('particulars as p')
            ->join('programs as section', 'section.program_id', '=', 'p.program_id')
            ->where('section.parent_id', $programId)
            ->orderBy('p.particular_id')
            ->get(['p.particular_id', 'p.particular_name']);
    }

    private function quarterRecord(int $churchId, int $programId, int $year, int $quarter): ?object
    {
        return DB::table('quarters')
            ->where('church_id', $churchId)
            ->where('program_id', $programId)
            ->where('year', (string) $year)
            ->where('quarter', 'Q'.$quarter)
            ->first();
    }

    private function reportData(?object $quarter, $particulars, int $quarterNumber): array
    {
        $values = [];
        $monthly = [];

        foreach ($particulars as $particular) {
            $id = (int) $particular->particular_id;

            if ($this->isMonthly($particular->particular_name)) {
                $monthly[$id] = [null, null, null];
            } else {
                $values[$id] = null;
            }
        }

        if ($quarter) {
            $items = DB::table('particular_items')
                ->where('quarter_id', $quarter->quarter_id)
                ->orderBy('item_id')
                ->get();

            foreach ($items as $item) {
                if (array_key_exists((int) $item->particular_id, $values)) {
                    $values[(int) $item->particular_id] = $item->value === null
                        ? null
                        : (int) $item->value;
                }
            }

            if ($monthly !== []) {
                $startMonth = (($quarterNumber - 1) * 3) + 1;
                $monthlyRows = DB::table('stewardships as s')
                    ->join('particular_items as i', 'i.item_id', '=', 's.item_id')
                    ->where('i.quarter_id', $quarter->quarter_id)
                    ->whereIn('i.particular_id', array_keys($monthly))
                    ->orderBy('s.stewardship_id')
                    ->get(['i.particular_id', 's.month', 's.value']);

                foreach ($monthlyRows as $row) {
                    $particularId = (int) $row->particular_id;
                    if (! array_key_exists($particularId, $monthly)) {
                        continue;
                    }

                    foreach (range(0, 2) as $index) {
                        if ($row->month === self::MONTH_NAMES[$startMonth + $index]) {
                            $monthly[$particularId][$index] = $row->value === null
                                ? null
                                : (float) $row->value;
                            break;
                        }
                    }
                }
            }
        }

        return [
            'status' => $quarter?->mission_approve
                ? 'Approved'
                : ($quarter?->district_endorse
                    ? 'Endorsed'
                    : ($quarter?->date_submitted ? 'Submitted' : 'Draft')),
            'dateSubmitted' => $quarter?->date_submitted,
            'values' => $values,
            'monthly' => $monthly,
        ];
    }

    private function findOrCreateQuarter(int $churchId, int $programId, int $year, int $quarterNumber): object
    {
        $quarter = $this->quarterRecord($churchId, $programId, $year, $quarterNumber);

        if ($quarter) {
            return DB::table('quarters')
                ->where('quarter_id', $quarter->quarter_id)
                ->lockForUpdate()
                ->first();
        }

        $id = DB::table('quarters')->insertGetId([
            'program_id' => $programId,
            'church_id' => $churchId,
            'quarter' => 'Q'.$quarterNumber,
            'year' => (string) $year,
            'date_submitted' => null,
            'district_endorse' => null,
            'mission_approve' => null,
        ], 'quarter_id');

        return DB::table('quarters')->where('quarter_id', $id)->first();
    }

    private function saveParticularValue(int $particularId, int $quarterId, ?int $value): int
    {
        $item = DB::table('particular_items')
            ->where('particular_id', $particularId)
            ->where('quarter_id', $quarterId)
            ->orderBy('item_id')
            ->first();

        if ($item) {
            DB::table('particular_items')
                ->where('item_id', $item->item_id)
                ->update(['value' => $value]);

            return (int) $item->item_id;
        }

        return (int) DB::table('particular_items')->insertGetId([
            'particular_id' => $particularId,
            'quarter_id' => $quarterId,
            'value' => $value,
        ], 'item_id');
    }

    private function isMonthly(string $name): bool
    {
        return in_array(mb_strtolower(trim($name)), ['offering', 'tithes'], true);
    }

    private function normalizeRole(string $role): string
    {
        return strtolower(trim(str_replace(['_', '-'], ' ', $role)));
    }
}
