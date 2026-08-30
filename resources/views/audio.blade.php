<!DOCTYPE html>
<html lang="id">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">


    <title>TUNE-MASTER</title>

    <link rel="icon" type="image/png" href="{{ asset('images/musicc.png') }}">
    <meta name="base-url" content="{{ url('/') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <!-- Bootstrap -->

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Bootstrap Icons -->

    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">

    <!-- Custom CSS -->

    <link rel="stylesheet" href="{{ asset('css/audio.css') }}">

    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
    >    

</head>

<body>
<div class="history-floating-menu dropdown">

    <button
        class="btn btn-light shadow history-floating-button"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title="Menu History">

        <i class="fa-solid fa-bars"></i>

    </button>

    <ul class="dropdown-menu shadow border-0">

        <li>
            <button
                id="btnHistorySongs"
                class="dropdown-item"
                type="button">

                <i class="bi bi-music-note-list me-2"></i>
                History Lagu

            </button>
        </li>

        <li>
            <button
                id="btnHistoryPitches"
                class="dropdown-item"
                type="button">

                <i class="bi bi-soundwave me-2"></i>
                History Pitch Shifting

            </button>
        </li>

    </ul>

</div>    

<!-- ========================= -->
<!-- HEADER -->
<!-- ========================= -->

<header class="hero-header">

    <div class="container py-5">

        <div class="row align-items-center">

            <div class="col-lg-8">

                <span class="badge bg-light text-primary mb-3">
                    DIGITAL KARAOKE
                </span>

                <h1 class="display-5 fw-bold text-white mb-3">
                    TUNE-MASTER
                </h1>

                <p class="lead text-white mb-0">
                    Aplikasi Pitch Shifting Audio Digital Untuk Personalisasi Nada Dasar Lagu Karaoke
                </p>

            </div>

        </div>

    </div>

</header>

<div class="container-fluid px-4">

<div class="accordion" id="mainAccordion">

<!-- ===================================================== -->
<!-- CARI LAGU -->
<!-- ===================================================== -->

<div class="accordion-item shadow-sm rounded-4 border-0 mb-4">

    <h2 class="accordion-header">
        <button class="accordion-button rounded-4"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapseSearch">

            <i class="bi bi-search me-2"></i>

            <div>
                <strong>Cari Lagu Karaoke</strong><br>
                <small class="text-muted">
                    Cari lagu karaoke dari YouTube
                </small>
            </div>

        </button>
    </h2>

    <div id="collapseSearch"
         class="accordion-collapse collapse show">

        <div class="accordion-body">

            <div class="row g-3 align-items-center">

                <div class="col-lg-10">
                    <input id="searchInput"
                           type="text"
                           class="form-control form-control-lg"
                           placeholder="Masukkan judul lagu karaoke..."
                           autocomplete="off">
                </div>

                <div class="col-lg-2">
                    <button id="btnSearch"
                            class="btn btn-primary btn-lg w-100">

                        <i class="bi bi-search me-2"></i>
                        Cari

                    </button>
                </div>

            </div>

            <div id="status" class="mt-3 text-muted">
                Silakan cari lagu karaoke yang ingin digunakan.
            </div>

            <ul id="results" class="list-group list-group-flush mt-3">
            </ul>
            <!-- Audio dan Key Detection diproses pada tahap Perekaman Vokal. -->
        </div>        
    </div>

    <div class="alert alert-primary mt-4 mb-0">

        <i class="bi bi-lightbulb-fill me-2"></i>

        pastikan lagu yang dipilih terdapat <strong>Judul Lagu & Nama Artist</strong>.

    </div>

</div>

<!-- ===================================================== -->
<!-- PEREKAMAN VOKAL -->
<!-- ===================================================== -->

