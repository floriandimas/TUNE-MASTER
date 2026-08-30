// ======================================================
// ELEMEN PEREKAMAN VOKAL
// ======================================================

const startBtn =
    document.getElementById(
        "startBtn"
    );

const stopBtn =
    document.getElementById(
        "stopBtn"
    );

const audioPlayback =
    document.getElementById(
        "audioPlayback"
    );

const vocalStatus =
    document.getElementById(
        "vocalStatus"
    );

let mediaRecorder = null;
let audioChunks = [];

const MAX_VOCAL_RECORDING_MS = 30000;
let vocalRecordingTimeout = null;

let audioContext = null;
let analyser = null;
let microphoneSource = null;
let microphoneStream = null;

let animationId = null;

// Reference melody disiapkan paralel setelah rekaman dimulai.
let referenceMelodyPromise = null;


// ======================================================
// SELISIH SEMITONE
// ======================================================

function getSemitoneDiff(from, to)
{
    const fromIndex =
        NOTES.indexOf(from);

    const toIndex =
        NOTES.indexOf(to);

    if(
        fromIndex === -1 ||
        toIndex === -1
    )
    {
        return 0;
    }

    let difference =
        toIndex - fromIndex;

    if(difference > 6)
    {
        difference -= 12;
    }

    if(difference < -6)
    {
        difference += 12;
    }

    return difference;
}

// ======================================================
// LOCK / UNLOCK TOMBOL PITCH
// ======================================================

function setPitchButtonsDisabled(disabled)
{
    document
        .querySelectorAll(
            "#pitchButtons button"
        )
        .forEach(button =>
        {
            button.disabled =
                disabled;
        });
}

// ======================================================
// STATE PENGUJIAN PITCH SHIFTING
// ======================================================

let testingOriginalAudioPath =
    null;

let testingCurrentAudioPath =
    null;

let testingOriginalKey =
    null;

let testingCurrentKey =
    null;

let testingOriginalChromagram =
    null;

let testingTemporalSimilarity = null;

let testingIntermediateKey =
    null;

let testingFirstTranspose =
    null;

let testingReturnTranspose =
    null;

let pitchDeviationChart =
    null;

let testingStep =
    0;

let testingCompleted =
    false;


// ======================================================
// RESET SESSION PENGUJIAN
// ======================================================

function resetPitchTesting()
{
    const audioOriginal =
        document.getElementById(
            "audioOriginal"
        );

    if(
        !audioOriginal ||
        !audioOriginal.src ||
        !originalKey
    )
    {
        return false;
    }

    const cleanOriginalPath =
        audioOriginal.src
            .split("?")[0];

    testingOriginalAudioPath =
        cleanOriginalPath;

    testingCurrentAudioPath =
        cleanOriginalPath;

    testingOriginalKey =
        originalKey;

    testingCurrentKey =
        originalKey;

    testingOriginalChromagram =
        null;

    testingTemporalSimilarity =
        null;
        
    testingIntermediateKey =
        null;

    testingFirstTranspose =
        null;

    testingReturnTranspose =
        null;

    testingStep =
        0;

    testingCompleted =
        false;

    /*
    |--------------------------------------------------------------------------
    | Kembalikan audio hasil ke kondisi kosong
    |--------------------------------------------------------------------------
    */

    const audioProcessed =
        document.getElementById(
            "audioProcessed"
        );

    if(audioProcessed)
    {
        audioProcessed.pause();

        audioProcessed.removeAttribute(
            "src"
        );

        audioProcessed.load();
    }

    /*
    |--------------------------------------------------------------------------
    | Reset tampilan
    |--------------------------------------------------------------------------
    */

    setText(
        "pitchStatus",
        "Pengujian siap dimulai."
    );

    setText(
        "visualOriginalKey",
        testingOriginalKey
    );

    setText(
        "visualTargetKey",
        "-"
    );

    setText(
        "visualTranspose",
        "-"
    );

    console.log(
        "TESTING RESET:",
        {
            originalPath:
                testingOriginalAudioPath,

            originalKey:
                testingOriginalKey,

            currentPath:
                testingCurrentAudioPath,

            currentKey:
                testingCurrentKey
        }
    );

    return true;
}

// ======================================================
// INISIALISASI SESSION PENGUJIAN
// ======================================================

function initializePitchTesting()
{
    const audioOriginal =
        document.getElementById(
            "audioOriginal"
        );

    if(
        !audioOriginal ||
        !audioOriginal.src ||
        !originalKey
    )
    {
        return false;
    }

    const cleanOriginalPath =
        audioOriginal.src
            .split("?")[0];

    /*
    |--------------------------------------------------------------------------
    | Buat session baru jika:
    | - belum pernah dimulai
    | - audio original berubah
    | - key original berubah
    |--------------------------------------------------------------------------
    */

    if(
        !testingOriginalAudioPath ||
        testingOriginalAudioPath !==
            cleanOriginalPath ||
        testingOriginalKey !==
            originalKey
    )
    {
        testingOriginalAudioPath =
            cleanOriginalPath;

        testingCurrentAudioPath =
            cleanOriginalPath;

        testingOriginalKey =
            originalKey;

        testingCurrentKey =
            originalKey;

        testingOriginalChromagram =
            null;

        testingTemporalSimilarity = 
            null;

        testingStep =
            0;

        testingCompleted =
            false;

        console.log(
            "SESSION TESTING DIMULAI:",
            {
                originalPath:
                    testingOriginalAudioPath,

                originalKey:
                    testingOriginalKey
            }
        );
    }

    return true;
}

// ======================================================
// PITCH SHIFTING
// ======================================================

async function changeKey(targetKey, button)
{
    if(
        !songData ||
        !Array.isArray(songData.graph) ||
        songData.graph.length === 0
    )
    {
        alert(
            "Data lagu belum siap. Silakan tunggu proses deteksi key selesai."
        );

        return;
    }

    if(!originalKey)
    {
        alert(
            "Pilih lagu terlebih dahulu."
        );

        return;
    }

    const difference =
        getSemitoneDiff(
            originalKey,
            targetKey
        );

    if(difference === 0)
    {
        alert(
            "Target key sama dengan key original."
        );

        return;
    }

    setText(
        "visualOriginalKey",
        originalKey
    );

    setText(
        "visualTargetKey",
        targetKey
    );

    setText(
        "visualTranspose",
        formatSemitone(difference)
    );

    if(
        Math.abs(difference) > 4
    )
    {
        const confirmed =
            confirm(
                "Perubahan lebih dari 4 semitone dapat memengaruhi kualitas audio. Tetap lanjutkan?"
            );

        if(!confirmed)
        {
            return;
        }
    }

    const audioOriginal =
        document.getElementById(
            "audioOriginal"
        );

    if(
        !audioOriginal ||
        !audioOriginal.src
    )
    {
        alert(
            "Audio original belum tersedia."
        );

        return;
    }

    setText(
        "pitchStatus",
        "Memproses pitch shifting..."
    );

    /*
    |--------------------------------------------------------------------------
    | LOCK SEMUA TOMBOL KEY
    |--------------------------------------------------------------------------
    */

    setPitchButtonsDisabled(
        true
    );

    const cleanPath =
        audioOriginal.src
            .split("?")[0];

    try
    {
        const response =
            await fetch(
                BASE_URL + "/transpose",
                {
                    method: "POST",

                    headers:
                    {
                        "Content-Type":
                            "application/json",

                        "X-CSRF-TOKEN":
                            csrf
                    },

                    body: JSON.stringify({
                        path: cleanPath,
                        semitone: difference,
                        target_key: targetKey,

                        recommended_key:
                            recommendationData?.recommended_key ||
                            null,

                        vocal_lowest:
                            vocalData?.lowest_note ||
                            null,

                        vocal_highest:
                            vocalData?.highest_note ||
                            null
                    })
                }
            );

        const data =
            await response.json();

        if(
            !response.ok ||
            data.success === false ||
            !data.path
        )
        {
            throw new Error(
                data.message ||
                "Pitch shifting gagal dilakukan."
            );
        }

        window.originalChromagram =
            data.original_chromagram || null;

        window.shiftedChromagram =
            data.shifted_chromagram || null;

        const audioProcessed =
            document.getElementById(
                "audioProcessed"
            );

        if(audioProcessed)
        {
            audioProcessed.src =
                data.path +
                "?t=" +
                Date.now();

            audioProcessed.load();

            audioProcessed.ontimeupdate =
                function()
                {
                    updateLyrics(
                        audioProcessed.currentTime
                    );
                };
        }

        setText(
            "detailTargetKey",
            targetKey
        );

        setText(
            "recommendedTranspose",
            formatSemitone(difference)
        );

        setText(
            "pitchStatus",
            "Pitch shifting selesai."
        );

        highlightPitchButton(
            button
        );

        drawChromagramValidation(
            originalKey,
            targetKey,
            difference
        );
    }
    catch(error)
    {
        console.error(
            "PITCH SHIFT ERROR:",
            error
        );

        setText(
            "pitchStatus",
            error.message ||
            "Gagal melakukan pitch shifting."
        );
    }
    finally
    {
        /*
        |--------------------------------------------------------------------------
        | UNLOCK SEMUA TOMBOL KEY
        |--------------------------------------------------------------------------
        */

        setPitchButtonsDisabled(
            false
        );
    }
}


// ======================================================
// FORMAT SEMITONE
// ======================================================

function formatSemitone(value)
{
    const number =
        Number(value) || 0;

    return (
        number > 0
            ? "+"
            : ""
    ) +
    number +
    " Semitone";
}


// ======================================================
// TERAPKAN KEY REKOMENDASI
// ======================================================

function applyRecommendedKey()
{
    if(
        !recommendationData ||
        !recommendationData.recommended_key
    )
    {
        alert(
            "Belum ada hasil rekomendasi."
        );

        return;
    }

    const button =
        document.querySelector(
            `.pitch-group button[data-key="${CSS.escape(
                recommendationData.recommended_key
            )}"]`
        );

    if(button)
    {
        changeKey(
            recommendationData.recommended_key,
            button
        );
    }
}


// ======================================================
// HIGHLIGHT KEY AKTIF
// ======================================================

function highlightPitchButton(activeButton)
{
    document
        .querySelectorAll(
            "#pitchButtons button"
        )
        .forEach(button =>
        {
            button.classList.remove(
                "active",
                "btn-primary",
                "btn-warning",
                "btn-outline-primary"
            );

            if(
                button.classList.contains(
                    "recommended"
                )
            )
            {
                button.classList.add(
                    "btn-warning"
                );
            }
            else
            {
                button.classList.add(
                    "btn-outline-primary"
                );
            }
        });

    if(!activeButton)
    {
        return;
    }

    activeButton.classList.remove(
        "btn-outline-primary",
        "btn-warning"
    );

    activeButton.classList.add(
        "btn-primary",
        "active"
    );
}


// ======================================================
// HIGHLIGHT KEY REKOMENDASI
// ======================================================

function highlightRecommendation(key)
{
    document
        .querySelectorAll(
            "#pitchButtons button"
        )
        .forEach(button =>
        {
            button.classList.remove(
                "recommended",
                "btn-warning"
            );

            if(
                !button.classList.contains(
                    "active"
                )
            )
            {
                button.classList.remove(
                    "btn-primary"
                );

                button.classList.add(
                    "btn-outline-primary"
                );
            }

            if(
                button.dataset.key === key
            )
            {
                button.classList.add(
                    "recommended"
                );

                if(
                    !button.classList.contains(
                        "active"
                    )
                )
                {
                    button.classList.remove(
                        "btn-outline-primary"
                    );

                    button.classList.add(
                        "btn-warning"
                    );
                }
            }
        });
}


// ======================================================
// VISUALISASI WAVEFORM
// ======================================================

function drawWaveform()
{
    const canvas =
        document.getElementById(
            "waveform"
        );

    if(
        !canvas ||
        !analyser
    )
    {
        return;
    }

    const context =
        canvas.getContext(
            "2d"
        );

    canvas.width =
        canvas.offsetWidth || 800;

    canvas.height =
        canvas.offsetHeight || 180;

    const bufferLength =
        analyser.fftSize;

    const dataArray =
        new Uint8Array(
            bufferLength
        );

    function draw()
    {
        animationId =
            requestAnimationFrame(
                draw
            );

        analyser.getByteTimeDomainData(
            dataArray
        );

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.lineWidth = 3;
        context.strokeStyle = "#1e9aca";

        context.beginPath();

        const sliceWidth =
            canvas.width /
            bufferLength;

        let x = 0;

        for(
            let index = 0;
            index < bufferLength;
            index++
        )
        {
            const value =
                dataArray[index] /
                128;

            const y =
                value *
                canvas.height /
                2;

            if(index === 0)
            {
                context.moveTo(
                    x,
                    y
                );
            }
            else
            {
                context.lineTo(
                    x,
                    y
                );
            }

            x += sliceWidth;
        }

        context.stroke();
    }

    draw();
}


// ======================================================
// TAMPILAN AWAL WAVEFORM
// ======================================================

