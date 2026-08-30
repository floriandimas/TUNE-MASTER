// ======================================================
// KONFIGURASI UTAMA
// ======================================================

const csrf =
    document.querySelector(
        'meta[name="csrf-token"]'
    )?.content || "";

const BASE_URL =
    document.querySelector(
        'meta[name="base-url"]'
    )?.content || "";

const NOTES = [
    "C", "C#", "D", "D#",
    "E", "F", "F#", "G",
    "G#", "A", "A#", "B"
];

const LYRIC_DELAY = 2.5;


// ======================================================
// DATA APLIKASI
// ======================================================

let originalKey = null;

let currentSongTitle = "";
let currentLyrics = "";

let songData = null;
let vocalData = null;
let recommendationData = null;

let selectedSearchVideoId = null;


// ======================================================
// DATA LIRIK
// ======================================================

let syncedLyricsData = [];
let currentLyricIndex = -1;


// ======================================================
// DATA VISUALISASI CHROMAGRAM
// ======================================================

let originalChromagramChart = null;
let shiftedChromagramChart = null;
let pitchRangeComparisonChart = null;

window.originalChromagram = null;
window.shiftedChromagram = null;


// ======================================================
// REKAM VOKAL SETELAH PITCH SHIFTING
// ======================================================

let pitchVocalRecorder = null;
let pitchVocalStream = null;
let pitchVocalChunks = [];
let pitchVocalBlob = null;

const pitchStartBtn =
    document.getElementById("pitchStartBtn");

const pitchStopBtn =
    document.getElementById("pitchStopBtn");

const pitchAudioPlayback =
    document.getElementById("pitchAudioPlayback");

const pitchVocalStatus =
    document.getElementById("pitchVocalStatus");


function setPitchVocalStatus(message)
{
    if(pitchVocalStatus)
    {
        pitchVocalStatus.innerText =
            message;
    }
}


if(pitchStartBtn)
{
    pitchStartBtn.addEventListener(
        "click",
        startPitchVocalRecording
    );
}


if(pitchStopBtn)
{
    pitchStopBtn.addEventListener(
        "click",
        stopPitchVocalRecording
    );

    pitchStopBtn.disabled = true;
}


