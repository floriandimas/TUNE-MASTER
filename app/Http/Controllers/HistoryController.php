<?php

namespace App\Http\Controllers;

use App\Models\HasilAnalisis;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    public function songs(Request $request): JsonResponse
    {
        $visitorId = $this->getVisitorId($request);

        if (!$visitorId) {
            return response()->json([
                'success' => false,
                'message' => 'Visitor ID tidak ditemukan.',
                'items' => [],
            ], 400);
        }

        /*
        |--------------------------------------------------------------------------
        | Ambil lagu unik yang pernah digunakan pengunjung
        |--------------------------------------------------------------------------
        */

        $history = HasilAnalisis::with('lagu')
            ->where('visitor_id', $visitorId)
            ->latest('created_at')
            ->get()
            ->filter(fn ($item) => $item->lagu !== null)
            ->unique('lagu_id')
            ->values()
            ->map(function ($item) {
                return [
                    'lagu_id' => $item->lagu->id_lagu,
                    'title' => $item->lagu->judul,
                    'channel' => $item->lagu->channel_title,
                    'original_key' => $item->lagu->key_asli,
                    'lowest_note' => $item->lagu->nada_terendah,
                    'highest_note' => $item->lagu->nada_tertinggi,
                    'used_at' => optional($item->created_at)
                        ->format('d-m-Y H:i'),
                ];
            });

        return response()->json([
            'success' => true,
            'total' => $history->count(),
            'items' => $history,
        ]);
    }

    public function pitches(Request $request): JsonResponse
    {
        $visitorId = $this->getVisitorId($request);

        if (!$visitorId) {
            return response()->json([
                'success' => false,
                'message' => 'Visitor ID tidak ditemukan.',
                'items' => [],
            ], 400);
        }

        /*
        |--------------------------------------------------------------------------
        | Ambil seluruh riwayat pitch shifting pengunjung
        |--------------------------------------------------------------------------
        */

        $history = HasilAnalisis::with([
            'lagu',
            'hasilPitch',
        ])
            ->where('visitor_id', $visitorId)
            ->latest('created_at')
            ->limit(100)
            ->get()
            ->filter(function ($item) {
                return $item->lagu !== null
                    && $item->hasilPitch !== null;
            })
            ->values()
            ->map(function ($item) {
                $pitchFile = basename(
                    $item->hasilPitch->path_pitch
                );

                return [
                    'analysis_id' => $item->id_analisis,
                    'title' => $item->lagu->judul,
                    'channel' => $item->lagu->channel_title,
                    'original_key' => $item->lagu->key_asli,
                    'target_key' => $item->hasilPitch->key_hasil,
                    'recommended_key' => $item->key_rekomendasi,
                    'transpose' => $item->transpose,
                    'vocal_lowest' => $item->nada_terendah_vokal,
                    'vocal_highest' => $item->nada_tertinggi_vokal,
                    'audio_path' => asset(
                        'storage/' . $pitchFile
                    ),
                    'created_at' => optional($item->created_at)
                        ->format('d-m-Y H:i'),
                ];
            });

        return response()->json([
            'success' => true,
            'total' => $history->count(),
            'items' => $history,
        ]);
    }

    private function getVisitorId(Request $request): ?string
    {
        return $request->attributes->get('visitor_id')
            ?? $request->cookie('visitor_id');
    }
}