<div class="accordion-item shadow-sm rounded-4 border-0 mb-4">

    <h2 class="accordion-header">
        <button class="accordion-button collapsed rounded-4"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapseVocal">

            <i class="bi bi-mic-fill me-2"></i>

            <div>
                <strong>Perekaman Vokal</strong><br>
                <small class="text-muted">
                    Rekam suara untuk menentukan rentang vokal pengguna.
                </small>
            </div>

        </button>
    </h2>

    <div id="collapseVocal"
         class="accordion-collapse collapse">

        <div class="accordion-body">

            <!-- Satu card untuk seluruh proses perekaman vokal -->
            <div class="card border-0 shadow-sm">

                <div class="card-body">

                    <h5 class="fw-bold mb-3">
                        Perekaman Vokal
                    </h5>

                    <!-- AUDIO LAGU ORIGINAL -->
                    <div class="mb-4">

                        <label class="form-label fw-semibold">
                            Audio Lagu Original
                        </label>

                        <audio
                            id="audioOriginal"
                            controls
                            class="w-100">
                        </audio>

                        <small class="text-muted d-block mt-2">
                            Audio lagu digunakan sebagai pengiring selama perekaman vokal.
                        </small>

                    </div>

                    <!-- KEY DETECTION -->
                    <div class="alert alert-primary mb-4">

                        <small class="text-muted d-block">
                            Key Lagu
                        </small>

                        <strong id="keyDetection">
                            -
                        </strong>

                    </div>

                    <!-- LIRIK LENGKAP -->
                    <div class="mb-4">

                        <label class="form-label fw-semibold">
                            Lirik Lagu
                        </label>

                        <!-- Dipertahankan untuk kompatibilitas dengan JavaScript lama. -->
                        <div id="lyricsReff" class="d-none"></div>

                        <div
                            id="lyricsRecording"
                            class="lyrics-box">

                            Silakan pilih lagu terlebih dahulu.

                        </div>

                    </div>

                    <!-- WAVEFORM -->
                    <div class="wave-container mb-3">
                        <canvas id="waveform"></canvas>
                    </div>

                    <!-- KONTROL REKAMAN -->
                    <div class="d-flex gap-2 mb-3">

                        <button
                            id="startBtn"
                            class="btn btn-success">

                            <i class="bi bi-record-circle me-2"></i>
                            Mulai Rekam

                        </button>

                        <button
                            id="stopBtn"
                            class="btn btn-danger"
                            disabled>

                            <i class="bi bi-stop-circle me-2"></i>
                            Stop Rekam

                        </button>

                    </div>

                    <div
                        id="vocalStatus"
                        class="alert alert-light border">

                        Belum ada rekaman.

                    </div>

                    <!-- HASIL REKAMAN -->
                    <div class="mt-3">

                        <label class="form-label fw-semibold">
                            Hasil Rekaman Vokal
                        </label>

                        <audio
                            id="audioPlayback"
                            controls
                            class="w-100">
                        </audio>

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>

<!-- ===================================================== -->
<!-- HASIL ANALISIS PERSONALISASI NADA -->
<!-- ===================================================== -->

