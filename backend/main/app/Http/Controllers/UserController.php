<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
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

                'church_id' => 'required|exists:churches,church_id',

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

        if ((int) $data['church_id'] !== (int) $pastor->church_id) {
            $occupied = User::where('role', 'pastor')
                ->where('church_id', $data['church_id'])
                ->where('status', 'active')
                ->where('user_id', '!=', $pastor->user_id)
                ->exists();

            if ($occupied) {
                throw ValidationException::withMessages([
                    'church_id' => 'This district already has an assigned pastor.',
                ]);
            }
        }

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

    // =========================================================
    // BULK TRANSFER PASTORS
    // =========================================================

    public function bulk_transfer(Request $request)
    {
        $data = $request->validate([
            'transfers' => [
                'required',
                'array',
                'min:1',
            ],

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

        /*
        |--------------------------------------------------------------------------
        | Make sure every destination district is unique
        |--------------------------------------------------------------------------
        */

        $destinationIds = array_column(
            $transfers,
            'church_id'
        );

        if (
            count($destinationIds) !==
            count(array_unique($destinationIds))
        ) {
            throw ValidationException::withMessages([
                'transfers' => 'Each pastor must be assigned to a different destination district.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Get all pastors being transferred
        |--------------------------------------------------------------------------
        */

        $userIds = array_column(
            $transfers,
            'user_id'
        );

        $pastors = User::whereIn(
            'user_id',
            $userIds
        )
            ->where('role', 'pastor')
            ->where('status', 'active')
            ->get()
            ->keyBy('user_id');

        /*
        |--------------------------------------------------------------------------
        | Make sure every selected user is actually a pastor
        |--------------------------------------------------------------------------
        */

        if ($pastors->count() !== count($userIds)) {

            $invalidIds = array_diff(
                $userIds,
                $pastors->keys()->all()
            );

            throw ValidationException::withMessages([
                'transfers' => 'One or more selected users are not pastors.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Build lookup of who is moving
        |--------------------------------------------------------------------------
        */

        $movingUserIds = array_flip(
            $userIds
        );

        DB::transaction(function () use (
            $transfers,
            $pastors,
            $movingUserIds
        ) {

            foreach ($transfers as $transfer) {

                $pastor = $pastors->get(
                    $transfer['user_id']
                );

                $destinationId =
                    (int) $transfer['church_id'];

                /*
            |--------------------------------------------------------------------------
            | Cannot transfer to the same district
            |--------------------------------------------------------------------------
            */

                if (
                    (int) $pastor->church_id ===
                    $destinationId
                ) {

                    throw ValidationException::withMessages([
                        'transfers' => "{$pastor->first_name} {$pastor->last_name} is already assigned to this district.",
                    ]);
                }

                /*
            |--------------------------------------------------------------------------
            | Check whether destination is occupied
            |--------------------------------------------------------------------------
            */

                $currentOccupant = User::where(
                    'role',
                    'pastor'
                )
                    ->where('status', 'active')
                    ->where(
                        'church_id',
                        $destinationId
                    )
                    ->whereNotIn(
                        'user_id',
                        array_keys($movingUserIds)
                    )
                    ->first();

                /*
            |--------------------------------------------------------------------------
            | Destination belongs to another pastor who is NOT moving
            |--------------------------------------------------------------------------
            */

                if ($currentOccupant) {

                    throw ValidationException::withMessages([
                        'transfers' => 'The destination district is already assigned to another pastor.',
                    ]);
                }
            }

            /*
        |--------------------------------------------------------------------------
        | Perform transfers
        |--------------------------------------------------------------------------
        |
        | Because a destination occupied by a pastor in the transfer batch
        | is allowed, swaps such as:
        |
        | Pastor A: District 1 -> District 2
        | Pastor B: District 2 -> District 1
        |
        | are valid.
        |
        */

            foreach ($transfers as $transfer) {

                $pastor =
                    $pastors->get(
                        $transfer['user_id']
                    );

                $pastor->update([
                    'church_id' => $transfer['church_id'],
                ]);
            }
        });

        return response()->json([
            'message' => count($transfers).
                ' pastor(s) transferred successfully.',

            'transferred_count' => count($transfers),
        ]);
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
            'message' => 'Pastor deactivated successfully.',
        ]);
    }
}
