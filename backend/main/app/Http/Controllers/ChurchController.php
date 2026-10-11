<?php

namespace App\Http\Controllers;

use App\Models\Church;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChurchController extends Controller
{
    /**
     * Get all districts.
     * Districts have parent_id = NULL.
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
     * Get churches belonging to a specified district.
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
            'district' => $districtRecord,
            'data' => $churches,
        ]);
    }

    /**
     * Get the authenticated pastor's assigned district.
     */
    public function myDistrict(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$this->isPastor($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Pastor account required.',
            ], $user ? 403 : 401);
        }

        $district = $this->getAssignedDistrict($user->church_id);

        if (!$district) {
            return response()->json([
                'success' => false,
                'message' => 'Assigned district not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'district' => $district,
        ]);
    }

    /**
     * Get only the churches belonging to the authenticated
     * pastor's assigned district.
     */
    public function myDistrictChurches(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$this->isPastor($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Pastor account required.',
            ], $user ? 403 : 401);
        }

        $district = $this->getAssignedDistrict($user->church_id);

        if (!$district) {
            return response()->json([
                'success' => false,
                'message' => 'Assigned district not found.',
            ], 404);
        }

        $churches = Church::query()
            ->where('parent_id', $district->church_id)
            ->orderBy('name')
            ->get([
                'church_id',
                'name',
                'address',
                'parent_id',
            ]);

        return response()->json([
            'success' => true,
            'district' => $district,
            'data' => $churches,
        ]);
    }

    /**
     * Check whether the authenticated user is a pastor.
     */
    private function isPastor($user): bool
    {
        return $user !== null
            && strtolower(trim((string) $user->role)) === 'pastor';
    }

    /**
     * Resolve the user's assigned district.
     *
     * users.church_id may refer to the district itself
     * or to a local church whose parent_id identifies its district.
     */
    private function getAssignedDistrict($churchId): ?Church
    {
        if (!$churchId) {
            return null;
        }

        $assignedChurch = Church::query()
            ->where('church_id', $churchId)
            ->first();

        if (!$assignedChurch) {
            return null;
        }

        $districtId = $assignedChurch->parent_id === null
            ? $assignedChurch->church_id
            : $assignedChurch->parent_id;

        return Church::query()
            ->where('church_id', $districtId)
            ->whereNull('parent_id')
            ->first();
    }
}
