<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function update_profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'extension_name' => 'nullable|string|max:50',
            'birthdate' => 'required|date|before:today',
            'gender' => 'required|string|in:male,female,other',
            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($user->user_id, 'user_id'),
            ],
            'profile_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        unset($data['profile_image']);

        $previousImage = $user->profile_image;
        if ($request->hasFile('profile_image')) {
            $data['profile_image'] = $request->file('profile_image')->store('profiles', 'public');
        }

        $user->update($data);
        if ($request->hasFile('profile_image') && $previousImage) {
            Storage::disk('public')->delete($previousImage);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->refresh(),
        ]);
    }

    // =========================================================
    // CREATE USER
    // =========================================================

    public function create_user(Request $request)
    {
        $data = $request->validate([
            'department_id' => 'required|exists:departments,department_id',

            'church_id' => 'required|exists:churches,church_id',

            'first_name' => 'required|string|max:255',

            'middle_name' => 'nullable|string|max:255',

            'last_name' => 'required|string|max:255',

            'extension_name' => 'nullable|string|max:50',

            'birthdate' => 'required|date|before:today',

            'gender' => 'required|string|in:male,female,other',

            'email' => 'required|email|unique:users,email',

            'password' => 'required|string|min:8',

        ]);

        $data['role'] = 'pastor';
        $data['status'] = 'active';

        $data['password'] =
            Hash::make(
                $data['password']
            );

        $user = DB::transaction(function () use ($data) {
            // Lock the district row so concurrent requests are serialized
            DB::table('churches')
                ->where('church_id', $data['church_id'])
                ->lockForUpdate()
                ->first();

            $occupied = User::where('role', 'pastor')
                ->where('church_id', $data['church_id'])
                ->where('status', 'active')
                ->exists();

            if ($occupied) {
                throw ValidationException::withMessages([
                    'church_id' => 'This district already has an assigned pastor.',
                ]);
            }

            return User::create($data);
        });

        return response()->json([

            'message' => 'User created successfully',

            'user' => $user,

        ], 201);
    }

    // =========================================================
    // VIEW PASTORS
    // =========================================================

    public function view_pastors(Request $request)
    {
        $pastors =
            User::query()
                ->where(
                    'role',
                    'pastor'
                )
                ->with([

                    'department:department_id,department_name',

                    'church:church_id,name',

                ])
                ->when(
                    $request->search,
                    function ($query, $search) {

                        $query->where(
                            function ($q) use ($search) {

                                $q->where(
                                    'first_name',
                                    'like',
                                    "%{$search}%"
                                )

                                    ->orWhere(
                                        'last_name',
                                        'like',
                                        "%{$search}%"
                                    )

                                    ->orWhere(
                                        'email',
                                        'like',
                                        "%{$search}%"
                                    );
                            }
                        );
                    }
                )
                ->when(
                    $request->department_id,
                    fn ($q, $id) => $q->where(
                        'department_id',
                        $id
                    )
                )
                ->when(
                    $request->church_id,
                    fn ($q, $id) => $q->where(
                        'church_id',
                        $id
                    )
                )
                ->when(
                    $request->filled('status'),
                    fn ($q) => $q->where(
                        'status',
                        $request->input('status')
                    )
                )
                ->orderBy(
                    'last_name'
                )
                ->orderBy(
                    'first_name'
                )
                ->paginate(
                    $request->integer(
                        'per_page',
                        15
                    )
                );

        return response()->json(
            $pastors
        );
    }

    // =========================================================
    // VIEW SINGLE PASTOR
    // =========================================================

    public function view_pastor($id)
    {
        $pastor =
            User::where(
                'role',
                'pastor'
            )
                ->with([

                    'department:department_id,department_name',

                    'church:church_id,name',

                ])
                ->findOrFail(
                    $id
                );

        return response()->json([

            'data' => $pastor,

        ]);
    }

    // =========================================================
    // UPDATE SINGLE PASTOR
    // =========================================================

    public function update_pastor(
        Request $request,
        $id
    ) {

        $pastor =
            User::where(
                'role',
                'pastor'
            )
                ->findOrFail($id);

        $data =
            $request->validate([

                'department_id' => 'required|exists:departments,department_id',

                'first_name' => 'required|string|max:255',

                'middle_name' => 'nullable|string|max:255',

                'last_name' => 'required|string|max:255',

                'extension_name' => 'nullable|string|max:50',

                'birthdate' => 'required|date|before:today',

                'gender' => 'required|string|in:male,female,other',

                'email' => ['required', 'email',
                    Rule::unique(
                        'users',
                        'email'
                    )->ignore(
                        $pastor->getKey(),
                        $pastor->getKeyName()
                    ),
                ],
                'password' => 'nullable|string|min:8',

            ]);

        if (
            empty($data['password'])
        ) {

            unset(
                $data['password']
            );
        } else {

            $data['password'] =
                Hash::make(
                    $data['password']
                );
        }

        $pastor->update(
            $data
        );

        return response()->json([

            'message' => 'User updated successfully',

            'user' => $pastor->fresh([
                'department',
                'church',
            ]),

        ]);
    }

    public function districtPastorAssignments(Request $request): JsonResponse
    {
        $this->authorizeAssistant($request);

        $districts = Church::query()
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get(['church_id', 'name']);

        $pastors = User::query()
            ->where('role', 'pastor')
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get([
                'user_id',
                'church_id',
                'first_name',
                'middle_name',
                'last_name',
                'extension_name',
            ]);

        $pastorsByDistrict = $pastors->keyBy('church_id');

        return response()->json([
            'assignments' => $districts->map(function (Church $district) use ($pastorsByDistrict): array {
                $pastor = $pastorsByDistrict->get($district->church_id);

                return [
                    'church_id' => $district->church_id,
                    'district_name' => $district->name,
                    'pastor_user_id' => $pastor?->user_id,
                    'pastor_name' => $pastor
                        ? implode(' ', array_filter([
                            $pastor->first_name,
                            $pastor->middle_name,
                            $pastor->last_name,
                            $pastor->extension_name,
                        ]))
                        : null,
                ];
            })->values(),
            'pastors' => $pastors->map(fn (User $pastor): array => [
                'user_id' => $pastor->user_id,
                'full_name' => implode(' ', array_filter([
                    $pastor->first_name,
                    $pastor->middle_name,
                    $pastor->last_name,
                    $pastor->extension_name,
                ])),
            ])->values(),
        ]);
    }

    public function assignPastorToDistrict(Request $request, int $districtId): JsonResponse
    {
        $this->authorizeAssistant($request);
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,user_id'],
        ]);

        DB::transaction(function () use ($districtId, $data): void {
            $district = Church::query()
                ->where('church_id', $districtId)
                ->whereNull('parent_id')
                ->lockForUpdate()
                ->firstOrFail();

            $pastor = User::query()
                ->whereKey($data['user_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($pastor->role !== 'pastor' || $pastor->status !== 'active') {
                throw ValidationException::withMessages([
                    'user_id' => 'Select an active pastor to assign.',
                ]);
            }

            if ((int) $pastor->church_id === $districtId) {
                throw ValidationException::withMessages([
                    'user_id' => 'This pastor is already assigned to the selected district.',
                ]);
            }

            $assignedPastor = User::query()
                ->where('role', 'pastor')
                ->where('status', 'active')
                ->where('church_id', $district->church_id)
                ->where('user_id', '!=', $pastor->user_id)
                ->lockForUpdate()
                ->first();

            if ($assignedPastor) {
                $assignedPastor->update(['church_id' => $pastor->church_id]);
            }

            $pastor->update(['church_id' => $district->church_id]);
        });

        return response()->json([
            'message' => 'Pastor assigned to the district successfully.',
        ]);
    }

    private function authorizeAssistant(Request $request): void
    {
        if (strtolower(trim((string) $request->user()?->role)) !== 'assistant') {
            abort(403, 'Only assistant accounts can manage district pastor assignments.');
        }
    }

    public function districtPastor(int $churchId)
    {
        $pastor = User::where('church_id', $churchId)
            ->where('role', 'pastor')
            ->where('department_id', 16)
            ->where('status', 'active')
            ->first();

        if (! $pastor) {
            return response()->json(['exists' => false]);
        }

        return response()->json([
            'exists' => true,
            'message' => 'This district already has a pastor.',
            'pastor' => [
                'user_id' => $pastor->user_id,
                'first_name' => $pastor->first_name,
                'last_name' => $pastor->last_name,
            ],
        ]);
    }

    public function activate_pastor($id)
    {
        $pastor = User::where('role', 'pastor')
            ->findOrFail($id);

        if ($pastor->status === 'active') {
            return response()->json([
                'message' => 'Pastor is already active.',
            ]);
        }

        $occupied = User::where('role', 'pastor')
            ->where('church_id', $pastor->church_id)
            ->where('status', 'active')
            ->whereKeyNot($pastor->getKey())
            ->exists();

        if ($occupied) {
            throw ValidationException::withMessages([
                'church_id' => 'This district already has an active pastor assigned.',
            ]);
        }

        DB::transaction(function () use ($pastor) {
            $pastor->update(['status' => 'active']);
        });

        return response()->json([
            'message' => 'Pastor activated successfully.',
        ]);
    }

    public function deactivate_pastor($id)
    {
        $pastor = User::where('role', 'pastor')
            ->findOrFail($id);

        DB::transaction(function () use ($pastor) {
            $pastor->update(['status' => 'inactive']);
            $pastor->tokens()->delete();
        });

        return response()->json([
            'data' => [
                'has_pastor'  => (bool) $pastor,
                'pastor_name' => $pastor
                    ? trim("{$pastor->first_name} {$pastor->last_name}")
                    : null,
            ],
        ]);
<<<<<<< Updated upstream
    }
    
=======
}
>>>>>>> Stashed changes
    // GET /api/users/{id}
    public function show($id)
    {
        $user = User::query()
            ->with([
                'church:church_id,name,parent_id',
                'church.parent:church_id,name',
                'department:department_id,department_name',
            ])
            ->select([
                'user_id', 'department_id', 'church_id',
                'first_name', 'middle_name', 'last_name', 'extension_name',
                'email', 'role',
            ])
            ->findOrFail($id);

        $isPastor = strtolower(trim((string) $user->role)) === 'pastor';
        $district = $isPastor
            ? ($user->church?->parent ?? $user->church)
            : null;

        return response()->json([
            'success' => true,
<<<<<<< Updated upstream
            'data'    => array_merge($user->toArray(), [
                'district' => $district
                    ? ['id' => (int) $district->church_id, 'name' => $district->name]
                    : null,
            ]),
=======
            'data'    => $user,
>>>>>>> Stashed changes
        ]);
    }
}
