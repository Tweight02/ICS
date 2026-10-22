<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BaptismController;
use App\Http\Controllers\ChurchController;
use App\Http\Controllers\DeathController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ParticipantController;
use App\Http\Controllers\PublicEventController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RepresentativeController;
use App\Http\Controllers\SampleController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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

Route::post('/login', [
    AuthController::class,
    'login',
]);

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

Route::get('/users/{id}', [
    UserController::class,
    'show',
])->whereNumber('id');

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

    Route::get('/district-options', [
        ChurchController::class,
        'districtOptions',
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
    ])->whereNumber('id');

    Route::put('/pastors/{id}', [
        UserController::class,
        'update_pastor',
    ])->whereNumber('id');

    Route::post('/pastors/{id}/activate', [
        UserController::class,
        'activate_pastor',
    ])->whereNumber('id');

    Route::delete('/pastors/{id}', [
        UserController::class,
        'deactivate_pastor',
    ])->whereNumber('id');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/district-pastor-assignments', [
            UserController::class,
            'districtPastorAssignments',
        ]);

        Route::put('/district-pastor-assignments/{districtId}', [
            UserController::class,
            'assignPastorToDistrict',
        ])->whereNumber('districtId');
    });
});

/*
|--------------------------------------------------------------------------
| REPORTS & CHURCH DEPARTMENTS
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->prefix('churches/{churchId}')->group(function () {
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
| DEPARTMENTS & PROGRAMS
|--------------------------------------------------------------------------
*/

Route::get('/departments', [
    DepartmentController::class,
    'getDepartment',
]);

Route::get('/departments/{departmentId}/programs', [
    DepartmentController::class,
    'programs',
]);

/*
|--------------------------------------------------------------------------
| EVENTS & PROGRAMS
|--------------------------------------------------------------------------
*/

Route::get('/public/events', [PublicEventController::class, 'index']);
Route::get('/public/events/{event}', [PublicEventController::class, 'show'])->whereNumber('event');
Route::post('/public/events/{event}/participants', [PublicEventController::class, 'register'])->whereNumber('event');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::get('/events/{event}', [EventController::class, 'show'])->whereNumber('event');
    Route::put('/events/{event}', [EventController::class, 'update'])->whereNumber('event');
    Route::delete('/events/{event}', [EventController::class, 'destroy'])->whereNumber('event');

    Route::get('/events/{event}/participants', [ParticipantController::class, 'index'])->whereNumber('event');
    Route::post('/events/{event}/participants', [ParticipantController::class, 'store'])->whereNumber('event');
    Route::patch('/participants/{participant}', [ParticipantController::class, 'update'])->whereNumber('participant');
    Route::delete('/participants/{participant}', [ParticipantController::class, 'destroy'])->whereNumber('participant');
});

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

Route::get('/quarters/{quarterId}/comments', [
    ReportController::class,
    'comments',
])->middleware('auth:sanctum');

Route::post('/comments', [
    ReportController::class,
    'addComment',
])->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| RESOURCE ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('baptisms', BaptismController::class);
    Route::apiResource('deaths', DeathController::class);
});

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | REPRESENTATIVES
    |--------------------------------------------------------------------------
    */

    // Keep specific routes before routes containing {id}.
    Route::get(
        '/pastor/representatives/churches',
        [RepresentativeController::class, 'available_churches']
    );

    Route::get(
        '/pastor/representatives/transfer-churches',
        [RepresentativeController::class, 'transfer_churches']
    );

    Route::post(
        '/pastor/representatives/bulk-transfer',
        [RepresentativeController::class, 'bulk_transfer']
    );

    Route::get('/pastor/representatives', [
        RepresentativeController::class,
        'index',
    ]);

    Route::get('/pastor/representatives/{id}', [
        RepresentativeController::class,
        'show',
    ])->whereNumber('id');

    Route::post('/pastor/representatives', [
        RepresentativeController::class,
        'store',
    ]);

    Route::post('/pastor/representatives/{id}/activate', [
        RepresentativeController::class,
        'activate',
    ])->whereNumber('id');

    Route::put('/pastor/representatives/{id}', [
        RepresentativeController::class,
        'update',
    ])->whereNumber('id');

    Route::delete('/pastor/representatives/{id}', [
        RepresentativeController::class,
        'destroy',
    ])->whereNumber('id');

    /*
    |--------------------------------------------------------------------------
    | PASTOR DISTRICT
    |--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | DEPARTMENT REPORT APPROVAL
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/churches/{churchId}/departments/{departmentId}/report/endorse',
        [ReportController::class, 'endorseDepartmentReport']
    );

    Route::post(
        '/churches/{churchId}/departments/{departmentId}/report/approve',
        [ReportController::class, 'approveDepartmentReport']
    );

    /*
    |--------------------------------------------------------------------------
    | ASSISTANT REPORT TEMPLATES
    |--------------------------------------------------------------------------
    */

    Route::post('/assistant/report-templates', [
        ReportController::class,
        'createReportTemplate',
    ]);

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATION TEST
    |--------------------------------------------------------------------------
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
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    Route::post('/logout', function (Request $request) {
        $user = $request->user();

        $token = $user->currentAccessToken();

        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    });
});
