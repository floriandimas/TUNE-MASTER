// ======================================================
// ELEMEN PENCARIAN
// ======================================================

const btnSearch =
    document.getElementById(
        "btnSearch"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );


// ======================================================
// EVENT PENCARIAN
// ======================================================

if(btnSearch)
{
    btnSearch.addEventListener(
        "click",
        search
    );
}

if(searchInput)
{
    searchInput.addEventListener(
        "keydown",
        function(event)
        {
            if(event.key === "Enter")
            {
                event.preventDefault();
                search();
            }
        }
    );
}


// ======================================================
// SEARCH
// ======================================================

async function search()
{
    const query =
        searchInput?.value.trim() || "";

    const statusElement =
        document.getElementById(
            "status"
        );

    const list =
        document.getElementById(
            "results"
        );

    if(query === "")
    {
        setText(
            "status",
            "Masukkan judul lagu terlebih dahulu."
        );

        if(list)
        {
            list.innerHTML = "";
        }

        return;
    }

    setText(
        "status",
        "Mencari..."
    );

    if(list)
    {
        list.innerHTML = "";
    }

    try
    {
        const response =
            await fetch(
                BASE_URL + "/search",
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
                        query: query
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "SEARCH:",
            data
        );

        if(
            !response.ok ||
            data.success === false
        )
        {
            throw new Error(
                data.message ||
                "Pencarian gagal dilakukan."
            );
        }

        const items =
            Array.isArray(data)
                ? data
                : data.items || [];

        if(items.length === 0)
        {
            setText(
                "status",
                data.message ||
                "Lagu karaoke tidak ditemukan."
            );

            return;
        }

        setText(
            "status",
            "Pilih lagu:"
        );

        renderSearchResults(items);
    }
    catch(error)
    {
        console.error(
            "SEARCH ERROR:",
            error
        );

        if(statusElement)
        {
            statusElement.innerText =
                error.message ||
                "Terjadi kesalahan saat pencarian.";
        }
    }
}


// ======================================================
// RENDER HASIL PENCARIAN
// ======================================================

function renderSearchResults(items)
{
    const list =
        document.getElementById(
            "results"
        );

    if(!list)
    {
        return;
    }

    list.innerHTML = "";

    items.forEach(item =>
    {
        const videoId =
            item.id?.videoId || "";

        const title =
            item.snippet?.title ||
            "Judul tidak tersedia";

        const channelTitle =
            item.snippet?.channelTitle ||
            "Channel tidak diketahui";

        const recommended =
            item.source?.recommended === true;

        const li =
            document.createElement(
                "li"
            );

        li.className =
            "search-result-item";

        li.dataset.videoId =
            videoId;

        if(
            selectedSearchVideoId ===
            videoId
        )
        {
            li.classList.add(
                "selected"
            );
        }

        li.innerHTML =
        `
            ${
                selectedSearchVideoId === videoId
                    ? createSelectedBadge()
                    : ""
            }

            <strong>
                ${escapeHtml(title)}
            </strong>

            <div class="mt-2 text-muted">
                Sumber:
                ${escapeHtml(channelTitle)}
            </div>

            ${
                recommended
                    ? `
                        <div class="mt-1">
                            <span class="badge-recommended">
                                ⭐ Sumber Direkomendasikan
                            </span>
                        </div>
                    `
                    : ""
            }

            <br>
        `;

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.innerText =
            "Pilih";

        button.addEventListener(
            "click",
            function()
            {
                markSelectedSearchResult(
                    videoId
                );

                selectSong(
                    videoId,
                    title
                );
            }
        );

        li.appendChild(
            button
        );

        list.appendChild(
            li
        );
    });
}


// ======================================================
// BADGE LAGU TERPILIH
// ======================================================

function createSelectedBadge()
{
    return `
        <span class="badge-selected">
            <i class="fa-solid fa-check"></i>
        </span>
    `;
}

