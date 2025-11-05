import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const SOURCE = "http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M/1477206.m3u8";
let latestHlsPath = ""; // store latest /hls/<token> path

// Enable CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Range");
  next();
});

// Proxy and rewrite M3U8
app.get("/stream.m3u8", async (req, res) => {
  try {
    const response = await fetch(SOURCE);
    if (!response.ok) throw new Error(`Failed to fetch M3U8: ${response.status}`);

    let text = await response.text();

    // Extract the first /hls/<token>/ path from the playlist
    const match = text.match(/\/hls\/[A-Za-z0-9]+/);
    if (match) latestHlsPath = match[0];

    const host = `${req.protocol}://${req.get("host")}`;

    // Replace segment URLs with Render domain
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

// Serve TS segments with correct /hls/<token>/ prefix
app.get("/*.ts", async (req, res) => {
  try {
    const filename = req.path.split("/").pop();
    if (!latestHlsPath) throw new Error("No HLS token path found yet");

    const segmentUrl = `http://centra.ink/live/Centra_Live_iVIOT/zTsGiHyZ884M${latestHlsPath}/${filename}`;
    const response = await fetch(segmentUrl);
    if (!response.ok) throw new Error(`Segment not found: ${segmentUrl}`);

    res.setHeader("Content-Type", "video/mp2t");
    response.body.pipe(res);
  } catch (err) {
    console.error("Error fetching TS segment:", err.message);
    res.status(500).send("Error loading segment");
  }
});

// Built-in HTML player
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>HLS Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    video { width: 80%; max-width: 960px; border-radius: 10px; background: #111; }
  </style>
</head>
<body>
  <video id="video" controls autoplay></video>
  <script>
    const video = document.getElementById('video');
    const streamURL = '/stream.m3u8';
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamURL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamURL;
      video.addEventListener('loadedmetadata', () => video.play());
    } else {
      document.body.innerHTML = '<h2 style="color:white;text-align:center;">Your browser does not support HLS.</h2>';
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
