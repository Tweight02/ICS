<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    //
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
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    public function view_pastors(Request $request)
    {
        $pastors = User::query()
            ->where('role', 'pastor')
            ->with([
                'department:department_id,department_name',
                'church:church_id,name',
            ])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->department_id, fn ($q, $id) => $q->where('department_id', $id))
            ->when($request->church_id, fn ($q, $id) => $q->where('church_id', $id))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($request->integer('per_page', 15));

        return response()->json($pastors);
    }
}
