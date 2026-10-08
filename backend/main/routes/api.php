<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Controller;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\SampleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ChurchController;
use App\Http\Controllers\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\BaptismController;
use App\Http\Controllers\DeathController;

Route::get('/test-speed', function () {
    return 'OK';
});


/*
|--------------------------------------------------------------------------
| USER
|--------------------------------------------------------------------------
*/

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


/*
|--------------------------------------------------------------------------
| SAMPLE
|--------------------------------------------------------------------------
*/

Route::get(
    '/sample',
    [SampleController::class, 'sample']
);


/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

Route::post(
    '/users',
    [UserController::class, 'create_user']
);


/*
|--------------------------------------------------------------------------
| DISTRICTS
|--------------------------------------------------------------------------
*/

Route::get(
    '/districts',
    [ChurchController::class, 'districts']
);

Route::get(
    '/districts/{district}/churches',
    [ChurchController::class, 'churches']
);


/*
|--------------------------------------------------------------------------
| REPORT - DEPARTMENTS
|--------------------------------------------------------------------------
*/

Route::get(
    '/churches/{churchId}/departments',
    [ReportController::class, 'departmentsByChurch']
);


/*
|--------------------------------------------------------------------------
| REPORT - GET
|--------------------------------------------------------------------------
*/

Route::get(
    '/churches/{churchId}/departments',
    [ReportController::class, 'getDepartments']
);

Route::get(
    '/churches/{churchId}/departments/{departmentId}/report',
    [ReportController::class, 'departmentReport']
    );

Route::get('/assistant/districts', [ChurchController::class, 'districts']);
Route::get('/assistant/departments', [DepartmentController::class, 'getDepartment']);
Route::post('/assistant/users', [UserController::class, 'create_user']);


Route::apiResource('baptisms', BaptismController::class);
Route::get('/churches', [BaptismController::class, 'allChurches']);
Route::apiResource('deaths',DeathController::class);

);


/*
|--------------------------------------------------------------------------
| REPORT - SAVE
|--------------------------------------------------------------------------
*/

Route::post(
    '/churches/{churchId}/departments/{departmentId}/report/save',
    [ReportController::class, 'saveDepartmentReport']
);


/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

Route::get(
    '/quarters/{quarterId}/comments',
    [ReportController::class, 'comments']
);


Route::post(
    '/comments',
    [ReportController::class, 'addComment']
);