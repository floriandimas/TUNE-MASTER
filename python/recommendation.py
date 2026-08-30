import json
import sys


# ======================================================
# PITCH CLASS
# ======================================================

NOTES = [
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
    "B",
]


# ======================================================
# PARSING KEY
# ======================================================

def parse_song_key(value):
    original_value = str(value).strip()
    lowered = original_value.lower()

    mode = None

    if "major" in lowered:
        mode = "Major"
    elif "minor" in lowered:
        mode = "Minor"

    root = (
        original_value
        .replace("Major", "")
        .replace("Minor", "")
        .replace("major", "")
        .replace("minor", "")
        .strip()
    )

    if root not in NOTES:
        raise ValueError(
            f"Key lagu tidak valid: {original_value}"
        )

    return root, mode


# ======================================================
# SELISIH SEMITONE ANTAR KEY
# ======================================================

def get_semitone_diff(from_key, to_key):
    from_index = NOTES.index(from_key)
    to_index = NOTES.index(to_key)

    difference = to_index - from_index

    # Gunakan arah perpindahan terdekat dalam 12 pitch class.
    if difference > 6:
        difference -= 12

    if difference < -6:
        difference += 12

    return difference


# ======================================================
# HITUNG KONDISI TRANSPOSE
# ======================================================

def evaluate_transpose(
    transpose,
    song_low,
    song_high,
    user_low,
    user_high,
    target_key,
):
    shifted_low = song_low + transpose
    shifted_high = song_high + transpose

    low_overflow = max(
        0,
        user_low - shifted_low,
    )

    high_overflow = max(
        0,
        shifted_high - user_high,
    )

    total_overflow = (
        low_overflow +
        high_overflow
    )

    fully_inside = (
        shifted_low >= user_low
        and
        shifted_high <= user_high
    )

    song_width = max(
        1,
        song_high - song_low,
    )

    overlap_low = max(
        shifted_low,
        user_low,
    )

    overlap_high = min(
        shifted_high,
        user_high,
    )

    overlap_width = max(
        0,
        overlap_high - overlap_low,
    )

    fit_percentage = min(
        100.0,
        (
            overlap_width /
            song_width
        ) * 100,
    )

    return {
        "target_key": target_key,
        "transpose": transpose,
        "shifted_low": shifted_low,
        "shifted_high": shifted_high,
        "low_overflow": low_overflow,
        "high_overflow": high_overflow,
        "total_overflow": total_overflow,
        "maximum_overflow": max(
            low_overflow,
            high_overflow,
        ),
        "fully_inside": fully_inside,
        "fit_percentage": round(
            fit_percentage,
            2,
        ),
    }


# ======================================================
# PILIH TRANSPOSE TERBAIK
# ======================================================

def choose_best_transpose(
    song_low,
    song_high,
    user_low,
    user_high,
    song_key,
):
    candidates = []

    # Tidak lagi dibatasi -4 sampai +4.
    # Sistem mengevaluasi seluruh 12 key kromatis satu kali.
    # Nilai transpose tiap target key menggunakan selisih
    # semitone terdekat dari key asli.
    for target_key in NOTES:
        transpose = get_semitone_diff(
            song_key,
            target_key,
        )

        candidates.append(
            evaluate_transpose(
                transpose,
                song_low,
                song_high,
                user_low,
                user_high,
                target_key,
            )
        )

    # Jika ada kandidat non-zero yang dapat membuat seluruh
    # rentang lagu tetap berada di dalam rentang vokal,
    # pilih perubahan key terkecil dari key asli.
    # Dengan begitu 0 tidak lagi otomatis menang ketika
    # ±1 (atau perubahan kecil lain) juga masih sepenuhnya cocok.
    nonzero_fully_inside_candidates = [
        candidate
        for candidate in candidates
        if (
            candidate["transpose"] != 0
            and
            candidate["fully_inside"]
        )
    ]

    if nonzero_fully_inside_candidates:
        return min(
            nonzero_fully_inside_candidates,
            key=lambda candidate: (
                abs(
                    candidate["transpose"]
                ),
                candidate["transpose"],
            ),
        )

    # Jika tidak ada perubahan non-zero yang fully_inside,
    # pilih kandidat non-zero dengan penyimpangan rentang
    # paling kecil. Ini memungkinkan ±1, ±2, dst. tetap
    # menjadi rekomendasi ketika benar-benar memberi fit terbaik.
    nonzero_candidates = [
        candidate
        for candidate in candidates
        if candidate["transpose"] != 0
    ]

    if nonzero_candidates:
        return min(
            nonzero_candidates,
            key=lambda candidate: (
                candidate["total_overflow"],
                candidate["maximum_overflow"],
                abs(
                    candidate["transpose"]
                ),
                candidate["transpose"],
            ),
        )

    # Fallback defensif.
    return min(
        candidates,
        key=lambda candidate: (
            candidate["total_overflow"],
            candidate["maximum_overflow"],
            abs(
                candidate["transpose"]
            ),
            candidate["transpose"],
        ),
    )


