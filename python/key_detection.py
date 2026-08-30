import json
import sys
from collections import Counter

import librosa
import numpy as np
from scipy.signal import butter, sosfilt


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

    raise TypeError(
        f"Object of type {type(obj).__name__} "
        "is not JSON serializable"
    )


# ======================================================
# VALIDASI ARGUMEN
# ======================================================

if len(sys.argv) < 2:

    print(
        json.dumps({
            "success": False,
            "error": "Path file audio tidak ditemukan."
        })
    )

    sys.exit()


file_path = sys.argv[1]


try:

    # ==================================================
    # LOAD AUDIO
    # ==================================================

    y, sr = librosa.load(
        file_path,
        sr=22050,
        offset=30,
        duration=45,
        mono=True
    )

    if y is None or len(y) == 0:

        raise ValueError(
            "Audio tidak memiliki data yang dapat dianalisis."
        )


    # ==================================================
    # HARMONIC-PERCUSSIVE SOURCE SEPARATION
    # ==================================================

    y_harm, y_perc = librosa.effects.hpss(
        y
    )

    # ======================================================
    # PRE-PROCESSING REFERENCE MELODY
    # ======================================================
    # High-pass ringan untuk mengurangi komponen bass
    # sebelum ekstraksi reference melody.

    MELODY_HP_CUTOFF = 120.0

    sos = butter(
        4,
        MELODY_HP_CUTOFF,
        btype="highpass",
        fs=sr,
        output="sos"
    )

    y_melody = sosfilt(
        sos,
        y_harm
    )


    # ==================================================
    # HARMONIC RATIO
    # ==================================================

    harmonic_energy = float(
        np.sum(
            np.square(y_harm)
        )
    )

    percussive_energy = float(
        np.sum(
            np.square(y_perc)
        )
    )

    total_energy = (
        harmonic_energy +
        percussive_energy
    )

    if total_energy > 0:

        harmonic_ratio = (
            harmonic_energy /
            total_energy
        ) * 100

    else:

        harmonic_ratio = 0.0


    # ==================================================
    # STATUS KUALITAS AUDIO
    # ==================================================

    if harmonic_ratio >= 85:

        status = "Layak Diproses"

    elif harmonic_ratio >= 75:

        status = "Perlu Diperhatikan"

    else:

        status = "Tidak Direkomendasikan"


    # ==================================================
    # CHROMA FEATURE
    # ==================================================

    chroma = librosa.feature.chroma_cqt(
        y=y_harm,
        sr=sr
    )

    chroma_stat = np.median(
        chroma,
        axis=1
    )

    chroma_norm = (
        np.linalg.norm(
            chroma_stat
        ) +
        1e-9
    )

    chroma_stat = (
        chroma_stat /
        chroma_norm
    )


    # ==================================================
    # KRUMHANSL KEY PROFILE
    # ==================================================

    major = np.array([
        6.35,
        2.23,
        3.48,
        2.33,
        4.38,
        4.09,
        2.52,
        5.19,
        2.39,
        3.66,
        2.29,
        2.88
    ])

    minor = np.array([
        6.33,
        2.68,
        3.52,
        5.38,
        2.60,
        3.53,
        2.54,
        4.75,
        3.98,
        2.69,
        3.34,
        3.17
    ])

    notes = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B"
    ]


    def score(template, chroma_vector):

        template_normalized = (
            template /
            (
                np.linalg.norm(
                    template
                ) +
                1e-9
            )
        )

        return float(
            np.dot(
                template_normalized,
                chroma_vector
            )
        )


    scores = []
    labels = []

    for index in range(12):

        major_template = np.roll(
            major,
            index
        )

        minor_template = np.roll(
            minor,
            index
        )

        scores.append(
            score(
                major_template,
                chroma_stat
            )
        )

        labels.append(
            f"{notes[index]} major"
        )

        scores.append(
            score(
                minor_template,
                chroma_stat
            )
        )

        labels.append(
            f"{notes[index]} minor"
        )


    scores = np.array(
        scores,
        dtype=float
    )

    top_indices = (
        scores
        .argsort()[-5:]
        [::-1]
    )

    candidates = []

    for index in top_indices:

        candidates.append({
            "key": str(
                labels[index]
            ),

            "score": float(
                scores[index]
            )
        })


    if len(candidates) == 0:

        raise ValueError(
            "Kandidat key lagu tidak ditemukan."
        )


    best_key = candidates[0]["key"]
    confidence = candidates[0]["score"]


    # ======================================================
    # SONG RANGE ESTIMATION DENGAN pYIN
    # ======================================================

    f0, voiced_flag, voiced_probability = librosa.pyin(
        y_harm,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C6"),
        sr=sr
    )

    if (
        f0 is None or
        voiced_flag is None or
        voiced_probability is None
    ):
        raise ValueError(
            "Estimasi pitch lagu tidak menghasilkan data."
        )

    times = librosa.times_like(
        f0,
        sr=sr
    )

    # ======================================================
    # FILTER DASAR
    # ======================================================

    base_valid = (
        voiced_flag.astype(bool) &
        np.isfinite(f0) &
        (f0 > 0)
    )

    # ======================================================
    # FILTER ADAPTIF BERDASARKAN VOICED PROBABILITY
    # ======================================================

    selected_threshold = 0.80

    valid = (
        base_valid &
        np.isfinite(voiced_probability) &
        (voiced_probability >= 0.80)
    )

    # Jika terlalu sedikit, turunkan threshold
    if np.count_nonzero(valid) < 10:

        selected_threshold = 0.60

        valid = (
            base_valid &
            np.isfinite(voiced_probability) &
            (voiced_probability >= 0.60)
        )

    # Jika masih terlalu sedikit, gunakan semua frame voiced
    if np.count_nonzero(valid) < 10:

        selected_threshold = 0.00

        valid = base_valid

    valid_f0 = f0[valid]
    valid_times = times[valid]

    valid_probabilities = np.nan_to_num(
        voiced_probability[valid],
        nan=0.0
    )

    if len(valid_f0) < 10:

        print(
            json.dumps({
                "success": False,
                "error":
                    "Data pitch lagu tetap tidak mencukupi "
                    "setelah proses filter adaptif."
            })
        )

        sys.exit()

    # ==================================================
    # HAPUS OUTLIER DENGAN PERCENTILE
    # ==================================================
    #
    # Percentile 10 dan 90 dipakai agar nilai pitch
    # ekstrem tidak langsung dianggap sebagai batas
    # rentang lagu.
    # ==================================================

    lowest_freq = float(
        np.percentile(
            valid_f0,
            10
        )
    )

    highest_freq = float(
        np.percentile(
            valid_f0,
            90
        )
    )


    # ==================================================
    # KONVERSI FREKUENSI KE MIDI
    # ==================================================

    lowest_midi = int(
        round(
            float(
                librosa.hz_to_midi(
                    lowest_freq
                )
            )
        )
    )

    highest_midi = int(
        round(
            float(
                librosa.hz_to_midi(
                    highest_freq
                )
            )
        )
    )


    if lowest_midi > highest_midi:

        lowest_midi, highest_midi = (
            highest_midi,
            lowest_midi
        )


    # ==================================================
    # KONVERSI MIDI KE NAMA NADA
    # ==================================================

    lowest_note = (
        librosa
        .midi_to_note(
            lowest_midi
        )
        .replace(
            "♯",
            "#"
        )
    )

    highest_note = (
        librosa
        .midi_to_note(
            highest_midi
        )
        .replace(
            "♯",
            "#"
        )
    )

    range_width = (
        highest_midi -
        lowest_midi
    )


    # ==================================================
    # DOMINANT NOTE
    # ==================================================

    midi_notes = []

    for pitch in valid_f0:

        midi_value = int(
            round(
                float(
                    librosa.hz_to_midi(
                        pitch
                    )
                )
            )
        )

        midi_notes.append(
            midi_value
        )


    if len(midi_notes) == 0:

        dominant_midi = lowest_midi

    else:

        dominant_midi = (
            Counter(
                midi_notes
            )
            .most_common(1)[0][0]
        )


    dominant_note = (
        librosa
        .midi_to_note(
            dominant_midi
        )
        .replace(
            "♯",
            "#"
        )
    )


    # ==================================================
    # GRAPH
    # ==================================================

    graph = []

    GRAPH_STEP = 2

    for index in range(
        0,
        len(f0),
        GRAPH_STEP
    ):

        current_f0 = f0[index]
        current_time = times[index]
        current_probability = voiced_probability[index]
        current_voiced = bool(
            voiced_flag[index]
        )

        # Hanya ambil pitch yang memiliki
        # voiced flag dan f0 yang valid.
        if (
            not current_voiced
            or not np.isfinite(current_f0)
            or current_f0 <= 0
            or not np.isfinite(current_probability)
        ):
            continue

        # Probability tetap disimpan sebagai
        # informasi kualitas pitch.
        graph.append({

            "time": round(
                float(
                    current_time
                ),
                2
            ),

            "midi": int(
                round(
                    float(
                        librosa.hz_to_midi(
                            current_f0
                        )
                    )
                )
            ),

            "voiced_probability": round(
                float(
                    current_probability
                ),
                4
            )
        })


    # ======================================================
    # REFERENCE MELODY EXTRACTION
    # ======================================================
    # Jalur terpisah untuk visualisasi kontur melody.
    # Tidak mengubah perhitungan key dan song range.

    melody_f0, melody_voiced_flag, melody_voiced_probability = librosa.pyin(
        y_melody,
        fmin=librosa.note_to_hz("C3"),
        fmax=librosa.note_to_hz("C6"),
        sr=sr,
        frame_length=2048,
        hop_length=256
    )

    melody_times = librosa.times_like(
        melody_f0,
        sr=sr,
        hop_length=256
    )

    MELODY_THRESHOLD = 0.60

    melody_valid = (
        melody_voiced_flag.astype(bool)
        & np.isfinite(melody_f0)
        & (melody_f0 > 0)
        & np.isfinite(melody_voiced_probability)
        & (melody_voiced_probability >= MELODY_THRESHOLD)
    )

    melody_f0_valid = melody_f0[melody_valid]
    melody_times_valid = melody_times[melody_valid]
    melody_probability_valid = melody_voiced_probability[melody_valid]

    reference_graph = []

    for i in range(len(melody_f0_valid)):

        frequency = float(melody_f0_valid[i])
        midi_float = float(librosa.hz_to_midi(frequency))

        reference_graph.append({
            "time": round(float(melody_times_valid[i]), 3),
            "midi_float": round(midi_float, 3),
            "midi": int(round(midi_float)),
            "frequency": round(frequency, 3),
            "voiced_probability": round(
                float(melody_probability_valid[i]), 4
            )
        })

    # ======================================================
    # MELODY SEGMENTATION
    # ======================================================

    melody_segments = []

    if len(melody_f0_valid) > 0:

        current_midi_values = []
        current_start_time = float(melody_times_valid[0])
        previous_time = float(melody_times_valid[0])

        MAX_GAP = 0.20
        MAX_NOTE_CHANGE = 0.50
        MIN_NOTE_DURATION = 0.08

        for i in range(len(melody_f0_valid)):

            current_frequency = float(melody_f0_valid[i])
            current_midi_float = float(librosa.hz_to_midi(current_frequency))
            current_time = float(melody_times_valid[i])

            if len(current_midi_values) == 0:
                current_midi_values.append(current_midi_float)
                current_start_time = current_time
                previous_time = current_time
                continue

            current_segment_midi = float(np.median(current_midi_values))
            midi_difference = abs(current_midi_float - current_segment_midi)
            time_gap = current_time - previous_time

            same_note = midi_difference <= MAX_NOTE_CHANGE
            close_in_time = time_gap <= MAX_GAP

            if same_note and close_in_time:
                current_midi_values.append(current_midi_float)
            else:
                segment_end_time = previous_time
                segment_midi_float = float(np.median(current_midi_values))
                segment_midi = int(round(segment_midi_float))

                duration = segment_end_time - current_start_time

                if duration >= MIN_NOTE_DURATION:
                    melody_segments.append({
                        "start": round(current_start_time, 3),
                        "end": round(segment_end_time, 3),
                        "duration": round(duration, 3),
                        "midi_float": round(segment_midi_float, 3),
                        "midi": segment_midi,
                        "note": librosa.midi_to_note(segment_midi).replace("♯", "#"),
                        "frames": len(current_midi_values)
                    })

                current_midi_values = [current_midi_float]
                current_start_time = current_time

            previous_time = current_time

        if len(current_midi_values) > 0:
            segment_end_time = previous_time
            segment_midi_float = float(np.median(current_midi_values))
            segment_midi = int(round(segment_midi_float))
            duration = segment_end_time - current_start_time

            if duration >= MIN_NOTE_DURATION:
                melody_segments.append({
                    "start": round(current_start_time, 3),
                    "end": round(segment_end_time, 3),
                    "duration": round(duration, 3),
                    "midi_float": round(segment_midi_float, 3),
                    "midi": segment_midi,
                    "note": librosa.midi_to_note(segment_midi).replace("♯", "#"),
                    "frames": len(current_midi_values)
                })

    # ==================================================
    # RESULT
    # ==================================================

    result = {
        "success": True,

        "best": str(
            best_key
        ),

        "harmonic_ratio": float(
            round(
                harmonic_ratio,
                2
            )
        ),

        "status": str(
            status
        ),

        "confidence": float(
            confidence
        ),

        "candidates": candidates,

        "lowest_note": str(
            lowest_note
        ),

        "highest_note": str(
            highest_note
        ),

        "lowest_midi": int(
            lowest_midi
        ),

        "highest_midi": int(
            highest_midi
        ),

        "range":
            f"{lowest_note} - {highest_note}",

        "range_width": int(
            range_width
        ),

        "dominant_note": str(
            dominant_note
        ),

        "valid_pitch_frames": int(
            len(valid_f0)
        ),

        "pitch_percentile_low": 8,

        "pitch_percentile_high": 92,

        "pitch_fmin": "C2",

        "pitch_fmax": "C6",

        "voiced_probability_threshold":
            float(selected_threshold),

        "graph": graph,

        # Reference melody khusus visualisasi
        "reference_threshold": float(MELODY_THRESHOLD),
        "reference_pitch_frames": int(len(melody_f0_valid)),
        "reference_duration": float(
            melody_times_valid[-1]
            if len(melody_times_valid) > 0
            else 0.0
        ),
        "reference_graph": reference_graph,
        "melody_segments": melody_segments
    }


    # ==================================================
    # OUTPUT
    # ==================================================

    print(
        json.dumps(
            result,
            default=json_converter,
            ensure_ascii=False
        )
    )


except Exception as error:

    print(
        json.dumps({
            "success": False,
            "error": str(
                error
            )
        })
    )
