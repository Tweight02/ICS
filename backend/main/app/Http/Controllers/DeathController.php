<?php

namespace App\Http\Controllers;

use App\Models\Baptism;
use App\Models\Death;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class DeathController extends Controller
{
    /**
     * Display all death records.
     */
    public function index(Request $request)
    {
        $churchIds = $this->authorizedChurchIds($request);

        if ($churchIds === null) {
            return $this->forbiddenResponse();
        }

        $deaths = Death::with('baptism')
            ->whereHas('baptism', fn ($query) => $query->whereIn('church_id', $churchIds))
            ->orderBy('date_of_death', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $deaths,
        ]);
    }

    /**
     * Store a new death record.
     */
    public function store(Request $request)
    {
        try {

            $validated = $request->validate([
                'baptism_id' => [
                    'required',
                    'integer',
                    'exists:baptisms,baptism_id',
                ],

                'quarter' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'date_of_death' => [
                    'required',
                    'date',
                ],
            ]);

            $churchIds = $this->authorizedChurchIds($request);
            $baptism = Baptism::query()->find($validated['baptism_id']);

            if (
                $churchIds === null
                || ! $baptism
                || ! in_array((int) $baptism->church_id, $churchIds, true)
            ) {
                return $this->forbiddenResponse();
            }

            $death = Death::create([
                'baptism_id' => $validated['baptism_id'],
                'quarter' => $validated['quarter'],
                'date_of_death' => $validated['date_of_death'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Death record created successfully.',
                'data' => $death,
            ], 201);

        } catch (ValidationException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Throwable $e) {

            Log::error(
                'Death record save failed.',
                [
                    'error' => $e->getMessage(),
                    'data' => $request->all(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to save death record.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display one death record.
     */
    public function show(Request $request, string $id)
    {
        $death = Death::with('baptism')
            ->find($id);

        if (! $death) {

            return response()->json([
                'success' => false,
                'message' => 'Death record not found.',
            ], 404);
        }

        $churchIds = $this->authorizedChurchIds($request);

        if (
            $churchIds === null
            || ! in_array((int) $death->baptism->church_id, $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        return response()->json([
            'success' => true,
            'data' => $death,
        ]);
    }

    /**
     * Update a death record.
     */
    public function update(Request $request, string $id)
    {
        $death = Death::find($id);

        if (! $death) {

            return response()->json([
                'success' => false,
                'message' => 'Death record not found.',
            ], 404);
        }

        $validated = $request->validate([
            'baptism_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:baptisms,baptism_id',
            ],

            'quarter' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'date_of_death' => [
                'sometimes',
                'required',
                'date',
            ],
        ]);

        $churchIds = $this->authorizedChurchIds($request);
        $currentChurchId = $death->baptism()->value('church_id');

        if (
            $churchIds === null
            || $currentChurchId === null
            || ! in_array((int) $currentChurchId, $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        if (isset($validated['baptism_id'])) {
            $targetBaptism = Baptism::query()->find($validated['baptism_id']);

            if (
                ! $targetBaptism
                || ! in_array((int) $targetBaptism->church_id, $churchIds, true)
            ) {
                return $this->forbiddenResponse();
            }
        }

        $death->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Death record updated successfully.',
            'data' => $death,
        ]);
    }

    /**
     * Delete a death record.
     */
    public function destroy(Request $request, string $id)
    {
        $death = Death::find($id);

        if (! $death) {

            return response()->json([
                'success' => false,
                'message' => 'Death record not found.',
            ], 404);
        }

        $churchIds = $this->authorizedChurchIds($request);
        $churchId = $death->baptism()->value('church_id');

        if (
            $churchIds === null
            || $churchId === null
            || ! in_array((int) $churchId, $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        $death->delete();

        return response()->json([
            'success' => true,
            'message' => 'Death record deleted successfully.',
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