function drawWaveformPlaceholder()
{
    const canvas =
        document.getElementById(
            "waveform"
        );

    if(!canvas)
    {
        return;
    }

    canvas.width =
        canvas.offsetWidth || 800;

    canvas.height =
        canvas.offsetHeight || 180;

    const context =
        canvas.getContext(
            "2d"
        );

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.font =
        "16px Arial";

    context.fillStyle =
        "#9ca3af";

    context.textAlign =
        "center";

    context.textBaseline =
        "middle";

    context.fillText(
        "Visualisasi Rekaman Vokal",
        canvas.width / 2,
        canvas.height / 2
    );
}


// ======================================================
// MULAI REKAMAN VOKAL
// ======================================================

if(startBtn)
{
    startBtn.addEventListener(
        "click",
        startVocalRecording
    );
}

async function startVocalRecording()
{
    if(
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    )
    {
        setVocalStatus(
            "Browser tidak mendukung perekaman mikrofon."
        );

        return;
    }

    try
    {
        // ==================================================
        // PENTING:
        // Recording vokal berdiri sendiri.
        // Tidak mengubah posisi, play, atau pause audio lagu.
        // Personalisasi Nada tetap memakai audioProcessed + lyricsFull
        // melalui handler yang sudah ada di fitur tersebut.
        // ==================================================

        console.log(
            "VOCAL RECORDING: microphone-only mode",
            {
                sample:
                    window.vocalLyricsSampleData || null
            }
        );

        // ==================================================
        // Akses mikrofon SECEPATNYA.
        // Reference melody disiapkan paralel agar proses DSP tidak
        // membuat pengguna menunggu sebelum microphone aktif.
        // ==================================================

        microphoneStream =
            await navigator
                .mediaDevices
                .getUserMedia({
                    audio: true
                });

        mediaRecorder =
            new MediaRecorder(
                microphoneStream
            );

        audioChunks = [];

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        analyser =
            audioContext.createAnalyser();

        microphoneSource =
            audioContext
                .createMediaStreamSource(
                    microphoneStream
                );

        microphoneSource.connect(
            analyser
        );

        analyser.fftSize =
            2048;

        drawWaveform();

        mediaRecorder.ondataavailable =
            function(event)
            {
                if(
                    event.data &&
                    event.data.size > 0
                )
                {
                    audioChunks.push(
                        event.data
                    );
                }
            };

        mediaRecorder.onstop =
            handleVocalRecordingStop;

        // ==================================================
        // Mulai recording TANPA memutar audio lagu.
        // ==================================================

        mediaRecorder.start();

        // Reference melody tidak mengontrol playback/lyrics.
        // Ia hanya disiapkan untuk tahap analisis setelah recording.
        referenceMelodyPromise =
            ensureReferenceMelody(
                window.vocalLyricsSampleData
            );

        if(vocalRecordingTimeout)
        {
            clearTimeout(
                vocalRecordingTimeout
            );
        }

        vocalRecordingTimeout =
            setTimeout(
                () =>
                {
                    if(
                        mediaRecorder &&
                        mediaRecorder.state !== "inactive"
                    )
                    {
                        stopVocalRecording();
                    }
                },
                MAX_VOCAL_RECORDING_MS
            );

        startBtn.disabled =
            true;

        if(stopBtn)
        {
            stopBtn.disabled =
                false;
        }

        setVocalStatus(
            "Rekaman sedang berlangsung..."
        );
    }
    catch(error)
    {
        console.error(
            "MICROPHONE ERROR:",
            error
        );

        // Pastikan stream yang sempat terbuka tidak tertinggal.
        stopMicrophoneStream();

        setVocalStatus(
            "Mikrofon tidak diizinkan atau tidak tersedia."
        );
    }
}

// ======================================================
// HENTIKAN REKAMAN VOKAL
// ======================================================

if(stopBtn)
{
    stopBtn.addEventListener(
        "click",
        stopVocalRecording
    );
}

function stopVocalRecording()
{
    // Recording vokal tidak mengontrol audio lagu.
    // Jangan pause audioOriginal di sini.

    if(vocalRecordingTimeout)
    {
        clearTimeout(
            vocalRecordingTimeout
        );

        vocalRecordingTimeout =
            null;
    }

    /*
    |--------------------------------------------------------------------------
    | Hentikan Media Recorder
    |--------------------------------------------------------------------------
    */

    if(
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    )
    {
        mediaRecorder.stop();
    }

    /*
    |--------------------------------------------------------------------------
    | Hentikan animasi waveform
    |--------------------------------------------------------------------------
    */

    if(animationId)
    {
        cancelAnimationFrame(
            animationId
        );

        animationId = null;
    }

    /*
    |--------------------------------------------------------------------------
    | Reset tombol
    |--------------------------------------------------------------------------
    */

    if(startBtn)
    {
        startBtn.disabled =
            false;
    }

    if(stopBtn)
    {
        stopBtn.disabled =
            true;
    }

    /*
    |--------------------------------------------------------------------------
    | Hentikan stream mikrofon
    |--------------------------------------------------------------------------
    */

    stopMicrophoneStream();
}


// ======================================================
// PROSES SETELAH REKAMAN SELESAI
// ======================================================

