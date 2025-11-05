import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const SOURCE = "http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M/1477206.m3u8";
const BASE = "http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M";

// Enable CORS for all browsers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Range");
  next();
});

// Serve M3U8 playlist with safe rewritten URLs
app.get("/stream.m3u8", async (req, res) => {
  try {
    const response = await fetch(SOURCE);
    if (!response.ok) throw new Error(`Failed to fetch M3U8: ${response.status}`);
    let text = await response.text();

    // Replace any URL ending with .ts (even if full URLs)
    const host = `${req.protocol}://${req.get("host")}`;
    text = text.replace(/https?:\/\/[^\s]+?(\d+\.ts)/g, `${host}/$1`); // replaces full URLs
    text = text.replace(/(^|\n)(\d+\.ts)/g, `$1${host}/$2`); // replaces relative ones

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
    console.error("Error fetching TS segment:", err);
    res.status(500).send("Error loading segment");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
