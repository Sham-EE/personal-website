// Shared Spotify helpers (Node 18+ — uses built-in fetch). No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].trim();
    }
  }
  const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env;
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('Missing CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN in spotify-dev/.env');
  }
  return { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN };
}

export async function getAccessToken() {
  const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = loadEnv();
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: REFRESH_TOKEN }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(j));
  return j.access_token;
}

// Your top tracks. range: short_term (~4 wk) | medium_term (~6 mo) | long_term (years).
// Note: Spotify does NOT expose personal play counts — only a ranked list.
export async function getTopTracks(range = 'short_term', limit = 5) {
  const token = await getAccessToken();
  const r = await fetch(
    'https://api.spotify.com/v1/me/top/tracks?time_range=' + range + '&limit=' + limit,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (r.status >= 400) return null;
  const j = await r.json();
  if (!j || !j.items) return null;
  return j.items.map(t => ({
    title: t.name,
    artist: (t.artists || []).map(a => a.name).join(', '),
  }));
}

// Your top artists (with images + genres) for the same time ranges.
export async function getTopArtists(range = 'short_term', limit = 8) {
  const token = await getAccessToken();
  const r = await fetch(
    'https://api.spotify.com/v1/me/top/artists?time_range=' + range + '&limit=' + limit,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (r.status >= 400) return null;
  const j = await r.json();
  if (!j || !j.items) return null;
  return j.items.map(a => ({
    name: a.name,
    img: a.images?.[1]?.url || a.images?.[0]?.url || '', // ~320px thumbnail
    genres: (a.genres || []).slice(0, 2),
  }));
}

// Your real recently-played history (newest first), with timestamps.
function fmtWhen(d) {
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return day + ' · ' + time;
}
export async function getRecentlyPlayed(limit = 20) {
  const token = await getAccessToken();
  const r = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=' + limit, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (r.status >= 400) return null;
  const j = await r.json();
  if (!j || !j.items) return null;
  return j.items.map(it => ({
    ts: it.played_at,
    when: fmtWhen(new Date(it.played_at)),
    title: it.track?.name || '',
    artist: (it.track?.artists || []).map(a => a.name).join(', '),
    album: it.track?.album?.name || '',
  }));
}

// Normalizes Spotify's currently-playing into the shape index.html expects.
export async function getNowPlaying() {
  const token = await getAccessToken();
  const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (r.status === 204 || r.status >= 400) return null; // nothing playing
  const j = await r.json();
  if (!j || !j.item) return null;
  return {
    title: j.item.name,
    artist: (j.item.artists || []).map(a => a.name).join(', '),
    album: j.item.album?.name || '',
    art: j.item.album?.images?.[0]?.url || '',
    url: j.item.external_urls?.spotify || '#',
    is_playing: !!j.is_playing,
    progress_ms: j.progress_ms || 0,
    duration_ms: j.item.duration_ms || 0,
  };
}