async function startPitchVocalRecording()
{
    try
    {
        if(
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        )
        {
            throw new Error(
                "Browser tidak mendukung akses microphone."
            );
        }

        if(
            !window.MediaRecorder
        )
        {
            throw new Error(
                "Browser tidak mendukung perekaman audio."
            );
        }

        pitchVocalChunks = [];
        pitchVocalBlob = null;

        /*
         * PERSONalisasi Nada:
         * audioProcessed harus mulai dari klik pengguna yang sama
         * dengan tombol Rekam. Jangan menunggu getUserMedia(),
         * karena await permission dapat membuat browser menolak
         * autoplay setelah user-activation sudah lewat.
         *
         * Audio tetap hanya sebagai playback/panduan; MediaRecorder
         * tetap merekam microphone saja.
         */
        const pitchAudio = document.getElementById("audioProcessed");
        const sample = window.vocalLyricsSampleData;

        if(sample && sample.startTime != null)
        {
            window.pitchVocalSampleData = {
                ...sample,
                type: "recommended_key"
            };
        }

        if(pitchAudio)
        {
            try
            {
                pitchAudio.currentTime = 0;
            }
            catch(error)
            {
                console.warn(
                    "Gagal mengatur posisi awal audioProcessed:",
                    error
                );
            }

            // Dipanggil langsung dari click handler sebelum await
            // getUserMedia() agar browser mempertahankan user gesture.
            const playPromise = pitchAudio.play();

            if(playPromise && typeof playPromise.catch === "function")
            {
                playPromise.catch(error =>
                {
                    console.warn(
                        "Audio personalisasi tidak dapat diputar otomatis:",
                        error
                    );
                });
            }
        }

        pitchVocalStream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        let mimeType = "";

        if(
            MediaRecorder.isTypeSupported(
                "audio/webm;codecs=opus"
            )
        )
        {
            mimeType =
                "audio/webm;codecs=opus";
        }
        else if(
            MediaRecorder.isTypeSupported(
                "audio/webm"
            )
        )
        {
            mimeType =
                "audio/webm";
        }

        pitchVocalRecorder =
            mimeType
                ? new MediaRecorder(
                    pitchVocalStream,
                    { mimeType }
                )
                : new MediaRecorder(
                    pitchVocalStream
                );

        pitchVocalRecorder.ondataavailable =
            function(event)
            {
                if(
                    event.data &&
                    event.data.size > 0
                )
                {
                    pitchVocalChunks.push(
                        event.data
                    );
                }
            };

        pitchVocalRecorder.onstop =
            handlePitchVocalRecordingStop;

        pitchVocalRecorder.onerror =
            function(event)
            {
                console.error(
                    "PITCH VOCAL RECORDER ERROR:",
                    event.error
                );

                setPitchVocalStatus(
                    "Gagal merekam vokal."
                );
            };

        // Mulai recorder setelah microphone siap.
        // audioProcessed sudah mulai diputar dari user gesture di atas,
        // sehingga musik dan recording berjalan pada sesi yang sama.
        pitchVocalRecorder.start();

        if(pitchStartBtn)
        {
            // Tombol tetap terlihat, hanya dinonaktifkan selama rekaman.
            pitchStartBtn.disabled = true;
        }

        if(pitchStopBtn)
        {
            pitchStopBtn.disabled = false;
        }

        setPitchVocalStatus(
            "Sedang merekam vokal..."
        );
    }
    catch(error)
    {
        console.error(
            "START PITCH VOCAL ERROR:",
            error
        );

        setPitchVocalStatus(
            error.message ||
            "Microphone tidak dapat digunakan."
        );

        if(pitchVocalStream)
        {
            pitchVocalStream
                .getTracks()
                .forEach(track =>
                    track.stop()
                );

            pitchVocalStream = null;
        }
    }
}


function stopPitchVocalRecording()
{
    if(
        !pitchVocalRecorder ||
        pitchVocalRecorder.state === "inactive"
    )
    {
        return;
    }

    setPitchVocalStatus(
        "Memproses hasil rekaman..."
    );

    pitchVocalRecorder.stop();

    // Hentikan playback audio personalisasi ketika recording selesai.
    // Jangan menyentuh audioOriginal karena recording rekomendasi
    // menggunakan microphone secara mandiri.
    const pitchAudio = document.getElementById("audioProcessed");

    if(pitchAudio)
    {
        pitchAudio.pause();
    }

    if(pitchVocalStream)
    {
        pitchVocalStream
            .getTracks()
            .forEach(track =>
                track.stop()
            );

        pitchVocalStream = null;
    }

    if(pitchStopBtn)
    {
        pitchStopBtn.disabled = true;
    }
}


