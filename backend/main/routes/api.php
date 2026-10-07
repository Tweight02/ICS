<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Controller;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\SampleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ChurchController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;

Route::get('/test-speed', function () {
    return 'OK';
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/sample', [SampleController::class, 'sample']);


Route::get('/districts', [ChurchController::class, 'districts']);
Route::get('/districts/{district}/churches', [ChurchController::class, 'churches']);

Route::get(
    '/churches/{churchId}/departments',
    [ReportController::class, 'departmentsByChurch']
);

Route::get(
    '/churches/{churchId}/departments/{departmentId}/report',
    [ReportController::class, 'departmentReport']
    );

Route::get('/assistant/districts', [ChurchController::class, 'districts']);
Route::get('/assistant/departments', [DepartmentController::class, 'getDepartment']);
Route::post('/assistant/users', [UserController::class, 'create_user']);