function markSelectedSearchResult(videoId)
{
    selectedSearchVideoId =
        videoId;

    document
        .querySelectorAll(
            "#results .search-result-item"
        )
        .forEach(item =>
        {
            item.classList.remove(
                "selected"
            );

            const oldBadge =
                item.querySelector(
                    ".badge-selected"
                );

            if(oldBadge)
            {
                oldBadge.remove();
            }
        });

    const selectedItem =
        document.querySelector(
            `#results .search-result-item[data-video-id="${CSS.escape(videoId)}"]`
        );

    if(!selectedItem)
    {
        return;
    }

    selectedItem.classList.add(
        "selected"
    );

    selectedItem.insertAdjacentHTML(
        "afterbegin",
        createSelectedBadge()
    );
}


// ======================================================
// PILIH LAGU
// ======================================================

window.selectSong =
async function(videoId, title)
{
    resetApplication();

    currentSongTitle =
        title;

    loadLyrics(title);

    setText(
        "status",
        "Mengunduh audio..."
    );

    try
    {
        const audioData =
            await fetchAudio(
                videoId,
                title
            );

        const audioOriginal =
            document.getElementById(
                "audioOriginal"
            );

        if(audioOriginal)
        {
            audioOriginal.src =
                audioData.path +
                "?t=" +
                Date.now();

            audioOriginal.load();

            bindLyricsAudioSync();
        }

        setText(
            "status",
            "Audio siap diputar. Deteksi key sedang berjalan..."
        );

        const keyData =
            await detectSongKey(
                audioData.path
            );

        displaySongData(
            keyData
        );

        setText(
            "status",
            "Audio dan hasil deteksi key siap digunakan."
        );
    }
    catch(error)
    {
        console.error(
            "SELECT SONG ERROR:",
            error
        );

        songData = null;
        originalKey = null;

        setText(
            "detailOriginalKey",
            "Gagal deteksi"
        );

        setText(
            "keyDetection",
            "Gagal deteksi"
        );

        setText(
            "harmonicRatio",
            "-"
        );

        setText(
            "harmonicStatus",
            "-"
        );

        setText(
            "songRange",
            "-"
        );

        setText(
            "songLowest",
            "-"
        );

        setText(
            "songHighest",
            "-"
        );

        setText(
            "status",
            error.message ||
            "Gagal memproses lagu."
        );
    }
};


// ======================================================
// FETCH AUDIO
// ======================================================

async function fetchAudio(
    videoId,
    title,
    channelTitle = ""
)
{
    const response =
        await fetch(
            BASE_URL + "/fetch-audio",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json",

                    "X-CSRF-TOKEN":
                        csrf
                },

                body: JSON.stringify({
                    videoId: videoId,
                    title: title,
                    channelTitle: channelTitle
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
            data.error ||
            data.message ||
            "Gagal mengunduh audio."
        );
    }

    return data;
}


// ======================================================
// DETEKSI KEY
// ======================================================

async function detectSongKey(path)
{
    const response =
        await fetch(
            BASE_URL + "/detect-key",
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
                    path:
                        path.split("?")[0]
                })
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
            "Gagal melakukan deteksi key."
        );
    }

    return data;
}


// ======================================================
// TAMPILKAN DATA LAGU
// ======================================================

function displaySongData(keyData)
{
    songData =
        keyData;

    setText(
        "keyDetection",
        keyData.key || "-"
    );

    if(
        keyData.harmonic_ratio !== undefined &&
        keyData.harmonic_ratio !== null &&
        !isNaN(
            Number(
                keyData.harmonic_ratio
            )
        )
    )
    {
        setText(
            "harmonicRatio",
            Number(
                keyData.harmonic_ratio
            ).toFixed(2) + "%"
        );
    }
    else
    {
        setText(
            "harmonicRatio",
            "-"
        );
    }

    setText(
        "harmonicStatus",
        keyData.status || "-"
    );

    setText(
        "songRange",
        keyData.range || "-"
    );

    setText(
        "songLowest",
        keyData.lowest_note || "-"
    );

    setText(
        "songHighest",
        keyData.highest_note || "-"
    );

    if(!keyData.key)
    {
        originalKey = null;

        setText(
            "detailOriginalKey",
            "-"
        );

        return;
    }

    originalKey =
        keyData.key
            .split(" ")[0]
            .trim();

    songData.key =
        originalKey;

    markOriginalKey(
        originalKey
    );

    let confidenceText = "";

    if(
        keyData.confidence !== undefined &&
        keyData.confidence !== null &&
        !isNaN(
            Number(
                keyData.confidence
            )
        )
    )
    {
        confidenceText =
            " (" +
            Number(
                keyData.confidence
            ).toFixed(2) +
            ")";
    }

    setText(
        "detailOriginalKey",
        keyData.key +
        confidenceText
    );
}


