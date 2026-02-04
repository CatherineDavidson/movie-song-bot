import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dns from "dns";

// ✅ Fix common "fetch failed" issues due to IPv6/DNS on some networks/hosts
dns.setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- HEALTH CHECK ---------- */
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/* ---------- Helper: fetch with timeout ---------- */
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- ITUNES SEARCH API ---------- */
app.get("/api/itunes/search", async (req, res) => {
  try {
    const {
      term,
      entity = "album", // album | song
      attribute = entity === "song" ? "songTerm" : "albumTerm",
      limit = 10,
    } = req.query;

    if (!term || !String(term).trim()) {
      return res.status(400).json({ error: "Missing search term" });
    }

    const itunesUrl =
      `https://itunes.apple.com/in/search?` +
      `term=${encodeURIComponent(term)}` +
      `&media=music` +
      `&entity=${encodeURIComponent(entity)}` +
      `&attribute=${encodeURIComponent(attribute)}` +
      `&limit=${encodeURIComponent(limit)}`;

    const response = await fetchWithTimeout(
      itunesUrl,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      10000
    );

    const text = await response.text();

    // Forward iTunes error status for debugging
    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(text);
  } catch (err) {
    // Helpful error message
    const msg =
      err?.name === "AbortError"
        ? "Upstream iTunes request timed out"
        : err?.message || "Unknown server error";
    res.status(500).json({ error: msg });
  }
});

/* ---------- ITUNES LOOKUP API ---------- */
app.get("/api/itunes/lookup", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id || !String(id).trim()) {
      return res.status(400).json({ error: "Missing collectionId" });
    }

    const itunesUrl =
      `https://itunes.apple.com/in/lookup?` +
      `id=${encodeURIComponent(id)}` +
      `&entity=song` +
      `&limit=50`;

    const response = await fetchWithTimeout(
      itunesUrl,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      10000
    );

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(text);
  } catch (err) {
    const msg =
      err?.name === "AbortError"
        ? "Upstream iTunes request timed out"
        : err?.message || "Unknown server error";
    res.status(500).json({ error: msg });
  }
});

/* ---------- SERVE FRONTEND ---------- */
app.use(express.static(path.join(__dirname, "public")));

// Optional fallback so refreshing doesn't 404
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
