<?php

namespace App\Http\Controllers;

use App\Models\Baptism;
use App\Models\Church;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BaptismController extends Controller
{
    /**
     * Display all baptism records.
     */
    public function index(Request $request)
    {
        $churchIds = $this->authorizedChurchIds($request, true);

        if ($churchIds === null) {
            return $this->forbiddenResponse();
        }

        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'min:1900', 'max:'.now()->year],
            'quarter' => ['sometimes', 'in:Q1,Q2,Q3,Q4'],
        ]);

        $baptisms = Baptism::query()
            ->join('churches', 'churches.church_id', '=', 'baptisms.church_id')
            ->whereIn('baptisms.church_id', $churchIds)
            ->whereNotNull('date_of_baptism')
            ->when(
                isset($validated['year']),
                fn ($query) => $query->whereYear('baptisms.date_of_baptism', $validated['year'])
            )
            ->when(
                isset($validated['quarter']),
                fn ($query) => $query->whereRaw(
                    'UPPER(TRIM(baptisms.quarter)) = ?',
                    [$validated['quarter']]
                )
            )
            ->select('baptisms.*', 'churches.name as church_name')
            ->orderByDesc('baptisms.date_of_baptism')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $baptisms,
        ]);
    }

    /**
     * Display all churches.
     */
    public function allChurches()
    {
        $churches = Church::select(
            'church_id',
            'name',
            'address',
            'parent_id'
        )
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $churches,
        ]);
    }

    /**
     * Store a newly created baptism record.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'church_id' => [
                'required',
                'integer',
                'exists:churches,church_id',
            ],

            'quarter' => [
                'required',
                'string',
                'max:255',
            ],

            'first_name' => [
                'required',
                'string',
                'max:255',
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'last_name' => [
                'required',
                'string',
                'max:255',
            ],

            'extension_name' => [
                'nullable',
                'string',
                'max:50',
            ],

            'birthdate' => [
                'required',
                'date',
            ],

            'gender' => [
                'required',
                'string',
                'max:20',
            ],

            'address' => [
                'required',
                'string',
                'max:255',
            ],

            'officiating_minister' => [
                'required',
                'string',
                'max:255',
            ],

            'place_of_baptism' => [
                'required',
                'string',
                'max:255',
            ],

            'date_of_baptism' => [
                'required',
                'date',
            ],

            'marital_status' => [
                'required',
                'string',
                'max:50',
            ],

            'is_reclaimed' => [
                'required',
                'boolean',
            ],
        ]);

        $churchIds = $this->authorizedChurchIds($request);

        if (
            $churchIds === null
            || ! in_array((int) $validated['church_id'], $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        // Prevent duplicate baptism records based on first, middle, and last name.
        $this->ensureUniqueMemberName($validated);

        $baptism = Baptism::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Baptism record created successfully.',
            'data' => $baptism,
        ], 201);
    }

    /**
     * Display the specified baptism record.
     */
    public function show(Request $request, string $id)
    {
        $baptism = Baptism::find($id);

        if (! $baptism) {
            return response()->json([
                'success' => false,
                'message' => 'Baptism record not found.',
            ], 404);
        }

        $churchIds = $this->authorizedChurchIds($request);

        if (
            $churchIds === null
            || ! in_array((int) $baptism->church_id, $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        return response()->json([
            'success' => true,
            'data' => $baptism,
        ]);
    }

    /**
     * Update the specified baptism record.
     */
    public function update(Request $request, string $id)
    {
        $baptism = Baptism::find($id);

        if (! $baptism) {
            return response()->json([
                'success' => false,
                'message' => 'Baptism record not found.',
            ], 404);
        }

        $churchIds = $this->authorizedChurchIds($request);

        if (
            $churchIds === null
            || ! in_array((int) $baptism->church_id, $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        $validated = $request->validate([
            'church_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:churches,church_id',
            ],

            'quarter' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'first_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'last_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'extension_name' => [
                'nullable',
                'string',
                'max:50',
            ],

            'birthdate' => [
                'sometimes',
                'required',
                'date',
            ],

            'gender' => [
                'sometimes',
                'required',
                'string',
                'max:20',
            ],

            'address' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'officiating_minister' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'place_of_baptism' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'date_of_baptism' => [
                'sometimes',
                'required',
                'date',
            ],

            'marital_status' => [
                'sometimes',
                'required',
                'string',
                'max:50',
            ],

            'is_reclaimed' => [
                'sometimes',
                'required',
                'boolean',
            ],
        ]);

        if (
            isset($validated['church_id'])
            && ! in_array((int) $validated['church_id'], $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        // Check duplicates when any of the member's name fields are changed.
        // Exclude the current record so a record can still be edited without
        // being treated as a duplicate of itself.
        $nameFields = ['first_name', 'middle_name', 'last_name'];

        if (count(array_intersect($nameFields, array_keys($validated))) > 0) {
            $duplicateCheckData = [
                'first_name' => array_key_exists('first_name', $validated)
                    ? $validated['first_name']
                    : $baptism->first_name,

                'middle_name' => array_key_exists('middle_name', $validated)
                    ? $validated['middle_name']
                    : $baptism->middle_name,

                'last_name' => array_key_exists('last_name', $validated)
                    ? $validated['last_name']
                    : $baptism->last_name,
            ];

            $this->ensureUniqueMemberName(
                $duplicateCheckData,
                (int) $baptism->baptism_id
            );
        }

        $baptism->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Baptism record updated successfully.',
            'data' => $baptism,
        ]);
    }

    /**
     * Delete the specified baptism record.
     */
    public function destroy(Request $request, string $id)
    {
        $baptism = Baptism::find($id);

        if (! $baptism) {
            return response()->json([
                'success' => false,
                'message' => 'Baptism record not found.',
            ], 404);
        }

        $churchIds = $this->authorizedChurchIds($request);

        if (
            $churchIds === null
            || ! in_array((int) $baptism->church_id, $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        $baptism->delete();

        return response()->json([
            'success' => true,
            'message' => 'Baptism record deleted successfully.',
        ]);
    }

    /**
     * Ensure no other baptism record has the same first, middle, and last name.
     * Name comparison ignores letter casing and leading/trailing spaces.
     * A null or empty middle name is treated as the same value.
     *
     * @param array<string, mixed> $data
     */
    private function ensureUniqueMemberName(array $data, ?int $ignoreBaptismId = null): void
    {
        $firstName = mb_strtolower(trim((string) ($data['first_name'] ?? '')));
        $middleName = mb_strtolower(trim((string) ($data['middle_name'] ?? '')));
        $lastName = mb_strtolower(trim((string) ($data['last_name'] ?? '')));

        $duplicateQuery = Baptism::query()
            ->whereRaw('LOWER(TRIM(first_name)) = ?', [$firstName])
            ->whereRaw(
                "LOWER(TRIM(COALESCE(middle_name, ''))) = ?",
                [$middleName]
            )
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [$lastName]);

        if ($ignoreBaptismId !== null) {
            $duplicateQuery->where('baptism_id', '!=', $ignoreBaptismId);
        }

        if ($duplicateQuery->exists()) {
            throw ValidationException::withMessages([
                'first_name' => [
                    'A baptism record with the same first name, middle name, and last name already exists. This member cannot be added again.',
                ],
            ]);
        }
    }

    /**
     * @return list<int>|null
     */
    private function authorizedChurchIds(Request $request, bool $allowDistrictSelection = false): ?array
    {
        $user = $request->user();

        $role = strtolower(trim(str_replace(
            ['_', '-'],
            ' ',
            (string) ($user->role ?? '')
        )));

        if (! $user || ! in_array($role, [
            'pastor',
            'district pastor',
            'director',
            'assistant',
            'administrative assistant',
            'head assistant',
            'head director',
        ], true)) {
            return null;
        }

        $isGlobalAssistant = in_array($role, ['assistant', 'administrative assistant'], true)
            && $user->department_id === null;

        $isReadOnlyDirector = $role === 'director' && $request->isMethod('GET');

        if (
            in_array($role, ['assistant', 'administrative assistant', 'director'], true)
            && (int) $user->department_id !== 16
            && ! $isGlobalAssistant
            && ! $isReadOnlyDirector
        ) {
            return null;
        }

        if (
            $allowDistrictSelection &&
            (
                in_array($role, ['head assistant', 'head director'], true) ||
                $isGlobalAssistant ||
                $isReadOnlyDirector ||
                (
                    in_array($role, ['assistant', 'administrative assistant', 'director'], true)
                    && (int) $user->department_id === 16
                )
            ) &&
            $request->filled('district_id')
        ) {
            $districtId = (int) $request->query('district_id');

            $isDistrict = Church::query()
                ->where('church_id', $districtId)
                ->whereNull('parent_id')
                ->exists();

            if (! $isDistrict) {
                return null;
            }

            return Church::query()
                ->where('church_id', $districtId)
                ->orWhere('parent_id', $districtId)
                ->pluck('church_id')
                ->map(fn ($churchId) => (int) $churchId)
                ->all();
        }

        if ($isReadOnlyDirector) {
            return Church::query()
                ->pluck('church_id')
                ->map(fn ($churchId) => (int) $churchId)
                ->all();
        }

        $assignedChurch = DB::table('churches')
            ->where('church_id', $user->church_id)
            ->first(['church_id', 'parent_id']);

        if (! $assignedChurch) {
            return [];
        }

        $districtId = (int) ($assignedChurch->parent_id ?? $assignedChurch->church_id);

        return DB::table('churches')
            ->where('church_id', $districtId)
            ->orWhere('parent_id', $districtId)
            ->pluck('church_id')
            ->map(fn ($churchId) => (int) $churchId)
            ->all();
    }

    private function forbiddenResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to access personal reports for this district.',
        ], 403);
    }
}