// ======================================================
// ORIGINAL KEY BADGE
// ======================================================

function markOriginalKey(key)
{
    document
        .querySelectorAll(
            "#pitchButtons button"
        )
        .forEach(button =>
        {
            const badge =
                button.querySelector(
                    ".original-badge"
                );

            if(badge)
            {
                badge.remove();
            }

            if(
                button.dataset.key ===
                key
            )
            {
                button.insertAdjacentHTML(
                    "beforeend",
                    `
                        <span
                            class="original-badge"
                            title="Original Key">
                            O
                        </span>
                    `
                );
            }
        });
}


// ======================================================
// PEMBERSIHAN JUDUL
// ======================================================

function cleanTitle(title)
{
    return String(title || "")

        .replace(/\(.*?\)/gi, "")
        .replace(/\[.*?\]/gi, "")

        .replace(/\bkaraoke version\b/gi, "")
        .replace(/\bkaraoke\b/gi, "")

        .replace(/\bofficial lyric video\b/gi, "")
        .replace(/\bofficial lyrics video\b/gi, "")
        .replace(/\bofficial audio\b/gi, "")
        .replace(/\bofficial video\b/gi, "")
        .replace(/\bofficial\b/gi, "")

        .replace(/\blyric video\b/gi, "")
        .replace(/\blyrics video\b/gi, "")
        .replace(/\blyrics\b/gi, "")
        .replace(/\blyric\b/gi, "")
        .replace(/\bvideo\b/gi, "")

        .replace(/\bhd\b/gi, "")
        .replace(/\bhq\b/gi, "")
        .replace(/\b4k\b/gi, "")
        .replace(/\b1080p\b/gi, "")
        .replace(/\b720p\b/gi, "")

        .replace(/\bfemale key\b/gi, "")
        .replace(/\bmale key\b/gi, "")
        .replace(/\bhigh key\b/gi, "")
        .replace(/\blower key\b/gi, "")
        .replace(/\bhigher key\b/gi, "")
        .replace(/\blower pitch\b/gi, "")
        .replace(/\bhigher pitch\b/gi, "")

        .replace(/\bminus one\b/gi, "")
        .replace(/\binstrumental\b/gi, "")
        .replace(/\bbacking track\b/gi, "")

        .replace(
            /\s+(feat|ft|featuring)\.?\s+.*$/i,
            ""
        )

        .replace(/\|/g, "-")
        .replace(/_/g, " ")
        .replace(/\s+-\s+/g, " - ")
        .replace(/\s{2,}/g, " ")

        .trim();
}


// ======================================================
// AMBIL LIRIK
// ======================================================

async function loadLyrics(title)
{
    const cleanedTitle =
        cleanTitle(title);

    setText(
        "lyricsReff",
        "Mengambil lirik..."
    );

    const lyricsFull =
        document.getElementById(
            "lyricsFull"
        );

    if(lyricsFull)
    {
        lyricsFull.innerHTML =
            "Mengambil lirik...";
    }

    try
    {
        const response =
            await fetch(
                BASE_URL + "/lyrics",
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
                        title: cleanedTitle
                    })
                }
            );

        const data =
            await response.json();

        if(!response.ok)
        {
            throw new Error(
                data.message ||
                "Gagal mengambil lirik."
            );
        }

        currentLyrics =
            data.plainLyrics || "";

        const lyricSource =
            data.syncedLyrics ||
            currentLyrics;

        if(!lyricSource)
        {
            showLyricsUnavailable();
            return;
        }

        makeReff(
            lyricSource
        );
    }
    catch(error)
    {
        console.error(
            "LYRICS ERROR:",
            error
        );

        showLyricsUnavailable();
    }
}


// ======================================================
// LIRIK TIDAK TERSEDIA
// ======================================================

function showLyricsUnavailable()
{
    setText(
        "lyricsReff",
        "Lirik tidak tersedia."
    );

    const lyricsFull =
        document.getElementById(
            "lyricsFull"
        );

    if(lyricsFull)
    {
        lyricsFull.innerHTML =
            "Lirik tidak tersedia.";
    }
}


