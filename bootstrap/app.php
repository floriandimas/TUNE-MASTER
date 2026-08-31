<?php

use App\Http\Middleware\EnsureVisitorId;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->appendToGroup('web', [
            EnsureVisitorId::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('audio:cleanup-old-files --days=30')->dailyAt('03:00');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
