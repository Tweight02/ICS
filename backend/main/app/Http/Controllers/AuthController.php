<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Validate credentials and issue a bearer token.
     * POST /api/login  { email, password }
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])
            ->where('status', 'active')
            ->first();

        // Same message for unknown email and wrong password to avoid user enumeration.
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Optional: keep one active session per user by revoking older tokens.
        // $user->tokens()->delete();

        $token = $user->createToken('angular-app')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token_type' => 'Bearer',
            'token' => $token,
            'user' => $user,
        ]);
    }

    /**
     * Return the currently authenticated user.
     * GET /api/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    /**
     * Revoke the token used for this request.
     * POST /api/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * Revoke every token the user has (log out of all devices).
     * POST /api/logout-all
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out of all devices.']);
    }
}