// ======================================================
// BUAT CUPLIKAN LIRIK UNTUK TES VOKAL
// ======================================================

function makeReff(lyrics)
{
    syncedLyricsData = [];

    if(!lyrics)
    {
        showLyricsUnavailable();
        return;
    }

    const lines =
        String(lyrics)
            .split("\n");

    /*
    |--------------------------------------------------------------------------
    | Parsing lirik tersinkronisasi
    |--------------------------------------------------------------------------
    */

    lines.forEach(line =>
    {
        const match =
            line.match(
                /\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)/
            );

        if(!match)
        {
            return;
        }

        const text =
            match[3].trim();

        if(
            text === "" ||
            isLyricsSectionMarker(text)
        )
        {
            return;
        }

        syncedLyricsData.push({
            time:
                parseInt(
                    match[1],
                    10
                ) * 60 +
                parseFloat(
                    match[2]
                ),

            text: text
        });
    });

    currentLyricIndex = -1;

    /*
    |--------------------------------------------------------------------------
    | Tentukan cuplikan untuk tes vokal
    |--------------------------------------------------------------------------
    */

    const vocalSample =
        getVocalLyricsSample(
            lyrics
        );

    // Setelah makeReff selesai, syncedLyricsData sudah tersedia.
    // Render ulang agar posisi awal lirik Perekaman Vokal
    // benar-benar mengikuti titik awal sampel/reff yang dipakai.
    renderRecordingLyrics(
        currentLyrics,
        lyrics
    );

    /*
    |--------------------------------------------------------------------------
    | Tampilkan lirik lengkap
    |--------------------------------------------------------------------------
    */

    if(syncedLyricsData.length > 0)
    {
        updateLyrics(0);
        return;
    }

    const plainLyrics =
        String(lyrics).trim();

    currentLyrics =
        plainLyrics;

    const lyricsFull =
        document.getElementById(
            "lyricsFull"
        );

    if(lyricsFull)
    {
        lyricsFull.innerHTML =
            formatLyrics(
                plainLyrics
            );
    }
}

// ======================================================
// AMBIL CUPLIKAN AWAL UNTUK TES VOKAL
// ======================================================

