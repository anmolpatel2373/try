import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const SOURCE = "http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M/1477206.m3u8";
const BASE = "http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M";

// __dirname setup for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Range");
  next();
});

// Proxy and clean up playlist
app.get("/stream.m3u8", async (req, res) => {
  try {
    const response = await fetch(SOURCE);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    let text = await response.text();

    const host = `${req.protocol}://${req.get("host")}`;

    // Remove any /hls/.../ before .ts filenames and rewrite to full Render URLs
    text = text.replace(/\/hls\/[A-Za-z0-9]+\/[^\/\n]*?(\d+_\d+\.ts)/g, `${host}/$1`);
    text = text.replace(/(^|\n)(\d+_\d+\.ts)/g, `$1${host}/$2`);
    text = text.replace(/(^|\n)(\d+\.ts)/g, `$1${host}/$2`);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(text);
  } catch (err) {
    console.error("Error fetching M3U8:", err);
    res.status(500).send("Error loading M3U8 playlist");
  }
});

// Serve TS segments
app.get("/*.ts", async (req, res) => {
  try {
    const filename = req.path.split("/").pop();
    const segmentUrl = `${BASE}/${filename}`;

    const response = await fetch(segmentUrl);
    if (!response.ok) throw new Error(`Segment not found: ${filename}`);

    res.setHeader("Content-Type", "video/mp2t");
    response.body.pipe(res);
  } catch (err) {
    console.error("Error fetching segment:", err);
    res.status(500).send("Error loading segment");
  }
});

// Optional HTML test page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
