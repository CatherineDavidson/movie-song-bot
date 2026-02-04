// ====== DOM ======
const movieInput = document.getElementById("movieInput");
const sendBtn = document.getElementById("sendBtn");
const chat = document.getElementById("chat");

const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");

// Voice button (make sure it exists in HTML)
const voiceBtn = document.getElementById("voiceBtn");

// ====== STATE ======
let currentPreviewUrl = null;
let currentMeta = null;

// ---------- API CALLS ----------
// Backend base URL:
// - Local + deployed (same server): location.origin
// - If you open UI using Live Server (5500) while backend is 3000, set BACKEND = "http://localhost:3000"
const BACKEND = location.origin;

// Call /api/itunes/search
async function apiSearch(term, entity, attribute, limit = 10) {
  const url =
    `${BACKEND}/api/itunes/search?term=${encodeURIComponent(term)}` +
    `&entity=${encodeURIComponent(entity)}` +
    `&attribute=${encodeURIComponent(attribute)}` +
    `&limit=${encodeURIComponent(limit)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

// Call /api/itunes/lookup
async function apiLookup(collectionId) {
  const url = `${BACKEND}/api/itunes/lookup?id=${encodeURIComponent(collectionId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
  return res.json();
}

// ====== UI ======
function addMsg(text, who = "bot") {
  const wrap = document.createElement("div");
  wrap.className = `msg ${who}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function normalize(s) {
  return (s || "").trim();
}

function resetPlayer() {
  currentPreviewUrl = null;
  currentMeta = null;
  audio.pause();
  audio.currentTime = 0;
  audio.src = "";
  playBtn.disabled = true;
  stopBtn.disabled = true;
}

// ====== URL BUILDERS (India storefront) ======
// (Not used right now, but kept as-is)
function itunesSearchUrl(term, entity, attribute) {
  const t = encodeURIComponent(term);
  return `https://itunes.apple.com/in/search?term=${t}&media=music&entity=${entity}&attribute=${attribute}&limit=10`;
}

function itunesLookupUrl(collectionId) {
  return `https://itunes.apple.com/in/lookup?id=${collectionId}&entity=song&limit=50`;
}

// ====== SEARCH LOGIC ======
async function searchSoundtrackAlbum(movie) {
  const term = `${movie} original motion picture soundtrack`;
  const data = await apiSearch(term, "album", "albumTerm", 10);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results;
}

async function lookupSongs(collectionId) {
  const data = await apiLookup(collectionId);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.filter((r) => r.wrapperType === "track" && r.previewUrl);
}

async function fallbackSongSearch(movie) {
  const term = `${movie} song tamil`;
  const data = await apiSearch(term, "song", "songTerm", 10);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.filter((r) => r.previewUrl);
}

function pickBestAlbum(albums, movieName) {
  if (!albums.length) return null;
  const m = movieName.toLowerCase();
  return (
    albums.find((a) => (a.collectionName || "").toLowerCase().includes(m)) ||
    albums[0] ||
    null
  );
}

async function fetchPreviewForMovie(movieName) {
  // 1) Album search (best)
  const albums = await searchSoundtrackAlbum(movieName);

  if (albums.length) {
    const bestAlbum = pickBestAlbum(albums, movieName);

    if (bestAlbum?.collectionId) {
      const songs = await lookupSongs(bestAlbum.collectionId);

      if (songs.length) {
        const track = songs[0];
        return {
          source: "album_lookup",
          debug: `AlbumResults=${albums.length}, SongsWithPreview=${songs.length}`,
          album: bestAlbum.collectionName,
          song: track.trackName,
          artist: track.artistName,
          previewUrl: track.previewUrl,
        };
      }
    }
  }

  // 2) Fallback song search
  const fallbackSongs = await fallbackSongSearch(movieName);

  if (fallbackSongs.length) {
    const track = fallbackSongs[0];
    return {
      source: "song_search",
      debug: `FallbackSongsWithPreview=${fallbackSongs.length}`,
      album: track.collectionName,
      song: track.trackName,
      artist: track.artistName,
      previewUrl: track.previewUrl,
    };
  }

  return null;
}

// ====== MAIN SEARCH HANDLER ======
async function handleSearch(movieNameOverride = null) {
  const movieName = normalize(movieNameOverride ?? movieInput.value);

  if (!movieName) {
    addMsg("Type a movie name da 😄", "bot");
    return;
  }

  addMsg(movieName, "user");
  addMsg("Searching preview… 🎧", "bot");

  resetPlayer();

  try {
    const result = await fetchPreviewForMovie(movieName);

    if (!result) {
      addMsg(
        "No preview found 😕\n" +
          "Try:\n" +
          "1) Movie + Song name\n" +
          "Example: 'Leo Naa Ready'",
        "bot"
      );
      return;
    }

    currentPreviewUrl = result.previewUrl;
    currentMeta = result;

    audio.src = currentPreviewUrl;
    playBtn.disabled = false;
    stopBtn.disabled = false;

    addMsg(
      `✅ Found (${result.source})\n` +
        `🎵 Song: ${result.song}\n` +
        `👤 Artist: ${result.artist}\n` +
        `💿 Album: ${result.album || "Unknown"}\n` +
        `🧪 Debug: ${result.debug}\n\n` +
        `Click “Play Preview” ▶`,
      "bot"
    );
  } catch (err) {
    addMsg(
      `Error: ${err.message}\n\n` +
        `Checklist:\n` +
        `1) Open UI from http://localhost:3000 (same as server)\n` +
        `2) Proxy/API routes must be running (/api/itunes/search)\n`,
      "bot"
    );
  }
}

// ====== BUTTON EVENTS ======
sendBtn.addEventListener("click", () => handleSearch());

movieInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

playBtn.addEventListener("click", async () => {
  if (!currentPreviewUrl) return;
  try {
    await audio.play();
    addMsg(`🎶 Playing: ${currentMeta?.song || "Preview"}…`, "bot");
  } catch {
    addMsg("Autoplay blocked. Press play on the audio controls 👇", "bot");
  }
});

stopBtn.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  addMsg("Stopped ✅", "bot");
});

audio.addEventListener("ended", () => {
  addMsg("Preview ended 🎧", "bot");
});

// ====== 🎙️ VOICE INPUT FEATURE ======
if (voiceBtn) {
  voiceBtn.addEventListener("click", () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMsg("Voice input not supported in this browser. Use Chrome.", "bot");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-IN"; // Try "ta-IN" if available in your Chrome
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    addMsg("Listening… 🎙️ Say the movie name", "bot");
    rec.start();

    rec.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      movieInput.value = spoken;
      addMsg(`Heard: ${spoken}`, "bot");
      handleSearch(spoken);
    };

    rec.onerror = (e) => {
      addMsg(`Voice error: ${e.error || "Unknown"}. Try again.`, "bot");
    };
  });
}
