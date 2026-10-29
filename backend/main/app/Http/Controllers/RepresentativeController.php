<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RepresentativeController extends Controller
{
    /**
     * Churches in the pastor's district that have no representative yet.
     */
    public function available_churches(Request $request)
    {
        $authUser = $request->user();

        if ($authUser->role !== 'pastor') {
            abort(403, 'Only pastors can list churches for new representatives.');
        }

        $districtId = $this->assignedDistrictId($authUser);
        $churches = Church::where('parent_id', $districtId)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('users')
                    ->whereColumn('users.church_id', 'churches.church_id')
                    ->where('users.role', 'representative')
                    ->where('users.status', 'active');
            })
            ->orderBy('name')
            ->get(['church_id', 'name']);

        return response()->json(['data' => $churches]);
    }

    public function transfer_churches(Request $request)
    {
        $authUser = $request->user();

        if ($authUser->role !== 'pastor') {
            abort(403, 'Only pastors can list transfer destination churches.');
        }

        $districtId = $this->assignedDistrictId($authUser);
        $churches = Church::query()
            ->where('parent_id', $districtId)
            ->orderBy('name')
            ->get(['church_id', 'name']);

        return response()->json(['data' => $churches]);
    }

    /**
     * Get representatives accessible to the authenticated user.
     *
     * Pastor: representatives in churches of his district.
     * Church representative: representatives in his own church.
     */
    public function index(Request $request)
    {
        $authUser = $request->user();

        if (! in_array($authUser->role, ['pastor', 'representative'])) {
            abort(403, 'You are not authorized to view representatives.');
        }
        $districtId = $authUser->role === 'pastor' ? $this->assignedDistrictId($authUser) : null;

        $query = User::query()
            ->select('users.*')
            ->where('users.role', 'representative')
            ->with([
                'department:department_id,department_name',
                'church:church_id,name,parent_id',
            ]);

        // PASTOR
        if ($authUser->role === 'pastor') {
            $query
                ->join('churches as representative_churches', 'representative_churches.church_id', '=', 'users.church_id')
                ->where('representative_churches.parent_id', $districtId);
        }

        // CHURCH REPRESENTATIVE
        if ($authUser->role === 'representative') {
            $query->where('users.church_id', $authUser->church_id);
        }

        // SEARCH
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // CHURCH FILTER
        if ($request->filled('church_id')) {
            $query->where('users.church_id', $request->church_id);
        }

        if ($request->filled('status')) {
            $query->where('users.status', $request->input('status'));
        }

        return response()->json(
            $query
                ->orderBy('users.last_name')
                ->orderBy('users.first_name')
                ->paginate($request->integer('per_page', 15))
        );
    }

    /**
     * View one representative.
     */
    public function show(Request $request, $id)
    {
        $authUser = $request->user();

        $representative = User::query()
            ->where('role', 'representative')
            ->with([
                'department:department_id,department_name',
                'church:church_id,name,parent_id',
            ])
            ->findOrFail($id);

        if ($authUser->role === 'pastor') {
            $districtId = $this->assignedDistrictId($authUser);

            $allowed = $representative->church
                && (int) $representative->church->parent_id === $districtId;

            if (! $allowed) {
                abort(403, 'This representative is outside your district.');
            }
        } elseif ($authUser->role === 'representative') {
            if ((int) $representative->church_id !== (int) $authUser->church_id) {
                abort(403, 'This representative belongs to another church.');
            }
        } else {
            abort(403, 'You are not authorized to view this representative.');
        }

        return response()->json([
            'data' => $representative,
        ]);
    }

    /**
     * Create a church representative.
     */
    public function store(Request $request)
    {
        $authUser = $request->user();

        $data = $request->validate([
            'church_id' => 'required|exists:churches,church_id',
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'extension_name' => 'nullable|string|max:50',
            'birthdate' => 'required|date|before:today',
            'gender' => 'required|string|in:male,female,other',
            'email' => [
                'required',
                'email',
                // unique per church (same email may exist in other churches)
                Rule::unique('users', 'email')->where('church_id', $request->input('church_id')),
                $this->noActiveEmailInOtherRole('representative'),
            ],
            'password' => 'required|string|min:8',
        ]);

        // Access check
        $church = Church::findOrFail($data['church_id']);

        if ($authUser->role === 'pastor') {
            if ((int) $church->parent_id !== $this->assignedDistrictId($authUser)) {
                abort(403, 'You can only assign representatives to churches in your district.');
            }
        } elseif ($authUser->role === 'representative') {
            if ((int) $church->church_id !== (int) $authUser->church_id) {
                abort(403, 'You can only assign a representative to your own church.');
            }
        } else {
            abort(403, 'You are not authorized to create representatives.');
        }

        // Department is inherited from the creator, never from the request
        if (! $authUser->department_id) {
            throw ValidationException::withMessages([
                'department_id' => 'Your account has no department assigned.',
            ]);
        }

        $data['department_id'] = $authUser->department_id;
        $data['role'] = 'representative';
        $data['status'] = 'active';
        $data['password'] = Hash::make($data['password']);

        $representative = DB::transaction(function () use ($data) {
            // Lock the church row so two requests can't both pass the check
            DB::table('churches')
                ->where('church_id', $data['church_id'])
                ->lockForUpdate()
                ->first();

            $occupied = User::where('role', 'representative')
                ->where('church_id', $data['church_id'])
                ->where('status', 'active')
                ->exists();

            if ($occupied) {
                throw ValidationException::withMessages([
                    'church_id' => 'This church already has a representative.',
                ]);
            }

            return User::create($data);
        });

        $representative->load(['department', 'church']);

        return response()->json([
            'message' => 'Church representative created successfully.',
            'user' => $representative,
        ], 201);
    }

    /**
     * Update representative (also handles transfer to another church).
     */
    public function update(Request $request, $id)
    {
        $authUser = $request->user();

        $representative = User::where('role', 'representative')->findOrFail($id);

        // AUTHORIZATION
        $church = $representative->church;

        if ($authUser->role === 'pastor') {
            $districtId = $this->assignedDistrictId($authUser);

            if (! $church || (int) $church->parent_id !== $districtId) {
                abort(403, 'This representative is outside your district.');
            }
        } elseif ($authUser->role === 'representative') {
            if ((int) $representative->church_id !== (int) $authUser->church_id) {
                abort(403, 'This representative belongs to another church.');
            }
        } else {
            abort(403, 'You are not authorized to update representatives.');
        }

        $destinationId = $request->integer('church_id');
        $isTransfer = $destinationId !== (int) $representative->church_id;

        // VALIDATION
        $data = $request->validate([
            'church_id' => 'required|exists:churches,church_id',
            'department_id' => 'required|exists:departments,department_id',
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'extension_name' => 'nullable|string|max:50',
            'birthdate' => 'required|date|before:today',
            'gender' => 'required|string|in:male,female,other',
            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')
                    ->where(fn ($q) => $isTransfer
                        ? $q->where('church_id', $destinationId)->where('status', 'active')
                        : $q->where('church_id', $representative->church_id))
                    ->ignore($representative->user_id, 'user_id'),
                $this->noActiveEmailInOtherRole('representative', $representative->user_id),
            ],
            'password' => 'nullable|string|min:8',
        ]);

        // PASSWORD
        if (empty($data['password'])) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        if ($authUser->role === 'representative' && $isTransfer) {
            abort(403, 'Representatives cannot transfer accounts between churches.');
        }

        $districtId = $authUser->role === 'pastor' ? $this->assignedDistrictId($authUser) : null;

        $representative = DB::transaction(function () use ($data, $authUser, $representative, $districtId, $isTransfer) {
            $destinationChurch = Church::query()
                ->where('church_id', $data['church_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $authUser->role === 'pastor' &&
                (int) $destinationChurch->parent_id !== $districtId
            ) {
                abort(403, 'You can only transfer representatives to churches in your district.');
            }

            // Plain edit: no transfer, update the same row
            if (! $isTransfer) {
                $representative->update($data);

                return $representative;
            }

            if ($representative->status !== 'active') {
                throw ValidationException::withMessages([
                    'church_id' => 'Only active representatives can be transferred.',
                ]);
            }

            $destinationOccupied = User::query()
                ->where('role', 'representative')
                ->where('status', 'active')
                ->where('church_id', $destinationChurch->church_id)
                ->where('user_id', '!=', $representative->user_id)
                ->exists();

            if ($destinationOccupied) {
                throw ValidationException::withMessages([
                    'church_id' => 'This church already has an active representative.',
                ]);
            }

            // Transfer: old row stays (inactive), new row in the destination church
            $this->retire($representative);

            return $this->place($representative, $destinationChurch->church_id, $data);
        });

        $representative->load(['department', 'church']);

        return response()->json([
            'message' => 'Representative updated successfully.',
            'user' => $representative,
        ]);
    }

    /**
     * Transfer active representatives to churches in the pastor's district.
     */
    public function bulk_transfer(Request $request)
    {
        $authUser = $request->user();

        if ($authUser->role !== 'pastor') {
            abort(403, 'Only pastors can transfer representatives.');
        }

        $data = $request->validate([
            'transfers' => ['required', 'array', 'min:1'],
            'transfers.*.user_id' => [
                'required',
                'integer',
                'distinct',
                'exists:users,user_id',
            ],
            'transfers.*.church_id' => [
                'required',
                'integer',
                'exists:churches,church_id',
            ],
        ]);

        $transfers = $data['transfers'];
        $userIds = array_map('intval', array_column($transfers, 'user_id'));
        $destinationIds = array_map('intval', array_column($transfers, 'church_id'));

        if (count($destinationIds) !== count(array_unique($destinationIds))) {
            throw ValidationException::withMessages([
                'transfers' => 'Each representative must have a different destination church.',
            ]);
        }

        $districtId = $this->assignedDistrictId($authUser);
        DB::transaction(function () use ($transfers, $userIds, $destinationIds, $districtId) {
            $representatives = User::query()
                ->whereIn('user_id', $userIds)
                ->where('role', 'representative')
                ->where('status', 'active')
                ->with('church:church_id,parent_id')
                ->orderBy('user_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('user_id');

            if ($representatives->count() !== count($userIds)) {
                throw ValidationException::withMessages([
                    'transfers' => 'One or more selected users are not active representatives.',
                ]);
            }

            foreach ($representatives as $representative) {
                if (
                    ! $representative->church ||
                    (int) $representative->church->parent_id !== $districtId
                ) {
                    abort(403, 'One or more representatives are outside your district.');
                }
            }

            $destinations = Church::query()
                ->whereIn('church_id', $destinationIds)
                ->orderBy('church_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('church_id');

            if ($destinations->count() !== count($destinationIds)) {
                throw ValidationException::withMessages([
                    'transfers' => 'One or more destination churches are unavailable.',
                ]);
            }

            foreach ($transfers as $transfer) {
                $representative = $representatives->get((int) $transfer['user_id']);
                $destination = $destinations->get((int) $transfer['church_id']);

                if ((int) $representative->church_id === (int) $destination->church_id) {
                    throw ValidationException::withMessages([
                        'transfers' => "{$representative->first_name} {$representative->last_name} is already assigned to this church.",
                    ]);
                }

                if ((int) $destination->parent_id !== $districtId) {
                    abort(403, 'You can only transfer representatives to churches in your district.');
                }

                $occupied = User::query()
                    ->where('role', 'representative')
                    ->where('status', 'active')
                    ->where('church_id', $destination->church_id)
                    ->whereNotIn('user_id', $userIds)
                    ->exists();

                if ($occupied) {
                    throw ValidationException::withMessages([
                        'transfers' => "{$destination->name} already has an active representative.",
                    ]);
                }
            }

            // Retire everyone first so chained moves (A->B while B->C) never collide
            foreach ($representatives as $representative) {
                $this->retire($representative);
            }

            foreach ($transfers as $transfer) {
                $this->place(
                    $representatives->get((int) $transfer['user_id']),
                    (int) $transfer['church_id']
                );
            }
        });

        return response()->json([
            'message' => count($transfers) . ' representative(s) transferred successfully.',
            'transferred_count' => count($transfers),
        ]);
    }

    public function activate(Request $request, int $id)
    {
        $authUser = $request->user();

        if ($authUser->role !== 'pastor') {
            abort(403, 'Only pastors can reactivate representatives.');
        }

        $districtId = $this->assignedDistrictId($authUser);
        DB::transaction(function () use ($id, $districtId) {
            $representative = User::query()
                ->where('role', 'representative')
                ->where('user_id', $id)
                ->lockForUpdate()
                ->firstOrFail();

            $church = Church::query()
                ->where('church_id', $representative->church_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $church->parent_id !== $districtId) {
                abort(403, 'This representative is outside your district.');
            }

            if ($representative->status === 'active') {
                throw ValidationException::withMessages([
                    'status' => 'This representative is already active.',
                ]);
            }

            $occupied = User::query()
                ->where('role', 'representative')
                ->where('status', 'active')
                ->where('church_id', $church->church_id)
                ->where('user_id', '!=', $representative->user_id)
                ->exists();

            if ($occupied) {
                throw ValidationException::withMessages([
                    'status' => 'This church already has an active representative. Transfer the current representative first.',
                ]);
            }

            // The same person must not be active in two churches at once
            $duplicate = User::query()
                ->where('email', $representative->email)
                ->where('status', 'active')
                ->where('user_id', '!=', $representative->user_id)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'status' => 'This person already has an active account in another church.',
                ]);
            }

            $representative->update(['status' => 'active']);
        });

        return response()->json([
            'message' => 'Representative reactivated successfully.',
        ]);
    }

    /**
     * Deactivate representative.
     */
    public function destroy(Request $request, $id)
    {
        $authUser = $request->user();

        if ($authUser->role !== 'pastor') {
            abort(403, 'Only pastors can delete representatives.');
        }
        $districtId = $this->assignedDistrictId($authUser);

        $representative = User::where('role', 'representative')
            ->with('church:church_id,parent_id')
            ->findOrFail($id);

        if (
            ! $representative->church ||
            (int) $representative->church->parent_id !== $districtId
        ) {
            abort(403, 'This representative is outside your district.');
        }

        DB::transaction(function () use ($representative) {
            $representative->update(['status' => 'inactive']);
            $representative->tokens()->delete();
        });

        return response()->json([
            'message' => 'Representative deactivated successfully.',
        ]);
    }

    /** Deactivate the old record and revoke its tokens. The row and its history stay as they are. */
    private function retire(User $user): void
    {
        $user->update(['status' => 'inactive']);
        $user->tokens()->delete();
    }

    /**
     * Put a person in a new church.
     * Reactivates their earlier record there if one exists (same email), otherwise creates a new one.
     * $overrides applies edited form data (e.g. from update()) to the new record.
     */
    private function place(User $source, int $churchId, array $overrides = []): User
    {
        $existing = User::where('email', $source->email)
            ->where('church_id', $churchId)
            ->first();

        if ($existing) {
            $existing->forceFill([
                ...$source->only([
                    'department_id', 'first_name', 'middle_name', 'last_name',
                    'extension_name', 'birthdate', 'gender', 'profile_image', 'password',
                ]),
                ...$overrides,
                'church_id' => $churchId,
                'status' => 'active',
            ])->save();

            return $existing;
        }

        $new = $source->replicate();
        $new->forceFill([
            ...$overrides,
            'church_id' => $churchId,
            'status' => 'active',
            'remember_token' => null,
        ])->save();

        return $new;
    }

    /**
     * Rejects an email that is actively used by an account with a different role,
     * so login can never match two active accounts of different types.
     */
    private function noActiveEmailInOtherRole(string $role, ?int $ignoreUserId = null): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($role, $ignoreUserId): void {
            $clash = User::query()
                ->where('email', $value)
                ->where('status', 'active')
                ->where('role', '!=', $role)
                ->when($ignoreUserId, fn ($q) => $q->where('user_id', '!=', $ignoreUserId))
                ->exists();

            if ($clash) {
                $fail('This email is already used by another account type.');
            }
        };
    }

    private function assignedDistrictId(User $pastor): int
    {
        $assignedChurch = Church::query()
            ->select(['church_id', 'parent_id'])
            ->findOrFail($pastor->church_id);

        return (int) ($assignedChurch->parent_id ?? $assignedChurch->church_id);
    }
}