<div class="accordion-item shadow-sm rounded-4 border-0 mb-4">

    <h2 class="accordion-header">

        <button class="accordion-button collapsed rounded-4"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapseAnalysis">

            <i class="bi bi-graph-up-arrow me-2"></i>

            <div>

                <strong>Hasil Analisis Personalisasi Nada</strong><br>

                <small class="text-muted">

                    Hasil identifikasi rentang vokal dan rekomendasi pitch.

                </small>

            </div>

        </button>

    </h2>

    <div id="collapseAnalysis"
         class="accordion-collapse collapse">

            <div class="accordion-body">

                <div class="row g-4">

                    <!-- ============================== -->
                    <!-- INPUT LAGU -->
                    <!-- ============================== -->

                    <div class="col-lg-4">

                        <div class="card border-0 shadow-sm h-100">

                            <div class="card-header bg-primary text-white">

                                <strong>
                                    Informasi Lagu
                                </strong>

                            </div>

                            <div class="card-body-infs">

                                <div class="d-flex justify-content-between mb-3">

                                    <span>Key Lagu</span>

                                    <strong id="detailOriginalKey">

                                        -

                                    </strong>

                                </div>

                                <div class="d-flex justify-content-between mb-3">

                                    <span>Rentang Lagu</span>

                                    <strong id="songRange">

                                        -

                                    </strong>

                                </div>

                                <div class="d-flex justify-content-between mb-3">

                                    <span>Nada Tertinggi</span>

                                    <strong id="songHighest">

                                        -

                                    </strong>

                                </div>

                                <div class="d-flex justify-content-between ">

                                    <span>Nada Terendah</span>

                                    <strong id="songLowest">

                                        -

                                    </strong>

                                </div>                                

                            </div>

                        </div>

                    </div>

                    <!-- ============================== -->
                    <!-- INPUT VOKAL -->
                    <!-- ============================== -->

                    <div class="col-lg-4">

                        <div class="card border-0 shadow-sm h-100">

                            <div class="card-header bg-success text-white">

                                <strong>
                                    Informasi Vokal
                                </strong>

                            </div>

                            <div class="card-body-infs">

                                <div class="d-flex justify-content-between mb-3">

                                    <span>Rentang Vokal</span>

                                    <strong id="vocalRange">

                                        -

                                    </strong>

                                </div>

                                <div class="d-flex justify-content-between  mb-3 ">

                                    <span>Nada Tertinggi</span>

                                    <strong id="vocalHighest">

                                        -

                                    </strong>

                                </div>

                                <div class="d-flex justify-content-between ">

                                    <span>Nada Terendah</span>

                                    <strong id="vocalLowest">

                                        -

                                    </strong>

                                </div>                                

                            </div>

                        </div>

                    </div>

                    <!-- ============================== -->
                    <!-- HASIL -->
                    <!-- ============================== -->

                    <div class="col-lg-4">

                        <div class="card border-0 shadow-sm h-100">

                            <div class="card-header bg-warning">

                                <strong>
                                    Hasil Analisis
                                </strong>

                            </div>

                            <div class="card-body-infs">

                                <div class="d-flex justify-content-between mb-3">

                                    <span>Transpose</span>

                                    <strong id="recommendedTranspose">

                                        -

                                    </strong>

                                </div>

                                <div class="d-flex justify-content-between mb-3">

                                    <span>Key Rekomendasi</span>

                                    <strong id="detailRecommendedKey">

                                        -

                                    </strong>

                                </div>

                                <div class="d-flex justify-content-between">

                                    <span>Key Hasil Pitch</span>

                                    <strong id="detailTargetKey">

                                        -

                                    </strong>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                <div class="alert alert-info mt-4 mb-0">

                    <i class="bi bi-info-circle-fill me-2"></i>

                    Sistem menghitung rekomendasi key berdasarkan
                    <strong>perbandingan rentang lagu</strong>
                    dan
                    <strong>rentang vokal pengguna</strong>.
                    Nilai transpose diperoleh dari selisih rentang tersebut,
                    kemudian digunakan sebagai dasar dalam menentukan
                    <strong>Key Rekomendasi</strong> sebelum proses
                    <strong>Pitch Shifting</strong> dilakukan.

                </div>

            </div>

        </div>

    </div>

</div>

<!-- ===================================================== -->
<!-- PERSONALISASI NADA -->
<!-- ===================================================== -->

