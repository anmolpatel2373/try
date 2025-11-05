import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Main .m3u8 source
const SOURCE = "http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M/1477206.m3u8";
// Base path for .ts segments
const BASE = "http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M";

// Enable CORS for all players (browser, hls.js, video.js, etc.)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Range");
  next();
});

// Proxy and rewrite M3U8 playlist
app.get("/stream.m3u8", async (req, res) => {
  try {
    const response = await fetch(SOURCE);
    if (!response.ok) throw new Error(`Failed to fetch M3U8: ${response.status}`);
    let text = await response.text();

    // Replace original segment URLs with this server’s URL
    const host = `${req.protocol}://${req.get("host")}`;
    text = text.replace(/(\d+\.ts)/g, (match) => `${host}/${match}`);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(text);
  } catch (err) {
    console.error("Error fetching .m3u8:", err);
    res.status(500).send("Error loading M3U8 playlist");
  }
});

// Proxy .ts segments
app.get("/*.ts", async (req, res) => {
  try {
    const filename = req.path.split("/").pop();
    const segmentUrl = `${BASE}/${filename}`;

    const response = await fetch(segmentUrl);
    if (!response.ok) throw new Error(`Segment not found: ${filename}`);

    res.setHeader("Content-Type", "video/mp2t");
    response.body.pipe(res);
  } catch (err) {
    console.error("Error fetching .ts segment:", err);
    res.status(500).send("Error loading segment");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