async function handlePitchVocalRecordingStop()
{
    try
    {
        const mimeType =
            pitchVocalRecorder &&
            pitchVocalRecorder.mimeType
                ? pitchVocalRecorder.mimeType
                : "audio/webm";

        pitchVocalBlob =
            new Blob(
                pitchVocalChunks,
                {
                    type: mimeType
                }
            );

        if(
            !pitchVocalBlob.size
        )
        {
            throw new Error(
                "Hasil rekaman kosong."
            );
        }

        /*
         * Tampilkan hasil rekaman langsung di UI.
         */
        const playbackUrl =
            URL.createObjectURL(
                pitchVocalBlob
            );

        if(pitchAudioPlayback)
        {
            pitchAudioPlayback.src =
                playbackUrl;

            pitchAudioPlayback.controls =
                true;

            pitchAudioPlayback.classList.remove(
                "d-none"
            );

            pitchAudioPlayback.load();
        }

        setPitchVocalStatus(
            "Mengirim hasil rekaman untuk analisis..."
        );

        /*
         * Kirim ke endpoint detect-vocal yang sama
         * dengan rekaman pertama.
         */
        const formData =
            new FormData();

        formData.append(
            "audio",
            pitchVocalBlob,
            "pitch_vocal.webm"
        );

        formData.append(
            "recording_type",
            "pitch_shifted"
        );

        if(window.pitchVocalSampleData)
        {
            if(window.pitchVocalSampleData.startTime != null)
            {
                formData.append(
                    "sample_start_time",
                    String(window.pitchVocalSampleData.startTime)
                );
            }

            if(window.pitchVocalSampleData.endTime != null)
            {
                formData.append(
                    "sample_end_time",
                    String(window.pitchVocalSampleData.endTime)
                );
            }
        }

        const response =
            await fetch(
                BASE_URL +
                "/detect-vocal",
                {
                    method: "POST",
                    headers:
                    {
                        "X-CSRF-TOKEN":
                            csrf,
                        "Accept":
                            "application/json"
                    },
                    body:
                        formData
                }
            );

        const data =
            await response.json();

        if(
            !response.ok ||
            data.success === false
        )
        {
            throw new Error(
                data.error ||
                data.message ||
                "Analisis vokal gagal."
            );
        }

        /*
         * Simpan hasil analisis ke state global agar
         * visualisasi yang sudah ada dapat menggunakannya.
         */
        window.pitchVocalData =
            data;

        setPitchVocalStatus(
            "Rekaman berhasil disimpan dan dianalisis."
        );

        /*
         * Event ini dapat dipakai oleh logic visualisasi
         * yang sudah ada tanpa mengubah chart sekarang.
         */
        window.dispatchEvent(
            new CustomEvent(
                "pitchVocalAnalyzed",
                {
                    detail: data
                }
            )
        );
    }
    catch(error)
    {
        console.error(
            "PITCH VOCAL RECORDING ERROR:",
            error
        );

        setPitchVocalStatus(
            error.message ||
            "Gagal memproses hasil rekaman."
        );
    }
    finally
    {
        pitchVocalChunks = [];
        pitchVocalRecorder = null;

        if(pitchStartBtn)
        {
            // Setelah selesai, tombol Mulai Rekam aktif kembali.
            pitchStartBtn.disabled = false;
        }

        if(pitchStopBtn)
        {
            pitchStopBtn.disabled = true;
        }
    }
}

// ======================================================
// HELPER ANTARMUKA
// ======================================================

function setText(id, value = "-")
{
    const element =
        document.getElementById(id);

    if(element)
    {
        element.innerText = value;
    }
}


// ======================================================
// RESET APLIKASI
// ======================================================

function resetPitchVocalRecorder()
{
    if(
        pitchVocalRecorder &&
        pitchVocalRecorder.state !== "inactive"
    )
    {
        pitchVocalRecorder.stop();
    }

    if(pitchVocalStream)
    {
        pitchVocalStream
            .getTracks()
            .forEach(track =>
                track.stop()
            );

        pitchVocalStream = null;
    }

    pitchVocalRecorder = null;
    pitchVocalChunks = [];
    pitchVocalBlob = null;

    if(pitchAudioPlayback)
    {
        pitchAudioPlayback.pause();
        pitchAudioPlayback.removeAttribute("src");
        pitchAudioPlayback.load();
    }

    setPitchVocalStatus(
        "Siap merekam vokal."
    );

    if(pitchStartBtn)
    {
        pitchStartBtn.disabled = false;
    }

    if(pitchStopBtn)
    {
        pitchStopBtn.disabled = true;
    }
}


