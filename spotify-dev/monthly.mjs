// Captures this month's top artists + top tracks into ../top-archive.json
// (newest month first). Re-running in the same month UPDATES that month's
// entry; a new month UNSHIFTS a fresh one — so the archive grows over time
// and you can page back through it with Older/Newer.
//
//   node monthly.mjs            (run once a month — or let the GitHub Action do it)
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTopTracks, getTopArtists } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'top-archive.json'); // served at /top-archive.json
const MAX = 60; // keep up to 5 years of months

const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

const [tracks, artists] = await Promise.all([
  getTopTracks('short_term', 5),
  getTopArtists('short_term', 8),
]);

if (!tracks && !artists) { console.error('Could not fetch top data.'); process.exit(1); }

let archive = [];
if (fs.existsSync(OUT)) { try { archive = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {} }

const entry = { month: monthLabel, artists: artists || [], tracks: tracks || [] };
if (archive[0] && archive[0].month === monthLabel) archive[0] = entry; // update current month
else archive.unshift(entry);                                            // new month
archive = archive.slice(0, MAX);

fs.writeFileSync(OUT, JSON.stringify(archive, null, 2));
console.log('Saved top-archive for', monthLabel, '—', (artists || []).length, 'artists,', (tracks || []).length, 'tracks');
