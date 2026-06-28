// One-time helper to obtain your Spotify REFRESH_TOKEN.
// Prereq: CLIENT_ID + CLIENT_SECRET set in spotify-dev/.env, and
// the redirect URI  http://127.0.0.1:8888/callback  added to your app
// in the Spotify Developer Dashboard.
//
//   node get-refresh-token.mjs
//
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
const { CLIENT_ID, CLIENT_SECRET } = process.env;
const REDIRECT = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-currently-playing user-read-playback-state user-read-recently-played user-top-read';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set CLIENT_ID and CLIENT_SECRET in spotify-dev/.env first.');
  process.exit(1);
}

const state = crypto.randomBytes(8).toString('hex');
const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
  response_type: 'code', client_id: CLIENT_ID, scope: SCOPES, redirect_uri: REDIRECT, state,
});

console.log('\n1) Open this URL in your browser, log in, and click Agree:\n\n' + authUrl + '\n');

http.createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) { res.end('ok'); return; }
  const u = new URL(req.url, 'http://127.0.0.1:8888');
  const code = u.searchParams.get('code');
  if (!code) { res.end('No code in callback.'); return; }
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
  });
  const j = await r.json();
  if (j.refresh_token) {
    res.end('Done — refresh token captured. You can close this tab and return to the terminal.');
    console.log('\n2) Add this line to spotify-dev/.env:\n\nREFRESH_TOKEN=' + j.refresh_token + '\n');
  } else {
    res.end('Error: ' + JSON.stringify(j));
    console.log('Error:', j);
  }
  process.exit(0);
}).listen(8888, () => console.log('(waiting for the redirect on http://127.0.0.1:8888/callback ...)'));
