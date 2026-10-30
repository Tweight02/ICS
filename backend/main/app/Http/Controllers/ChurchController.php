<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Services\ReportMonitoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChurchController extends Controller
{
    /**
     * Get all districts.
     * Districts have parent_id = NULL.
     */
    public function districts(Request $request, ReportMonitoringService $monitoring): JsonResponse
    {
        $validated = $request->validate([
            'department_id' => ['sometimes', 'integer', 'exists:departments,department_id'],
            'year' => ['sometimes', 'integer', 'min:1900', 'max:'.now()->year],
        ]);
        $departmentId = isset($validated['department_id'])
            ? (int) $validated['department_id']
            : null;
        $year = isset($validated['year'])
            ? (string) $validated['year']
            : (string) config('app.reporting_year', now()->year);

        $districts = Church::query()
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get([
                'church_id',
                'name',
                'address',
                'parent_id',
            ]);

        $churchesByDistrict = Church::query()
            ->whereIn('parent_id', $districts->pluck('church_id'))
            ->get([
                'church_id',
                'parent_id',
            ])
            ->groupBy('parent_id');
        $monitoringByChurch = $monitoring->forChurches(
            $churchesByDistrict->flatten(1)->pluck('church_id')->all(),
            $departmentId,
            $year
        );

        $districts->each(function (Church $district) use ($churchesByDistrict, $monitoringByChurch) {
            $churches = $churchesByDistrict->get($district->church_id, collect());
            $district->church_count = $churches->count();

            foreach (range(1, 4) as $quarterNumber) {
                $values = $churches
                    ->map(fn (Church $church) => $monitoringByChurch[$church->church_id]['q'.$quarterNumber] ?? null)
                    ->filter(fn ($value) => $value !== null);

                $district->{'q'.$quarterNumber} = $values->isEmpty()
                    ? null
                    : (int) round($values->avg());
            }
        });

        return response()->json([
            'success' => true,
            'data' => $districts,
        ]);
    }

    /**
     * Get district options for dropdowns.
     */
    public function districtOptions(): JsonResponse
    {
        $districts = Church::query()
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get([
                'church_id',
                'name',
            ]);

        return response()->json([
            'success' => true,
            'data' => $districts,
        ]);
    }

    /**
     * Get churches belonging to a specified district.
     */
    public function churches(
        Request $request,
        int $district,
        ReportMonitoringService $monitoring
    ): JsonResponse {
        $validated = $request->validate([
            'department_id' => ['sometimes', 'integer', 'exists:departments,department_id'],
            'year' => ['sometimes', 'integer', 'min:1900', 'max:'.now()->year],
        ]);
        $departmentId = isset($validated['department_id'])
            ? (int) $validated['department_id']
            : null;
        $year = isset($validated['year'])
            ? (string) $validated['year']
            : (string) config('app.reporting_year', now()->year);

        $districtRecord = Church::query()
            ->where('church_id', $district)
            ->whereNull('parent_id')
            ->first();

        if (! $districtRecord) {
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

        $monitoringByChurch = $monitoring->forChurches(
            $churches->pluck('church_id')->all(),
            $departmentId,
            $year
        );
        if ($departmentId === 16) {
            $districtMonitoring = $monitoring->forChurches(
                [$districtRecord->church_id],
                $departmentId,
                $year
            );
            $districtRecord->monitoring = $districtMonitoring[$districtRecord->church_id] ?? [];
        }
        $churches->each(function (Church $church) use ($monitoringByChurch) {
            $church->monitoring = $monitoringByChurch[$church->church_id] ?? [
                'q1' => null,
                'q2' => null,
                'q3' => null,
                'q4' => null,
            ];
        });

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

        if (! $this->isPastor($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Pastor account required.',
            ], $user ? 403 : 401);
        }

        $district = $this->getAssignedDistrict($user->church_id);

        if (! $district) {
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
    public function myDistrictChurches(
        Request $request,
        ReportMonitoringService $monitoring
    ): JsonResponse {
        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'min:1900', 'max:'.now()->year],
        ]);
        $year = isset($validated['year'])
            ? (string) $validated['year']
            : (string) config('app.reporting_year', now()->year);
        $user = $request->user();

        if (! $this->isPastor($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Pastor account required.',
            ], $user ? 403 : 401);
        }

        $district = $this->getAssignedDistrict($user->church_id);

        if (! $district) {
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

        $monitoringByChurch = $monitoring->forChurches(
            $churches->pluck('church_id')->all(),
            null,
            $year
        );
        $churches->each(function (Church $church) use ($monitoringByChurch) {
            $church->monitoring = $monitoringByChurch[$church->church_id] ?? [
                'q1' => null,
                'q2' => null,
                'q3' => null,
                'q4' => null,
            ];
        });

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
        if (! $churchId) {
            return null;
        }

        $assignedChurch = Church::query()
            ->where('church_id', $churchId)
            ->first();

        if (! $assignedChurch) {
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
