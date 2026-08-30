<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EnsureVisitorId
{
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $visitorId =
            $request->cookie('visitor_id');

        if(!$visitorId) {
            $visitorId =
                (string) Str::uuid();
        }

        $request->attributes->set(
            'visitor_id',
            $visitorId
        );

        $response =
            $next($request);

        if(!$request->cookie('visitor_id')) {
            $response->withCookie(
                cookie(
                    'visitor_id',
                    $visitorId,
                    60 * 24 * 180
                )
            );
        }

        return $response;
    }
}