# ======================================================
# PROGRAM UTAMA
# ======================================================

try:
    if len(sys.argv) < 6:
        raise ValueError(
            "Parameter recommendation tidak lengkap."
        )

    song_low = int(
        sys.argv[1]
    )

    song_high = int(
        sys.argv[2]
    )

    user_low = int(
        sys.argv[3]
    )

    user_high = int(
        sys.argv[4]
    )

    song_key, song_mode = parse_song_key(
        sys.argv[5]
    )

    if song_low > song_high:
        raise ValueError(
            "Nada terendah lagu lebih tinggi "
            "daripada nada tertinggi lagu."
        )

    if user_low > user_high:
        raise ValueError(
            "Nada terendah vokal lebih tinggi "
            "daripada nada tertinggi vokal."
        )

    best = choose_best_transpose(
        song_low,
        song_high,
        user_low,
        user_high,
        song_key,
    )

    transpose = best["transpose"]
    recommended_key = best["target_key"]

    if song_mode:
        recommended_key_full = (
            recommended_key +
            " " +
            song_mode
        )

        original_key_full = (
            song_key +
            " " +
            song_mode
        )
    else:
        recommended_key_full = (
            recommended_key
        )

        original_key_full = (
            song_key
        )

    if best["fully_inside"]:
        if transpose == 0:
            status = "Sudah sesuai"

            explanation = (
                "Rentang lagu sudah berada "
                "di dalam rentang vokal pengguna, "
                "sehingga perubahan key tidak diperlukan."
            )
        else:
            status = "Sesuai penuh"

            explanation = (
                "Rentang lagu setelah transposisi "
                "berada di dalam rentang vokal pengguna."
            )
    else:
        status = "Rekomendasi kompromi"

        explanation = (
            "Rentang lagu tidak dapat dimasukkan "
            "sepenuhnya ke dalam rentang vokal pengguna. "
            "Sistem memilih transpose dengan "
            "penyimpangan terkecil dan paling seimbang."
        )

    print(
        json.dumps({
            "success": True,

            "original_key": song_key,
            "original_key_full":
                original_key_full,

            "recommended_key":
                recommended_key,

            "recommended_key_full":
                recommended_key_full,

            "transpose":
                transpose,

            "status":
                status,

            "explanation":
                explanation,

            "fit_percentage":
                best["fit_percentage"],

            "song_lowest_before":
                song_low,

            "song_highest_before":
                song_high,

            "song_lowest_after":
                best["shifted_low"],

            "song_highest_after":
                best["shifted_high"],

            "user_lowest":
                user_low,

            "user_highest":
                user_high,

            "low_overflow":
                best["low_overflow"],

            "high_overflow":
                best["high_overflow"],

            "fully_inside":
                best["fully_inside"],

            "candidate_scope":
                "all_12_chromatic_keys",
        })
    )

except Exception as error:
    print(
        json.dumps({
            "success": False,
            "error": str(error),
        })
    )