<div class="accordion-item shadow-sm rounded-4 border-0 mb-4">

    <h2 class="accordion-header">
        <button class="accordion-button collapsed rounded-4"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapsePitch">

            <i class="bi bi-sliders me-2"></i>

            <div>
                <strong>Personalisasi Nada</strong><br>
                <small class="text-muted">
                    Pilih nada dasar yang paling nyaman untuk dinyanyikan.
                </small>
            </div>

        </button>
    </h2>

    <div id="collapsePitch" class="accordion-collapse collapse">

        <div class="accordion-body">

        <div class="alert alert-light border">

            <i class="bi bi-info-circle-fill me-2"></i>

            <strong>Keterangan :</strong>

            <ul class="mb-0 mt-2">

                <li>
                    <span class="badge bg-secondary">
                        O
                    </span>

                    menunjukkan <strong>Key Asli Lagu</strong>.
                </li>

                <li>

                    <span class="badge bg-warning text-dark">

                        

                    </span>

                    menunjukkan <strong>Key Rekomendasi</strong>.

                </li>

                <li>

                    <span class="badge bg-primary">

                        

                    </span>

                    menunjukkan <strong>Key yang sedang digunakan untuk Pitch Shifting</strong>.

                </li>

            </ul>

        </div>

            <div
                id="pitchStatus"
                class="text-center text-muted mb-3">

                Siap melakukan Pitch Shifting

            </div>        

            <div
                id="pitchButtons"
                class="pitch-group d-flex flex-wrap justify-content-center gap-2 mt-4 mb-4">

                <button data-key="C"
                        onclick="changeKey('C',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    C
                </button>

                <button data-key="C#"
                        onclick="changeKey('C#',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    C#
                </button>

                <button data-key="D"
                        onclick="changeKey('D',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    D
                </button>

                <button data-key="D#"
                        onclick="changeKey('D#',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    D#
                </button>

                <button data-key="E"
                        onclick="changeKey('E',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    E
                </button>

                <button data-key="F"
                        onclick="changeKey('F',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    F
                </button>

                <button data-key="F#"
                        onclick="changeKey('F#',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    F#
                </button>

                <button data-key="G"
                        onclick="changeKey('G',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    G
                </button>

                <button data-key="G#"
                        onclick="changeKey('G#',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    G#
                </button>

                <button data-key="A"
                        onclick="changeKey('A',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    A
                </button>

                <button data-key="A#"
                        onclick="changeKey('A#',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    A#
                </button>

                <button data-key="B"
                        onclick="changeKey('B',this)"
                        class="btn btn-outline-primary rounded-pill px-3">
                    B
                </button>

            </div>
            <!-- Satu card untuk audio hasil, perekaman vokal, dan lirik -->
            <div class="card border-0 shadow-sm">

                <div class="card-body">

                    <!-- AUDIO HASIL PITCH SHIFTING -->
                    <h5 class="fw-bold mb-3">
                        Audio Pitch Shifting
                    </h5>

                    <audio
                        id="audioProcessed"
                        controls
                        class="w-100 mb-3">
                    </audio>

                    <!-- LIRIK -->
                    <div class="border-top pt-4">

                        <h5 class="fw-bold mb-3">
                            Lirik Lagu
                        </h5>

                        <div
                            id="lyricsFull"
                            class="lyrics-box">

                            Silakan pilih lagu terlebih dahulu.

                        </div>

                        <div class="text-center text-muted mt-3">

                            <small>
                                Lirik akan berubah otomatis mengikuti audio hasil
                                personalisasi nada.
                            </small>

                        </div>

                    </div>

                    <!-- REKAM VOKAL SETELAH PITCH SHIFTING -->
                    <div class="border-top pt-4">

                        <h5 class="fw-bold mb-3">
                            Rekam Vokal
                        </h5>

                        <div class="wave-container mb-3">
                            <canvas id="pitchWaveform"></canvas>
                        </div>

                        <div class="d-flex gap-2 mb-3">

                            <button
                                id="pitchStartBtn"
                                class="btn btn-success">

                                <i class="bi bi-record-circle me-2"></i>
                                Mulai Rekam

                            </button>

                            <button
                                id="pitchStopBtn"
                                class="btn btn-danger"
                                disabled>

                                <i class="bi bi-stop-circle me-2"></i>
                                Stop Rekam

                            </button>

                        </div>

                        <div
                            id="pitchVocalStatus"
                            class="alert alert-light border">

                            Belum ada rekaman.

                        </div>

                        <audio
                            id="pitchAudioPlayback"
                            controls
                            class="w-100 mb-4">
                        </audio>

                    </div>

                    <div class="alert alert-success mb-4">

                        <i class="bi bi-check-circle-fill me-2"></i>

                        Audio hasil transposisi akan muncul setelah
                        pengguna memilih <strong>Target Key</strong>.

                    </div>

                </div>

            </div>

            <div class="row mt-5">

                <div class="col-lg-12">

                    <div class="card border-0 bg-light">

                        <div class="card-body">

                            <h6 class="fw-bold mb-3">

                                Keterangan

                            </h6>

                                <ul class="mb-0">

                                    <li>
                                        Key rekomendasi diperoleh dari hasil analisis rentang lagu dan rentang vokal pengguna.
                                    </li>

                                    <li>
                                        Pengguna tetap dapat memilih key lain sesuai kenyamanan bernyanyi.
                                    </li>

                                    <li>
                                        Setelah key dipilih, sistem melakukan proses Pitch Shifting tanpa mengubah tempo lagu.
                                    </li>

                                </ul>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>

<!-- ===================================================== -->
<!-- VISUALISASI ANALISIS NADA -->
<!-- ===================================================== -->

