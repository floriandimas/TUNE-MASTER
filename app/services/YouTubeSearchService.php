<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class YouTubeSearchService
{
    private array $recommendedChannels = [
        [
            'name' => 'Sing King',
            'channel_id' => 'UCwTRjvjVge51X-ILJ4i22ew',
            'keywords' => ['sing king'],
            'priority' => 1,
        ],
        [
            'name' => 'Karaoke Music',
            'channel_id' => null,
            'keywords' => ['karaoke music'],
            'priority' => 2,
        ],
        [
            'name' => 'INDO INDIE KARAOKE',
            'channel_id' => null,
            'keywords' => ['indo indie karaoke'],
            'priority' => 3,
        ],
        [
            'name' => 'GMusic Entertainment',
            'channel_id' => null,
            'keywords' => ['gmusic entertainment'],
            'priority' => 3,
        ],
        [
            'name' => 'Capleo Music',
            'channel_id' => null,
            'keywords' => ['capleo music'],
            'priority' => 4,
        ],
        [
            'name' => 'SUPER KARAOKE',
            'channel_id' => null,
            'keywords' => ['super karaoke'],
            'priority' => 5,
        ],
        [
            'name' => 'M&L Studio',
            'channel_id' => null,
            'keywords' => ['M&L Studio'],
            'priority' => 6,
        ],
    ];

    public function search(string $searchInput): array
    {
        $apiKey = config('services.youtube.key');

        if (!$apiKey) {
            throw new RuntimeException('YouTube API Key belum dikonfigurasi.');
        }

        $response = Http::timeout(30)
            ->retry(2, 1000)
            ->get('https://www.googleapis.com/youtube/v3/search', [
                'part' => 'snippet',
                'q' => $searchInput . ' karaoke',
                'type' => 'video',
                'maxResults' => 25,
                'order' => 'relevance',
                'videoEmbeddable' => 'true',
                'videoSyndicated' => 'true',
                'safeSearch' => 'moderate',
                'regionCode' => 'ID',
                'relevanceLanguage' => 'id',
                'key' => $apiKey,
            ]);

        $data = $response->json();

        if (!$response->successful()) {
            throw new RuntimeException(
                data_get($data, 'error.message', 'YouTube API gagal memproses pencarian.')
            );
        }

        $searchWords = $this->searchWords($searchInput);
        $results = [];

        foreach (($data['items'] ?? []) as $index => $item) {
            $videoId = data_get($item, 'id.videoId');

            if (!$videoId) {
                continue;
            }

            $title = html_entity_decode(
                data_get($item, 'snippet.title', ''),
                ENT_QUOTES | ENT_HTML5,
                'UTF-8'
            );

            // Judul wajib memuat seluruh kata yang dimasukkan pengguna.
            // Channel rekomendasi tidak boleh membuat lagu berbeda ikut tampil.
            if (!$this->titleMatches($title, $searchWords)) {
                continue;
            }

            $channelId = data_get($item, 'snippet.channelId', '');
            $channelTitle = html_entity_decode(
                data_get($item, 'snippet.channelTitle', 'Channel tidak diketahui'),
                ENT_QUOTES | ENT_HTML5,
                'UTF-8'
            );

            $source = $this->detectRecommendedSource($channelId, $channelTitle);
            $normalizedTitle = $this->normalize($title);
            $hasKaraokeKeyword = $this->containsKaraokeKeyword($normalizedTitle);

            // Query API sudah ditambah "karaoke", tetapi hasil tetap harus berupa
            // karaoke/instrumental agar lagu versi vokal asli tidak ikut tampil.
            if (!$hasKaraokeKeyword) {
                continue;
            }

            $results[] = [
                'id' => [
                    'videoId' => $videoId,
                ],
                'snippet' => [
                    'title' => $title,
                    'description' => data_get($item, 'snippet.description', ''),
                    'channelId' => $channelId,
                    'channelTitle' => $channelTitle,
                    'publishedAt' => data_get($item, 'snippet.publishedAt'),
                    'thumbnails' => data_get($item, 'snippet.thumbnails', []),
                ],
                'source' => [
                    'recommended' => $source['recommended'],
                    'badge' => $source['recommended'] ? 'Sumber Direkomendasikan' : null,
                    'recommended_name' => $source['name'],
                    'priority' => $source['priority'],
                    'original_position' => $index + 1,
                    'has_karaoke_keyword' => true,
                ],
            ];
        }

        return collect($results)
            ->unique(fn (array $item) => data_get($item, 'id.videoId'))
            ->sort(function (array $first, array $second): int {
                $firstRecommended = data_get($first, 'source.recommended', false);
                $secondRecommended = data_get($second, 'source.recommended', false);

                if ($firstRecommended !== $secondRecommended) {
                    return $firstRecommended ? -1 : 1;
                }

                if ($firstRecommended && $secondRecommended) {
                    $priorityComparison = data_get($first, 'source.priority', 999)
                        <=> data_get($second, 'source.priority', 999);

                    if ($priorityComparison !== 0) {
                        return $priorityComparison;
                    }
                }

                return data_get($first, 'source.original_position', 999)
                    <=> data_get($second, 'source.original_position', 999);
            })
            ->take(10)
            ->values()
            ->all();
    }

    private function searchWords(string $query): array
    {
        $words = preg_split('/\s+/u', $this->normalize($query), -1, PREG_SPLIT_NO_EMPTY);

        return array_values(array_unique($words ?: []));
    }

    private function titleMatches(string $title, array $searchWords): bool
    {
        $normalizedTitle = $this->normalize($title);

        foreach ($searchWords as $word) {
            if (!str_contains($normalizedTitle, $word)) {
                return false;
            }
        }

        return $searchWords !== [];
    }

    private function detectRecommendedSource(string $channelId, string $channelTitle): array
    {
        $normalizedChannel = $this->normalize($channelTitle);

        foreach ($this->recommendedChannels as $channel) {
            $matchedById = !empty($channel['channel_id'])
                && $channelId === $channel['channel_id'];

            $matchedByName = collect($channel['keywords'])->contains(
                fn (string $keyword) => str_contains(
                    $normalizedChannel,
                    $this->normalize($keyword)
                )
            );

            if ($matchedById || $matchedByName) {
                return [
                    'recommended' => true,
                    'name' => $channel['name'],
                    'priority' => $channel['priority'],
                ];
            }
        }

        return [
            'recommended' => false,
            'name' => null,
            'priority' => 999,
        ];
    }

    private function containsKaraokeKeyword(string $title): bool
    {
        foreach ([
            'karaoke',
            'instrumental',
            'minus one',
            'backing track',
            'no vocal',
            'tanpa vokal',
        ] as $keyword) {
            if (str_contains($title, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function normalize(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = mb_strtolower(trim($text), 'UTF-8');
        $text = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text);

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }
}