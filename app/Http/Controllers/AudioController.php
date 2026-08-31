<?php

namespace App\Http\Controllers;

use App\Models\HasilAnalisis;
use App\Models\HasilPitch;
use App\Models\Lagu;
use App\Services\LyricsService;
use App\Services\YouTubeSearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AudioController extends Controller
{
    public function __construct(
        private readonly YouTubeSearchService $youtubeSearchService,
        private readonly LyricsService $lyricsService
    ) {}

    public function search(Request $request)
    {
        set_time_limit(120);

        $validated = $request->validate([
            'query' => 'required|string|max:150',
        ]);

        $searchInput = trim($validated['query']);

        if ($searchInput === '') {
            return response()->json([
                'success' => false,
                'message' => 'Judul lagu tidak boleh kosong.',
                'items' => [],
            ], 422);
        }

        try {
            $items = $this->youtubeSearchService->search($searchInput);

            return response()->json([
                'success' => true,
                'message' => empty($items)
                    ? 'Lagu karaoke yang sesuai tidak ditemukan.'
                    : 'Pencarian berhasil.',
                'query' => $searchInput,
                'total' => count($items),
                'items' => $items,
            ]);
        } catch (\Throwable $error) {
            Log::error('YouTube search error', [
                'query' => $searchInput,
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $error->getMessage(),
                'items' => [],
            ], 500);
        }
    }

    public function fetchAudio(Request $request)
    {
        set_time_limit(300);

        $validated = $request->validate([
            'videoId' => 'required|string|max:100',
            'title' => 'nullable|string|max:255',
            'channelTitle' => 'nullable|string|max:255',
        ]);

        $videoId = $validated['videoId'];
        $title = trim((string) ($validated['title'] ?? ''));
        $channelTitle = trim((string) ($validated['channelTitle'] ?? ''));

        $downloadMode = (string) config('services.youtube_download.mode', 'mp3');
        $ffmpegLocation = (string) config('services.youtube_download.ffmpeg_location', '');
        $defaultExtension = $downloadMode === 'original' ? 'webm' : 'mp3';
        $filename = 'audio_' . md5($videoId) . '.' . $defaultExtension;
        $fullPath = storage_path('app/public/' . $filename);

        try {
            /*
            |--------------------------------------------------------------------------
            | Unduh audio apabila file belum tersedia
            |--------------------------------------------------------------------------
            */

            if (!file_exists($fullPath)) {
                $url = 'https://www.youtube.com/watch?v=' . $videoId;
                $python = (string) config('services.python.bin', 'python');
                $script = base_path('python/download_audio.py');

                $command = sprintf(
                    '%s %s %s %s %s %s 2>&1',
                    escapeshellcmd($python),
                    escapeshellarg($script),
                    escapeshellarg($url),
                    escapeshellarg($fullPath),
                    escapeshellarg($downloadMode),
                    escapeshellarg($ffmpegLocation)
                );

                $output = [];
                $exitCode = 0;

                exec($command, $output, $exitCode);

                $rawOutput = implode("\n", $output);
                $downloadResult = json_decode($rawOutput, true);

                $downloadedPath = data_get($downloadResult, 'path', $fullPath);

                if (!file_exists($downloadedPath)) {
                    Log::error('Download audio gagal', [
                        'video_id' => $videoId,
                        'exit_code' => $exitCode,
                        'output' => $output,
                        'download_result' => $downloadResult,
                        'downloaded_path' => $downloadedPath,
                    ]);

                    return response()->json([
                        'success' => false,
                        'error' => data_get(
                            $downloadResult,
                            'error',
                            'Download audio gagal. Pastikan modul Python yt-dlp dan ffmpeg tersedia.'
                        ),
                    ], 500);
                }

                $fullPath = $downloadedPath;
                $filename = basename($downloadedPath);
            }

            /*
            |--------------------------------------------------------------------------
            | Simpan atau perbarui data lagu
            |--------------------------------------------------------------------------
            */

            $lagu = Lagu::firstOrNew([
                'video_id' => $videoId,
            ]);

            // Hindari mengganti judul yang sudah benar dengan video ID.
            if ($title !== '') {
                $lagu->judul = $title;
            } elseif (!$lagu->exists || empty($lagu->judul)) {
                $lagu->judul = $videoId;
            }

            if ($channelTitle !== '') {
                $lagu->channel_title = $channelTitle;
            }

            $lagu->path_file = $filename;
            $lagu->format = 'mp3';
            $lagu->save();

            return response()->json([
                'success' => true,
                'path' => asset('storage/' . $filename),
                'lagu_id' => $lagu->id_lagu,
                'cached' => true,
            ]);
        } catch (\Throwable $error) {
            Log::error('Fetch audio error', [
                'video_id' => $videoId,
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Terjadi kesalahan saat mengambil audio.',
            ], 500);
        }
    }

    public function detectKey(Request $request)
    {
        set_time_limit(300);

        $validated = $request->validate([
            'path' => 'required|string',
        ]);

        $path = $validated['path'];
        $filename = basename(parse_url($path, PHP_URL_PATH));

        $fullPath = storage_path('app/public/' . $filename);
        $cacheFile = storage_path('app/key_cache.json');

        if (!file_exists($fullPath)) {
            return response()->json([
                'success' => false,
                'error' => 'File audio tidak ditemukan.',
            ], 404);
        }

        /*
        |--------------------------------------------------------------------------
        | Muat cache
        |--------------------------------------------------------------------------
        */

        $cache = [];

        if (file_exists($cacheFile)) {
            $cache = json_decode(
                file_get_contents($cacheFile),
                true
            ) ?? [];
        }

        /*
        |--------------------------------------------------------------------------
        | Gunakan cache jika sudah tersedia
        |--------------------------------------------------------------------------
        */

        if (isset($cache[$filename])) {
            $result = $cache[$filename];

            $lagu = $this->updateLaguFromDetection(
                $filename,
                $result
            );

            $result['lagu_id'] = $lagu?->id_lagu;
            $result['from_cache'] = true;

            return response()->json($result);
        }

        /*
        |--------------------------------------------------------------------------
        | Jalankan deteksi key
        |--------------------------------------------------------------------------
        */

        $python = 'python';
        $script = base_path('python/key_detection.py');

        $command = sprintf(
            '%s %s %s',
            escapeshellcmd($python),
            escapeshellarg($script),
            escapeshellarg($fullPath)
        );

        $output = shell_exec($command);

        $data = json_decode($output, true);

        if (
            !$data ||
            !isset($data['success']) ||
            $data['success'] !== true
        ) {
            Log::error('Deteksi key gagal', [
                'filename' => $filename,
                'raw_output' => $output,
            ]);

            return response()->json([
                'success' => false,
                'error' => $data['error']
                    ?? 'Gagal membaca hasil deteksi key.',
            ], 500);
        }

        /*
        |--------------------------------------------------------------------------
        | Susun hasil
        |--------------------------------------------------------------------------
        */

        $result = [
            'success' => true,

            'key' => $data['best'] ?? 'UNKNOWN',
            'confidence' => $data['confidence'] ?? 0,
            'harmonic_ratio' => $data['harmonic_ratio'] ?? 0,
            'status' => $data['status'] ?? '-',

            'candidates' => $data['candidates'] ?? [],

            'lowest_note' => $data['lowest_note'] ?? '-',
            'highest_note' => $data['highest_note'] ?? '-',

            'lowest_midi' => $data['lowest_midi'] ?? 0,
            'highest_midi' => $data['highest_midi'] ?? 0,

            'range' => $data['range'] ?? '-',
            'range_width' => $data['range_width'] ?? 0,

            'dominant_note' => $data['dominant_note'] ?? '-',
            'graph' => $data['graph'] ?? [],
            'reference_graph' => $data['reference_graph'] ?? [],
            'reference_threshold' => $data['reference_threshold'] ?? null,
            'reference_pitch_frames' => $data['reference_pitch_frames'] ?? 0,
            'reference_duration' => $data['reference_duration'] ?? 0,
            'melody_segments' => $data['melody_segments'] ?? [],
        ];

        /*
        |--------------------------------------------------------------------------
        | Simpan ke database
        |--------------------------------------------------------------------------
        */

        $lagu = $this->updateLaguFromDetection(
            $filename,
            $result
        );

        $result['lagu_id'] = $lagu?->id_lagu;
        $result['from_cache'] = false;

        /*
        |--------------------------------------------------------------------------
        | Simpan cache JSON
        |--------------------------------------------------------------------------
        */

        $cache[$filename] = $result;

        file_put_contents(
            $cacheFile,
            json_encode(
                $cache,
                JSON_PRETTY_PRINT |
                    JSON_UNESCAPED_UNICODE
            )
        );

        return response()->json($result);
    }

    public function transpose(Request $request)
    {
        set_time_limit(300);

        /*
        |--------------------------------------------------------------------------
        | Validasi request
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'path' => 'required|string',
            'semitone' => 'required|integer|min:-11|max:11',
            'target_key' => 'required|string|max:10',
            'recommended_key' => 'nullable|string|max:10',
            'vocal_lowest' => 'nullable|string|max:20',
            'vocal_highest' => 'nullable|string|max:20',
        ]);

        $path =
            $validated['path'];

        $semitone =
            (int) $validated['semitone'];

        $targetKey =
            $validated['target_key'];

        /*
        |--------------------------------------------------------------------------
        | Ambil nama file dari URL/path
        |--------------------------------------------------------------------------
        */

        $filename =
            basename(
                parse_url(
                    $path,
                    PHP_URL_PATH
                )
            );

        $fullPath =
            storage_path(
                'app/public/' .
                    $filename
            );

        /*
        |--------------------------------------------------------------------------
        | Pastikan file input tersedia
        |--------------------------------------------------------------------------
        */

        if (!file_exists($fullPath)) {
            return response()->json([
                'success' => false,

                'message' =>
                'File audio input tidak ditemukan.',

                'filename' =>
                $filename
            ], 404);
        }

        try {
            /*
            |--------------------------------------------------------------------------
            | Jalankan Python pitch shifting
            |--------------------------------------------------------------------------
            */

            $python =
                'python';

            $script =
                base_path(
                    'python/pitch_shift.py'
                );

            $command =
                sprintf(
                    '%s %s %s %d',
                    escapeshellcmd(
                        $python
                    ),
                    escapeshellarg(
                        $script
                    ),
                    escapeshellarg(
                        $fullPath
                    ),
                    $semitone
                );

            $output =
                shell_exec(
                    $command
                );

            $data =
                json_decode(
                    $output,
                    true
                );

            /*
            |--------------------------------------------------------------------------
            | Validasi hasil Python
            |--------------------------------------------------------------------------
            */

            if (
                !$data ||
                !($data['success'] ?? false)
            ) {
                Log::error(
                    'Pitch shifting gagal',
                    [
                        'input' =>
                        $filename,

                        'transpose' =>
                        $semitone,

                        'raw_output' =>
                        $output
                    ]
                );

                return response()->json([
                    'success' => false,

                    'message' =>
                    'Pitch shifting gagal.',

                    'raw' =>
                    $output
                ], 500);
            }

            /*
            |--------------------------------------------------------------------------
            | File hasil pitch
            |--------------------------------------------------------------------------
            */

            $pitchFilename =
                basename(
                    $data['audio']
                );

            /*
            |--------------------------------------------------------------------------
            | Simpan hasil ke database untuk kebutuhan riwayat.
            |
            | PENTING:
            | Database TIDAK menjadi syarat pitch shifting.
            | Jika penyimpanan database gagal, hasil pitch tetap dikembalikan.
            |--------------------------------------------------------------------------
            */

            try {
                $lagu = Lagu::where(
                    'path_file',
                    $filename
                )->first();

                if ($lagu) {
                    $hasilPitch = HasilPitch::updateOrCreate(
                        [
                            'lagu_id' =>
                            $lagu->id_lagu,

                            'transpose' =>
                            $semitone
                        ],
                        [
                            'key_hasil' =>
                            $targetKey,

                            'path_pitch' =>
                            $pitchFilename
                        ]
                    );

                    $visitorId =
                        $request->attributes->get(
                            'visitor_id'
                        )
                        ?? $request->cookie(
                            'visitor_id'
                        );

                    if ($visitorId) {
                        HasilAnalisis::create([
                            'visitor_id' =>
                            $visitorId,

                            'lagu_id' =>
                            $lagu->id_lagu,

                            'hasil_pitch_id' =>
                            $hasilPitch->id_pitch,

                            'key_rekomendasi' =>
                            $validated['recommended_key'] ?? null,

                            'transpose' =>
                            $semitone,

                            'nada_terendah_vokal' =>
                            $validated['vocal_lowest'] ?? null,

                            'nada_tertinggi_vokal' =>
                            $validated['vocal_highest'] ?? null
                        ]);
                    }
                } else {
                    Log::warning(
                        'Riwayat pitch tidak disimpan karena data lagu tidak ditemukan.',
                        [
                            'filename' =>
                            $filename
                        ]
                    );
                }
            } catch (\Throwable $databaseError) {
                Log::warning(
                    'Pitch shifting berhasil tetapi penyimpanan riwayat gagal.',
                    [
                        'filename' =>
                        $filename,

                        'message' =>
                        $databaseError->getMessage()
                    ]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Response pitch shifting
            |--------------------------------------------------------------------------
            */

            return response()->json([
                'success' => true,

                'input_file' =>
                $filename,

                'output_file' =>
                $pitchFilename,

                'path' =>
                asset(
                    'storage/' .
                        $pitchFilename
                ),

                'transpose' =>
                $data['transpose']
                    ?? $semitone,

                'target_key' =>
                $targetKey,

                'original_chromagram' =>
                $data['original_chromagram'] ?? [],

                'shifted_chromagram' =>
                $data['shifted_chromagram'] ?? []
            ]);
        } catch (\Throwable $error) {
            Log::error(
                'Transpose error',
                [
                    'filename' =>
                    $filename,

                    'message' =>
                    $error->getMessage()
                ]
            );

            return response()->json([
                'success' => false,

                'message' =>
                'Terjadi kesalahan saat proses pitch shifting.'
            ], 500);
        }
    }

    public function detectVocal(Request $request)
    {
        set_time_limit(300);

        if (!$request->hasFile('audio')) {
            return response()->json([
                'success' => false,
                'error' => 'Audio tidak ditemukan'
            ], 400);
        }

        $file = $request->file('audio');

        /*
        |--------------------------------------------------------------------------
        | Tentukan jenis rekaman
        |--------------------------------------------------------------------------
        |
        | initial       = rekaman vokal pertama
        | pitch_shifted = rekaman setelah pitch shifting
        |
        */
        $recordingType = $request->input(
            'recording_type',
            'initial'
        );

        if ($recordingType === 'pitch_shifted') {
            $folder = 'vocal_recordings/pitch_shifted';
        } else {
            $folder = 'vocal_recordings/initial';
        }

        /*
        |--------------------------------------------------------------------------
        | Buat folder jika belum ada
        |--------------------------------------------------------------------------
        */
        $directory = storage_path(
            'app/public/' . $folder
        );

        if (!is_dir($directory)) {
            mkdir(
                $directory,
                0755,
                true
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Nama file
        |--------------------------------------------------------------------------
        */
        $filename =
            'voice_' .
            time() .
            '_' .
            uniqid() .
            '.webm';

        /*
        |--------------------------------------------------------------------------
        | Simpan audio ke Laravel Storage
        |--------------------------------------------------------------------------
        */
        $file->move(
            $directory,
            $filename
        );

        $path =
            $directory .
            DIRECTORY_SEPARATOR .
            $filename;

        /*
        |--------------------------------------------------------------------------
        | Jalankan Python
        |--------------------------------------------------------------------------
        */
        $python = "python";

        $script = base_path(
            "python/detect_vocal.py"
        );

        $output = shell_exec(
            "$python \"$script\" \"$path\""
        );

        if (!$output) {

            return response()->json([
                "success" => false,
                "error" => "Python tidak mengembalikan data"
            ], 500);
        }

        /*
        |--------------------------------------------------------------------------
        | Decode hasil Python
        |--------------------------------------------------------------------------
        */
        $data = json_decode(
            $output,
            true
        );

        if (!$data) {

            return response()->json([
                "success" => false,
                "error" => "JSON tidak valid",
                "raw" => $output
            ], 500);
        }

        /*
        |--------------------------------------------------------------------------
        | Tambahkan informasi file hasil rekaman
        |--------------------------------------------------------------------------
        |
        | Tidak mengubah struktur hasil analisis Python.
        | Hanya menambahkan informasi penyimpanan agar JS
        | mengetahui file mana yang digunakan.
        |
        */
        $data['recording_type'] =
            $recordingType;

        $data['audio_filename'] =
            $filename;

        $data['audio_path'] =
            'storage/' .
            $folder .
            '/' .
            $filename;

        return response()->json($data);
    }

    public function recommendation(Request $request)
    {
        set_time_limit(300);

        $python = "python";

        $script =
            base_path(
                "python/recommendation.py"
            );

        $command =
            $python . " " .
            escapeshellarg($script) . " " .

            intval($request->song_lowest) . " " .

            intval($request->song_highest) . " " .

            intval($request->user_lowest) . " " .

            intval($request->user_highest) . " " .

            escapeshellarg(
                $request->song_key
            );

        $output = shell_exec($command);

        $data =
            json_decode(
                $output,
                true
            );

        if (
            !$data ||
            !($data["success"] ?? false)
        ) {
            return response()->json([
                "error" => "Recommendation gagal"
            ], 500);
        }

        return response()->json($data);
    }


    public function saveAnalysisCache(Request $request)
    {
        $validated = $request->validate([
            'filename' => 'required|string',
            'data' => 'required|array',
        ]);

        $cacheFile = storage_path('app/analysis_cache.json');

        $cache = [];

        if (file_exists($cacheFile)) {
            $cache = json_decode(
                file_get_contents($cacheFile),
                true
            ) ?? [];
        }

        $cache[$validated['filename']] = $validated['data'];

        file_put_contents(
            $cacheFile,
            json_encode(
                $cache,
                JSON_PRETTY_PRINT |
                    JSON_UNESCAPED_UNICODE
            )
        );

        return response()->json([
            'success' => true,
            'message' => 'Hasil analisis berhasil disimpan.',
        ]);
    }

    public function referenceMelody(Request $request)
    {
        set_time_limit(300);

        $validated = $request->validate([
            'path' => 'required|string',
            'start_time' => 'required|numeric|min:0',
            'duration' => 'required|numeric|min:0.1|max:30',
        ]);

        $path = $validated['path'];
        $filename = basename(parse_url($path, PHP_URL_PATH));
        $fullPath = storage_path('app/public/' . $filename);

        if (!file_exists($fullPath)) {
            return response()->json([
                'success' => false,
                'error' => 'File audio tidak ditemukan.',
            ], 404);
        }

        $python = 'python';
        $script = base_path('python/reference_melody.py');

        $command = sprintf(
            '%s %s %s %s %s 2>&1',
            escapeshellcmd($python),
            escapeshellarg($script),
            escapeshellarg($fullPath),
            escapeshellarg((string) $validated['start_time']),
            escapeshellarg((string) $validated['duration'])
        );

        $output = shell_exec($command);
        $data = json_decode($output, true);

        if (!$data || !($data['success'] ?? false)) {
            Log::error('Reference melody gagal', [
                'filename' => $filename,
                'raw_output' => $output,
            ]);

            return response()->json([
                'success' => false,
                'error' => $data['error'] ?? 'Gagal mengekstrak reference melody.',
            ], 500);
        }

        return response()->json($data);
    }

    public function lyrics(Request $request)
    {
        $request->validate([
            'title' => 'nullable|string|max:255',
        ]);

        return response()->json(
            $this->lyricsService->find(
                (string) $request->input('title', '')
            )
        );
    }

    private function updateLaguFromDetection(
        string $filename,
        array $result
    ): ?Lagu {
        $lagu = Lagu::where(
            'path_file',
            $filename
        )->first();

        if (!$lagu) {
            Log::warning(
                'Data lagu tidak ditemukan saat menyimpan hasil deteksi.',
                [
                    'filename' => $filename,
                ]
            );

            return null;
        }

        $lagu->update([
            'key_asli' => $result['key'] ?? null,
            'nada_terendah' => $result['lowest_note'] ?? null,
            'nada_tertinggi' => $result['highest_note'] ?? null,
        ]);

        return $lagu;
    }
}