<div class="accordion-item shadow-sm rounded-4 border-0 mb-4">

    <h2 class="accordion-header">

        <button
            class="accordion-button collapsed rounded-4"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapseVisualization">

            <i class="bi bi-bar-chart-line-fill me-2"></i>

            <div>

                <strong>Visualisasi Analisis Nada</strong><br>

                <small class="text-muted">

                    Perbandingan rentang nada dan visualisasi hasil analisis pitch sebelum serta sesudah proses personalisasi.

                </small>

            </div>

        </button>

    </h2>

    <div
        id="collapseVisualization"
        class="accordion-collapse collapse">

        <div class="accordion-body">

            <!-- ======================================= -->
            <!-- INFORMASI VALIDASI PERUBAHAN KEY -->
            <!-- ======================================= -->

            <div class="row g-3 mb-4">

                <div class="col-md-3">

                    <div class="card border-0 bg-light h-100">

                        <div class="card-body">

                            <small class="text-muted d-block mb-1">
                                Key Asli
                            </small>

                            <h5
                                id="visualOriginalKey"
                                class="fw-bold mb-0">

                                -

                            </h5>

                        </div>

                    </div>

                </div>

                <div class="col-md-3">

                    <div class="card border-0 bg-light h-100">

                        <div class="card-body">

                            <small class="text-muted d-block mb-1">
                                Key Hasil
                            </small>

                            <h5
                                id="visualTargetKey"
                                class="fw-bold text-primary mb-0">

                                -

                            </h5>

                        </div>

                    </div>

                </div>

                <div class="col-md-3">

                    <div class="card border-0 bg-light h-100">

                        <div class="card-body">

                            <small class="text-muted d-block mb-1">
                                Transpose
                            </small>

                            <h5
                                id="visualTranspose"
                                class="fw-bold text-warning mb-0">

                                -

                            </h5>

                        </div>

                    </div>

                </div>

                <div class="col-md-3">

                    <div class="card border-0 bg-light h-100">

                        <div class="card-body">

                            <small class="text-muted d-block mb-1">
                                Status Validasi
                            </small>

                            <h5
                                id="visualValidationStatus"
                                class="fw-bold text-muted mb-0">

                                Belum tersedia

                            </h5>

                        </div>

                    </div>

                </div>

            </div>


            <!-- ======================================= -->
            <!-- CHROMAGRAM SEBELUM DAN SESUDAH -->
            <!-- ======================================= -->

            <div class="row g-4">

                <!-- CHROMAGRAM ASLI -->

                <div class="col-lg-6">

                    <div class="card border-0 shadow-sm h-100">

                        <div class="card-body">

                            <div
                                class="d-flex justify-content-between align-items-center mb-3">

                                <div>

                                    <h5
                                        id="originalChromagramTitle"
                                        class="fw-bold mb-1">

                                        Chromagram Audio Asli

                                    </h5>

                                    <small
                                        id="originalChromagramDescription"
                                        class="text-muted">

                                        Distribusi intensitas relatif kelas nada sebelum Pitch Shifting

                                    </small>

                                </div>

                                <span
                                    id="originalKeyBadge"
                                    class="badge bg-secondary">

                                    Key: -

                                </span>

                            </div>

                            <div class="visualization-chart-container">

                                <canvas
                                    id="originalChromagramChart">
                                </canvas>

                            </div>

                        </div>

                    </div>

                </div>


                <!-- CHROMAGRAM HASIL -->

                <div class="col-lg-6">

                    <div class="card border-0 shadow-sm h-100">

                        <div class="card-body">

                            <div
                                class="d-flex justify-content-between align-items-center mb-3">

                                <div>

                                    <h5
                                        id="resultChromagramTitle"
                                        class="fw-bold mb-1">

                                        Chromagram Hasil Pitch Shifting

                                    </h5>

                                    <small
                                        id="resultChromagramDescription"
                                        class="text-muted">

                                        Distribusi intensitas relatif kelas nada setelah Pitch Shifting

                                    </small>

                                </div>

                                <span
                                    id="targetKeyBadge"
                                    class="badge bg-primary">

                                    Key: -

                                </span>

                            </div>

                            <div class="visualization-chart-container">

                                <canvas
                                    id="shiftedChromagramChart">
                                </canvas>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            <!-- ======================================= -->
            <!-- HASIL VALIDASI POLA CHROMA -->
            <!-- ======================================= -->

            <div class="card border-0 shadow-sm mt-4">

                <div class="card-body">

                    <h5
                        id="chromaValidationTitle"
                        class="fw-bold mb-4">

                        Hasil Validasi Perubahan Key

                    </h5>

                    <div class="row g-4">

                        <div class="col-md-4">

                            <small
                                id="chromaShiftLabel"
                                class="text-muted d-block mb-1">

                                Pergeseran Pola Chroma

                            </small>

                            <strong
                                id="chromaShiftResult"
                                class="fs-5">

                                -

                            </strong>

                        </div>

                        <div class="col-md-4">

                            <small
                                id="chromaSimilarityLabel"
                                class="text-muted d-block mb-1">

                                Kesesuaian Pola

                            </small>

                            <strong
                                id="chromaSimilarity"
                                class="fs-5">

                                -

                            </strong>

                        </div>

                        <div class="col-md-4">

                            <small class="text-muted d-block mb-1">
                                Interpretasi
                            </small>

                            <strong
                                id="chromaInterpretation"
                                class="fs-5">

                                Belum dilakukan Pitch Shifting

                            </strong>

                        </div>

                    </div>

                    <div
                        id="chromaValidationAlert"
                        class="alert alert-light border mt-4 mb-0">

                        <i class="bi bi-info-circle-fill me-2"></i>

                        Pilih target key dan lakukan Pitch Shifting untuk
                        menampilkan validasi perubahan pola nada.

                    </div>

                </div>

            </div>

            <!-- ======================================= -->
            <!-- PENJELASAN CHROMAGRAM -->
            <!-- ======================================= -->

            <div
                id="chromaExplanation"
                class="alert alert-primary mt-4 mb-0">

                <i class="bi bi-lightbulb-fill me-2"></i>

                <strong>Interpretasi Visualisasi:</strong>

                Chromagram memperlihatkan distribusi intensitas relatif pada
                12 kelas nada, yaitu C hingga B. Setelah proses Pitch Shifting
                dilakukan, pola chroma audio asli digeser sesuai jumlah semitone
                yang dipilih. Tingkat kesesuaian menunjukkan kemiripan antara
                pola chroma yang diharapkan dengan pola chroma hasil proses.

            </div>

            <!-- ======================================= -->
            <!-- VALIDASI PITCH: VOKAL VS MELODY -->
            <!-- ======================================= -->

            <div class="row g-4 mt-1">

                <!-- ================================ -->
                <!-- ORIGINAL / SEBELUM TRANSPOSE -->
                <!-- ================================ -->

                <div class="col-lg-6">

                    <div class="card border-0 shadow-sm h-100">

                        <div class="card-body">

                            <div class="d-flex align-items-center justify-content-between mb-2">

                                <div>
                                    <h6 class="fw-bold mb-1">
                                        Vokal vs Melodi Lagu Asli
                                    </h6>

                                    <small class="text-muted">
                                        Validasi nada setelah alignment temporal sebelum transposisi
                                    </small>
                                </div>

                            </div>

                            <div
                                style="
                                    position: relative;
                                    height: 320px;
                                    width: 100%;
                                "
                            >

                                <canvas
                                    id="originalPitchComparisonChart">
                                </canvas>

                            </div>

                            <div class="row text-center mt-3 g-3">

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Fals</small>
                                    <strong id="originalPitchMAE">-</strong>
                                </div>

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Tepat ≤ 1 Nada</small>
                                    <strong id="originalPitchWithin1">-</strong>
                                </div>

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Offset Pitch</small>
                                    <strong id="originalPitchOffset">-</strong>
                                </div>

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Offset Waktu</small>
                                    <strong id="originalPitchAlignment">-</strong>
                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                <!-- ================================ -->
                <!-- RECOMMENDED / SESUDAH TRANSPOSE -->
                <!-- ================================ -->

                <div class="col-lg-6">

                    <div class="card border-0 shadow-sm h-100">

                        <div class="card-body">

                            <div class="d-flex align-items-center justify-content-between mb-2">

                                <div>
                                    <h6 class="fw-bold mb-1">
                                        Vokal vs Melodi Rekomendasi
                                    </h6>

                                    <small class="text-muted">
                                        Validasi nada setelah alignment temporal pada key rekomendasi
                                    </small>
                                </div>

                            </div>

                            <div
                                style="
                                    position: relative;
                                    height: 320px;
                                    width: 100%;
                                "
                            >

                                <canvas
                                    id="recommendedPitchComparisonChart">
                                </canvas>

                            </div>

                            <div class="row text-center mt-3 g-3">

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Fals</small>
                                    <strong id="recommendedPitchMAE">-</strong>
                                </div>

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Tepat ≤ 1 Nada</small>
                                    <strong id="recommendedPitchWithin1">-</strong>
                                </div>

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Offset Pitch</small>
                                    <strong id="recommendedPitchOffset">-</strong>
                                </div>

                                <div class="col-6 col-md-3">
                                    <small class="text-muted d-block">Offset Waktu</small>
                                    <strong id="recommendedPitchAlignment">-</strong>
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>
        </div>
    </div>