function resetApplication()
{
    resetPitchVocalRecorder();

    // Data analisis
    songData = null;
    vocalData = null;
    recommendationData = null;

    originalKey = null;

    // Data lirik
    currentLyrics = "";
    syncedLyricsData = [];
    currentLyricIndex = -1;

    // Data chromagram
    window.originalChromagram = null;
    window.shiftedChromagram = null;
    window.referenceMelodyData = null;
    window.pitchVocalSampleData = null;
    window.pitchVocalData = null;

    // Audio hasil pitch shifting
    const audioProcessed =
        document.getElementById(
            "audioProcessed"
        );

    if(audioProcessed)
    {
        audioProcessed.pause();
        audioProcessed.removeAttribute("src");
        audioProcessed.load();
    }

    // Reset lirik
    const lyricsFull =
        document.getElementById(
            "lyricsFull"
        );

    if(lyricsFull)
    {
        lyricsFull.innerHTML =
            "Silakan pilih lagu terlebih dahulu.";
    }

    const lyricsReff =
        document.getElementById(
            "lyricsReff"
        );

    if(lyricsReff)
    {
        lyricsReff.innerText =
            "Silakan pilih lagu terlebih dahulu.";
    }

    // Reset informasi
    [
        "detailOriginalKey",
        "detailTargetKey",
        "detailRecommendedKey",
        "recommendedTranspose",

        "songRange",
        "songLowest",
        "songHighest",

        "keyDetection",
        "harmonicRatio",
        "harmonicStatus",

        "vocalRange",
        "vocalLowest",
        "vocalHighest",


        // Visualisasi validasi key
        "visualOriginalKey",
        "visualTargetKey",
        "visualTranspose",
        "chromaShiftResult",
        "chromaSimilarity"

    ].forEach(id =>
    {
        setText(id, "-");
    });

    setText(
        "visualValidationStatus",
        "Belum tersedia"
    );

    setText(
        "chromaInterpretation",
        "Belum dilakukan Pitch Shifting"
    );

    setText(
        "originalKeyBadge",
        "Key: -"
    );

    setText(
        "targetKeyBadge",
        "Key: -"
    );

    const validationAlert =
        document.getElementById(
            "chromaValidationAlert"
        );

    if(validationAlert)
    {
        validationAlert.classList.remove(
            "validation-success",
            "validation-warning",
            "validation-failed"
        );

        validationAlert.innerHTML = `
            <i class="bi bi-info-circle-fill me-2"></i>
            Pilih target key dan lakukan Pitch Shifting untuk
            menampilkan validasi perubahan pola nada.
        `;
    }    

    const validationStatus =
        document.getElementById(
            "visualValidationStatus"
        );

    if(validationStatus)
    {
        validationStatus.classList.remove(
            "validation-success",
            "validation-warning",
            "validation-failed"
        );
    }

    // Reset status pitch
    setText(
        "pitchStatus",
        "Siap melakukan Pitch Shifting"
    );

    // Reset tombol key
    document
        .querySelectorAll(
            "#pitchButtons button"
        )
        .forEach(button =>
        {
            button.classList.remove(
                "active",
                "recommended",
                "btn-primary",
                "btn-warning"
            );

            button.classList.add(
                "btn-outline-primary"
            );
        });

    // Hapus badge original key
    document
        .querySelectorAll(
            ".original-badge"
        )
        .forEach(badge =>
        {
            badge.remove();
        });

    // Hapus chromagram audio asli
    if(originalChromagramChart)
    {
        originalChromagramChart.destroy();
        originalChromagramChart = null;
    }

    // Hapus chromagram hasil pitch shifting
    if(shiftedChromagramChart)
    {
        shiftedChromagramChart.destroy();
        shiftedChromagramChart = null;
    }
    // Hapus visualisasi rentang pitch
    if(pitchRangeComparisonChart)
    {
        pitchRangeComparisonChart.destroy();
        pitchRangeComparisonChart = null;
    }    
}

// ======================================================
// HISTORY
// ======================================================

const btnHistorySongs =
    document.getElementById(
        "btnHistorySongs"
    );

const btnHistoryPitches =
    document.getElementById(
        "btnHistoryPitches"
    );


// ======================================================
// BUKA HISTORY LAGU
// ======================================================