function getVocalLyricsSample(lyrics)
{
    /*
    |--------------------------------------------------------------------------
    | PRIORITAS:
    | Gunakan synced lyrics karena memiliki timestamp.
    |--------------------------------------------------------------------------
    */

    if(
        Array.isArray(syncedLyricsData) &&
        syncedLyricsData.length > 0
    )
    {
        const sampleLines = [];

        const firstLyric =
            syncedLyricsData[0];

        if(!firstLyric)
        {
            return "";
        }

        const startTime =
            Number(
                firstLyric.time
            ) || 0;

        /*
        |--------------------------------------------------------------------------
        | Ambil cuplikan sekitar 10 - 15 detik.
        |
        | Maksimal 8 baris supaya teks tidak terlalu panjang.
        |--------------------------------------------------------------------------
        */

        const TARGET_DURATION =
            15;

        const MAX_LINES =
            8;

        for(
            let index = 0;
            index < syncedLyricsData.length;
            index++
        )
        {
            const item =
                syncedLyricsData[index];

            if(
                !item ||
                !item.text
            )
            {
                continue;
            }

            const currentTime =
                Number(
                    item.time
                ) || 0;

            /*
            |--------------------------------------------------------------------------
            | Hentikan jika sudah melewati durasi target,
            | tetapi pastikan minimal ada beberapa baris.
            |--------------------------------------------------------------------------
            */

            if(
                sampleLines.length >= 4 &&
                currentTime - startTime >
                    TARGET_DURATION
            )
            {
                break;
            }

            sampleLines.push(
                item
            );

            if(
                sampleLines.length >=
                MAX_LINES
            )
            {
                break;
            }
        }

        if(sampleLines.length > 0)
        {
            const lastLine =
                sampleLines[
                    sampleLines.length - 1
                ];

            /*
            |--------------------------------------------------------------------------
            | Estimasi akhir sampel.
            |
            | Jika masih ada baris berikutnya,
            | gunakan timestamp baris berikutnya sebagai batas akhir.
            |--------------------------------------------------------------------------
            */

            const nextIndex =
                sampleLines.length;

            let endTime =
                startTime +
                TARGET_DURATION;

            if(
                syncedLyricsData[
                    nextIndex
                ]
            )
            {
                endTime =
                    Number(
                        syncedLyricsData[
                            nextIndex
                        ].time
                    ) ||
                    endTime;
            }
            else if(lastLine)
            {
                endTime =
                    Math.max(
                        startTime,
                        Number(
                            lastLine.time
                        ) || startTime
                    ) + 3;
            }

            /*
            |--------------------------------------------------------------------------
            | Simpan metadata sampel.
            |--------------------------------------------------------------------------
            */

            window.vocalLyricsSampleData =
            {
                type:
                    "opening_lyrics",

                startTime:
                    Number(
                        startTime.toFixed(3)
                    ),

                endTime:
                    Number(
                        endTime.toFixed(3)
                    ),

                duration:
                    Number(
                        (
                            endTime -
                            startTime
                        ).toFixed(3)
                    ),

                lines:
                    sampleLines.map(
                        item =>
                        ({
                            time:
                                Number(
                                    item.time
                                ),

                            text:
                                item.text
                        })
                    )
            };

            console.log(
                "VOCAL LYRICS SAMPLE:",
                window.vocalLyricsSampleData
            );

            return sampleLines
                .map(
                    item =>
                        item.text
                )
                .join("\n");
        }
    }


    /*
    |--------------------------------------------------------------------------
    | FALLBACK:
    |
    | Jika synced lyrics tidak tersedia,
    | gunakan beberapa baris awal plain lyrics.
    |--------------------------------------------------------------------------
    */

    const cleanLines =
        String(
            lyrics || ""
        )
        .split("\n")
        .map(line =>
            removeLyricsTimestamp(
                line
            ).trim()
        )
        .filter(line =>
            line !== "" &&
            !isLyricsSectionMarker(
                line
            )
        );

    if(cleanLines.length === 0)
    {
        window.vocalLyricsSampleData =
            null;

        return "";
    }

    const sampleLines =
        cleanLines.slice(
            0,
            8
        );

    window.vocalLyricsSampleData =
    {
        type:
            "opening_lyrics_fallback",

        startTime:
            null,

        endTime:
            null,

        duration:
            null,

        lines:
            sampleLines.map(
                text =>
                ({
                    time:
                        null,

                    text:
                        text
                })
            )
    };

    console.log(
        "VOCAL LYRICS SAMPLE:",
        window.vocalLyricsSampleData
    );

    return sampleLines.join(
        "\n"
    );
}


// ======================================================
// HAPUS TIMESTAMP LIRIK
// ======================================================

function removeLyricsTimestamp(line)
{
    return String(line || "")
        .replace(
            /^\[\d+:\d+(?:\.\d+)?\]\s*/,
            ""
        );
}


// ======================================================
// DETEKSI PENANDA CHORUS / REFF
// ======================================================

function isChorusMarker(line)
{
    const normalized =
        normalizeLyricsMarker(
            line
        );

    return [
        "chorus",
        "reff",
        "refrain",
        "hook",
        "chorus 1",
        "chorus 2",
        "reff 1",
        "reff 2"
    ].includes(
        normalized
    );
}


// ======================================================
// DETEKSI PENANDA PRE-CHORUS
// ======================================================

function isPreChorusMarker(line)
{
    const normalized =
        normalizeLyricsMarker(
            line
        );

    return [
        "pre chorus",
        "prechorus",
        "pre chorus 1",
        "pre chorus 2",
        "prechorus 1",
        "prechorus 2"
    ].includes(
        normalized
    );
}

// ======================================================
// DETEKSI PENANDA BAGIAN LAGU
// ======================================================

function isLyricsSectionMarker(line)
{
    const normalized =
        normalizeLyricsMarker(
            line
        );

    if(normalized === "")
    {
        return false;
    }

    return /^(intro|verse|pre chorus|prechorus|chorus|reff|refrain|hook|bridge|interlude|instrumental|outro|ending|post chorus)(\s*\d+)?$/i
        .test(
            normalized
        );
}


// ======================================================
// NORMALISASI PENANDA LIRIK
// ======================================================