async function handleVocalRecordingStop()
{
    // Jika reference melody masih diproses, tunggu di tahap analisis.
    // Ini tidak lagi menghambat microphone saat recording dimulai.
    if(referenceMelodyPromise)
    {
        try
        {
            await referenceMelodyPromise;
        }
        catch(error)
        {
            console.warn(
                "REFERENCE MELODY TIDAK SIAP SAAT ANALISIS:",
                error
            );
        }
        finally
        {
            referenceMelodyPromise = null;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Buat Blob dari hasil rekaman
    |--------------------------------------------------------------------------
    */

    const audioBlob =
        new Blob(
            audioChunks,
            {
                type:
                    mediaRecorder?.mimeType ||
                    "audio/webm"
            }
        );

    /*
    |--------------------------------------------------------------------------
    | Validasi rekaman
    |--------------------------------------------------------------------------
    */

    if(audioBlob.size === 0)
    {
        setVocalStatus(
            "Rekaman suara kosong."
        );

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Tampilkan playback hasil rekaman
    |--------------------------------------------------------------------------
    */

    if(audioPlayback)
    {
        audioPlayback.src =
            URL.createObjectURL(
                audioBlob
            );

        audioPlayback.load();
    }

    setVocalStatus(
        "Menganalisis vokal..."
    );

    /*
    |--------------------------------------------------------------------------
    | Siapkan data untuk detect-vocal
    |--------------------------------------------------------------------------
    */

    const formData =
        new FormData();

    formData.append(
        "audio",
        audioBlob,
        "voice.webm"
    );

    /*
    |--------------------------------------------------------------------------
    | Kirim metadata posisi sampel
    |
    | Belum dipakai Python untuk perhitungan.
    | Disiapkan agar posisi cuplikan tetap diketahui.
    |--------------------------------------------------------------------------
    */

    if(
        window.vocalLyricsSampleData
    )
    {
        if(
            window.vocalLyricsSampleData
                .startTime !== null &&
            window.vocalLyricsSampleData
                .startTime !== undefined
        )
        {
            formData.append(
                "sample_start_time",
                String(
                    window.vocalLyricsSampleData
                        .startTime
                )
            );
        }

        if(
            window.vocalLyricsSampleData
                .endTime !== null &&
            window.vocalLyricsSampleData
                .endTime !== undefined
        )
        {
            formData.append(
                "sample_end_time",
                String(
                    window.vocalLyricsSampleData
                        .endTime
                )
            );
        }

        if(
            window.vocalLyricsSampleData
                .type
        )
        {
            formData.append(
                "sample_type",
                window.vocalLyricsSampleData
                    .type
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Debug data rekaman
    |--------------------------------------------------------------------------
    */

    console.log(
        "VOCAL RECORDING SUBMIT:",
        {
            blobSize:
                audioBlob.size,

            sample:
                window.vocalLyricsSampleData ||
                null
        }
    );

    try
    {
        /*
        |--------------------------------------------------------------------------
        | Request analisis vokal
        |--------------------------------------------------------------------------
        */

        const response =
            await fetch(
                BASE_URL +
                "/detect-vocal",
                {
                    method:
                        "POST",

                    headers:
                    {
                        "X-CSRF-TOKEN":
                            csrf
                    },

                    body:
                        formData
                }
            );

        const data =
            await response.json();

        /*
        |--------------------------------------------------------------------------
        | Validasi response
        |--------------------------------------------------------------------------
        */

        if(
            !response.ok ||
            data.success === false
        )
        {
            throw new Error(
                data.error ||
                data.message ||
                "Gagal menganalisis vokal."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Simpan hasil analisis vokal
        |--------------------------------------------------------------------------
        */

        vocalData =
            data;


        /*
        |--------------------------------------------------------------------------
        | Sinkronkan waktu pitch vokal dengan posisi lagu
        |--------------------------------------------------------------------------
        */

        if(
            vocalData &&
            Array.isArray(
                vocalData.pitch_track
            ) &&
            window.vocalLyricsSampleData &&
            window.vocalLyricsSampleData.startTime !== null &&
            window.vocalLyricsSampleData.startTime !== undefined
        )
        {
            const sampleStartTime =
                Number(
                    window.vocalLyricsSampleData.startTime
                );

            if(
                Number.isFinite(
                    sampleStartTime
                )
            )
            {
                vocalData.pitch_track =
                    vocalData.pitch_track.map(
                        point =>
                        {
                            const recordingTime =
                                Number(
                                    point.time
                                ) || 0;

                            return {
                                ...point,

                                recording_time:
                                    recordingTime,

                                song_time:
                                    Number(
                                        (
                                            sampleStartTime +
                                            recordingTime
                                        ).toFixed(3)
                                    )
                            };
                        }
                    );
            }
        }
        /*
        |--------------------------------------------------------------------------
        | Debug hasil detect-vocal
        |--------------------------------------------------------------------------
        */

        console.log(
            "VOCAL ANALYSIS RESULT:",
            vocalData
        );

        /*
        |--------------------------------------------------------------------------
        | Tampilkan hasil analisis
        |--------------------------------------------------------------------------
        */

        displayVocalData(
            vocalData
        );

        /*
        |--------------------------------------------------------------------------
        | Request rekomendasi key
        |--------------------------------------------------------------------------
        */

        if(
            songData &&
            vocalData
        )
        {
            await requestRecommendation();
        }
        else
        {
            setVocalStatus(
                "Analisis vokal berhasil. Pilih lagu untuk memperoleh rekomendasi."
            );
        }
    }
    catch(error)
    {
        console.error(
            "VOCAL ANALYSIS ERROR:",
            error
        );

        vocalData = null;

        setVocalStatus(
            error.message ||
            "Gagal menganalisis vokal."
        );
    }
}


// ======================================================
// TAMPILKAN DATA VOKAL
// ======================================================

function displayVocalData(data)
{
    /*
    |--------------------------------------------------------------------------
    | Data rentang vokal
    |--------------------------------------------------------------------------
    */

    setText(
        "vocalRange",
        data.range || "-"
    );

    setText(
        "vocalLowest",
        data.lowest_note || "-"
    );

    setText(
        "vocalHighest",
        data.highest_note || "-"
    );

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    setVocalStatus(
        "Analisis vokal berhasil."
    );
}

function displayPitchDeviation(data)
{
    const section =
        document.getElementById(
            "pitchDeviationSection"
        );

    /*
    |--------------------------------------------------------------------------
    | Reset tampilan terlebih dahulu
    |--------------------------------------------------------------------------
    */

    if(section)
    {
        section.style.display =
            "none";
    }

    if(pitchDeviationChart)
    {
        pitchDeviationChart.destroy();

        pitchDeviationChart =
            null;
    }

    /*
    |--------------------------------------------------------------------------
    | Validasi data deviasi berbasis reference
    |--------------------------------------------------------------------------
    */

    if(
        !data ||
        !data.pitch_deviation ||
        !Array.isArray(data.pitch_track) ||
        data.pitch_track.length === 0
    )
    {
        console.warn(
            "Data evaluasi deviasi pitch berbasis reference tidak tersedia.",
            data
        );

        return;
    }

    const deviation =
        data.pitch_deviation;

    const meanAbsoluteCent =
        Number(
            deviation.mean_absolute_cent
        );

    if(
        !Number.isFinite(
            meanAbsoluteCent
        )
    )
    {
        console.warn(
            "Mean Absolute Cent Deviation tidak tersedia.",
            deviation
        );

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Tampilkan section
    |--------------------------------------------------------------------------
    */

    if(section)
    {
        section.style.display =
            "block";
    }

    /*
    |--------------------------------------------------------------------------
    | Hanya nilai utama yang digunakan dalam pengujian
    |--------------------------------------------------------------------------
    */

    setText(
        "meanCentDeviation",
        meanAbsoluteCent.toFixed(2)
    );

    /*
    |--------------------------------------------------------------------------
    | Canvas grafik
    |--------------------------------------------------------------------------
    */

    const canvas =
        document.getElementById(
            "pitchDeviationChart"
        );

    if(!canvas)
    {
        console.warn(
            "Canvas pitchDeviationChart tidak ditemukan."
        );

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Bentuk titik grafik
    |
    | X = waktu rekaman
    | Y = residual pitch deviation dalam cent
    |--------------------------------------------------------------------------
    */

    const chartPoints =
        data.pitch_track
            .map(
                (point, index) =>
                {
                    const time =
                        Number(
                            point.recording_time ??
                            point.time
                        );

                    const cent =
                        Number(
                            point.cent_deviation
                        );

                    if(
                        !Number.isFinite(time) ||
                        !Number.isFinite(cent)
                    )
                    {
                        return null;
                    }

                    return {
                        x: time,
                        y: cent,
                        sourceIndex: index
                    };
                }
            )
            .filter(
                point =>
                    point !== null
            );

    if(chartPoints.length === 0)
    {
        console.warn(
            "Tidak ada titik deviasi pitch yang valid."
        );

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Garis 0 cent
    |--------------------------------------------------------------------------
    */

    const firstTime =
        chartPoints[0].x;

    const lastTime =
        chartPoints[
            chartPoints.length - 1
        ].x;

    const zeroLine =
    [
        {
            x: firstTime,
            y: 0
        },
        {
            x: lastTime,
            y: 0
        }
    ];

    /*
    |--------------------------------------------------------------------------
    | Buat grafik
    |--------------------------------------------------------------------------
    */

    pitchDeviationChart =
        new Chart(
            canvas,
            {
                type:
                    "line",

                data:
                {
                    datasets:
                    [
                        {
                            label:
                                "Deviasi Pitch terhadap Reference",

                            data:
                                chartPoints,

                            borderColor:
                                "#36a2eb",

                            backgroundColor:
                                "rgba(54, 162, 235, 0.15)",

                            borderWidth:
                                2,

                            pointRadius:
                                0,

                            pointHoverRadius:
                                4,

                            tension:
                                0.15,

                            fill:
                                false,

                            spanGaps:
                                true
                        },

                        {
                            label:
                                "0 Cent",

                            data:
                                zeroLine,

                            borderColor:
                                "#ff6384",

                            borderWidth:
                                1,

                            pointRadius:
                                0,

                            borderDash:
                                [5, 5],

                            fill:
                                false
                        }
                    ]
                },

                options:
                {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    parsing:
                        false,

                    interaction:
                    {
                        mode:
                            "nearest",

                        intersect:
                            false
                    },

                    plugins:
                    {
                        legend:
                        {
                            display:
                                true
                        },

                        tooltip:
                        {
                            filter:
                                function(context)
                                {
                                    return (
                                        context.datasetIndex === 0
                                    );
                                },

                            callbacks:
                            {
                                title:
                                    function(items)
                                    {
                                        if(
                                            !items ||
                                            items.length === 0
                                        )
                                        {
                                            return "";
                                        }

                                        const time =
                                            Number(
                                                items[0].raw.x
                                            );

                                        return (
                                            "Waktu Rekaman: " +
                                            time.toFixed(2) +
                                            " detik"
                                        );
                                    },

                                label:
                                    function(context)
                                    {
                                        const sourceIndex =
                                            context.raw
                                                .sourceIndex;

                                        const point =
                                            data.pitch_track[
                                                sourceIndex
                                            ];

                                        const cent =
                                            Number(
                                                point
                                                    .cent_deviation
                                            );

                                        return [
                                            "Deviasi: " +
                                            (
                                                cent > 0
                                                    ? "+"
                                                    : ""
                                            ) +
                                            cent.toFixed(2) +
                                            " cent",

                                            "Nada Pengguna: " +
                                            (
                                                point.nearest_note ||
                                                "-"
                                            ),

                                            "Nada Reference: " +
                                            (
                                                point.reference_note ||
                                                "-"
                                            )
                                        ];
                                    }
                            }
                        }
                    },

                    scales:
                    {
                        x:
                        {
                            type:
                                "linear",

                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Waktu Rekaman (detik)"
                            },

                            ticks:
                            {
                                maxTicksLimit:
                                    12,

                                callback:
                                    function(value)
                                    {
                                        return (
                                            Number(value)
                                                .toFixed(1)
                                        );
                                    }
                            }
                        },

                        y:
                        {
                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Residual Pitch Deviation (cent)"
                            },

                            ticks:
                            {
                                callback:
                                    function(value)
                                    {
                                        if(value > 0)
                                        {
                                            return (
                                                "+" +
                                                value
                                            );
                                        }

                                        return value;
                                    }
                            }
                        }
                    }
                }
            }
        );

    /*
    |--------------------------------------------------------------------------
    | Debug
    |--------------------------------------------------------------------------
    */

    console.log(
        "PITCH DEVIATION VISUALIZATION:",
        {
            meanAbsoluteCent:
                meanAbsoluteCent,

            globalPitchOffset:
                deviation
                    .global_pitch_offset_semitone,

            alignmentMethod:
                deviation
                    .alignment_method,

            referenceType:
                deviation
                    .reference_type,

            referenceFile:
                deviation
                    .reference_file,

            points:
                chartPoints.length
        }
    );
}


// ======================================================
// REQUEST REKOMENDASI
// ======================================================

async function requestRecommendation()
{
    if(
        !songData ||
        !vocalData
    )
    {
        return;
    }

    const requiredValues = [
        songData.lowest_midi,
        songData.highest_midi,
        vocalData.lowest_midi,
        vocalData.highest_midi
    ];

    const invalidValue =
        requiredValues.some(
            value =>
                value === undefined ||
                value === null ||
                Number.isNaN(
                    Number(value)
                )
        );

    if(invalidValue)
    {
        setVocalStatus(
            "Data rentang lagu atau vokal tidak lengkap."
        );

        return;
    }

    try
    {
        const response =
            await fetch(
                BASE_URL +
                "/recommendation",
                {
                    method: "POST",

                    headers:
                    {
                        "Content-Type":
                            "application/json",

                        "X-CSRF-TOKEN":
                            csrf
                    },

                    body: JSON.stringify({
                        song_lowest:
                            Number(
                                songData.lowest_midi
                            ),

                        song_highest:
                            Number(
                                songData.highest_midi
                            ),

                        user_lowest:
                            Number(
                                vocalData.lowest_midi
                            ),

                        user_highest:
                            Number(
                                vocalData.highest_midi
                            ),

                        song_key:
                            songData.key ||
                            originalKey
                    })
                }
            );

        const data =
            await response.json();

        if(
            !response.ok ||
            data.success === false ||
            !data.recommended_key
        )
        {
            throw new Error(
                data.error ||
                data.message ||
                "Gagal memperoleh rekomendasi."
            );
        }

        recommendationData =
            data;

        displayRecommendation(
            recommendationData
        );

        // ==============================================
        // VISUALISASI FASE 1
        // ==============================================
        //
        // Rekaman pertama hanya mengisi grafik kiri:
        // Vokal Awal vs Melodi Lagu Asli.
        // Grafik kanan sengaja dibiarkan kosong sampai
        // rekaman fase 2 (setelah personalisasi nada) selesai.
        // ==============================================

        drawInitialOriginalComparison();

        setVocalStatus(
            "Analisis vokal dan rekomendasi berhasil."
        );
    }
    catch(error)
    {
        console.error(
            "RECOMMENDATION ERROR:",
            error
        );

        recommendationData = null;

        setVocalStatus(
            error.message ||
            "Gagal memperoleh rekomendasi key."
        );
    }
}

// ======================================================
// PITCH COMPARISON
// ======================================================

function compareVocalWithMelody()
{
    if(!vocalData || !recommendationData)
    {
        return null;
    }

    return buildRecordingComparison(
        vocalData,
        window.vocalLyricsSampleData,
        0,
        "initial"
    );
}

// ======================================================
// VISUALISASI PITCH COMPARISON
// ======================================================

let originalPitchComparisonChart = null;
let recommendedPitchComparisonChart = null;


function drawPitchComparison(result)
{
    if(
        !result ||
        !Array.isArray(result.comparison) ||
        result.comparison.length === 0
    )
    {
        console.warn(
            "Data pitch comparison tidak tersedia."
        );

        return;
    }

    const comparison =
        result.comparison;

    // ==================================================
    // WAKTU AWAL SAMPEL
    // ==================================================
    //
    // songData.graph memakai waktu lagu absolut.
    // comparison memakai waktu relatif terhadap rekaman vokal.
    // Keduanya disamakan di sini untuk VISUALISASI.
    // ==================================================

    const sample =
        window.vocalLyricsSampleData;

    const sampleStart =
        sample &&
        sample.startTime !== undefined &&
        sample.startTime !== null
            ? Number(sample.startTime)
            : 0;


    // ==================================================
    // KONTUR VOKAL
    // ==================================================
    //
    // Gunakan seluruh pitch vokal yang sudah berhasil
    // dibandingkan. Jangan pecah menjadi titik terpisah
    // sebagai dataset utama; tampilkan sebagai satu garis.
    // Warna garis vokal dibuat berbeda dari melody.
    // ==================================================

    function createVocalContour()
    {
        return comparison
            .map(point =>
            {
                const x =
                    Number(
                        point.recording_time
                    );

                const y =
                    Number(
                        point.vocal_midi
                    );

                if(
                    !Number.isFinite(x) ||
                    !Number.isFinite(y)
                )
                {
                    return null;
                }

                return {
                    x,
                    y
                };
            })
            .filter(point => point !== null)
            .sort(
                (a, b) =>
                    a.x - b.x
            );
    }


    const vocalContour =
        createVocalContour();


    // ==================================================
    // MARKER FALS
    // ==================================================
    //
    // Marker tetap mengikuti hasil comparison asli.
    // Jadi warna fals tidak dibuat-buat dan tidak mengubah
    // MAE. Garis vokalnya tetap satu kontur utuh.
    // ==================================================

    function createDeviationMarkers(
        referenceField
    )
    {
        const flat = [];
        const sharp = [];
        const inTune = [];

        comparison.forEach(point =>
        {
            const x =
                Number(
                    point.recording_time
                );

            const vocal =
                Number(
                    point.vocal_midi
                );

            const reference =
                Number(
                    point[referenceField]
                );

            if(
                !Number.isFinite(x) ||
                !Number.isFinite(vocal) ||
                !Number.isFinite(reference)
            )
            {
                return;
            }

            const deviation =
                vocal - reference;

            const item = {
                x,
                y: vocal
            };

            if(
                Math.abs(deviation) <= 1
            )
            {
                inTune.push(item);
            }
            else if(
                deviation < -1
            )
            {
                flat.push(item);
            }
            else
            {
                sharp.push(item);
            }
        });

        return {
            inTune,
            flat,
            sharp
        };
    }


    const originalMarkers =
        createDeviationMarkers(
            "original_midi"
        );

    const recommendedMarkers =
        createDeviationMarkers(
            "recommended_midi"
        );


    // ==================================================
    // MELODY LAGU
    // ==================================================
    //
    // PENTING:
    // Jangan ambil melody dari comparison.
    // comparison hanya berisi titik yang berhasil dipasangkan
    // dengan vokal sehingga melody bisa terlihat terpotong.
    //
    // Gunakan SONG GRAPH sebagai trajectory melody penuh.
    // Jika tersedia midi_float, gunakan itu agar perubahan
    // pitch lebih natural; fallback ke midi jika tidak ada.
    // ==================================================

    function createSongMelody(
        transposeValue
    )
    {
        if(
            !songData ||
            !Array.isArray(songData.graph)
        )
        {
            return [];
        }

        return songData.graph
            .map(point =>
            {
                const absoluteTime =
                    Number(
                        point.time
                    );

                const midi =
                    Number(
                        point.midi_float ??
                        point.midi
                    );

                if(
                    !Number.isFinite(
                        absoluteTime
                    ) ||
                    !Number.isFinite(midi)
                )
                {
                    return null;
                }

                return {
                    x:
                        absoluteTime -
                        sampleStart,

                    y:
                        midi +
                        transposeValue
                };
            })
            .filter(point =>
                point !== null &&
                Number.isFinite(point.x) &&
                Number.isFinite(point.y)
            )
            .sort(
                (a, b) =>
                    a.x - b.x
            );
    }


    const originalMelody =
        createSongMelody(0);

    const recommendedMelody =
        createSongMelody(
            Number(result.transpose) || 0
        );


    console.log(
        "PITCH COMPARISON VISUAL:",
        {
            melodyPoints:
                originalMelody.length,

            vocalPoints:
                vocalContour.length,

            transpose:
                Number(result.transpose) || 0
        }
    );


    // ==================================================
    // OPTIONS
    // ==================================================

    function createOptions()
    {
        return {

            responsive:
                true,

            maintainAspectRatio:
                false,

            interaction:
            {
                mode:
                    "nearest",

                intersect:
                    false
            },

            plugins:
            {
                legend:
                {
                    display:
                        true,

                    // Marker fals tetap digambar pada grafik,
                    // tetapi legend cukup menampilkan dua kontur.
                    labels:
                    {
                        filter:
                            function(item, chartData)
                            {
                                const dataset =
                                    chartData.datasets[
                                        item.datasetIndex
                                    ];

                                const label =
                                    dataset &&
                                    dataset.label
                                        ? dataset.label
                                        : "";

                                return (
                                    label ===
                                        "Melodi Lagu Asli" ||

                                    label ===
                                        "Melodi Rekomendasi" ||

                                    label ===
                                        "Kontur Vokal"
                                );
                            }
                    }
                },

                tooltip:
                {
                    callbacks:
                    {
                        label:
                            function(context)
                            {
                                const midi =
                                    Number(
                                        context.parsed.y
                                    );

                                return (
                                    "MIDI: " +
                                    midi.toFixed(2)
                                );
                            }
                    }
                }
            },

            scales:
            {
                x:
                {
                    type:
                        "linear",

                    title:
                    {
                        display:
                            true,

                        text:
                            "Waktu Rekaman (detik)"
                    }
                },

                y:
                {
                    title:
                    {
                        display:
                            true,

                        text:
                            "MIDI Note"
                    }
                }
            }
        };
    }


    // ==================================================
    // HAPUS CHART LAMA
    // ==================================================

    if(
        originalPitchComparisonChart
    )
    {
        originalPitchComparisonChart.destroy();

        originalPitchComparisonChart =
            null;
    }

    if(
        recommendedPitchComparisonChart
    )
    {
        recommendedPitchComparisonChart.destroy();

        recommendedPitchComparisonChart =
            null;
    }


    // ==================================================
    // DATASET GARIS VOKAL + MARKER FALS
    // ==================================================

    function vocalLineDataset()
    {
        return {
            label:
                "Kontur Vokal",

            data:
                vocalContour,

            // Vokal ditampilkan sebagai titik-titik pitch.
            // Data comparison dan perhitungan Tepat/Fals tetap sama.
            showLine:
                false,

            borderColor:
                "#1677ff",

            backgroundColor:
                "#1677ff",

            borderWidth:
                0,

            pointRadius:
                2.5,

            pointHoverRadius:
                4,

            tension:
                0,

            fill:
                false,

            spanGaps:
                false
        };
    }


    function markerDatasets(
        markers
    )
    {
        return [

            {
                label:
                    "Vokal Tepat",

                data:
                    markers.inTune,

                showLine:
                    false,

                pointRadius:
                    2.5,

                pointHoverRadius:
                    4,

                backgroundColor:
                    "#ff8aa8",

                borderColor:
                    "#ff8aa8"
            },

            {
                label:
                    "Vokal Flat",

                data:
                    markers.flat,

                showLine:
                    false,

                pointRadius:
                    2.5,

                pointHoverRadius:
                    4,

                backgroundColor:
                    "#f6a15a",

                borderColor:
                    "#f6a15a"
            },

            {
                label:
                    "Vokal Sharp",

                data:
                    markers.sharp,

                showLine:
                    false,

                pointRadius:
                    2.5,

                pointHoverRadius:
                    4,

                backgroundColor:
                    "#ffd35c",

                borderColor:
                    "#ffd35c"
            }
        ];
    }


    // ==================================================
    // CHART SEBELUM REKOMENDASI
    // ==================================================

    const originalCanvas =
        document.getElementById(
            "originalPitchComparisonChart"
        );

    if(originalCanvas)
    {
        const ctx =
            originalCanvas.getContext(
                "2d"
            );

        originalPitchComparisonChart =
            new Chart(
                ctx,
                {
                    type:
                        "scatter",

                    data:
                    {
                        datasets:
                        [

                            {
                                label:
                                    "Melodi Lagu Asli",

                                data:
                                    originalMelody,

                                showLine:
                                    true,

                                borderColor:
                                    "#6f767d",

                                backgroundColor:
                                    "#6f767d",

                                borderWidth:
                                    2,

                                pointRadius:
                                    0,

                                pointHoverRadius:
                                    4,

                                tension:
                                    0.05,

                                fill:
                                    false,

                                spanGaps:
                                    true
                            },

                            vocalLineDataset(),

                            ...markerDatasets(
                                originalMarkers
                            )

                        ]
                    },

                    options:
                        createOptions()
                }
            );
    }


    // ==================================================
    // CHART SETELAH REKOMENDASI
    // ==================================================

    const recommendedCanvas =
        document.getElementById(
            "recommendedPitchComparisonChart"
        );

    if(recommendedCanvas)
    {
        const ctx =
            recommendedCanvas.getContext(
                "2d"
            );

        recommendedPitchComparisonChart =
            new Chart(
                ctx,
                {
                    type:
                        "scatter",

                    data:
                    {
                        datasets:
                        [

                            {
                                label:
                                    "Melodi Rekomendasi",

                                data:
                                    recommendedMelody,

                                showLine:
                                    true,

                                borderColor:
                                    "#6f767d",

                                backgroundColor:
                                    "#6f767d",

                                borderWidth:
                                    2,

                                pointRadius:
                                    0,

                                pointHoverRadius:
                                    4,

                                tension:
                                    0.05,

                                fill:
                                    false,

                                spanGaps:
                                    true
                            },

                            vocalLineDataset(),

                            ...markerDatasets(
                                recommendedMarkers
                            )

                        ]
                    },

                    options:
                        createOptions()
                }
            );
    }


    // ==================================================
    // UPDATE NILAI HASIL COMPARISON
    // ==================================================
    //
    // Tampilan metric:
    // Fals (%) = 100% - Tepat <= 1 Semitone (%)
    //
    // MAE tetap dihitung internal untuk comparison,
    // tetapi TIDAK ditampilkan pada UI.
    //
    // Blade metric boleh dikosongkan. JS membuat footer
    // metric langsung setelah canvas agar tidak double.
    // ==================================================

    function formatMetric(value, suffix = "")
    {
        const number =
            Number(value);

        if(!Number.isFinite(number))
        {
            return "-";
        }

        return number.toFixed(2) + suffix;
    }

    const originalWithin =
        Number(
            result.original_within_1_note
        );

    const recommendedWithin =
        Number(
            result.recommended_within_1_note
        );

    const originalFals =
        Number.isFinite(
            originalWithin
        )
            ? 100 - originalWithin
            : NaN;

    const recommendedFals =
        Number.isFinite(
            recommendedWithin
        )
            ? 100 - recommendedWithin
            : NaN;

    function ensureFalsFooter(
        canvasId,
        falsValue,
        withinValue
    )
    {
        const canvas =
            document.getElementById(
                canvasId
            );

        if(!canvas)
        {
            console.warn(
                "Canvas metric tidak ditemukan:",
                canvasId
            );

            return;
        }

        const host =
            canvas.parentElement;

        if(!host)
        {
            return;
        }

        let footer =
            host.querySelector(
                '[data-pitch-fals-footer="true"]'
            );

        if(!footer)
        {
            footer =
                document.createElement(
                    "div"
                );

            footer.dataset.pitchFalsFooter =
                "true";

            footer.style.cssText =
                "display:flex;justify-content:space-around;align-items:center;gap:24px;margin:10px 8px 2px;padding:6px 4px 2px;font-size:12px;line-height:1.2;text-align:center;";

            host.appendChild(
                footer
            );
        }

        footer.innerHTML =
            '<div>' +
                '<div style="font-size:10px;opacity:.7;margin-bottom:3px;">Fals</div>' +
                '<strong>' +
                    formatMetric(
                        falsValue,
                        "%"
                    ) +
                '</strong>' +
            '</div>' +

            '<div>' +
                '<div style="font-size:10px;opacity:.7;margin-bottom:3px;">Tepat ≤ 1 Nada</div>' +
                '<strong>' +
                    formatMetric(
                        withinValue,
                        "%"
                    ) +
                '</strong>' +
            '</div>';
    }

    ensureFalsFooter(
        "originalPitchComparisonChart",
        originalFals,
        originalWithin
    );

    ensureFalsFooter(
        "recommendedPitchComparisonChart",
        recommendedFals,
        recommendedWithin
    );

    console.log(
        "FALS METRICS DISPLAYED:",
        {
            originalFals:
                originalFals,

            recommendedFals:
                recommendedFals,

            originalWithin1:
                originalWithin,

            recommendedWithin1:
                recommendedWithin,

            comparisonCount:
                result.comparison_count
        }
    );
}

// ======================================================
// VISUALISASI RENTANG NADA
// ======================================================


// ======================================================

function drawPitchRangeComparison()
{
    const canvas =
        document.getElementById(
            "pitchRangeComparisonChart"
        );

    if(!canvas)
    {
        console.warn(
            "Canvas pitchRangeComparisonChart tidak ditemukan."
        );

        return;
    }


    // ==================================================
    // VALIDASI DATA LAGU
    // ==================================================

    if(
        !songData ||
        !Array.isArray(songData.graph) ||
        songData.graph.length === 0
    )
    {
        console.warn(
            "Data graph lagu tidak tersedia."
        );

        return;
    }


    // ==================================================
    // VALIDASI DATA VOKAL
    // ==================================================

    if(
        !vocalData ||
        vocalData.lowest_midi === undefined ||
        vocalData.highest_midi === undefined
    )
    {
        console.warn(
            "Data rentang vokal tidak tersedia."
        );

        return;
    }


    // ==================================================
    // VALIDASI REKOMENDASI
    // ==================================================

    if(
        !recommendationData ||
        recommendationData.transpose === undefined
    )
    {
        console.warn(
            "Data transpose rekomendasi tidak tersedia."
        );

        return;
    }


    // ==================================================
    // HAPUS CHART LAMA
    // ==================================================

    if(pitchRangeComparisonChart)
    {
        pitchRangeComparisonChart.destroy();

        pitchRangeComparisonChart =
            null;
    }


    // ==================================================
    // DATA DASAR
    // ==================================================

    const transpose =
        Number(
            recommendationData.transpose
        ) || 0;

    const vocalLow =
        Number(
            vocalData.lowest_midi
        );

    const vocalHigh =
        Number(
            vocalData.highest_midi
        );


    // ==================================================
    // TRAJECTORY LAGU SEBELUM REKOMENDASI
    // ==================================================

    const originalPoints =
        songData.graph
            .map(
                point =>
                {
                    const time =
                        Number(
                            point.time
                        );

                    const midi =
                        Number(
                            point.midi
                        );

                    if(
                        !Number.isFinite(time) ||
                        !Number.isFinite(midi)
                    )
                    {
                        return null;
                    }

                    return {
                        x: time,
                        y: midi
                    };
                }
            )
            .filter(
                point =>
                    point !== null
            );


    // ==================================================
    // TRAJECTORY LAGU SESUDAH REKOMENDASI
    // ==================================================

    const recommendedPoints =
        songData.graph
            .map(
                point =>
                {
                    const time =
                        Number(
                            point.time
                        );

                    const midi =
                        Number(
                            point.midi
                        );

                    if(
                        !Number.isFinite(time) ||
                        !Number.isFinite(midi)
                    )
                    {
                        return null;
                    }

                    return {
                        x: time,

                        y:
                            midi +
                            transpose
                    };
                }
            )
            .filter(
                point =>
                    point !== null
            );


    if(
        originalPoints.length === 0
    )
    {
        return;
    }


    // ==================================================
    // RENTANG WAKTU
    // ==================================================

    const firstTime =
        originalPoints[0].x;

    const lastTime =
        originalPoints[
            originalPoints.length - 1
        ].x;


    // ==================================================
    // BATAS BAWAH VOKAL
    // ==================================================

    const vocalLowLine =
    [
        {
            x: firstTime,
            y: vocalLow
        },

        {
            x: lastTime,
            y: vocalLow
        }
    ];


    // ==================================================
    // BATAS ATAS VOKAL
    // ==================================================

    const vocalHighLine =
    [
        {
            x: firstTime,
            y: vocalHigh
        },

        {
            x: lastTime,
            y: vocalHigh
        }
    ];


    // ==================================================
    // BUAT GRAFIK
    // ==================================================

    pitchRangeComparisonChart =
        new Chart(
            canvas,
            {
                type: "line",

                data:
                {
                    datasets:
                    [

                        // ----------------------------------
                        // SEBELUM REKOMENDASI
                        // ----------------------------------

                        {
                            label:
                                "Sebelum Rekomendasi",

                            data:
                                originalPoints,

                            borderColor:
                                "#198754",

                            borderWidth:
                                2,

                            pointRadius:
                                0,

                            pointHoverRadius:
                                4,

                            tension:
                                0.15,

                            fill:
                                false,

                            spanGaps:
                                true
                        },


                        // ----------------------------------
                        // SESUDAH REKOMENDASI
                        // ----------------------------------

                        {
                            label:
                                "Setelah Rekomendasi",

                            data:
                                recommendedPoints,

                            borderColor:
                                "#ffc107",

                            borderWidth:
                                2,

                            pointRadius:
                                0,

                            pointHoverRadius:
                                4,

                            tension:
                                0.15,

                            fill:
                                false,

                            spanGaps:
                                true
                        },


                        // ----------------------------------
                        // BATAS BAWAH
                        // ----------------------------------

                        {
                            label:
                                "Batas Bawah Vokal",

                            data:
                                vocalLowLine,

                            borderColor:
                                "#0d6efd",

                            borderWidth:
                                2,

                            borderDash:
                                [6, 4],

                            pointRadius:
                                0,

                            fill:
                                false
                        },


                        // ----------------------------------
                        // BATAS ATAS
                        // ----------------------------------

                        {
                            label:
                                "Batas Atas Vokal",

                            data:
                                vocalHighLine,

                            borderColor:
                                "#0d6efd",

                            borderWidth:
                                2,

                            borderDash:
                                [6, 4],

                            pointRadius:
                                0,

                            fill:
                                false
                        }

                    ]
                },


                options:
                {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    parsing:
                        false,


                    interaction:
                    {
                        mode:
                            "nearest",

                        intersect:
                            false
                    },


                    plugins:
                    {
                        legend:
                        {
                            display:
                                true
                        },


                        tooltip:
                        {
                            callbacks:
                            {
                                title:
                                    function(items)
                                    {
                                        if(
                                            !items ||
                                            items.length === 0
                                        )
                                        {
                                            return "";
                                        }

                                        const time =
                                            Number(
                                                items[0]
                                                    .raw
                                                    .x
                                            );

                                        return (
                                            "Waktu: " +
                                            time.toFixed(2) +
                                            " detik"
                                        );
                                    },


                                label:
                                    function(context)
                                    {
                                        const value =
                                            Number(
                                                context.parsed.y
                                            );

                                        return (
                                            context.dataset.label +
                                            ": MIDI " +
                                            value.toFixed(0)
                                        );
                                    }
                            }
                        }
                    },


                    scales:
                    {
                        x:
                        {
                            type:
                                "linear",

                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Waktu Lagu (detik)"
                            },

                            ticks:
                            {
                                maxTicksLimit:
                                    12,

                                callback:
                                    function(value)
                                    {
                                        return Number(
                                            value
                                        ).toFixed(1);
                                    }
                            }
                        },


                        y:
                        {
                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Pitch (MIDI)"
                            },

                            suggestedMin:
                                vocalLow - 4,

                            suggestedMax:
                                vocalHigh + 4
                        }
                    }
                }
            }
        );


    // ==================================================
    // STATUS
    // ==================================================

    const status =
        document.getElementById(
            "pitchRangeChartStatus"
        );

    if(status)
    {
        status.innerText =
            "Visualisasi tersedia";

        status.classList.remove(
            "bg-secondary"
        );

        status.classList.add(
            "bg-success"
        );
    }


    console.log(
        "PITCH RANGE COMPARISON:",
        {
            transpose:
                transpose,

            vocalLow:
                vocalLow,

            vocalHigh:
                vocalHigh,

            originalPoints:
                originalPoints.length,

            recommendedPoints:
                recommendedPoints.length
        }
    );
}

// ======================================================
// TAMPILKAN REKOMENDASI
// ======================================================

function displayRecommendation(data)
{
    const transpose =
        Number(
            data.transpose
        ) || 0;

    setText(
        "recommendedTranspose",
        formatSemitone(
            transpose
        )
    );

    setText(
        "detailRecommendedKey",
        data.recommended_key || "-"
    );

    const analysisRecommendedKey =
        document.getElementById(
            "analysisRecommendedKey"
        );

    if(analysisRecommendedKey)
    {
        analysisRecommendedKey.innerText =
            data.recommended_key || "-";
    }

    highlightRecommendation(
        data.recommended_key
    );

    // ======================================================
    // VISUALISASI RENTANG NADA
    // ======================================================

    drawPitchRangeComparison();    

    setText(
        "pitchStatus",
        "Rekomendasi key siap digunakan."
    );
}

// ======================================================
// VALIDASI PERUBAHAN KEY DENGAN CHROMAGRAM
// ======================================================

function drawChromagramValidation(
    originalKeyValue,
    targetKeyValue,
    transpose
)
{
    const original = window.originalChromagram;
    const shifted = window.shiftedChromagram;

    if(
        !isValidChromagram(original) ||
        !isValidChromagram(shifted)
    )
    {
        showChromaValidationError(
            "Data chromagram dari proses Pitch Shifting tidak tersedia."
        );

        return;
    }

    const transposeValue =
        Number(transpose) || 0;

    drawOriginalChromagram(
        original
    );

    drawShiftedChromagram(
        shifted
    );

    updateChromaValidationInformation(
        originalKeyValue,
        targetKeyValue,
        transposeValue,
        null
    );
}

// ======================================================
// VALIDASI ORIGINAL VS RETURNED
// ======================================================

function drawReturnedChromagramValidation()
{
    const original =
        testingOriginalChromagram;

    const returned =
        window.shiftedChromagram;

    /*
    |--------------------------------------------------------------------------
    | Validasi chromagram
    |--------------------------------------------------------------------------
    */

    if(
        !isValidChromagram(original) ||
        !isValidChromagram(returned)
    )
    {
        showChromaValidationError(
            "Data chromagram Original atau Returned tidak tersedia."
        );

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | PENTING
    |
    | Tidak menggunakan circularShift().
    |
    | Karena yang dibandingkan adalah:
    |
    | Original F
    | VS
    | Returned F
    |--------------------------------------------------------------------------
    */

    const similarity =
        calculateCosineSimilarity(
            original,
            returned
        );

    const similarityPercentage =
        similarity * 100;

    /*
    |--------------------------------------------------------------------------
    | Simpan hasil
    |--------------------------------------------------------------------------
    */

    window.testingCosineSimilarity =
        similarity;

    /*
    |--------------------------------------------------------------------------
    | Gambar grafik
    |--------------------------------------------------------------------------
    */

    drawOriginalChromagram(
        original
    );

    drawShiftedChromagram(
        returned
    );

    /*
    |--------------------------------------------------------------------------
    | Informasi
    |--------------------------------------------------------------------------
    */

    setText(
        "visualOriginalKey",
        testingOriginalKey
    );

    setText(
        "visualTargetKey",
        testingOriginalKey
    );

    setText(
        "visualTranspose",
        "Kembali ke Key Awal"
    );

    setText(
        "originalKeyBadge",
        "Key Original: " +
        testingOriginalKey
    );

    setText(
        "targetKeyBadge",
        "Key Returned: " +
        testingOriginalKey
    );

    setText(
        "chromaShiftResult",
        testingOriginalKey +
        " → " +
        testingIntermediateKey +
        " → " +
        testingCurrentKey +
        " (" +
        formatSemitone(testingFirstTranspose) +
        " / " +
        formatSemitone(testingReturnTranspose) +
        ")"
    );

    setText(
        "chromaSimilarity",
        similarityPercentage
            .toFixed(2) +
        "%"
    );

    /*
    |--------------------------------------------------------------------------
    | Status validasi
    |--------------------------------------------------------------------------
    */

    const validation =
        getReturnedValidationStatus(
            similarityPercentage
        );

    setText(
        "visualValidationStatus",
        validation.status
    );

    setText(
        "chromaInterpretation",
        validation.interpretation
    );

    updateChromaValidationStyle(
        validation
    );

    console.log(
        "HASIL ORIGINAL VS RETURNED:",
        {
            originalKey:
                testingOriginalKey,

            returnedKey:
                testingCurrentKey,

            similarity:
                similarity,

            percentage:
                similarityPercentage
        }
    );
}


// ======================================================
// VALIDASI STRUKTUR DATA CHROMAGRAM
// ======================================================

function isValidChromagram(data)
{
    return (
        Array.isArray(data) &&
        data.length === 12 &&
        data.every(value =>
            Number.isFinite(
                Number(value)
            )
        )
    );
}


// ======================================================
// PERGESERAN MELINGKAR 12 KELAS NADA
// ======================================================

function circularShift(data, semitone)
{
    const length =
        data.length;

    const normalizedShift =
        (
            Number(semitone) %
            length +
            length
        ) %
        length;

    const result =
        new Array(length);

    data.forEach((value, index) =>
    {
        const newIndex =
            (
                index +
                normalizedShift
            ) %
            length;

        result[newIndex] =
            Number(value);
    });

    return result;
}


// ======================================================
// COSINE SIMILARITY
// ======================================================

function calculateCosineSimilarity(
    first,
    second
)
{
    let dotProduct = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    for(
        let index = 0;
        index < first.length;
        index++
    )
    {
        const firstValue =
            Number(first[index]) || 0;

        const secondValue =
            Number(second[index]) || 0;

        dotProduct +=
            firstValue *
            secondValue;

        firstMagnitude +=
            firstValue *
            firstValue;

        secondMagnitude +=
            secondValue *
            secondValue;
    }

    const denominator =
        Math.sqrt(firstMagnitude) *
        Math.sqrt(secondMagnitude);

    if(denominator === 0)
    {
        return 0;
    }

    const result =
        dotProduct /
        denominator;

    // Pastikan hasil berada pada rentang 0 sampai 1.
    return Math.max(
        0,
        Math.min(
            1,
            result
        )
    );
}


// ======================================================
// CHROMAGRAM AUDIO ASLI
// ======================================================

function drawOriginalChromagram(data)
{
    const canvas =
        document.getElementById(
            "originalChromagramChart"
        );

    if(!canvas)
    {
        return;
    }

    if(originalChromagramChart)
    {
        originalChromagramChart.destroy();

        originalChromagramChart =
            null;
    }

    originalChromagramChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data:
                {
                    labels: NOTES,

                    datasets:
                    [
                        {
                            label:
                                "Energi Chroma Audio Asli",

                            data:
                                data.map(
                                    value =>
                                        Number(value)
                                ),

                            backgroundColor:
                                "rgba(108,117,125,.65)",

                            borderColor:
                                "#6c757d",

                            borderWidth:
                                1
                        }
                    ]
                },

                options:
                {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins:
                    {
                        legend:
                        {
                            display:
                                false
                        },

                        tooltip:
                        {
                            callbacks:
                            {
                                label:
                                    function(context)
                                    {
                                        return (
                                            "Energi: " +
                                            Number(
                                                context.parsed.y
                                            ).toFixed(4)
                                        );
                                    }
                            }
                        }
                    },

                    scales:
                    {
                        y:
                        {
                            beginAtZero:
                                true,

                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Energi Chroma"
                            }
                        },

                        x:
                        {
                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Kelas Nada"
                            }
                        }
                    }
                }
            }
        );
}


// ======================================================
// CHROMAGRAM AUDIO HASIL
// ======================================================

function drawShiftedChromagram(data)
{
    const canvas =
        document.getElementById(
            "shiftedChromagramChart"
        );

    if(!canvas)
    {
        return;
    }

    if(shiftedChromagramChart)
    {
        shiftedChromagramChart.destroy();

        shiftedChromagramChart =
            null;
    }

    shiftedChromagramChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data:
                {
                    labels: NOTES,

                    datasets:
                    [
                        {
                            label:
                                "Energi Chroma Hasil Pitch Shifting",

                            data:
                                data.map(
                                    value =>
                                        Number(value)
                                ),

                            backgroundColor:
                                "rgba(13,110,253,.65)",

                            borderColor:
                                "#0d6efd",

                            borderWidth:
                                1
                        }
                    ]
                },

                options:
                {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins:
                    {
                        legend:
                        {
                            display:
                                false
                        },

                        tooltip:
                        {
                            callbacks:
                            {
                                label:
                                    function(context)
                                    {
                                        return (
                                            "Energi: " +
                                            Number(
                                                context.parsed.y
                                            ).toFixed(4)
                                        );
                                    }
                            }
                        }
                    },

                    scales:
                    {
                        y:
                        {
                            beginAtZero:
                                true,

                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Energi Chroma"
                            }
                        },

                        x:
                        {
                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Kelas Nada"
                            }
                        }
                    }
                }
            }
        );
}


