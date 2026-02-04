import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Proxy endpoint
app.get("/itunes", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.startsWith("https://itunes.apple.com/")) {
      return res.status(400).json({ error: "Invalid iTunes URL" });
    }

    const r = await fetch(url);
    const data = await r.text();

    res.set("Access-Control-Allow-Origin", "*");
    res.type("application/json").send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback → index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
