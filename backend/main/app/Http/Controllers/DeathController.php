<?php

namespace App\Http\Controllers;

use App\Models\Baptism;
use App\Models\Death;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class DeathController extends Controller
{
    /**
     * Display all death records belonging to the
     * authorized church or district.
     *
     * Includes manually entered death records because
     * they are also linked to a baptism row.
     */
    public function index(Request $request)
    {
        $churchIds = $this->authorizedChurchIds($request, true);

        if ($churchIds === null) {
            return $this->forbiddenResponse();
        }

        $deaths = Death::with('baptism')
            ->whereHas('baptism', function ($query) use ($churchIds) {
                $query->whereIn('church_id', $churchIds);
            })
            ->orderBy('date_of_death', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $deaths,
        ]);
    }

    /**
     * Store a new death record.
     *
     * EXISTING BAPTISM:
     * Uses the existing baptism_id.
     *
     * NEW DEATH RECORD:
     * Creates a Baptism row with date_of_baptism = NULL,
     * then creates the Death row using its generated ID.
     *
     * No additional columns are required in deaths.
     */
    public function store(Request $request)
    {
        try {

            $isManual = ! $request->filled('baptism_id');

            $rules = [
                'baptism_id' => [
                    'nullable',
                    'integer',
                    'exists:baptisms,baptism_id',
                ],

                'quarter' => [
                    'required',
                    'in:Q1,Q2,Q3,Q4',
                ],

                'date_of_death' => [
                    'required',
                    'date',
                    'before_or_equal:today',
                ],
            ];

            // Additional information is required only
            // for manually entered death records.
            if ($isManual) {

                $rules = array_merge($rules, [

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
                        'max:255',
                    ],

                    'church_id' => [
                        'required',
                        'integer',
                        'exists:churches,church_id',
                    ],

                    'birthdate' => [
                        'required',
                        'date',
                        'before_or_equal:today',
                    ],

                    'gender' => [
                        'required',
                        'in:Male,Female',
                    ],

                    'marital_status' => [
                        'required',
                        'in:Single,Married,Widowed',
                    ],
                ]);
            }

            $validated = $request->validate($rules);

            // Check the signed-in user's authorized churches.
            $churchIds = $this->authorizedChurchIds($request);

            if ($churchIds === null) {
                return $this->forbiddenResponse();
            }

            if ($isManual) {

                // ====================================
                // NEW DEATH RECORD WITHOUT BAPTISM
                // ====================================

                $churchId = (int) $validated['church_id'];

                if (! in_array($churchId, $churchIds, true)) {
                    return $this->forbiddenResponse();
                }

                // Death must occur after birth.
                if (
                    $validated['date_of_death'] <=
                    $validated['birthdate']
                ) {
                    throw ValidationException::withMessages([
                        'date_of_death' => [
                            'Date of Death must be at least one day after the birthdate.',
                        ],
                    ]);
                }

                $firstName = trim($validated['first_name']);
                $middleName = trim($validated['middle_name'] ?? '');
                $lastName = trim($validated['last_name']);
                $extensionName = trim($validated['extension_name'] ?? '');

                /*
                 * Prevent duplicate personal records in baptisms.
                 *
                 * If the same person already has a baptism
                 * record, the user should select that person
                 * using Existing Baptism Record instead.
                 */
                $existingPerson = $this->findMatchingBaptism(
                    $churchId,
                    $firstName,
                    $middleName,
                    $lastName,
                    $extensionName,
                    $validated['birthdate']
                );

                if ($existingPerson) {

                    $alreadyDeceased = Death::query()
                        ->where('baptism_id', $existingPerson->baptism_id)
                        ->exists();

                    return response()->json([
                        'success' => false,
                        'message' => $alreadyDeceased
                            ? 'This person already has a death record.'
                            : 'This person already has a baptism record. Please select the existing member instead of adding the person again.',
                        'errors' => [
                            'first_name' => [
                                $alreadyDeceased
                                    ? 'A death record already exists for this person.'
                                    : 'A baptism record already exists for this person. Please use Existing Baptism Record.',
                            ],
                        ],
                    ], 422);
                }

                /*
                 * IMPORTANT:
                 * Both database insertions happen in one transaction.
                 *
                 * If the death insertion fails, the baptism
                 * insertion will also be rolled back.
                 */
                $death = DB::transaction(function () use (
                    $validated,
                    $churchId,
                    $firstName,
                    $middleName,
                    $lastName,
                    $extensionName
                ) {

                    // STEP 1: Create a hidden baptism row.
                    $newBaptism = Baptism::create([

                        'church_id' => $churchId,

                        'quarter' => $validated['quarter'],

                        'first_name' => $firstName,

                        // Middle name is NOT NULL in your database.
                        'middle_name' => $middleName,

                        'last_name' => $lastName,

                        'extension_name' => $extensionName !== ''
                            ? $extensionName
                            : null,

                        'birthdate' => $validated['birthdate'],

                        'gender' => $validated['gender'],

                        // Required database columns.
                        // These are empty because this person
                        // does not have an actual baptism record.
                        'address' => '',

                        'officiating_minister' => '',

                        'place_of_baptism' => '',

                        // This identifies the row as a
                        // manually entered death record.
                        'date_of_baptism' => null,

                        'marital_status' => $validated['marital_status'],

                        // false = Newly Baptized default.
                        // No actual baptism is recorded because
                        // date_of_baptism is NULL.
                        'is_reclaimed' => false,
                    ]);

                    // STEP 2: Create the death record using
                    // the newly generated baptism_id.
                    $newDeath = Death::create([
                        'baptism_id' => $newBaptism->baptism_id,
                        'quarter' => $validated['quarter'],
                        'date_of_death' => $validated['date_of_death'],
                    ]);

                    return $newDeath;
                });

            } else {

                // ====================================
                // EXISTING BAPTISM RECORD
                // ====================================

                $baptism = Baptism::query()
                    ->find($validated['baptism_id']);

                if (! $baptism) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Baptism record not found.',
                    ], 404);
                }

                $churchId = (int) $baptism->church_id;

                if (! in_array($churchId, $churchIds, true)) {
                    return $this->forbiddenResponse();
                }

                // Death must be after the person's birthdate.
                if (
                    $validated['date_of_death'] <=
                    substr((string) $baptism->birthdate, 0, 10)
                ) {
                    throw ValidationException::withMessages([
                        'date_of_death' => [
                            'Date of Death must be at least one day after the birthdate.',
                        ],
                    ]);
                }

                // Prevent duplicate death records for the same member.
                $alreadyExists = Death::query()
                    ->where('baptism_id', $baptism->baptism_id)
                    ->exists();

                if ($alreadyExists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This member already has a death record.',
                        'errors' => [
                            'baptism_id' => [
                                'A death record already exists for this baptized member.',
                            ],
                        ],
                    ], 422);
                }

                $death = DB::transaction(function () use ($validated, $baptism) {

                    return Death::create([
                        'baptism_id' => $baptism->baptism_id,
                        'quarter' => $validated['quarter'],
                        'date_of_death' => $validated['date_of_death'],
                    ]);
                });
            }

            $death->load('baptism');

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
     * Find a baptism row with the same personal information.
     *
     * This prevents a manual death entry from creating
     * another baptism row for an existing person.
     */
    private function findMatchingBaptism(
        int $churchId,
        string $firstName,
        string $middleName,
        string $lastName,
        string $extensionName,
        string $birthdate
    ): ?Baptism {

        return Baptism::query()
            ->where('church_id', $churchId)
            ->whereDate('birthdate', $birthdate)

            ->whereRaw(
                "LOWER(TRIM(first_name)) = ?",
                [strtolower($firstName)]
            )

            ->whereRaw(
                "LOWER(TRIM(COALESCE(middle_name, ''))) = ?",
                [strtolower($middleName)]
            )

            ->whereRaw(
                "LOWER(TRIM(last_name)) = ?",
                [strtolower($lastName)]
            )

            ->whereRaw(
                "LOWER(TRIM(COALESCE(extension_name, ''))) = ?",
                [strtolower($extensionName)]
            )

            ->first();
    }

    /**
     * Display one death record.
     */
    public function show(Request $request, string $id)
    {
        $death = Death::with('baptism')->find($id);

        if (! $death) {
            return response()->json([
                'success' => false,
                'message' => 'Death record not found.',
            ], 404);
        }

        $churchIds = $this->authorizedChurchIds($request);
        $churchId = $death->baptism?->church_id;

        if (
            $churchIds === null ||
            $churchId === null ||
            ! in_array((int) $churchId, $churchIds, true)
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
        $death = Death::with('baptism')->find($id);

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
                'in:Q1,Q2,Q3,Q4',
            ],

            'date_of_death' => [
                'sometimes',
                'required',
                'date',
                'before_or_equal:today',
            ],
        ]);

        $churchIds = $this->authorizedChurchIds($request);

        $currentChurchId = $death->baptism?->church_id;

        if (
            $churchIds === null ||
            $currentChurchId === null ||
            ! in_array((int) $currentChurchId, $churchIds, true)
        ) {
            return $this->forbiddenResponse();
        }

        $targetBaptism = $death->baptism;

        if (isset($validated['baptism_id'])) {

            $targetBaptism = Baptism::query()
                ->find($validated['baptism_id']);

            if (
                ! $targetBaptism ||
                ! in_array((int) $targetBaptism->church_id, $churchIds, true)
            ) {
                return $this->forbiddenResponse();
            }

            // Prevent assigning a member that already
            // has another death record.
            if (
                (int) $validated['baptism_id'] !==
                (int) $death->baptism_id
            ) {

                $alreadyExists = Death::query()
                    ->where('baptism_id', $validated['baptism_id'])
                    ->where('death_id', '!=', $death->death_id)
                    ->exists();

                if ($alreadyExists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This member already has a death record.',
                    ], 422);
                }
            }
        }

        if (isset($validated['date_of_death']) && $targetBaptism) {

            if (
                $validated['date_of_death'] <=
                substr((string) $targetBaptism->birthdate, 0, 10)
            ) {
                throw ValidationException::withMessages([
                    'date_of_death' => [
                        'Date of Death must be at least one day after the birthdate.',
                    ],
                ]);
            }
        }

        $death->update($validated);

        $death->load('baptism');

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
        $death = Death::with('baptism')->find($id);

        if (! $death) {
            return response()->json([
                'success' => false,
                'message' => 'Death record not found.',
            ], 404);
        }

        $churchId = $death->baptism?->church_id;
        $churchIds = $this->authorizedChurchIds($request);

        if (
            $churchIds === null ||
            $churchId === null ||
            ! in_array((int) $churchId, $churchIds, true)
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
    private function authorizedChurchIds(
        Request $request,
        bool $allowDistrictSelection = false
    ): ?array {

        $user = $request->user();

        $role = strtolower(trim(str_replace(
            ['_', '-'],
            ' ',
            (string) ($user->role ?? '')
        )));

        if (
            ! $user ||
            ! in_array($role, [
                'pastor',
                'district pastor',
                'director',
                'assistant',
                'administrative assistant',
                'head assistant',
                'head director',
            ], true)
        ) {
            return null;
        }

        $isGlobalAssistant = in_array(
            $role,
            ['assistant', 'administrative assistant'],
            true
        ) && $user->department_id === null;

        $isReadOnlyDirector =
            $role === 'director' && $request->isMethod('GET');

        if (
            in_array($role, [
                'assistant',
                'administrative assistant',
                'director',
            ], true) &&
            (int) $user->department_id !== 16 &&
            ! $isGlobalAssistant &&
            ! $isReadOnlyDirector
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
                    in_array($role, [
                        'assistant',
                        'administrative assistant',
                        'director',
                    ], true) &&
                    (int) $user->department_id === 16
                )
            ) &&
            $request->filled('district_id')
        ) {

            $districtId = (int) $request->query('district_id');

            $isDistrict = DB::table('churches')
                ->where('church_id', $districtId)
                ->whereNull('parent_id')
                ->exists();

            if (! $isDistrict) {
                return null;
            }

            return DB::table('churches')
                ->where('church_id', $districtId)
                ->orWhere('parent_id', $districtId)
                ->pluck('church_id')
                ->map(fn ($churchId) => (int) $churchId)
                ->all();
        }

        if ($isReadOnlyDirector) {
            return DB::table('churches')
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

        $districtId = (int) (
            $assignedChurch->parent_id
            ?? $assignedChurch->church_id
        );

        return DB::table('churches')
            ->where('church_id', $districtId)
            ->orWhere('parent_id', $districtId)
            ->pluck('church_id')
            ->map(fn ($churchId) => (int) $churchId)
            ->all();
    }

    /**
     * Return forbidden response.
     */
    private function forbiddenResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to access personal reports for this district.',
        ], 403);
    }
}
