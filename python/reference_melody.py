import json
import sys
import librosa
import numpy as np
from scipy.signal import butter, sosfilt

# ======================================================
# KONFIGURASI YANG SUDAH DISESUAIKAN UNTUK KARAOKE
# ======================================================
SAMPLE_RATE = 22050
FRAME_LENGTH = 2048
HOP_LENGTH = 256

# DISESUAIKAN: Batas pitch dipersempit agar instrumen bass/low-end tidak menipu algoritma
FMIN = "E3"  # Naik dari C3 untuk memotong jangkauan instrumen rendah
FMAX = "C6"

# DISESUAIKAN: Diturunkan dari 0.60 karena pada musik karaoke, energi melodi penuntun
# sering terbagi dengan instrumen pengiring lainnya.
MELODY_THRESHOLD = 0.40  

MAX_GAP = 0.20
MAX_NOTE_CHANGE = 0.50
MIN_NOTE_DURATION = 0.08

# DISESUAIKAN: Ditimpa dengan filter Bandpass untuk mengisolasi frekuensi melodi vokal (tengah)
MELODY_LP_CUTOFF = 1200.0  # Memotong instrumen yang terlalu melengking (hi-hat, cymbal)
MELODY_HP_CUTOFF = 150.0   # Memotong instrumen bass/kick drum secara lebih tegas

