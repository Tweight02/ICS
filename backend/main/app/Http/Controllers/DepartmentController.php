<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DepartmentController extends Controller
{
    //
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
}
