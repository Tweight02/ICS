<?php

namespace App\Http\Controllers;

use App\Models\Church;
use Illuminate\Http\JsonResponse;

class ChurchController extends Controller
{
    /**
     * Get all districts.
     *
     * Districts are the records where parent_id is NULL.
     */
    public function districts(): JsonResponse
    {
        $districts = Church::query()
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get([
                'church_id',
                'name',
                'address',
                'parent_id',
            ]);

        return response()->json([
            'success' => true,
            'data' => $districts,
        ]);
    }

    /**
     * Get all churches/companies belonging to a district.
     */
    public function churches(int $district): JsonResponse
    {
        $districtRecord = Church::query()
            ->where('church_id', $district)
            ->whereNull('parent_id')
            ->first();

        if (!$districtRecord) {
            return response()->json([
                'success' => false,
                'message' => 'District not found.',
            ], 404);
        }

        $churches = Church::query()
            ->where('parent_id', $district)
            ->orderBy('name')
            ->get([
                'church_id',
                'name',
                'address',
                'parent_id',
            ]);

        return response()->json([
            'success' => true,
            'district' => [
                'church_id' => $districtRecord->church_id,
                'name' => $districtRecord->name,
                'address' => $districtRecord->address,
            ],
            'data' => $churches,
        ]);
    }
}