# ======================================================
# JSON CONVERTER
# ======================================================
def json_converter(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

# ======================================================
# ARGUMEN
# ======================================================
if len(sys.argv) < 2:
    print(json.dumps({"success": False, "error": "Path file lagu tidak ditemukan."}))
    sys.exit()

file_path = sys.argv[1]

try:
    start_time = float(sys.argv[2]) if len(sys.argv) >= 3 else 0.0
except ValueError:
    print(json.dumps({"success": False, "error": "start_time harus berupa angka."}))
    sys.exit()

try:
    duration = float(sys.argv[3]) if len(sys.argv) >= 4 else 30.0
except ValueError:
    print(json.dumps({"success": False, "error": "duration harus berupa angka."}))
    sys.exit()

if start_time < 0: start_time = 0.0
if duration <= 0: duration = 30.0
if duration > 30: duration = 30.0

try:
    # 1. LOAD AUDIO KARAOKE
    y, sr = librosa.load(file_path, sr=SAMPLE_RATE, offset=start_time, duration=duration, mono=True)

    if y is None or len(y) == 0:
        raise ValueError("Cuplikan audio tidak memiliki data.")

    # 2. HARMONIC-PERCUSSIVE SOURCE SEPARATION (HPSS)
    # Menaikkan margin harmonic agar filter lebih ketat mengisolasi instrumen melodi kontinu
    y_harm, y_perc = librosa.effects.hpss(y, margin=(2.0, 1.0))

    # 3. PRE-PROCESSING: BANDPASS FILTER (Paling Penting untuk Karaoke)
    # Membuat filter untuk meredam frekuensi ekstrem bawah (bass) dan atas (cymbal)
    sos = butter(4, [MELODY_HP_CUTOFF, MELODY_LP_CUTOFF], btype="bandpass", fs=sr, output="sos")
    y_melody = sosfilt(sos, y_harm)

    # 4. pYIN REFERENCE MELODY TRACKING
    f0, voiced_flag, voiced_probability = librosa.pyin(
        y_melody,
        fmin=librosa.note_to_hz(FMIN),
        fmax=librosa.note_to_hz(FMAX),
        sr=sr,
        frame_length=FRAME_LENGTH,
        hop_length=HOP_LENGTH
    )

    if f0 is None or voiced_flag is None or voiced_probability is None:
        raise ValueError("pYIN tidak menghasilkan data pitch.")

    times = librosa.times_like(f0, sr=sr, hop_length=HOP_LENGTH)

    # 5. VALIDATING VALID FRAMES
    #
    # pYIN pada beberapa lagu dapat menghasilkan voiced_flag=True
    # sepanjang bagian audio, tetapi voiced_probability rendah karena
    # karakter instrumental/aransemen. Jika confidence dijadikan hard
    # filter, reference melody dapat menyusut menjadi hanya beberapa
    # frame (seperti kasus 10 frame pada ~29 detik audio).
    #
    # Karena tujuan tahap ini adalah membangun trajectory reference yang
    # utuh untuk alignment, confidence digunakan sebagai informasi
    # kualitas, bukan sebagai pemotong utama trajectory.
    valid = (
        voiced_flag.astype(bool)
        & np.isfinite(f0)
        & (f0 > 0)
        & np.isfinite(voiced_probability)
    )

    valid_f0 = f0[valid]
    valid_times = times[valid]
    valid_probability = voiced_probability[valid]

    # Smoothing ringan pada domain MIDI untuk meredam lonjakan frame tunggal
    # tanpa mengubah struktur nada secara agresif. Window ~80 ms pada
    # hop_length 256 / 22.05 kHz masih cukup kecil untuk mengikuti
    # perubahan melody karaoke.
    if len(valid_f0) >= 5:
        midi_values = librosa.hz_to_midi(valid_f0)
        smoothed_midi = np.empty_like(midi_values, dtype=float)
        half_window = 3

        for i in range(len(midi_values)):
            left = max(0, i - half_window)
            right = min(len(midi_values), i + half_window + 1)
            smoothed_midi[i] = np.median(midi_values[left:right])

        # Confidence tinggi dipertahankan sedekat mungkin dengan estimasi
        # pYIN asli; confidence rendah memakai hasil smoothing agar tidak
        # menghasilkan trajectory liar akibat frame ambigu.
        low_confidence = valid_probability < MELODY_THRESHOLD
        final_midi = np.where(
            low_confidence,
            smoothed_midi,
            midi_values
        )
        valid_f0 = librosa.midi_to_hz(final_midi)

    # 6. GENERATE REFERENCE GRAPH DATA
    reference_graph = []
    for i in range(len(valid_f0)):
        frequency = float(valid_f0[i])
        midi_float = float(librosa.hz_to_midi(frequency))
        reference_graph.append({
            "time": round(float(valid_times[i]), 3),
            "song_time": round(start_time + float(valid_times[i]), 3),
            "midi_float": round(midi_float, 3),
            "midi": int(round(midi_float)),
            "frequency": round(frequency, 3),
            "voiced_probability": round(float(valid_probability[i]), 4)
        })

    # 7. MELODY SEGMENTATION LOGIC
    melody_segments = []
    if len(valid_f0) > 0:
        current_values = []
        current_start = float(valid_times[0])
        previous_time = float(valid_times[0])

        for i in range(len(valid_f0)):
            frequency = float(valid_f0[i])
            midi_float = float(librosa.hz_to_midi(frequency))
            current_time = float(valid_times[i])

            if len(current_values) == 0:
                current_values.append(midi_float)
                current_start = current_time
                previous_time = current_time
                continue

            segment_midi = float(np.median(current_values))
            midi_difference = abs(midi_float - segment_midi)
            time_gap = current_time - previous_time

            same_note = midi_difference <= MAX_NOTE_CHANGE
            close_in_time = time_gap <= MAX_GAP

            if same_note and close_in_time:
                current_values.append(midi_float)
            else:
                segment_end = previous_time
                segment_midi_float = float(np.median(current_values))
                segment_midi = int(round(segment_midi_float))
                duration_segment = segment_end - current_start

                if duration_segment >= MIN_NOTE_DURATION:
                    melody_segments.append({
                        "start": round(start_time + current_start, 3),
                        "end": round(start_time + segment_end, 3),
                        "relative_start": round(current_start, 3),
                        "relative_end": round(segment_end, 3),
                        "duration": round(duration_segment, 3),
                        "midi_float": round(segment_midi_float, 3),
                        "midi": segment_midi,
                        "note": librosa.midi_to_note(segment_midi).replace("♯", "#"),
                        "frames": len(current_values)
                    })

                current_values = [midi_float]
                current_start = current_time

            previous_time = current_time

        if len(current_values) > 0:
            segment_end = previous_time
            segment_midi_float = float(np.median(current_values))
            segment_midi = int(round(segment_midi_float))
            duration_segment = segment_end - current_start

            if duration_segment >= MIN_NOTE_DURATION:
                melody_segments.append({
                    "start": round(start_time + current_start, 3),
                    "end": round(start_time + segment_end, 3),
                    "relative_start": round(current_start, 3),
                    "relative_end": round(segment_end, 3),
                    "duration": round(duration_segment, 3),
                    "midi_float": round(segment_midi_float, 3),
                    "midi": segment_midi,
                    "note": librosa.midi_to_note(segment_midi).replace("♯", "#"),
                    "frames": len(current_values)
                })

    # 8. RANGE CALCULATION (Menggunakan persentil agar lebih kebal noise instrumen)
    if len(valid_f0) > 0:
        lowest_midi = int(round(float(librosa.hz_to_midi(np.percentile(valid_f0, 8)))))
        highest_midi = int(round(float(librosa.hz_to_midi(np.percentile(valid_f0, 92)))))
    else:
        lowest_midi, highest_midi = None, None

    # 9. JSON OUTPUT RESPONSES
    result = {
        "success": True,
        "start_time": float(start_time),
        "duration": float(duration),
        "actual_duration": round(float(len(y) / sr), 3),
        "reference_threshold": float(MELODY_THRESHOLD),
        "reference_filter_mode": "voiced_only_with_confidence_weighted_smoothing",
        "reference_pitch_frames": int(len(valid_f0)),
        "graph": reference_graph,
        "melody_segments": melody_segments,
        "lowest_midi": lowest_midi,
        "highest_midi": highest_midi
    }

    print(json.dumps(result, default=json_converter, ensure_ascii=False))

except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
