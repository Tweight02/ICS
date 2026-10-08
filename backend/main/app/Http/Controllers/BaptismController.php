<?php

namespace App\Http\Controllers;

use App\Models\Baptism;
use App\Models\Church;
use Illuminate\Http\Request;

class BaptismController extends Controller
{
    /**
     * Display all baptism records.
     */
    public function index()
    {
        $baptisms = Baptism::orderBy('date_of_baptism', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $baptisms
        ]);
    }

    /**
     * Display all churches.
     */
    public function allChurches()
    {
        $churches = Church::select(
            'church_id',
            'name',
            'address',
            'parent_id'
        )
        ->orderBy('name')
        ->get();

        return response()->json([
            'success' => true,
            'data' => $churches
        ]);
    }

    /**
     * Store a newly created baptism record.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'church_id' => [
                'required',
                'integer',
                'exists:churches,church_id'
            ],

            'first_name' => [
                'required',
                'string',
                'max:255'
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:255'
            ],

            'last_name' => [
                'required',
                'string',
                'max:255'
            ],

            'extension_name' => [
                'nullable',
                'string',
                'max:50'
            ],

            'birthdate' => [
                'required',
                'date'
            ],

            'gender' => [
                'required',
                'string',
                'max:20'
            ],

            'address' => [
                'required',
                'string',
                'max:255'
            ],

            'officiating_minister' => [
                'required',
                'string',
                'max:255'
            ],

            'place_of_baptism' => [
                'required',
                'string',
                'max:255'
            ],

            'date_of_baptism' => [
                'required',
                'date'
            ],

            'marital_status' => [
                'required',
                'string',
                'max:50'
            ],

            'is_reclaimed' => [
                'required',
                'boolean'
            ],
        ]);

        $baptism = Baptism::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Baptism record created successfully.',
            'data' => $baptism
        ], 201);
    }

    /**
     * Display the specified baptism record.
     */
    public function show(string $id)
    {
        $baptism = Baptism::find($id);

        if (!$baptism) {
            return response()->json([
                'success' => false,
                'message' => 'Baptism record not found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $baptism
        ]);
    }

    /**
     * Update the specified baptism record.
     */
    public function update(Request $request, string $id)
    {
        $baptism = Baptism::find($id);

        if (!$baptism) {
            return response()->json([
                'success' => false,
                'message' => 'Baptism record not found.'
            ], 404);
        }

        $validated = $request->validate([
            'church_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:churches,church_id'
            ],

            'first_name' => [
                'sometimes',
                'required',
                'string',
                'max:255'
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:255'
            ],

            'last_name' => [
                'sometimes',
                'required',
                'string',
                'max:255'
            ],

            'extension_name' => [
                'nullable',
                'string',
                'max:50'
            ],

            'birthdate' => [
                'sometimes',
                'required',
                'date'
            ],

            'gender' => [
                'sometimes',
                'required',
                'string',
                'max:20'
            ],

            'address' => [
                'sometimes',
                'required',
                'string',
                'max:255'
            ],

            'officiating_minister' => [
                'sometimes',
                'required',
                'string',
                'max:255'
            ],

            'place_of_baptism' => [
                'sometimes',
                'required',
                'string',
                'max:255'
            ],

            'date_of_baptism' => [
                'sometimes',
                'required',
                'date'
            ],

            'marital_status' => [
                'sometimes',
                'required',
                'string',
                'max:50'
            ],

            'is_reclaimed' => [
                'sometimes',
                'required',
                'boolean'
            ],
        ]);

        $baptism->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Baptism record updated successfully.',
            'data' => $baptism
        ]);
    }

    /**
     * Delete the specified baptism record.
     */
    public function destroy(string $id)
    {
        $baptism = Baptism::find($id);

        if (!$baptism) {
            return response()->json([
                'success' => false,
                'message' => 'Baptism record not found.'
            ], 404);
        }

        $baptism->delete();

        return response()->json([
            'success' => true,
            'message' => 'Baptism record deleted successfully.'
        ]);
    }
}