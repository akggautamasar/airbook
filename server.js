// server.js – production server for AirBook
// Serves the Vite build and proxies Telegram file downloads to avoid CORS.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;

// ── Telegram file proxy ───────────────────────────────────────
// The browser cannot fetch https://api.telegram.org/file/bot… directly
// because Telegram doesn't send CORS headers. This endpoint fetches the
// file server-side and streams it back, keeping the bot token off the client.
app.get('/api/telegram-file', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'Missing ?path= query parameter' });
  }

  const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'VITE_TELEGRAM_BOT_TOKEN is not configured on the server' });
  }

  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Telegram returned ${upstream.status}` });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=300');
    // Stream the response body directly to the client
    const reader = upstream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      return pump();
    };
    await pump();
  } catch (err) {
    console.error('[proxy] Error fetching from Telegram:', err);
    res.status(502).json({ error: 'Failed to fetch file from Telegram' });
  }
});

// ── Static files (Vite build) ────────────────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// SPA fallback – serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AirBook server running on port ${PORT}`);
});
