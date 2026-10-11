<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BaptismController;
use App\Http\Controllers\ChurchController;
use App\Http\Controllers\DeathController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RepresentativeController;
use App\Http\Controllers\SampleController;
use App\Http\Controllers\UserController;

Route::get('/test-speed', function () {
    return 'OK';
});
Route::post('/login', [AuthController::class, 'login']);

Route::get('/user', fn(Request $request) => $request->user())->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| USERS & SAMPLES
|--------------------------------------------------------------------------
*/

Route::get('/sample', [SampleController::class, 'sample']);
Route::post('/users', [UserController::class, 'create_user']);

/*
|--------------------------------------------------------------------------
| DISTRICTS & CHURCHES
|--------------------------------------------------------------------------
*/

Route::get('/churches', [BaptismController::class, 'allChurches']);
Route::get('/districts', [ChurchController::class, 'districts']);
Route::get('/districts/{district}/churches', [ChurchController::class, 'churches']);

/*
|--------------------------------------------------------------------------
| ASSISTANT ROUTES
|--------------------------------------------------------------------------
*/

Route::prefix('assistant')->group(function () {
    Route::get('/districts', [ChurchController::class, 'districts']);
    Route::get('/departments', [DepartmentController::class, 'getDepartment']);
    Route::post('/users', [UserController::class, 'create_user']);
    Route::get('/pastors', [UserController::class, 'view_pastors']);
    Route::get('/pastors/{id}', [UserController::class, 'view_pastor']);
    Route::put('/pastors/{id}', [UserController::class, 'update_pastor']);
    Route::post('/pastors/bulk-transfer', [UserController::class, 'bulk_transfer']);
});

/*
|--------------------------------------------------------------------------
| REPORTS & DEPARTMENTS
|--------------------------------------------------------------------------
*/

Route::prefix('churches/{churchId}')->group(function () {
    Route::get('/departments', [ReportController::class, 'getDepartments']);
    Route::get('/departments/{departmentId}/report', [ReportController::class, 'departmentReport']);
    Route::post('/departments/{departmentId}/report/save', [ReportController::class, 'saveDepartmentReport']);
});

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

Route::get('/quarters/{quarterId}/comments', [ReportController::class, 'comments']);
Route::post('/comments', [ReportController::class, 'addComment']);

/*
|--------------------------------------------------------------------------
| RESOURCES
|--------------------------------------------------------------------------
*/

Route::apiResource('baptisms', BaptismController::class);
Route::apiResource('deaths', DeathController::class);
Route::get('/churches', [BaptismController::class, 'allChurches']);
Route::apiResource('deaths', DeathController::class);

Route::middleware([
    'auth:sanctum'
])->group(function () {

    Route::get(
        '/representatives',
        [RepresentativeController::class, 'index']
    );

    Route::post(
        '/representatives',
        [RepresentativeController::class, 'store']
    );

    Route::get(
        '/representatives/{id}',
        [RepresentativeController::class, 'show']
    );

    Route::put(
        '/representatives/{id}',
        [RepresentativeController::class, 'update']
    );

});