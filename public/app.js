
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

// ====== PROXY FETCH ======
// Requires proxy: http://localhost:3000/itunes?url=<encoded itunes url>
async function proxyFetchJson(itunesUrl) {
  const proxyUrl = `http://localhost:3000/itunes?url=${encodeURIComponent(itunesUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Proxy request failed (${res.status}). ${txt}`);
  }
  return res.json();
}

// ====== URL BUILDERS (India storefront) ======
function itunesSearchUrl(term, entity, attribute) {
  const t = encodeURIComponent(term);
  return `https://itunes.apple.com/in/search?term=${t}&media=music&entity=${entity}&attribute=${attribute}&limit=10`;
}

function itunesLookupUrl(collectionId) {
  return `https://itunes.apple.com/in/lookup?id=${collectionId}&entity=song&limit=50`;
}

// ====== SEARCH LOGIC ======
async function searchSoundtrackAlbum(movieName) {
  const term = `${movieName} original motion picture soundtrack`;
  const url = itunesSearchUrl(term, "album", "albumTerm");
  const data = await proxyFetchJson(url);
  return { resultCount: data.resultCount || 0, albums: data.results || [] };
}

async function lookupAlbumSongs(collectionId) {
  const url = itunesLookupUrl(collectionId);
  const data = await proxyFetchJson(url);
  const songs = (data.results || []).filter(
    r => r.wrapperType === "track" && r.previewUrl
  );
  return { resultCount: data.resultCount || 0, songs };
}

async function fallbackSearchSongs(movieName) {
  const term = `${movieName} song tamil`;
  const url = itunesSearchUrl(term, "song", "songTerm");
  const data = await proxyFetchJson(url);
  const songs = (data.results || []).filter(r => r.previewUrl);
  return { resultCount: data.resultCount || 0, songs };
}

function pickBestAlbum(albums, movieName) {
  if (!albums.length) return null;
  const m = movieName.toLowerCase();
  return (
    albums.find(a => (a.collectionName || "").toLowerCase().includes(m)) ||
    albums[0] ||
    null
  );
}

async function fetchPreviewForMovie(movieName) {
  // 1) Album search (best)
  const albumSearch = await searchSoundtrackAlbum(movieName);

  if (albumSearch.albums.length) {
    const bestAlbum = pickBestAlbum(albumSearch.albums, movieName);

    if (bestAlbum?.collectionId) {
      const lookup = await lookupAlbumSongs(bestAlbum.collectionId);

      if (lookup.songs.length) {
        const track = lookup.songs[0];
        return {
          source: "album_lookup",
          debug: `AlbumSearch=${albumSearch.resultCount}, AlbumTracks=${lookup.resultCount}`,
          album: bestAlbum.collectionName,
          song: track.trackName,
          artist: track.artistName,
          previewUrl: track.previewUrl,
        };
      }
    }
  }

  // 2) Fallback song search
  const songSearch = await fallbackSearchSongs(movieName);

  if (songSearch.songs.length) {
    const track = songSearch.songs[0];
    return {
      source: "song_search",
      debug: `SongSearch=${songSearch.resultCount}`,
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
        `1) Proxy running on http://localhost:3000 ?\n` +
        `2) Your network may block itunes.apple.com\n`,
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
    rec.lang = "en-IN"; // You can try "ta-IN" if available in your Chrome
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

    rec.onend = () => {
      // optional: you can show a message when it stops listening
    };
  });
}
