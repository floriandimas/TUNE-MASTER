import librosa
import soundfile as sf
import sys
import numpy as np
import json
import os

input_file = sys.argv[1]
semitone = float(sys.argv[2])

# ==========================
# LOAD AUDIO
# ==========================
y, sr = librosa.load(input_file, sr=44100)

# ==========================
# FUNGSI CHROMA
# ==========================
def extract_chroma(audio, sr):
    chroma = librosa.feature.chroma_cqt(y=audio, sr=sr)

    # Representasi global 12 pitch class
    chroma_mean = np.mean(chroma, axis=1)

    # Normalisasi agar perbandingan lebih stabil
    norm = np.linalg.norm(chroma_mean)

    if norm > 0:
        chroma_mean = chroma_mean / norm

    return chroma, chroma_mean

# ==========================
# CHROMAGRAM ORIGINAL
# ==========================
original_chroma_full, original_chroma = extract_chroma(y, sr)

# ==========================
# PITCH SHIFT
# ==========================
y_shifted = librosa.effects.pitch_shift(
    y,
    sr=sr,
    n_steps=semitone,
    res_type="kaiser_best"
)

# ==========================
# NORMALISASI AUDIO
# ==========================
peak = np.max(np.abs(y_shifted))

if peak > 0:
    y_shifted = y_shifted / peak

# ==========================
# CHROMAGRAM HASIL
# ==========================
shifted_chroma_full, shifted_chroma = extract_chroma(y_shifted, sr)

# ==========================
# SIMILARITY TEMPORAL
# ==========================
frame_count = min(
    original_chroma_full.shape[1],
    shifted_chroma_full.shape[1]
)

original_temporal = original_chroma_full[:, :frame_count]
shifted_temporal = shifted_chroma_full[:, :frame_count]

# Shift pola original secara teoritis
shift_amount = int(round(semitone))
expected_temporal = np.roll(
    original_temporal,
    shift_amount,
    axis=0
)

frame_similarities = []

for i in range(frame_count):
    first = expected_temporal[:, i]
    second = shifted_temporal[:, i]

    denominator = (
        np.linalg.norm(first) *
        np.linalg.norm(second)
    )

    if denominator > 0:
        similarity = np.dot(first, second) / denominator
        frame_similarities.append(float(similarity))

if frame_similarities:
    temporal_similarity = float(
        np.mean(frame_similarities)
    )
else:
    temporal_similarity = 0.0

# ==========================
# OUTPUT AUDIO
# ==========================
base, ext = os.path.splitext(input_file)

output = (
    base +
    f"_shifted_{int(semitone)}" +
    ext
)

sf.write(
    output,
    y_shifted,
    sr
)

# ==========================
# OUTPUT JSON
# ==========================
print(json.dumps({
    "success": True,
    "audio": output,
    "transpose": semitone,

    "original_chromagram":
        original_chroma.tolist(),

    "shifted_chromagram":
        shifted_chroma.tolist(),

    "temporal_chroma_similarity":
        round(
            temporal_similarity,
            6
        )
}))