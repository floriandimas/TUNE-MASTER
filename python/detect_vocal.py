import librosa
import numpy as np
import json
import sys
from collections import Counter

file_path = sys.argv[1]

SAMPLE_RATE = 22050
HOP_LENGTH = 256
FRAME_LENGTH = 2048


def detect_pitch(y, sr):
    f0, voiced_flag, voiced_probability = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
        frame_length=FRAME_LENGTH,
        hop_length=HOP_LENGTH
    )

    times = librosa.times_like(
        f0,
        sr=sr,
        hop_length=HOP_LENGTH
    )

    frame_count = min(
        len(f0),
        len(times),
        len(voiced_flag)
    )

    return (
        f0[:frame_count],
        voiced_flag[:frame_count],
        times[:frame_count]
    )


def create_base_valid(f0, voiced_flag):
    return (
        voiced_flag &
        np.isfinite(f0) &
        (f0 > 0)
    )


try:
    # ==========================
    # LOAD AUDIO USER
    # ==========================

    y, sr = librosa.load(
        file_path,
        sr=SAMPLE_RATE
    )

    # ==========================
    # PITCH USER
    # ==========================

    user_f0, user_voiced_flag, user_times = detect_pitch(
        y,
        sr
    )

    user_base_valid = create_base_valid(
        user_f0,
        user_voiced_flag
    )

    user_f0_valid = user_f0[
        user_base_valid
    ]

    user_times_valid = user_times[
        user_base_valid
    ]

    if len(user_f0_valid) < 10:
        print(json.dumps({
            "success": False,
            "error": "Frame pitch valid pengguna tidak mencukupi."
        }))
        sys.exit()

    # ==========================
    # RENTANG VOKAL USER
    # ==========================

    lowest_freq = np.percentile(
        user_f0_valid,
        5
    )

    highest_freq = np.percentile(
        user_f0_valid,
        95
    )

    lowest_note = (
        librosa
        .hz_to_note(lowest_freq)
        .replace("♯", "#")
    )

    highest_note = (
        librosa
        .hz_to_note(highest_freq)
        .replace("♯", "#")
    )

    lowest_midi = int(
        round(
            librosa.hz_to_midi(
                lowest_freq
            )
        )
    )

    highest_midi = int(
        round(
            librosa.hz_to_midi(
                highest_freq
            )
        )
    )

    range_width = (
        highest_midi -
        lowest_midi
    )

    # ==========================
    # DOMINANT NOTE USER
    # ==========================

    midi_notes = [
        int(
            round(
                librosa.hz_to_midi(
                    pitch
                )
            )
        )
        for pitch in user_f0_valid
    ]

    dominant_midi = Counter(
        midi_notes
    ).most_common(1)[0][0]

    dominant_note = (
        librosa
        .midi_to_note(
            dominant_midi
        )
        .replace("♯", "#")
    )

    # ==========================
    # DATA GRAFIK PITCH USER
    # ==========================

    graph = []

    for i in range(
        len(user_f0_valid)
    ):

        frequency = float(
            user_f0_valid[i]
        )

        midi_float = float(
            librosa.hz_to_midi(
                frequency
            )
        )

        graph.append({
            "time": round(
                float(
                    user_times_valid[i]
                ),
                3
            ),

            "midi_float": round(
                midi_float,
                3
            ),

            "midi": int(
                round(
                    midi_float
                )
            ),

            "frequency": round(
                frequency,
                3
            )
        })
    # ==========================
    # OUTPUT
    # ==========================

    print(json.dumps({
        "success": True,
        "lowest_note": lowest_note,
        "highest_note": highest_note,
        "lowest_midi": lowest_midi,
        "highest_midi": highest_midi,
        "range": f"{lowest_note} - {highest_note}",
        "range_width": range_width,
        "dominant_note": dominant_note,
        "graph": graph
    }))

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }))
