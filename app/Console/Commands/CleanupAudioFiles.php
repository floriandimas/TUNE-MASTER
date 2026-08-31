<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupAudioFiles extends Command
{
    protected $signature = 'audio:cleanup-old-files
        {--days=30 : Delete audio files older than this number of days}
        {--dry-run : Show files that would be deleted without deleting them}';

    protected $description = 'Remove old downloaded audio files from storage/app/public to control disk usage';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $dryRun = (bool) $this->option('dry-run');
        $threshold = now()->subDays($days)->timestamp;

        $disk = Storage::disk('public');
        $deleted = 0;
        $scanned = 0;

        foreach ($disk->files('') as $file) {
            if (!preg_match('/^audio_[a-f0-9]{32}\.(mp3|webm|m4a|mp4|ogg)$/i', basename($file))) {
                continue;
            }

            $scanned++;

            $absolutePath = storage_path('app/public/' . $file);
            $modifiedAt = @filemtime($absolutePath);

            if ($modifiedAt === false || $modifiedAt > $threshold) {
                continue;
            }

            if ($dryRun) {
                $this->line("Would delete: {$file}");
                continue;
            }

            $disk->delete($file);
            $deleted++;
            $this->line("Deleted: {$file}");
        }

        $this->info(sprintf(
            'Scanned %d audio files. %s %d files older than %d days.',
            $scanned,
            $dryRun ? 'Would delete' : 'Deleted',
            $deleted,
            $days
        ));

        return self::SUCCESS;
    }
}
