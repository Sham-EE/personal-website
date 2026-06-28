// Pulls your real recently-played tracks and merges them into ../snapshots.json
// (newest first, de-duplicated by play time). Each run adds whatever's new since
// last time, so the archive grows into a real listening history.
//
//   node snapshot.mjs            (run periodically; or let the GitHub Action do it)
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRecentlyPlayed } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'snapshots.json'); // served at /snapshots.json
const MAX = 300; // keep the archive bounded

const recent = await getRecentlyPlayed(50);
if (!recent || !recent.length) { console.log('No recently-played data.'); process.exit(0); }

let existing = [];
if (fs.existsSync(OUT)) { try { existing = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {} }

const seen = new Set(existing.map(e => e.ts));
const fresh = recent.filter(r => r.ts && !seen.has(r.ts));

let merged = [...fresh, ...existing].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, MAX);
fs.writeFileSync(OUT, JSON.stringify(merged, null, 2));
console.log('snapshots.json: +' + fresh.length + ' new, ' + merged.length + ' total.');