function normalizeLyricsMarker(line)
{
    return String(line || "")
        .toLowerCase()
        .replace(
            /^\[|\]$/g,
            ""
        )
        .replace(
            /^\(|\)$/g,
            ""
        )
        .replace(
            /:/g,
            ""
        )
        .replace(
            /-/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


// ======================================================
// SAMPEL LIRIK BIASA
// ======================================================

function getPlainLyricsSample(text)
{
    if(!text)
    {
        return "Lirik reff tidak tersedia.";
    }

    const lines =
        text
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);

    const start =
        Math.floor(
            lines.length * 0.35
        );

    const end =
        Math.max(
            start + 4,
            Math.floor(
                lines.length * 0.55
            )
        );

    return lines
        .slice(start, end)
        .join("\n");
}


// ======================================================
// FORMAT LIRIK BIASA
// ======================================================

function formatLyrics(text)
{
    if(!text)
    {
        return "";
    }

    return escapeHtml(
        text.trim()
    )
        .replace(
            /\n{3,}/g,
            "\n\n"
        )
        .replace(
            /\n{2,}/g,
            "<br><br>"
        )
        .replace(
            /\n/g,
            "<br>"
        );
}


// ======================================================
// LIRIK PEREKAMAN VOKAL — FULL, STATIS, FOKUS REFF
// ======================================================

function renderRecordingLyrics(plainLyrics, syncedLyrics = "")
{
    const lyricsRecording =
        document.getElementById(
            "lyricsRecording"
        );

    if(!lyricsRecording)
    {
        return;
    }

    /*
     * Perekaman Vokal:
     * - full lirik tetap ditampilkan
     * - hanya sekitar 5 baris terlihat sekaligus
     * - posisi awal mengikuti bagian REFF yang terdeteksi
     * - setelah posisi awal ditentukan, scroll manual
     * - tidak ada highlight / animasi / sinkronisasi audio
     */
    let sourceLines = [];

    const rawSynced =
        String(
            syncedLyrics || ""
        ).trim();

    if(rawSynced)
    {
        sourceLines =
            rawSynced
                .split(/\r?\n/)
                .map(line =>
                    removeLyricsTimestamp(
                        line
                    ).trim()
                )
                .filter(line =>
                    line !== "" &&
                    !isLyricsSectionMarker(line)
                );
    }

    if(sourceLines.length === 0)
    {
        sourceLines =
            String(
                plainLyrics || ""
            )
                .split(/\r?\n/)
                .map(line =>
                    removeLyricsTimestamp(
                        line
                    ).trim()
                )
                .filter(Boolean);
    }

    if(sourceLines.length === 0)
    {
        lyricsRecording.innerHTML =
            "Lirik tidak tersedia.";
        return;
    }

    /*
     * Tentukan posisi awal berdasarkan DATA YANG SAMA dengan
     * makeReff/getVocalLyricsSample pada alur lirik tersinkronisasi.
     *
     * Pada project ini titik fokus sampel berada mulai sekitar
     * 35% dari urutan baris lirik tersinkronisasi. Karena
     * sourceLines dibentuk dari urutan yang sama, indeks ini
     * dapat langsung digunakan sebagai anchor scroll.
     */
    let focusIndex = -1;

    if(
        Array.isArray(syncedLyricsData) &&
        syncedLyricsData.length > 0
    )
    {
        focusIndex =
            Math.floor(
                syncedLyricsData.length * 0.35
            );

        focusIndex =
            Math.max(
                0,
                Math.min(
                    focusIndex,
                    sourceLines.length - 1
                )
            );
    }

    /*
     * Jika synced lyrics tidak tersedia, gunakan marker REFF
     * dari plain lyrics bila memang ada.
     */
    if(focusIndex === -1)
    {
        const plainLines =
            String(
                plainLyrics || ""
            )
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);

        focusIndex =
            findRecordingReffIndex(
                plainLines
            );
    }

    /*
     * Bila tidak ada informasi tersinkronisasi maupun marker,
     * tampilkan dari awal dan biarkan pengguna scroll manual.
     */
    if(focusIndex === -1)
    {
        focusIndex = 0;
    }

    /*
     * Hanya sekitar 5 baris yang terlihat.
     * Full lirik tetap berada di dalam container.
     */
    lyricsRecording.style.height = "180px";
    lyricsRecording.style.maxHeight = "180px";
    lyricsRecording.style.overflowY = "auto";
    lyricsRecording.style.overflowX = "hidden";
    lyricsRecording.style.scrollBehavior = "auto";

    lyricsRecording.innerHTML =
        sourceLines
            .map((line, index) =>
                `<div
                    class="recording-lyric-line"
                    data-lyric-index="${index}"
                    style="display:block; color:inherit; background:transparent; font-weight:normal; line-height:28px; min-height:28px; margin:0; padding:0;"
                >${escapeHtml(line)}</div>`
            )
            .join("");

    const focusElement =
        lyricsRecording.querySelector(
            `[data-lyric-index="${focusIndex}"]`
        );

    if(focusElement)
    {
        /*
         * REFF ditempatkan di bagian atas viewport.
         * Hanya dilakukan sekali setelah render.
         * Selanjutnya pengguna bebas scroll manual.
         */
        requestAnimationFrame(() =>
        {
            lyricsRecording.scrollTop =
                Math.max(
                    0,
                    focusElement.offsetTop
                );
        });
    }
}


