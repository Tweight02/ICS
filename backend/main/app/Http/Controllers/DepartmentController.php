<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DepartmentController extends Controller
{
    public function getDepartment()
    {
        $start = microtime(true);

        $departments = Department::query()
            ->select([
                'department_id',
                'department_name',
            ])
            ->orderBy('department_name')
            ->get();

        $queryEnd = microtime(true);

        $response = response()->json([
            'success' => true,
            'data' => $departments,
        ]);

        $responseEnd = microtime(true);

        Log::info('Department API', [
            'query_ms' => ($queryEnd - $start) * 1000,
            'controller_ms' => ($responseEnd - $start) * 1000,
        ]);

        return $response;
    }

    // GET /api/departments/{departmentId}/programs
    public function programs($departmentId)
    {
        $department = Department::with([
            'programs:program_id,department_id,program_name,parent_id',
            'programs.particulars:particular_id,program_id,particular_name',
        ])->findOrFail($departmentId);

        return response()->json([
            'success' => true,
            'data'    => $department->programs,
        ]);
    }
}