if(btnHistorySongs)
{
    btnHistorySongs.addEventListener(
        "click",
        async function()
        {
            const modalElement =
                document.getElementById(
                    "historySongsModal"
                );

            if(!modalElement)
            {
                return;
            }

            const modal =
                bootstrap.Modal.getOrCreateInstance(
                    modalElement
                );

            modal.show();

            await loadSongHistory();
        }
    );
}


// ======================================================
// BUKA HISTORY PITCH
// ======================================================

if(btnHistoryPitches)
{
    btnHistoryPitches.addEventListener(
        "click",
        async function()
        {
            const modalElement =
                document.getElementById(
                    "historyPitchesModal"
                );

            if(!modalElement)
            {
                return;
            }

            const modal =
                bootstrap.Modal.getOrCreateInstance(
                    modalElement
                );

            modal.show();

            await loadPitchHistory();
        }
    );
}


// ======================================================
// AMBIL HISTORY LAGU
// ======================================================

async function loadSongHistory()
{
    const statusElement =
        document.getElementById(
            "historySongsStatus"
        );

    const listElement =
        document.getElementById(
            "historySongsList"
        );

    if(statusElement)
    {
        statusElement.classList.remove(
            "d-none"
        );

        statusElement.innerText =
            "Memuat history lagu...";
    }

    if(listElement)
    {
        listElement.innerHTML = "";
    }

    try
    {
        const response =
            await fetch(
                BASE_URL +
                "/history/songs",
                {
                    method: "GET",

                    headers:
                    {
                        "Accept":
                            "application/json"
                    }
                }
            );

        const data =
            await response.json();

        if(
            !response.ok ||
            data.success === false
        )
        {
            throw new Error(
                data.message ||
                "Gagal mengambil history lagu."
            );
        }

        const items =
            Array.isArray(data.items)
                ? data.items
                : [];

        if(items.length === 0)
        {
            if(statusElement)
            {
                statusElement.innerText =
                    "Belum ada history lagu.";
            }

            return;
        }

        if(statusElement)
        {
            statusElement.classList.add(
                "d-none"
            );
        }

        renderSongHistory(
            items
        );
    }
    catch(error)
    {
        console.error(
            "SONG HISTORY ERROR:",
            error
        );

        if(statusElement)
        {
            statusElement.innerText =
                error.message ||
                "Gagal memuat history lagu.";
        }
    }
}


// ======================================================
// TAMPILKAN HISTORY LAGU
// ======================================================

function renderSongHistory(items)
{
    const listElement =
        document.getElementById(
            "historySongsList"
        );

    if(!listElement)
    {
        return;
    }

    listElement.innerHTML = "";

    items.forEach(item =>
    {
        const card =
            document.createElement(
                "div"
            );

        card.className =
            "card border-0 bg-light shadow-sm";

        const range =
            item.lowest_note &&
            item.highest_note
                ? item.lowest_note +
                  " – " +
                  item.highest_note
                : "-";

        card.innerHTML = `
            <div class="card-body">

                <div class="d-flex justify-content-between gap-3">

                    <div>

                        <h6 class="fw-bold mb-2">
                            ${escapeHistoryHtml(
                                item.title || "-"
                            )}
                        </h6>

                        <div class="text-muted small mb-1">
                            Sumber:
                            ${escapeHistoryHtml(
                                item.channel ||
                                "Tidak tersedia"
                            )}
                        </div>

                        <div class="small">
                            Key asli:
                            <strong>
                                ${escapeHistoryHtml(
                                    item.original_key || "-"
                                )}
                            </strong>
                        </div>

                        <div class="small">
                            Rentang lagu:
                            <strong>
                                ${escapeHistoryHtml(
                                    range
                                )}
                            </strong>
                        </div>

                    </div>

                    <div class="text-end">

                        <small class="text-muted">
                            ${escapeHistoryHtml(
                                item.used_at || "-"
                            )}
                        </small>

                    </div>

                </div>

            </div>
        `;

        listElement.appendChild(
            card
        );
    });
}


// ======================================================
// AMBIL HISTORY PITCH
// ======================================================