function normalizeLyricForMatch(line)
{
    return String(
        line || ""
    )
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

function findRecordingReffIndex(lines)
{
    if(
        !Array.isArray(lines) ||
        lines.length === 0
    )
    {
        return -1;
    }

    for(
        let index = 0;
        index < lines.length;
        index++
    )
    {
        if(
            isChorusMarker(
                lines[index]
            )
        )
        {
            return Math.min(
                index + 1,
                lines.length - 1
            );
        }
    }

    return -1;
}


// ======================================================
// UPDATE LIRIK BERDASARKAN WAKTU
// ======================================================

// ======================================================
// SINKRONISASI LIRIK DENGAN AUDIO
// ======================================================
// Gunakan renderer lirik yang sama untuk audio original
// dan audio hasil pitch shifting.
// ======================================================

function bindLyricsAudioSync()
{
    const audioIds = [
        "audioOriginal",
        "audioProcessed"
    ];

    audioIds.forEach(id =>
    {
        const audio =
            document.getElementById(id);

        if(!audio || audio.dataset.lyricsSyncBound === "1")
        {
            return;
        }

        audio.addEventListener(
            "timeupdate",
            () =>
            {
                updateLyrics(
                    Number(audio.currentTime) || 0
                );
            }
        );

        audio.addEventListener(
            "seeked",
            () =>
            {
                updateLyrics(
                    Number(audio.currentTime) || 0
                );
            }
        );

        audio.dataset.lyricsSyncBound = "1";
    });
}

// Jalankan setelah DOM tersedia.
if(document.readyState === "loading")
{
    document.addEventListener(
        "DOMContentLoaded",
        bindLyricsAudioSync
    );
}
else
{
    bindLyricsAudioSync();
}

function updateLyrics(currentTime)
{
    if(
        syncedLyricsData.length === 0
    )
    {
        return;
    }

    let index = 0;

    for(
        let i = 0;
        i < syncedLyricsData.length;
        i++
    )
    {
        if(
            currentTime >=
            syncedLyricsData[i].time +
            LYRIC_DELAY
        )
        {
            index = i;
        }
    }

    if(
        index ===
        currentLyricIndex
    )
    {
        return;
    }

    currentLyricIndex =
        index;

    let html = "";

    const start =
        Math.max(
            0,
            index - 2
        );

    const end =
        Math.min(
            syncedLyricsData.length - 1,
            index + 2
        );

    for(
        let i = start;
        i <= end;
        i++
    )
    {
        const className =
            i === index
                ? "active-lyric"
                : "normal-lyric";

        html += `
            <div class="${className}">
                ${escapeHtml(
                    syncedLyricsData[i].text
                )}
            </div>
        `;
    }

    const lyricsFull =
        document.getElementById(
            "lyricsFull"
        );

    // Personalisasi Nada tetap menggunakan lyricsFull.
    // lyricsRecording sengaja tidak disentuh oleh updateLyrics().
    if(lyricsFull)
    {
        lyricsFull.innerHTML =
            html;
    }
}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value)
{
    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