</div>

<!-- ===================================================== -->
<!-- TIPS PENGGUNAAN -->
<!-- ===================================================== -->

<div class="card border-0 shadow-sm rounded-4 mb-5">

    <div class="card-body">

        <h4 class="fw-bold mb-4">

            <i class="bi bi-lightbulb-fill text-warning me-2"></i>

            Tips Penggunaan

        </h4>

        <div class="row">

            <div class="col-md-4">

                <div class="d-flex">

                    <i class="bi bi-search fs-3 text-primary me-3"></i>

                    <div>

                        <strong>Cari Lagu</strong>

                        <p class="mb-0 text-muted">

                            Cari lagu karaoke yang ingin digunakan.

                        </p>

                    </div>

                </div>

            </div>

            <div class="col-md-4">

                <div class="d-flex">

                    <i class="bi bi-mic-fill fs-3 text-success me-3"></i>

                    <div>

                        <strong>Rekam Vokal</strong>

                        <p class="mb-0 text-muted">

                            Lakukan analisis vokal menggunakan suara alami.

                        </p>

                    </div>

                </div>

            </div>

            <div class="col-md-4">

                <div class="d-flex">

                    <i class="bi bi-music-note-list fs-3 text-danger me-3"></i>

                    <div>

                        <strong>Pilih Target Key</strong>

                        <p class="mb-0 text-muted">

                            Dengarkan hasil Pitch Shifting sesuai rentang vokal.

                        </p>

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>