async function loadPitchHistory()
{
    const statusElement =
        document.getElementById(
            "historyPitchesStatus"
        );

    const listElement =
        document.getElementById(
            "historyPitchesList"
        );

    if(statusElement)
    {
        statusElement.classList.remove(
            "d-none"
        );

        statusElement.innerText =
            "Memuat history pitch shifting...";
    }

    if(listElement)
    {
        listElement.innerHTML = "";
    }

    try
    {
        const response =
            await fetch(
                BASE_URL +
                "/history/pitches",
                {
                    method: "GET",

                    headers:
                    {
                        "Accept":
                            "application/json"
                    }
                }
            );

        const data =
            await response.json();

        if(
            !response.ok ||
            data.success === false
        )
        {
            throw new Error(
                data.message ||
                "Gagal mengambil history pitch shifting."
            );
        }

        const items =
            Array.isArray(data.items)
                ? data.items
                : [];

        if(items.length === 0)
        {
            if(statusElement)
            {
                statusElement.innerText =
                    "Belum ada history pitch shifting.";
            }

            return;
        }

        if(statusElement)
        {
            statusElement.classList.add(
                "d-none"
            );
        }

        renderPitchHistory(
            items
        );
    }
    catch(error)
    {
        console.error(
            "PITCH HISTORY ERROR:",
            error
        );

        if(statusElement)
        {
            statusElement.innerText =
                error.message ||
                "Gagal memuat history pitch shifting.";
        }
    }
}


// ======================================================
// TAMPILKAN HISTORY PITCH
// ======================================================

function renderPitchHistory(items)
{
    const listElement =
        document.getElementById(
            "historyPitchesList"
        );

    if(!listElement)
    {
        return;
    }

    listElement.innerHTML = "";

    items.forEach(item =>
    {
        const card =
            document.createElement(
                "div"
            );

        card.className =
            "card border-0 bg-light shadow-sm";

        const transpose =
            Number(item.transpose) || 0;

        const transposeText =
            (
                transpose > 0
                    ? "+"
                    : ""
            ) +
            transpose +
            " Semitone";

        const vocalRange =
            item.vocal_lowest &&
            item.vocal_highest
                ? item.vocal_lowest +
                  " – " +
                  item.vocal_highest
                : "-";

        card.innerHTML = `
            <div class="card-body">

                <div class="row g-3 align-items-center">

                    <div class="col-lg-5">

                        <h6 class="fw-bold mb-2">
                            ${escapeHistoryHtml(
                                item.title || "-"
                            )}
                        </h6>

                        <div class="small text-muted mb-1">
                            ${escapeHistoryHtml(
                                item.channel ||
                                "Sumber tidak tersedia"
                            )}
                        </div>

                        <div class="small">
                            Key:
                            <strong>
                                ${escapeHistoryHtml(
                                    item.original_key || "-"
                                )}
                                →
                                ${escapeHistoryHtml(
                                    item.target_key || "-"
                                )}
                            </strong>
                        </div>

                        <div class="small">
                            Transpose:
                            <strong>
                                ${escapeHistoryHtml(
                                    transposeText
                                )}
                            </strong>
                        </div>

                        <div class="small">
                            Rentang vokal:
                            <strong>
                                ${escapeHistoryHtml(
                                    vocalRange
                                )}
                            </strong>
                        </div>

                        <div class="small text-muted mt-2">
                            ${escapeHistoryHtml(
                                item.created_at || "-"
                            )}
                        </div>

                    </div>

                    <div class="col-lg-7">

                        <audio
                            controls
                            preload="metadata"
                            class="w-100"
                            src="${escapeHistoryHtml(
                                item.audio_path || ""
                            )}">
                        </audio>

                    </div>

                </div>

            </div>
        `;

        listElement.appendChild(
            card
        );
    });
}


// ======================================================
// KEAMANAN OUTPUT HISTORY
// ======================================================

function escapeHistoryHtml(value)
{
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}