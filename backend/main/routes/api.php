
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

/*
|--------------------------------------------------------------------------
| TEST ROUTES
|--------------------------------------------------------------------------
*/

Route::get('/test-speed', function () {
    return 'OK';
});

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

// Login does not require authentication.
Route::post('/login', [
    AuthController::class,
    'login',
]);

// Return the authenticated user.
Route::get('/user', function (Request $request) {
    return response()->json($request->user());
})->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| USERS & SAMPLES
|--------------------------------------------------------------------------
*/

Route::get('/sample', [
    SampleController::class,
    'sample',
]);

Route::post('/users', [
    UserController::class,
    'create_user',
]);

/*
|--------------------------------------------------------------------------
| DISTRICTS & CHURCHES
|--------------------------------------------------------------------------
*/

Route::get('/churches', [
    BaptismController::class,
    'allChurches',
]);

Route::get('/districts', [
    ChurchController::class,
    'districts',
]);

Route::get('/districts/{district}/churches', [
    ChurchController::class,
    'churches',
]);

/*
|--------------------------------------------------------------------------
| ASSISTANT ROUTES
|--------------------------------------------------------------------------
*/

Route::prefix('assistant')->group(function () {
    Route::get('/districts', [
        ChurchController::class,
        'districts',
    ]);

    Route::get('/districts/{churchId}/pastor', [
        UserController::class,
        'districtPastor',
    ])->whereNumber('churchId');

    Route::get('/departments', [
        DepartmentController::class,
        'getDepartment',
    ]);

    Route::post('/users', [
        UserController::class,
        'create_user',
    ]);

    Route::get('/pastors', [
        UserController::class,
        'view_pastors',
    ]);

    Route::get('/pastors/{id}', [
        UserController::class,
        'view_pastor',
    ]);

    Route::put('/pastors/{id}', [
        UserController::class,
        'update_pastor',
    ]);

    Route::post('/pastors/bulk-transfer', [
        UserController::class,
        'bulk_transfer',
    ]);
});

/*
|--------------------------------------------------------------------------
| REPORTS & DEPARTMENTS
|--------------------------------------------------------------------------
*/

Route::prefix('churches/{churchId}')->group(function () {
    Route::get('/departments', [
        ReportController::class,
        'getDepartments',
    ]);

    Route::get('/departments/{departmentId}/report', [
        ReportController::class,
        'departmentReport',
    ]);

    Route::post('/departments/{departmentId}/report/save', [
        ReportController::class,
        'saveDepartmentReport',
    ]);

    Route::get('/departments/{departmentId}/comments', [
        ReportController::class,
        'departmentComments',
    ]);
});

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

Route::get('/quarters/{quarterId}/comments', [
    ReportController::class,
    'comments',
]);

Route::post('/comments', [
    ReportController::class,
    'addComment',
])->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| RESOURCE ROUTES
|--------------------------------------------------------------------------
*/

Route::apiResource('baptisms', BaptismController::class);

Route::apiResource('deaths', DeathController::class);

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    | Representatives
    */

    Route::get('/representatives', [
        RepresentativeController::class,
        'index',
    ]);

    Route::post('/representatives', [
        RepresentativeController::class,
        'store',
    ]);

    Route::get('/representatives/{id}', [
        RepresentativeController::class,
        'show',
    ]);

    Route::put('/representatives/{id}', [
        RepresentativeController::class,
        'update',
    ]);

    /*
    | Pastor: assigned district
    |
    | GET /api/pastor/my-district
    | GET /api/pastor/my-district/churches
    */

    Route::prefix('pastor')->group(function () {
        Route::get('/my-district', [
            ChurchController::class,
            'myDistrict',
        ]);

        Route::get('/my-district/churches', [
            ChurchController::class,
            'myDistrictChurches',
        ]);
    });

    Route::post('/churches/{churchId}/departments/{departmentId}/report/endorse', [
        ReportController::class,
        'endorseDepartmentReport',
    ]);

    Route::post('/churches/{churchId}/departments/{departmentId}/report/approve', [
        ReportController::class,
        'approveDepartmentReport',
    ]);

    /*
    | Authentication test
    */

    Route::get('/test-auth', function (Request $request) {
        $user = $request->user();

        return response()->json([
            'authenticated' => true,
            'user_id' => $user->user_id,
            'role' => $user->role,
            'church_id' => $user->church_id,
        ]);
    });

    /*
    | Logout
    */

    Route::post('/logout', function (Request $request) {
        $token = $request->user()->currentAccessToken();

        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    });
});