<!-- ===================================================== -->
<!-- MODAL HISTORY LAGU -->
<!-- ===================================================== -->

<div
    class="modal fade"
    id="historySongsModal"
    tabindex="-1"
    aria-hidden="true">

    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">

        <div class="modal-content border-0 rounded-4 shadow">

            <div class="modal-header">

                <div>
                    <h5 class="modal-title fw-bold">
                        History Lagu
                    </h5>

                    <small class="text-muted">
                        Daftar lagu yang pernah digunakan.
                    </small>
                </div>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal">
                </button>

            </div>

            <div class="modal-body">

                <div
                    id="historySongsStatus"
                    class="text-muted text-center py-4">

                    Memuat history lagu...

                </div>

                <div
                    id="historySongsList"
                    class="d-flex flex-column gap-3">
                </div>

            </div>

        </div>

    </div>

</div>

<!-- ===================================================== -->
<!-- MODAL HISTORY PITCH SHIFTING -->
<!-- ===================================================== -->

<div
    class="modal fade"
    id="historyPitchesModal"
    tabindex="-1"
    aria-hidden="true">

    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">

        <div class="modal-content border-0 rounded-4 shadow">

            <div class="modal-header">

                <div>
                    <h5 class="modal-title fw-bold">
                        History Pitch Shifting
                    </h5>

                    <small class="text-muted">
                        Audio hasil personalisasi nada yang pernah diproses.
                    </small>
                </div>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal">
                </button>

            </div>

            <div class="modal-body">

                <div
                    id="historyPitchesStatus"
                    class="text-muted text-center py-4">

                    Memuat history pitch shifting...

                </div>

                <div
                    id="historyPitchesList"
                    class="d-flex flex-column gap-3">
                </div>

            </div>

        </div>

    </div>

</div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script src="{{ asset('js/audio.js') }}?v={{ filemtime(public_path('js/audio.js')) }}"></script>

<script src="{{ asset('js/search-song.js') }}?v={{ filemtime(public_path('js/search-song.js')) }}"></script>

<script src="{{ asset('js/audio-analysis.js') }}?v={{ filemtime(public_path('js/audio-analysis.js')) }}"></script>


</body>

</html>