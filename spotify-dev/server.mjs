// Local dev server: serves the static site AND /api/now-playing on one origin,
// so index.html can fetch real Spotify data with no CORS fuss.
//
//   node server.mjs   →   http://localhost:3000   (open the Music tab)
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getNowPlaying, getTopTracks, getRecentlyPlayed } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // project root (where index.html lives)

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon',
};

http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/now-playing')) {
      let data = null;
      try { data = await getNowPlaying(); } catch (e) { console.error(e.message); }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data || {}));
      return;
    }
    if (req.url.startsWith('/api/top-tracks')) {
      let data = null;
      try { data = await getTopTracks('short_term', 5); } catch (e) { console.error(e.message); }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data || []));
      return;
    }
    if (req.url.startsWith('/api/recently-played')) {
      let data = null;
      try { data = await getRecentlyPlayed(20); } catch (e) { console.error(e.message); }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data || []));
      return;
    }
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (fp.startsWith(ROOT) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
      return;
    }
    res.writeHead(404); res.end('Not found');
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
}).listen(3000, () => console.log('▶ http://localhost:3000   (Entertainment → ♪  shows your real now-playing)'));
