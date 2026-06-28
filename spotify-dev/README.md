# Spotify — local live data

The site works fully without this (it falls back to mock data). Use this only
when you want the Music page to show your **real** now-playing locally.

## One-time setup (~5 min)

1. **Create a Spotify app** → https://developer.spotify.com/dashboard → *Create app*.
   - Add Redirect URI: `http://127.0.0.1:8888/callback`
   - Copy the **Client ID** and **Client Secret**.
2. **Configure env**
   ```bash
   cd spotify-dev
   cp .env.example .env
   # paste CLIENT_ID and CLIENT_SECRET into .env
   ```
3. **Get your refresh token** (one time)
   ```bash
   node get-refresh-token.mjs
   ```
   Open the printed URL → Agree → it prints a `REFRESH_TOKEN=...` line.
   Paste that into `.env`.

## See it live locally

```bash
cd spotify-dev
node server.mjs
```
Open **http://localhost:3000** → Entertainment → **♪**. Play something in Spotify
and the Now-Playing panel (waveform, vinyl, progress) tracks it, refreshing every 30s.
When nothing is playing it quietly falls back to the mock track.

> Requires Node 18+ (uses built-in `fetch`). No `npm install` needed.

## Building the "Listening Snapshots" archive

Each run of `snapshot.mjs` appends the current track to `../snapshots.json`
(which the page reads for the Older/Newer archive):

```bash
node snapshot.mjs                 # take one snapshot now
# or keep taking one every 30 min:
while true; do node snapshot.mjs; sleep 1800; done
```

### Hosting paths
- **GitHub Pages (static):** run the snapshot step on a schedule with the included
  GitHub Action (`.github/workflows/spotify-snapshot.yml`) — it commits `snapshots.json`
  to the repo every 30 min. Now-playing stays mock unless you also add a serverless
  function. Put `CLIENT_ID` / `CLIENT_SECRET` / `REFRESH_TOKEN` in repo **Settings →
  Secrets → Actions**.
- **Vercel / Netlify:** move `server.mjs`'s `/api/now-playing` logic into a serverless
  function and you get true real-time now-playing too.

`.env` is gitignored — your secrets never get committed.
