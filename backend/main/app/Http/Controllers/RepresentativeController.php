<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RepresentativeController extends Controller
{
    // Church IDs the logged-in user may manage (null = unrestricted)
    private function scopedChurchIds(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'pastor') {
            return Church::where('parent_id', $user->church_id)->pluck('church_id');
        }

        return null;
    }

    // Every church in scope, with its current representative (null = vacant)
    public function index(Request $request)
    {
        $ids = $this->scopedChurchIds($request);

        $churches = Church::query()
            ->whereNotNull('parent_id')
            ->when($ids, fn($q) => $q->whereIn('church_id', $ids))
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->with('representative:user_id,church_id,first_name,middle_name,last_name,extension_name,email,birthdate,gender,department_id')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $churches]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $data['role'] = 'representative';
        $data['password'] = Hash::make($data['password']);

        $rep = User::create($data);

        return response()->json([
            'message' => 'Representative created successfully',
            'user'    => $rep->load('church:church_id,name'),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $ids = $this->scopedChurchIds($request);

        $rep = User::where('role', 'representative')
            ->when($ids, fn($q) => $q->whereIn('church_id', $ids))
            ->findOrFail($id);

        $data = $this->validated($request, $rep);

        if (empty($data['password'])) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        $rep->update($data);

        return response()->json([
            'message' => 'Representative updated successfully',
            'user'    => $rep->fresh('church:church_id,name'),
        ]);
    }

    private function validated(Request $request, ?User $rep = null): array
    {
        $data = $request->validate([
            'department_id'  => 'required|exists:departments,department_id',
            'church_id'      => [
                'required',
                'exists:churches,church_id',
                // one representative per church
                Rule::unique('users', 'church_id')
                    ->where('role', 'representative')
                    ->ignore($rep?->getKey(), 'user_id'),
            ],
            'first_name'     => 'required|string|max:255',
            'middle_name'    => 'nullable|string|max:255',
            'last_name'      => 'required|string|max:255',
            'extension_name' => 'nullable|string|max:50',
            'birthdate'      => 'required|date|before:today',
            'gender'         => 'required|in:male,female,other',
            'email'          => ['required', 'email',
                Rule::unique('users', 'email')->ignore($rep?->getKey(), 'user_id')],
            'password'       => $rep ? 'nullable|string|min:8' : 'required|string|min:8',
        ]);

        // Must be a child church (not a district) inside the allowed scope
        $church = Church::findOrFail($data['church_id']);
        $ids = $this->scopedChurchIds($request);

        if ($church->parent_id === null || ($ids && !$ids->contains($church->church_id))) {
            throw ValidationException::withMessages([
                'church_id' => 'This church is not in your district.',
            ]);
        }

        return $data;
    }
}