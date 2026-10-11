<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Models\Church;
use Illuminate\Support\Facades\DB;

class RepresentativeController extends Controller
{
    /**
     * Get representatives accessible to the authenticated user.
     *
     * Pastor:
     *   Can see representatives in churches belonging to his district.
     *
     * Church representative:
     *   Can see representatives in his own church.
     */
    /**
     * Churches in the pastor's district that have no representative yet.
     */
    public function available_churches(Request $request)
    {
        $authUser = $request->user();

        if ($authUser->role !== 'pastor') {
            abort(403, 'Only pastors can list churches for new representatives.');
        }

        $churches = Church::where('parent_id', $authUser->church_id)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('users')
                    ->whereColumn('users.church_id', 'churches.church_id')
                    ->where('users.role', 'church_representative');
            })
            ->orderBy('name')
            ->get(['church_id', 'name']);

        return response()->json(['data' => $churches]);
    }

    public function index(Request $request)
    {
        $authUser = $request->user();

        if (
            !in_array(
                $authUser->role,
                ['pastor', 'church_representative']
            )
        ) {
            abort(
                403,
                'You are not authorized to view representatives.'
            );
        }

        $query = User::query()
            ->where(
                'role',
                'church_representative'
            )
            ->with([
                'department:department_id,department_name',
                'church:church_id,name,parent_id',
            ]);

        /*
    |--------------------------------------------------------------------------
    | PASTOR
    |--------------------------------------------------------------------------
    */

        if ($authUser->role === 'pastor') {

            $query->whereHas('church', function ($q) use ($authUser) {

                $q->where(
                    'parent_id',
                    $authUser->church_id
                );
            });
        }

        /*
    |--------------------------------------------------------------------------
    | CHURCH REPRESENTATIVE
    |--------------------------------------------------------------------------
    */

        if ($authUser->role === 'church_representative') {

            $query->where(
                'church_id',
                $authUser->church_id
            );
        }


        /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

        if ($request->filled('search')) {

            $search = $request->search;

            $query->where(function ($q) use ($search) {

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
            });
        }


        /*
    |--------------------------------------------------------------------------
    | CHURCH FILTER
    |--------------------------------------------------------------------------
    */

        if ($request->filled('church_id')) {

            $query->where(
                'church_id',
                $request->church_id
            );
        }


        return response()->json(
            $query
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->paginate(
                    $request->integer('per_page', 15)
                )
        );
    }


    /**
     * View one representative.
     */
    public function show(Request $request, $id)
    {
        $authUser = $request->user();

        $representative = User::query()
            ->where('role', 'church_representative')
            ->with([
                'department:department_id,department_name',
                'church:church_id,name,parent_id',
            ])
            ->findOrFail($id);

        /*
        |--------------------------------------------------------------------------
        | AUTHORIZATION
        |--------------------------------------------------------------------------
        */

        if ($authUser->role === 'pastor') {

            $allowed = $representative->church
                && (int) $representative->church->parent_id
                === (int) $authUser->church_id;

            if (!$allowed) {
                abort(403, 'This representative is outside your district.');
            }
        } elseif ($authUser->role === 'church_representative') {

            if (
                (int) $representative->church_id !==
                (int) $authUser->church_id
            ) {
                abort(
                    403,
                    'This representative belongs to another church.'
                );
            }
        } else {

            abort(
                403,
                'You are not authorized to view this representative.'
            );
        }

        return response()->json([
            'data' => $representative
        ]);
    }


    /**
     * Create a church representative.
     */
    public function store(Request $request)
    {
        $authUser = $request->user();

        $data = $request->validate([
            'church_id'      => 'required|exists:churches,church_id',
            'first_name'     => 'required|string|max:255',
            'middle_name'    => 'nullable|string|max:255',
            'last_name'      => 'required|string|max:255',
            'extension_name' => 'nullable|string|max:50',
            'birthdate'      => 'required|date|before:today',
            'gender'         => 'required|string|in:male,female,other',
            'email'          => 'required|email|unique:users,email',
            'password'       => 'required|string|min:8',
        ]);

        // Access check
        $church = Church::findOrFail($data['church_id']);

        if ($authUser->role === 'pastor') {
            if ((int) $church->parent_id !== (int) $authUser->church_id) {
                abort(403, 'You can only assign representatives to churches in your district.');
            }
        } elseif ($authUser->role === 'church_representative') {
            if ((int) $church->church_id !== (int) $authUser->church_id) {
                abort(403, 'You can only assign a representative to your own church.');
            }
        } else {
            abort(403, 'You are not authorized to create representatives.');
        }

        // Department is inherited from the creator, never from the request
        if (!$authUser->department_id) {
            throw ValidationException::withMessages([
                'department_id' => 'Your account has no department assigned.',
            ]);
        }

        $data['department_id'] = $authUser->department_id;
        $data['role']          = 'church_representative';
        $data['password']      = Hash::make($data['password']);

        $representative = DB::transaction(function () use ($data) {
            // Lock the church row so two requests can't both pass the check
            DB::table('churches')
                ->where('church_id', $data['church_id'])
                ->lockForUpdate()
                ->first();

            $occupied = User::where('role', 'church_representative')
                ->where('church_id', $data['church_id'])
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
            'user'    => $representative,
        ], 201);
    }


    /**
     * Update representative.
     */
    public function update(
        Request $request,
        $id
    ) {

        $authUser = $request->user();

        $representative = User::where(
            'role',
            'church_representative'
        )->findOrFail($id);


        /*
        |--------------------------------------------------------------------------
        | AUTHORIZATION
        |--------------------------------------------------------------------------
        */

        $church = $representative->church;

        if ($authUser->role === 'pastor') {

            if (
                !$church ||
                (int) $church->parent_id !==
                (int) $authUser->church_id
            ) {
                abort(
                    403,
                    'This representative is outside your district.'
                );
            }
        } elseif ($authUser->role === 'church_representative') {

            if (
                (int) $representative->church_id !==
                (int) $authUser->church_id
            ) {
                abort(
                    403,
                    'This representative belongs to another church.'
                );
            }
        } else {

            abort(
                403,
                'You are not authorized to update representatives.'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $data = $request->validate([

            'department_id' =>
            'required|exists:departments,department_id',

            'first_name' =>
            'required|string|max:255',

            'middle_name' =>
            'nullable|string|max:255',

            'last_name' =>
            'required|string|max:255',

            'extension_name' =>
            'nullable|string|max:50',

            'birthdate' =>
            'required|date|before:today',

            'gender' =>
            'required|string|in:male,female,other',

            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')
                    ->ignore(
                        $representative->user_id,
                        'user_id'
                    ),
            ],

            'password' =>
            'nullable|string|min:8',
        ]);


        /*
        |--------------------------------------------------------------------------
        | PASSWORD
        |--------------------------------------------------------------------------
        */

        if (
            empty($data['password'])
        ) {

            unset($data['password']);
        } else {

            $data['password'] = Hash::make(
                $data['password']
            );
        }


        /*
        |--------------------------------------------------------------------------
        | UPDATE
        |--------------------------------------------------------------------------
        */

        $representative->update($data);

        $representative->load([
            'department',
            'church'
        ]);

        return response()->json([

            'message' =>
            'Representative updated successfully.',

            'user' =>
            $representative,

        ]);
    }

    /**
     * Delete representative.
     */
    public function destroy(Request $request, $id)
    {
        $authUser = $request->user();

        if ($authUser->role !== 'pastor') {
            abort(403, 'Only pastors can delete representatives.');
        }

        $representative = User::where('role', 'church_representative')
            ->with('church:church_id,parent_id')
            ->findOrFail($id);

        if (
            !$representative->church ||
            (int) $representative->church->parent_id !== (int) $authUser->church_id
        ) {
            abort(403, 'This representative is outside your district.');
        }

        try {
            $representative->delete();
        } catch (QueryException $e) {
            // e.g. foreign keys from reports or other records still point at this user
            return response()->json([
                'message' => 'This representative cannot be deleted because other records depend on them.',
            ], 409);
        }

        return response()->json([
            'message' => 'Representative deleted successfully.',
        ]);
    }
}
