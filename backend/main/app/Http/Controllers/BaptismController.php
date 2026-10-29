<?php

namespace App\Http\Controllers;

use App\Models\Baptism;
use App\Models\Church;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BaptismController extends Controller
{
    /**
     * Display all baptism records.
     */
    public function index(Request $request)
    {
        $churchIds = $this->authorizedChurchIds($request);

        if ($churchIds === null) {
            return $this->forbiddenResponse();
        }

        $baptisms = Baptism::whereIn('church_id', $churchIds)
            ->orderBy('date_of_baptism', 'desc')
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
     * @return list<int>|null
     */
    private function authorizedChurchIds(Request $request): ?array
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

        if (
            in_array($role, ['assistant', 'administrative assistant', 'director'], true)
            && (int) $user->department_id !== 16
        ) {
            return null;
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
