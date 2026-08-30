<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AudioController;
use App\Http\Controllers\HistoryController;

Route::get('/', function () {
    return view('audio');
});
Route::get(
    '/history/songs',
    [HistoryController::class, 'songs']
);

Route::get(
    '/history/pitches',
    [HistoryController::class, 'pitches']
);

Route::post('/search', [AudioController::class, 'search']);
Route::post('/fetch-audio',[AudioController::class, 'fetchAudio'])->name('fetch.audio');
Route::post('/transpose', [AudioController::class, 'transpose']);
Route::post('/detect-key', [AudioController::class, 'detectKey']);
Route::post('/detect-vocal', [AudioController::class, 'detectVocal']);
Route::post('/lyrics', [AudioController::class, 'lyrics']);
Route::post('/recommendation', [AudioController::class,'recommendation']);
Route::post('/reference-melody', [AudioController::class, 'referenceMelody']);
Route::post('/save-analysis-cache', [AudioController::class, 'saveAnalysisCache']);
Route::post('/save-pitch-vocal',[AudioController::class, 'savePitchVocal']);

Route::get('/env-test', function () {
    return env('YOUTUBE_API_KEY');
});

Route::get('/config-test', function () {
    return config('services.youtube.key');
});