<?php

use App\Modules\Events\Http\Controllers\CatalogController;
use App\Modules\Events\Http\Controllers\EventController;
use App\Modules\Events\Http\Controllers\MeController;
use App\Modules\Events\Http\Controllers\ParticipantController;
use Illuminate\Support\Facades\Route;

// Loaded from routes/api.php, so every path starts with /api.
// Use the same auth middleware your other protected routes use (config/events.php).
Route::middleware(config('events.middleware'))->group(function () {
    Route::get('/me', MeController::class);

    Route::get('/catalog/departments', [CatalogController::class, 'departments']);
    Route::get('/catalog/districts', [CatalogController::class, 'districts']);
    Route::get('/catalog/churches', [CatalogController::class, 'churches']);

    Route::get('/events/calendar', [EventController::class, 'calendar']); // before the resource
    Route::apiResource('events', EventController::class);

    Route::get('/events/{event}/participants', [ParticipantController::class, 'index']);
    Route::post('/events/{event}/participants', [ParticipantController::class, 'store']);
    Route::patch('/participants/{participant}', [ParticipantController::class, 'update']);
    Route::delete('/participants/{participant}', [ParticipantController::class, 'destroy']);
});
