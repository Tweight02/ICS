<?php

namespace App\Http\Controllers;

use App\Models\Death;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class DeathController extends Controller
{
    /**
     * Display all death records.
     */
    public function index()
    {
        $deaths = Death::with('baptism')
            ->orderBy('date_of_death', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $deaths
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
                    'exists:baptisms,baptism_id'
                ],

                'quarter' => [
                    'required',
                    'string',
                    'max:255'
                ],

                'date_of_death' => [
                    'required',
                    'date'
                ],
            ]);

            $death = Death::create([
                'baptism_id' => $validated['baptism_id'],
                'quarter' => $validated['quarter'],
                'date_of_death' => $validated['date_of_death'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Death record created successfully.',
                'data' => $death
            ], 201);

        } catch (ValidationException $e) {

            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);

        } catch (\Throwable $e) {

            Log::error(
                'Death record save failed.',
                [
                    'error' => $e->getMessage(),
                    'data' => $request->all()
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Failed to save death record.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display one death record.
     */
    public function show(string $id)
    {
        $death = Death::with('baptism')
            ->find($id);

        if (!$death) {

            return response()->json([
                'success' => false,
                'message' => 'Death record not found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $death
        ]);
    }

    /**
     * Update a death record.
     */
    public function update(Request $request, string $id)
    {
        $death = Death::find($id);

        if (!$death) {

            return response()->json([
                'success' => false,
                'message' => 'Death record not found.'
            ], 404);
        }

        $validated = $request->validate([
            'baptism_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:baptisms,baptism_id'
            ],

            'quarter' => [
                'sometimes',
                'required',
                'string',
                'max:255'
            ],

            'date_of_death' => [
                'sometimes',
                'required',
                'date'
            ],
        ]);

        $death->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Death record updated successfully.',
            'data' => $death
        ]);
    }

    /**
     * Delete a death record.
     */
    public function destroy(string $id)
    {
        $death = Death::find($id);

        if (!$death) {

            return response()->json([
                'success' => false,
                'message' => 'Death record not found.'
            ], 404);
        }

        $death->delete();

        return response()->json([
            'success' => true,
            'message' => 'Death record deleted successfully.'
        ]);
    }
}