// ======================================================
// TAMPILKAN INFORMASI VALIDASI
// ======================================================

function updateChromaValidationInformation(
    originalKeyValue,
    targetKeyValue,
    transpose,
    similarity
)
{
    setText(
        "visualOriginalKey",
        originalKeyValue || "-"
    );

    setText(
        "visualTargetKey",
        targetKeyValue || "-"
    );

    setText(
        "visualTranspose",
        formatSemitone(transpose)
    );

    setText(
        "originalKeyBadge",
        "Key: " +
        (
            originalKeyValue ||
            "-"
        )
    );

    setText(
        "targetKeyBadge",
        "Key: " +
        (
            targetKeyValue ||
            "-"
        )
    );

    setText(
        "chromaShiftResult",
        formatChromaShift(transpose)
    );

    /*
    |--------------------------------------------------------------------------
    | STEP 1
    | Belum ada nilai kesesuaian pola.
    |--------------------------------------------------------------------------
    */

    if(
        similarity === null ||
        similarity === undefined ||
        !Number.isFinite(
            Number(similarity)
        )
    )
    {
        setText(
            "chromaSimilarity",
            "-"
        );

        setText(
            "visualValidationStatus",
            "Menunggu Pengembalian"
        );

        setText(
            "chromaInterpretation",
            "Kesesuaian pola dihitung setelah audio dikembalikan ke key awal."
        );

        const alertElement =
            document.getElementById(
                "chromaValidationAlert"
            );

        if(alertElement)
        {
            alertElement.classList.remove(
                "validation-success",
                "validation-warning",
                "validation-failed"
            );

            alertElement.innerHTML = `
                <i class="bi bi-info-circle-fill me-2"></i>
                Audio telah mengalami Pitch Shifting.
                Kembalikan audio ke key awal untuk menghitung
                kesesuaian pola menggunakan cosine similarity.
            `;
        }

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | Nilai tersedia
    |--------------------------------------------------------------------------
    */

    setText(
        "chromaSimilarity",
        Number(
            similarity
        ).toFixed(2) +
        "%"
    );

    const validation =
        getChromaValidationStatus(
            Number(similarity)
        );

    setText(
        "visualValidationStatus",
        validation.status
    );

    setText(
        "chromaInterpretation",
        validation.interpretation
    );

    updateChromaValidationStyle(
        validation
    );
}


// ======================================================
// FORMAT PERGESERAN CHROMA
// ======================================================

function formatChromaShift(value)
{
    const semitone =
        Number(value) || 0;

    if(semitone === 0)
    {
        return "0 kelas nada";
    }

    return (
        semitone > 0
            ? "+"
            : ""
    ) +
    semitone +
    " kelas nada";
}


// ======================================================
// STATUS VALIDASI
// ======================================================

function getChromaValidationStatus(similarity)
{
    if(similarity >= 90)
    {
        return {
            status:
                "Sesuai",

            interpretation:
                "Pola chroma bergeser sesuai target key.",

            className:
                "validation-success"
        };
    }

    if(similarity >= 75)
    {
        return {
            status:
                "Cukup Sesuai",

            interpretation:
                "Pola chroma bergeser, tetapi terdapat perbedaan energi nada.",

            className:
                "validation-warning"
        };
    }

    return {
        status:
            "Tidak Sesuai",

        interpretation:
            "Pola chroma hasil belum sesuai dengan pergeseran yang diharapkan.",

        className:
            "validation-failed"
    };
}

// ======================================================
// STATUS VALIDASI ORIGINAL VS RETURNED
// ======================================================

function getReturnedValidationStatus(similarity)
{
    if(similarity >= 90)
    {
        return {
            status:
                "Sangat Mirip",

            interpretation:
                "Pola chroma audio setelah dikembalikan ke key awal memiliki kemiripan yang tinggi terhadap audio asli.",

            className:
                "validation-success"
        };
    }

    if(similarity >= 75)
    {
        return {
            status:
                "Cukup Mirip",

            interpretation:
                "Pola chroma audio setelah dikembalikan ke key awal masih memiliki kemiripan terhadap audio asli, tetapi terdapat perubahan distribusi intensitas tonal.",

            className:
                "validation-warning"
        };
    }

    return {
        status:
            "Kurang Mirip",

        interpretation:
            "Pola chroma audio setelah dikembalikan ke key awal menunjukkan perbedaan yang cukup besar terhadap audio asli.",

        className:
            "validation-failed"
    };
}

// ======================================================
// STYLE DAN ALERT VALIDASI
// ======================================================

function updateChromaValidationStyle(
    validation
)
{
    const statusElement =
        document.getElementById(
            "visualValidationStatus"
        );

    const alertElement =
        document.getElementById(
            "chromaValidationAlert"
        );

    const validationClasses = [
        "validation-success",
        "validation-warning",
        "validation-failed"
    ];

    if(statusElement)
    {
        statusElement.classList.remove(
            ...validationClasses
        );

        statusElement.classList.add(
            validation.className
        );
    }

    if(alertElement)
    {
        alertElement.classList.remove(
            ...validationClasses
        );

        alertElement.classList.add(
            validation.className
        );

        alertElement.innerHTML = `
            <i class="bi bi-check-circle-fill me-2"></i>
            ${validation.interpretation}
        `;
    }
}


// ======================================================
// ERROR VISUALISASI
// ======================================================

function showChromaValidationError(message)
{
    setText(
        "visualValidationStatus",
        "Data tidak tersedia"
    );

    setText(
        "chromaInterpretation",
        "Validasi belum dapat dilakukan"
    );

    const alertElement =
        document.getElementById(
            "chromaValidationAlert"
        );

    if(alertElement)
    {
        alertElement.classList.remove(
            "validation-success",
            "validation-warning"
        );

        alertElement.classList.add(
            "validation-failed"
        );

        alertElement.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
        `;
    }
}


// ======================================================
// HENTIKAN STREAM MIKROFON
// ======================================================

function stopMicrophoneStream()
{
    if(microphoneStream)
    {
        microphoneStream
            .getTracks()
            .forEach(track =>
            {
                track.stop();
            });

        microphoneStream = null;
    }

    if(microphoneSource)
    {
        try
        {
            microphoneSource.disconnect();
        }
        catch(error)
        {
            console.warn(
                "Microphone source disconnect:",
                error
            );
        }

        microphoneSource = null;
    }

    if(audioContext)
    {
        audioContext
            .close()
            .catch(() => {});

        audioContext = null;
    }

    analyser = null;

    drawWaveformPlaceholder();
}


// ======================================================
// STATUS VOKAL
// ======================================================

function setVocalStatus(message)
{
    if(vocalStatus)
    {
        vocalStatus.innerText =
            message;
    }
}

// ======================================================
// INISIALISASI
// ======================================================

drawWaveformPlaceholder();

// ======================================================
// LABEL VISUALISASI SHIFT PERTAMA
// ======================================================

function setShiftValidationLabels()
{
    setText(
        "originalChromagramTitle",
        "Chromagram Audio Asli"
    );

    setText(
        "originalChromagramDescription",
        "Distribusi intensitas relatif kelas nada sebelum Pitch Shifting"
    );

    setText(
        "resultChromagramTitle",
        "Chromagram Hasil Pitch Shifting"
    );

    setText(
        "resultChromagramDescription",
        "Distribusi intensitas relatif kelas nada setelah Pitch Shifting"
    );

    setText(
        "chromaValidationTitle",
        "Hasil Validasi Perubahan Key"
    );

    setText(
        "chromaShiftLabel",
        "Pergeseran Pola Chroma"
    );

    setText(
        "chromaSimilarityLabel",
        "Kesesuaian Pola"
    );

    const explanation =
        document.getElementById(
            "chromaExplanation"
        );

    if(explanation)
    {
        explanation.innerHTML = `
            <i class="bi bi-lightbulb-fill me-2"></i>

            <strong>Interpretasi Visualisasi:</strong>

            Kesesuaian pola chroma dihitung dengan membandingkan pola chroma
            yang diharapkan setelah pergeseran semitone dengan pola chroma
            aktual hasil Pitch Shifting menggunakan cosine similarity.`
        ;

    }
}

// ======================================================
// LABEL VISUALISASI ORIGINAL VS RETURNED
// ======================================================

function setReturnedValidationLabels()
{
    setText(
        "originalChromagramTitle",
        "Chromagram Audio Asli"
    );

    setText(
        "originalChromagramDescription",
        "Distribusi intensitas relatif kelas nada pada audio asli"
    );

    setText(
        "resultChromagramTitle",
        "Chromagram Audio Setelah Dikembalikan"
    );

    setText(
        "resultChromagramDescription",
        "Distribusi intensitas relatif kelas nada setelah audio dikembalikan ke key awal"
    );

    setText(
        "chromaValidationTitle",
        "Hasil Validasi Pengembalian Key"
    );

    setText(
        "chromaShiftLabel",
        "Alur Pengujian"
    );

    setText(
        "chromaSimilarityLabel",
        "Cosine Similarity"
    );

    const explanation =
        document.getElementById(
            "chromaExplanation"
        );

    if(explanation)
    {
        explanation.innerHTML = `
            <i class="bi bi-lightbulb-fill me-2"></i>

            <strong>Interpretasi Visualisasi:</strong>

            Pengujian membandingkan pola chroma audio asli dengan
            pola chroma audio setelah melalui proses Pitch Shifting
            dan dikembalikan ke key awal. Nilai cosine similarity
            menunjukkan tingkat kemiripan kedua pola chroma tersebut.
        `;
    }
}
// ======================================================
// VALIDASI PITCH: DUA REKAMAN
// ======================================================

function compareTwoVocalRecordings()
{
    if(!vocalData || !recommendationData || !window.pitchVocalData)
    {
        return null;
    }

    const original = buildRecordingComparison(
        vocalData,
        window.vocalLyricsSampleData,
        0,
        "initial"
    );

    const recommended = buildRecordingComparison(
        window.pitchVocalData,
        window.pitchVocalSampleData || window.vocalLyricsSampleData,
        Number(recommendationData.transpose) || 0,
        "recommended"
    );

    return {
        original: original?.comparison || [],
        recommended: recommended?.comparison || [],
        originalMetric: original
            ? {
                mae: original.mae,
                within1: original.within1,
                fals: original.fals,
                median_offset: original.median_offset,
                alignment_offset_seconds: original.alignment_offset_seconds
            }
            : null,
        recommendedMetric: recommended
            ? {
                mae: recommended.mae,
                within1: recommended.within1,
                fals: recommended.fals,
                median_offset: recommended.median_offset,
                alignment_offset_seconds: recommended.alignment_offset_seconds
            }
            : null,
        originalStart: original?.sampleStart ?? 0,
        recommendedStart: recommended?.sampleStart ?? 0,
        transpose: Number(recommendationData.transpose) || 0
    };
}

// ======================================================
// VISUALISASI FASE 1
// ======================================================
//
// Fase 1:
// Rekaman vokal awal + melodi lagu asli.
// Grafik kanan TIDAK digambar di tahap ini.
//
// Tujuan fungsi ini hanya menyiapkan grafik kiri dan
// metric kiri. Setelah rekaman fase 2 selesai, event
// pitchVocalAnalyzed akan memanggil drawTwoVocalComparison()
// untuk melengkapi grafik kanan.
// ======================================================

function getSampleWindow(sample, data)
{
    const start =
        sample && sample.startTime != null
            ? Number(sample.startTime)
            : 0;

    let end =
        sample && sample.endTime != null
            ? Number(sample.endTime)
            : NaN;

    if(!Number.isFinite(end) || end <= start)
    {
        let duration = 0;

        if(data && Array.isArray(data.graph))
        {
            for(const point of data.graph)
            {
                const time = Number(point.time);
                if(Number.isFinite(time))
                {
                    duration = Math.max(duration, time);
                }
            }
        }

        end = start + duration;
    }

    return {
        start: Number.isFinite(start) ? start : 0,
        end: Number.isFinite(end) ? end : start
    };
}

function median(values)
{
    const numbers = values
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

    if(numbers.length === 0)
    {
        return 0;
    }

    const middle = Math.floor(numbers.length / 2);

    return numbers.length % 2 === 0
        ? (numbers[middle - 1] + numbers[middle]) / 2
        : numbers[middle];
}

function downsamplePitchPoints(points, maxPoints = 450)
{
    if(points.length <= maxPoints)
    {
        return points.map((point, index) => ({
            ...point,
            source_index: index
        }));
    }

    const output = [];
    const last = points.length - 1;

    for(let i = 0; i < maxPoints; i++)
    {
        const sourceIndex = Math.round(
            i * last / (maxPoints - 1)
        );

        output.push({
            ...points[sourceIndex],
            source_index: sourceIndex
        });
    }

    return output;
}

/*
 * Dynamic Time Warping untuk mengatasi perbedaan timing antara
 * nyanyian pengguna dan melody reference. Alignment dilakukan pada
 * bentuk kontur pitch (setelah median pitch dikurangi), sehingga
 * offset key tidak mengganggu proses pencocokan waktu.
 */
function dtwPitchAlign(vocalPoints, referencePoints, mode = "subsequence")
{
    const vocals = downsamplePitchPoints(vocalPoints);
    const refs = downsamplePitchPoints(referencePoints);

    if(vocals.length < 2 || refs.length < 2)
    {
        return null;
    }

    /*
     * Alignment memakai kontur pitch (median-centered) agar
     * perbedaan key tidak mengganggu pencarian pasangan waktu.
     *
     * FASE 1 (initial):
     * - Rekaman vokal memang khusus REFF.
     * - Seluruh rekaman vokal dipasangkan dengan seluruh reference.
     * - Tidak ada pencarian subsequence dan tidak ada free-start/end.
     *
     * FASE 2 (subsequence):
     * - Rekaman vokal berisi bagian lagu sebelum REFF.
     * - Reference REFF dicari sebagai subsequence di dalam rekaman.
     */
    const vocalCenter = median(
        vocals.map(point => point.vocal_midi)
    );

    const referenceCenter = median(
        refs.map(point => point.midi)
    );

    const n = vocals.length;
    const m = refs.length;
    const width = m + 1;
    const size = (n + 1) * (m + 1);

    const dp = new Float64Array(size);
    const direction = new Int8Array(size);

    dp.fill(Infinity);

    /*
     * Penalti gap hanya digunakan untuk jalur alignment.
     * Nilai kecil tetap dipertahankan agar perilaku fase 2
     * tidak berubah secara agresif.
     */
    const gapPenalty = 0.15;

    if(mode === "initial")
    {
        /*
         * Full-sequence DTW:
         * pasangan harus dimulai dari awal kedua sequence dan
         * berakhir di akhir kedua sequence.
         */
        dp[0] = 0;
    }
    else
    {
        /*
         * Subsequence DTW:
         * reference boleh mulai dicocokkan pada titik mana pun
         * di dalam rekaman vokal.
         */
        for(let i = 0; i <= n; i++)
        {
            dp[i * width] = 0;
        }
    }
    for(let i = 1; i <= n; i++)
    {
        const vocalPitch =
            vocals[i - 1].vocal_midi - vocalCenter;

        for(let j = 1; j <= m; j++)
        {
            const referencePitch =
                refs[j - 1].midi - referenceCenter;

            const pitchCost = Math.min(
                12,
                Math.abs(vocalPitch - referencePitch)
            );

            const index = i * width + j;

            const diagonal =
                dp[(i - 1) * width + (j - 1)];

            const up =
                dp[(i - 1) * width + j] + gapPenalty;

            const left =
                dp[i * width + (j - 1)] + gapPenalty;

            if(diagonal <= up && diagonal <= left)
            {
                dp[index] = pitchCost + diagonal;
                direction[index] = 1;
            }
            else if(up <= left)
            {
                dp[index] = pitchCost + up;
                direction[index] = 2;
            }
            else
            {
                dp[index] = pitchCost + left;
                direction[index] = 3;
            }
        }
    }

    /*
     * Fase 1 harus berakhir di ujung kedua sequence.
     * Fase 2: reference harus selesai di kolom terakhir (j = m),
     * tetapi boleh selesai pada titik vokal mana pun.
     */
    let bestEndIndex = n;
    let bestCost = dp[n * width + m];

    if(mode !== "initial")
    {
        for(let i = 1; i <= n; i++)
        {
            const cost = dp[i * width + m];
            if(cost < bestCost)
            {
                bestCost = cost;
                bestEndIndex = i;
            }
        }
    }

    if(!Number.isFinite(bestCost))
    {
        return null;
    }

    const path = [];
    let i = bestEndIndex;
    let j = m;

    while(i > 0 && j > 0)
    {
        const move = direction[i * width + j];

        if(!move)
        {
            break;
        }

        path.push({
            vocal_index: vocals[i - 1].source_index,
            reference_index: refs[j - 1].source_index
        });

        if(move === 1)
        {
            i--;
            j--;
        }
        else if(move === 2)
        {
            i--;
        }
        else
        {
            j--;
        }
    }

    path.reverse();

    if(path.length === 0 || j !== 0)
    {
        return null;
    }

    /*
     * Satu titik vokal bisa muncul lebih dari sekali pada path DTW
     * karena langkah horizontal/vertical. Kita pilih satu reference
     * secara deterministik: reference yang paling dekat dengan median
     * offset waktu dari path.
     *
     * TIDAK ADA lagi pengisian/interpolasi untuk titik yang tidak pernah
     * dilewati path DTW. Dengan begitu Fals hanya dihitung dari pasangan
     * yang benar-benar diperoleh dari alignment.
     */
    const pathOffsets = path
        .map(pair =>
        {
            const vocal = vocalPoints[pair.vocal_index];
            const reference = referencePoints[pair.reference_index];

            if(!vocal || !reference)
            {
                return NaN;
            }

            return reference.time - vocal.recording_time;
        })
        .filter(Number.isFinite);

    const estimatedOffset = median(pathOffsets);
    const vocalToReferences = new Map();

    for(const pair of path)
    {
        if(!vocalToReferences.has(pair.vocal_index))
        {
            vocalToReferences.set(
                pair.vocal_index,
                []
            );
        }

        vocalToReferences
            .get(pair.vocal_index)
            .push(pair.reference_index);
    }

    const pairs = [];

    for(const [vocalIndex, referenceIndices] of vocalToReferences.entries())
    {
        const vocal = vocalPoints[vocalIndex];

        if(!vocal)
        {
            continue;
        }

        let selectedReferenceIndex = null;
        let selectedDistance = Infinity;

        for(const referenceIndex of referenceIndices)
        {
            const reference = referencePoints[referenceIndex];

            if(!reference)
            {
                continue;
            }

            const expectedReferenceTime =
                vocal.recording_time + estimatedOffset;

            const distance =
                Math.abs(
                    reference.time - expectedReferenceTime
                );

            if(distance < selectedDistance)
            {
                selectedDistance = distance;
                selectedReferenceIndex = referenceIndex;
            }
        }

        if(selectedReferenceIndex !== null)
        {
            pairs.push({
                vocal_index: vocalIndex,
                reference_index: selectedReferenceIndex
            });
        }
    }

    pairs.sort((a, b) => a.vocal_index - b.vocal_index);

    return {
        pairs,
        cost: bestCost,
        vocal_count: vocalPoints.length,
        reference_count: referencePoints.length,
        matched_vocal_start_index:
            path.length > 0 ? path[0].vocal_index : null,
        matched_vocal_end_index:
            path.length > 0 ? path[path.length - 1].vocal_index : null,
        alignment_offset_seconds: estimatedOffset,
        alignment_mode: mode
    };
}

function getReferenceGraphForSample(sample, transpose = 0)
{
    const sampleStart = Number(sample?.startTime ?? 0);
    const sampleEnd = Number(sample?.endTime ?? NaN);

    /*
     * Prioritas reference:
     * 1) referenceMelodyData = hasil ekstraksi khusus REFF
     * 2) songData.reference_graph = reference melody dari analisis lagu
     * 3) songData.graph = fallback terakhir
     *
     * Ketiganya memakai trajectory yang sama secara konseptual,
     * tetapi waktu referenceMelodyData sudah relatif terhadap awal REFF.
     */
    let source = null;
    let sourceType = "";

    if(
        window.referenceMelodyData &&
        Array.isArray(window.referenceMelodyData.graph)
    )
    {
        source = window.referenceMelodyData.graph;
        sourceType = "reference_melody_sample";
    }
    else if(
        songData &&
        Array.isArray(songData.reference_graph)
    )
    {
        source = songData.reference_graph;
        sourceType = "song_reference_graph";
    }
    else if(
        songData &&
        Array.isArray(songData.graph)
    )
    {
        source = songData.graph;
        sourceType = "song_graph_fallback";
    }

    if(!Array.isArray(source))
    {
        return [];
    }

    const hasAbsoluteReferenceTime =
        source.some(point => Number.isFinite(Number(point.song_time)));

    const referenceDuration = Number.isFinite(sampleEnd) && sampleEnd > sampleStart
        ? sampleEnd - sampleStart
        : Number(window.referenceMelodyData?.duration || 0);

    const references = source
        .map(point =>
        {
            const midi = Number(
                point.midi_float ?? point.midi
            );

            if(!Number.isFinite(midi))
            {
                return null;
            }

            const relativeTime = Number(point.time);
            const absoluteTime = Number(point.song_time);

            let recordingTime;
            let songTime;

            if(
                sourceType === "reference_melody_sample" &&
                Number.isFinite(absoluteTime)
            )
            {
                /* reference_melody.py memberikan time relatif dan
                 * song_time absolut. Jangan menggeser lagi. */
                recordingTime = relativeTime;
                songTime = absoluteTime;
            }
            else if(hasAbsoluteReferenceTime && Number.isFinite(absoluteTime))
            {
                recordingTime = absoluteTime - sampleStart;
                songTime = absoluteTime;
            }
            else
            {
                /* fallback song graph menggunakan time absolut */
                recordingTime = relativeTime - sampleStart;
                songTime = relativeTime;
            }

            if(
                !Number.isFinite(recordingTime) ||
                !Number.isFinite(songTime)
            )
            {
                return null;
            }

            if(recordingTime < -0.05)
            {
                return null;
            }

            if(
                Number.isFinite(referenceDuration) &&
                referenceDuration > 0 &&
                recordingTime > referenceDuration + 0.05
            )
            {
                return null;
            }

            if(
                sourceType !== "reference_melody_sample" &&
                Number.isFinite(sampleEnd) &&
                songTime > sampleEnd + 0.05
            )
            {
                return null;
            }

            if(
                sourceType !== "reference_melody_sample" &&
                songTime < sampleStart - 0.05
            )
            {
                return null;
            }

            return {
                time: Math.max(0, recordingTime),
                song_time: songTime,
                midi: midi + transpose
            };
        })
        .filter(point => point !== null)
        .sort((a, b) => a.time - b.time);

    /* Hindari titik waktu duplikat yang dapat membuat DTW mendapatkan
     * pasangan horizontal berlebihan hanya karena frame identik. */
    const deduplicated = [];

    for(const point of references)
    {
        const previous = deduplicated[deduplicated.length - 1];

        if(
            previous &&
            Math.abs(previous.time - point.time) < 0.001
        )
        {
            previous.midi =
                (previous.midi + point.midi) / 2;
            previous.song_time =
                (previous.song_time + point.song_time) / 2;
            continue;
        }

        deduplicated.push(point);
    }

    return deduplicated;
}

async function ensureReferenceMelody(sample)
{
    if(!sample || sample.startTime == null)
    {
        return null;
    }

    const audioOriginal =
        document.getElementById("audioOriginal");

    if(!audioOriginal || !audioOriginal.src)
    {
        return null;
    }

    const startTime = Number(sample.startTime);
    const endTime = Number(sample.endTime);

    if(!Number.isFinite(startTime))
    {
        return null;
    }

    const duration = Number.isFinite(endTime) && endTime > startTime
        ? Math.min(30, endTime - startTime)
        : 15;

    try
    {
        const response = await fetch(
            BASE_URL + "/reference-melody",
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": csrf
                },
                body: JSON.stringify({
                    path: audioOriginal.src.split("?")[0],
                    start_time: startTime,
                    duration: duration
                })
            }
        );

        const data = await response.json();

        if(!response.ok || data.success === false)
        {
            throw new Error(
                data.error ||
                data.message ||
                "Reference melody gagal diperoleh."
            );
        }

        window.referenceMelodyData = data;

        console.log(
            "REFERENCE MELODY READY:",
            {
                frames: Array.isArray(data.graph) ? data.graph.length : 0,
                startTime,
                duration
            }
        );

        return data;
    }
    catch(error)
    {
        console.warn(
            "REFERENCE MELODY REQUEST GAGAL:",
            error
        );

        return null;
    }
}

function buildRecordingComparison(vocalSource, sample, transpose, phase = "initial")
{
    if(
        !vocalSource ||
        !Array.isArray(vocalSource.graph) ||
        !songData
    )
    {
        return null;
    }

    const windowRange = getSampleWindow(sample, vocalSource);

    /*
     * Reference dipotong ke REFF, tetapi vokal TIDAK lagi dipotong
     * berdasarkan durasi REFF dari t=0. Rekaman rekomendasi dilakukan
     * tanpa playback lagu sehingga pengguna bisa menyanyikan bagian
     * sebelum REFF terlebih dahulu.
     */
    const allVocals = vocalSource.graph
        .filter(point =>
            Number.isFinite(Number(point.time)) &&
            Number.isFinite(Number(point.midi_float))
        )
        .map(point =>
        ({
            recording_time: Number(point.time),
            vocal_midi: Number(point.midi_float)
        }))
        .sort((a, b) => a.recording_time - b.recording_time);

    if(allVocals.length < 3)
    {
        return null;
    }

    const references = getReferenceGraphForSample(
        sample,
        transpose
    );

    if(references.length < 3)
    {
        return null;
    }

    /*
     * Batasi pencarian ke area sekitar perkiraan posisi REFF di dalam
     * rekaman. Ini mencegah subsequence-DTW memilih pengulangan melodi
     * lain yang kebetulan mirip jauh di bagian recording.
     *
     * Jika startTime = 0, area pencarian dimulai dari awal recording.
     */
    const referenceStart = Number(sample?.startTime);
    const referenceDuration =
        references[references.length - 1].time - references[0].time;

    const vocalDuration =
        allVocals[allVocals.length - 1].recording_time -
        allVocals[0].recording_time;

    const isRecommendedPhase = phase === "recommended";

    const expectedStart = isRecommendedPhase
        ? (Number.isFinite(referenceStart) ? Math.max(0, referenceStart) : 0)
        : 0;

    const searchPadding = Math.max(
        5,
        Math.min(10, referenceDuration * 0.75)
    );

    let searchStart = Math.max(
        0,
        expectedStart - searchPadding
    );

    let searchEnd = Math.min(
        allVocals[allVocals.length - 1].recording_time,
        expectedStart + referenceDuration + searchPadding
    );

    /* Bila rekaman lebih pendek dari perkiraan posisi REFF, jangan
     * menghasilkan array kosong hanya karena metadata timing. */
    if(searchEnd <= searchStart)
    {
        searchStart = allVocals[0].recording_time;
        searchEnd = allVocals[allVocals.length - 1].recording_time;
    }

    /* Jika search window terlalu sempit dibanding reference, gunakan
     * seluruh recording agar DTW masih dapat menemukan subsequence. */
    if(searchEnd - searchStart < referenceDuration * 0.75)
    {
        searchStart = allVocals[0].recording_time;
        searchEnd = allVocals[allVocals.length - 1].recording_time;
    }

    const vocals = allVocals.filter(point =>
        point.recording_time >= searchStart &&
        point.recording_time <= searchEnd
    );

    if(vocals.length < 3)
    {
        return null;
    }

    /*
     * Fase 1 = full-sequence karena rekaman memang khusus REFF.
     * Fase 2 = subsequence karena rekaman dimulai dari awal lagu.
     */
    const alignment = dtwPitchAlign(
        vocals,
        references,
        phase === "initial"
            ? "initial"
            : "subsequence"
    );

    if(!alignment || alignment.pairs.length === 0)
    {
        return null;
    }

    const comparison = [];

    for(const pair of alignment.pairs)
    {
        const vocal = vocals[pair.vocal_index];
        const reference = references[pair.reference_index];

        if(!vocal || !reference)
        {
            continue;
        }

        const deviation =
            vocal.vocal_midi - reference.midi;

        comparison.push({
            recording_time: vocal.recording_time,
            /* Waktu lagu adalah waktu reference yang berhasil dipasangkan,
             * bukan sampleStart + recording_time. */
            song_time: reference.song_time,
            vocal_midi: vocal.vocal_midi,
            reference_midi: reference.midi,
            reference_recording_time: reference.time,
            reference_song_time: reference.song_time,
            deviation,
            abs_deviation: Math.abs(deviation)
        });
    }

    comparison.sort(
        (a, b) => a.recording_time - b.recording_time
    );

    if(comparison.length < 3)
    {
        return null;
    }

    const errors = comparison.map(
        point => point.abs_deviation
    );

    const signedOffsets = comparison.map(
        point => point.deviation
    );

    /*
     * Toleransi evaluasi tetap 1 semitone sesuai definisi sistem.
     * Denominator hanya pasangan yang benar-benar diperoleh dari DTW.
     */
    const within1 =
        errors.filter(error => error <= 1).length /
        errors.length * 100;

    const medianOffset = median(
        signedOffsets
    );

    const medianAbsoluteDeviation = median(
        errors
    );

    const alignmentOffsets = comparison.map(point =>
        point.reference_recording_time - point.recording_time
    );

    const alignmentOffset = median(
        alignmentOffsets
    );

    const firstMatchedTime =
        comparison[0]?.recording_time ?? 0;

    const lastMatchedTime =
        comparison[comparison.length - 1]?.recording_time ?? firstMatchedTime;

    return {
        comparison,
        sampleStart: windowRange.start,
        sampleEnd: windowRange.end,
        matchedSampleStart: firstMatchedTime,
        matchedSampleEnd: lastMatchedTime,
        within1,
        fals: 100 - within1,
        /* Disimpan untuk kompatibilitas internal lama, tetapi tidak
         * dijadikan indikator utama maupun ditampilkan sebagai MAE. */
        mae:
            errors.reduce((sum, value) => sum + value, 0) /
            errors.length,
        median_offset: medianOffset,
        median_absolute_deviation: medianAbsoluteDeviation,
        alignment_offset_seconds: alignmentOffset,
        alignment_method: "Subsequence-DTW",
        matched_points: comparison.length,
        matched_vocal_duration:
            Math.max(0, lastMatchedTime - firstMatchedTime),
        recording_search_window:
        {
            start: searchStart,
            end: searchEnd,
            duration: Math.max(0, searchEnd - searchStart)
        },
        transpose
    };
}

function destroyPitchComparisonCharts()
{
    if(originalPitchComparisonChart)
    {
        originalPitchComparisonChart.destroy();
        originalPitchComparisonChart = null;
    }

    if(recommendedPitchComparisonChart)
    {
        recommendedPitchComparisonChart.destroy();
        recommendedPitchComparisonChart = null;
    }
}

function clearPitchComparisonMetrics()
{
    const ids = [
        "originalPitchMAE",
        "originalPitchWithin1",
        "originalPitchOffset",
        "originalPitchAlignment",
        "recommendedPitchMAE",
        "recommendedPitchWithin1",
        "recommendedPitchOffset",
        "recommendedPitchAlignment"
    ];

    ids.forEach(id =>
    {
        const element = document.getElementById(id);
        if(element)
        {
            element.textContent = "-";
        }
    });
}

function createPitchComparisonOptions()
{
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction:
        {
            mode: "nearest",
            intersect: false
        },
        plugins:
        {
            legend:
            {
                display: true
            },
            tooltip:
            {
                callbacks:
                {
                    label: function(context)
                    {
                        return "MIDI: " +
                            Number(context.parsed.y).toFixed(2);
                    }
                }
            }
        },
        scales:
        {
            x:
            {
                type: "linear",
                title:
                {
                    display: true,
                    text: "Waktu Rekaman (detik)"
                }
            },
            y:
            {
                title:
                {
                    display: true,
                    text: "MIDI Note"
                }
            }
        }
    };
}

function createComparisonMarkers(comparison)
{
    const exact = [];
    const flat = [];
    const sharp = [];

    comparison.forEach(point =>
    {
        const item =
        {
            x: point.recording_time,
            y: point.vocal_midi
        };

        const deviation =
            point.vocal_midi - point.reference_midi;

        if(Math.abs(deviation) <= 1)
        {
            exact.push(item);
        }
        else if(deviation < -1)
        {
            flat.push(item);
        }
        else
        {
            sharp.push(item);
        }
    });

    return { exact, flat, sharp };
}

function createReferenceMelody(sampleStart, sampleEnd, transpose)
{
    const references = getReferenceGraphForSample(
        { startTime: sampleStart, endTime: sampleEnd },
        transpose
    );

    return references.map(point =>
    ({
        x: point.time,
        y: point.midi
    }));
}

function markerDatasets(markers)
{
    return [
        {
            label: "Vokal Tepat",
            data: markers.exact,
            showLine: false,
            pointRadius: 2.5,
            pointHoverRadius: 4
        },
        {
            label: "Vokal Flat",
            data: markers.flat,
            showLine: false,
            pointRadius: 2.5,
            pointHoverRadius: 4
        },
        {
            label: "Vokal Sharp",
            data: markers.sharp,
            showLine: false,
            pointRadius: 2.5,
            pointHoverRadius: 4
        }
    ];
}

function renderComparisonChart(canvasId, chartType, melodyLabel, comparison, sampleStart, sampleEnd, transpose)
{
    const canvas = document.getElementById(canvasId);

    if(!canvas || !comparison || comparison.length === 0)
    {
        return null;
    }

    const vocalContour = comparison.map(point =>
    ({
        x: point.recording_time,
        y: point.vocal_midi
    }));

    const markers =
        createComparisonMarkers(comparison);

    return new Chart(
        canvas.getContext("2d"),
        {
            type: "scatter",
            data:
            {
                datasets:
                [
                    {
                        label: melodyLabel,
                        data: comparison.map(point =>
                        ({
                            x: point.recording_time,
                            y: point.reference_midi
                        })),
                        showLine: true,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                        tension: 0.05
                    },
                    {
                        label: "Kontur Vokal",
                        data: vocalContour,
                        showLine: true,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                        tension: 0.08
                    },
                    ...markerDatasets(markers)
                ]
            },
            options: createPitchComparisonOptions()
        }
    );
}

function updatePitchMetricElements(prefix, result)
{
    if(!result)
    {
        return;
    }

    const falsElement =
        document.getElementById(prefix + "PitchMAE");

    const withinElement =
        document.getElementById(prefix + "PitchWithin1");

    const offsetElement =
        document.getElementById(prefix + "PitchOffset");

    const alignmentElement =
        document.getElementById(prefix + "PitchAlignment");

    if(falsElement)
    {
        falsElement.textContent =
            result.fals.toFixed(2) + "%";
    }

    if(withinElement)
    {
        withinElement.textContent =
            result.within1.toFixed(2) + "%";
    }

    if(offsetElement)
    {
        const offset = Number(result.median_offset);
        offsetElement.textContent = Number.isFinite(offset)
            ? (offset > 0 ? "+" : "") + offset.toFixed(2) + " st"
            : "-";
    }

    if(alignmentElement)
    {
        const alignment = Number(result.alignment_offset_seconds);
        alignmentElement.textContent = Number.isFinite(alignment)
            ? (alignment > 0 ? "+" : "") + alignment.toFixed(2) + " dtk"
            : "-";
    }
}

// ======================================================
// FASE 1 — HANYA GRAFIK KIRI
// ======================================================
function drawInitialOriginalComparison()
{
    if(
        !vocalData ||
        !songData ||
        !recommendationData
    )
    {
        return;
    }

    destroyPitchComparisonCharts();
    clearPitchComparisonMetrics();

    const sample = window.vocalLyricsSampleData;

    const result = buildRecordingComparison(
        vocalData,
        sample,
        0,
        "initial"
    );

    if(!result)
    {
        console.warn(
            "Visualisasi fase 1 belum memiliki data reff yang valid."
        );
        return;
    }

    originalPitchComparisonChart =
        renderComparisonChart(
            "originalPitchComparisonChart",
            "scatter",
            "Melodi Lagu Asli",
            result.comparison,
            result.sampleStart,
            result.sampleEnd,
            0
        );

    // KANAN sengaja tetap kosong pada fase 1.
    updatePitchMetricElements(
        "original",
        result
    );

    // Simpan hasil Fase 1 sementara agar dapat ditulis bersama hasil Fase 2.
    window.initialPitchComparisonResult = result;

    console.log(
        "PHASE 1 REFF VISUALIZATION:",
        result
    );
}

async function saveAnalysisCache(originalResult, recommendedResult)
{
    if(
        !originalResult ||
        !recommendedResult ||
        !songData ||
        !vocalData ||
        !recommendationData
    )
    {
        console.warn("ANALYSIS CACHE: data belum lengkap.");
        return;
    }

    const audioOriginal =
        document.getElementById("audioOriginal");

    if(!audioOriginal || !audioOriginal.src)
    {
        console.warn("ANALYSIS CACHE: audio original tidak tersedia.");
        return;
    }

    const filename =
        audioOriginal.src
            .split("?")[0]
            .split("/")
            .pop();

    if(!filename)
    {
        console.warn("ANALYSIS CACHE: filename tidak tersedia.");
        return;
    }

    const data =
    {
        informasi_lagu: {
            key: songData.key || originalKey || "-",
            confidence: Number(songData.confidence) || 0,
            range: songData.range || "-",
            highest_note: songData.highest_note || "-",
            lowest_note: songData.lowest_note || "-"
        },

        informasi_vokal: {
            range: vocalData.range || "-",
            highest_note: vocalData.highest_note || "-",
            lowest_note: vocalData.lowest_note || "-"
        },

        hasil_rekomendasi: {
            transpose: Number(recommendationData.transpose) || 0,
            key_rekomendasi: recommendationData.recommended_key || "-",
            key_hasil_pitch: recommendationData.recommended_key || "-"
        },

        validasi_original: {
            fals: Number(originalResult.fals),
            within_1_semitone: Number(originalResult.within1),
            pitch_offset: Number(originalResult.median_offset),
            time_offset: Number(originalResult.alignment_offset_seconds)
        },

        validasi_recommended: {
            fals: Number(recommendedResult.fals),
            within_1_semitone: Number(recommendedResult.within1),
            pitch_offset: Number(recommendedResult.median_offset),
            time_offset: Number(recommendedResult.alignment_offset_seconds)
        }
    };

    try
    {
        const response =
            await fetch(
                BASE_URL + "/save-analysis-cache",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrf,
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        filename,
                        data
                    })
                }
            );

        const resultResponse = await response.json();

        if(!response.ok || resultResponse.success === false)
        {
            throw new Error(
                resultResponse.message ||
                "Gagal menyimpan analysis cache."
            );
        }

        console.log(
            "ANALYSIS CACHE SAVED:",
            { filename, data }
        );
    }
    catch(error)
    {
        console.error(
            "ANALYSIS CACHE ERROR:",
            error
        );
    }
}

// ======================================================
// FASE 2 — ISI GRAFIK KANAN SAJA
// ======================================================
function drawTwoVocalComparison()
{
    if(
        !vocalData ||
        !songData ||
        !recommendationData ||
        !window.pitchVocalData
    )
    {
        return;
    }

    const sample =
        window.pitchVocalSampleData ||
        window.vocalLyricsSampleData;

    const result = buildRecordingComparison(
        window.pitchVocalData,
        sample,
        Number(recommendationData.transpose) || 0,
        "recommended"
    );

    if(!result)
    {
        console.warn(
            "Visualisasi fase 2 belum memiliki data reff yang valid."
        );
        return;
    }

    // PENTING: grafik kiri tidak disentuh/digambar ulang.
    if(recommendedPitchComparisonChart)
    {
        recommendedPitchComparisonChart.destroy();
        recommendedPitchComparisonChart = null;
    }

    recommendedPitchComparisonChart =
        renderComparisonChart(
            "recommendedPitchComparisonChart",
            "scatter",
            "Melodi Rekomendasi",
            result.comparison,
            result.sampleStart,
            result.sampleEnd,
            result.transpose
        );

    updatePitchMetricElements(
        "recommended",
        result
    );

    saveAnalysisCache(
        window.initialPitchComparisonResult || null,
        result
    );

    console.log(
        "PHASE 2 REFF VISUALIZATION:",
        result
    );
}


window.addEventListener(
    "pitchVocalAnalyzed",
    function(event)
    {
        if(event && event.detail)
        {
            window.pitchVocalData = event.detail;
        }

        if(
            songData &&
            recommendationData &&
            window.pitchVocalData
        )
        {
            drawTwoVocalComparison();
        }
    }
);
