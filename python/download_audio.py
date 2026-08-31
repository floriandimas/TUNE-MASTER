import json
import os
import glob
import sys


def fail(message: str) -> None:
    print(json.dumps({"success": False, "error": message}))
    sys.exit(1)


if len(sys.argv) < 4:
    fail(
        "Argumen tidak lengkap. Gunakan: python download_audio.py <url> <output_path> <mode> [ffmpeg_location]"
    )

url = sys.argv[1]
output_path = sys.argv[2]
mode = sys.argv[3].strip().lower()
ffmpeg_location = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4].strip() else None

try:
    from yt_dlp import YoutubeDL
except Exception:
    fail("Modul Python yt-dlp belum terpasang. Jalankan: pip install yt-dlp")

output_dir = os.path.dirname(output_path)
if output_dir:
    os.makedirs(output_dir, exist_ok=True)

output_base, _ = os.path.splitext(output_path)
outtmpl = output_base + ".%(ext)s"

options = {
    "outtmpl": outtmpl,
    "noplaylist": True,
    "quiet": True,
    "no_warnings": True,
}

if mode == "mp3":
    options["format"] = "bestaudio/best"
    options["postprocessors"] = [
        {
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }
    ]

    if ffmpeg_location:
        options["ffmpeg_location"] = ffmpeg_location

elif mode == "original":
    options["format"] = "bestaudio/best"

else:
    fail("Mode tidak valid. Gunakan 'mp3' atau 'original'.")

try:
    with YoutubeDL(options) as ydl:
        ydl.download([url])
except Exception as exc:
    fail(f"Gagal mengunduh audio: {exc}")

if not os.path.exists(output_path):
    matched_files = sorted(glob.glob(output_base + ".*"))

    if matched_files:
        output_path = matched_files[0]
    else:
        fail("Download selesai tetapi file audio tidak ditemukan.")

print(json.dumps({"success": True, "path": output_path}))
