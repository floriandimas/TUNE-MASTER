<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class LyricsService
{
    public function find(string $title): array
    {
        $title = trim($title);

        if ($title === '') {
            return $this->emptyResult();
        }

        $title = str_replace(['–', '—', '−', '|'], '-', $title);
        $title = preg_replace('/\s+/', ' ', $title) ?? $title;
        $index = strrpos($title, '-');

        if ($index === false) {
            return $this->emptyResult();
        }

        $left = trim(substr($title, 0, $index));
        $right = trim(substr($title, $index + 1));

        $artistCandidates = $this->artistCandidates([$left, $right]);
        $trackCandidates = $this->trackCandidates([$left, $right]);

        foreach ($artistCandidates as $artist) {
            foreach ($trackCandidates as $track) {
                try {
                    $response = Http::timeout(15)
                        ->retry(1, 500)
                        ->get('https://lrclib.net/api/get', [
                            'artist_name' => $artist,
                            'track_name' => $track,
                        ]);
                } catch (\Throwable) {
                    continue;
                }

                if (!$response->successful()) {
                    continue;
                }

                $data = $response->json();

                if ($this->hasLyrics($data)) {
                    return $this->formatResult($data, $track, $artist);
                }
            }
        }

        foreach ($trackCandidates as $track) {
            foreach ($artistCandidates as $artist) {
                try {
                    $response = Http::timeout(15)
                        ->retry(1, 500)
                        ->get('https://lrclib.net/api/search', [
                            'q' => $track . ' ' . $artist,
                        ]);
                } catch (\Throwable) {
                    continue;
                }

                if (!$response->successful()) {
                    continue;
                }

                foreach (($response->json() ?? []) as $item) {
                    if ($this->hasLyrics($item)) {
                        return $this->formatResult($item);
                    }
                }
            }
        }

        return $this->emptyResult();
    }

    private function artistCandidates(array $parts): array
    {
        $candidates = [];

        foreach ($parts as $artist) {
            $candidates[] = $artist;
            $candidates[] = $this->normalizeText($artist);
            $candidates[] = preg_replace('/\s+(feat|ft|featuring)\.?.*$/i', '', $artist);
            $candidates[] = preg_split('/&|,| x | X /i', $artist)[0] ?? '';
            $candidates[] = preg_split('/ dan /i', $artist)[0] ?? '';
        }

        return $this->uniqueClean($candidates);
    }

    private function trackCandidates(array $parts): array
    {
        $candidates = [];

        foreach ($parts as $track) {
            $candidates[] = $track;
            $candidates[] = $this->normalizeText($track);
            $candidates[] = preg_replace('/\s*\(.*?\)/', '', $track);
            $candidates[] = preg_replace('/\s*\[.*?\]/', '', $track);
        }

        return $this->uniqueClean($candidates);
    }

    private function uniqueClean(array $values): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn ($value) => trim((string) $value),
            $values
        ))));
    }

    private function hasLyrics(mixed $data): bool
    {
        return is_array($data)
            && (!empty($data['plainLyrics']) || !empty($data['syncedLyrics']));
    }

    private function formatResult(array $data, string $track = '', string $artist = ''): array
    {
        return [
            'plainLyrics' => $data['plainLyrics'] ?? '',
            'syncedLyrics' => $data['syncedLyrics'] ?? '',
            'trackName' => $data['trackName'] ?? $track,
            'artistName' => $data['artistName'] ?? $artist,
        ];
    }

    private function emptyResult(): array
    {
        return [
            'plainLyrics' => '',
            'syncedLyrics' => '',
        ];
    }

    private function normalizeText(string $text): string
    {
        if (function_exists('iconv')) {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);

            if ($converted !== false) {
                $text = $converted;
            }
        }

        $text = str_replace(['–', '—', '−', '|'], '-', $text);
        $text = preg_replace('/\s*\(.*?\)/', '', $text) ?? $text;
        $text = preg_replace('/\s*\[.*?\]/', '', $text) ?? $text;
        $text = preg_replace(
            '/\b(karaoke|official|video|lyrics|lyric|audio|hd|hq|4k|version|original key|female key|male key)\b/i',
            '',
            $text
        ) ?? $text;
        $text = preg_replace('/\s+(feat|ft|featuring)\.?.*$/i', '', $text) ?? $text;

        return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
    }
}