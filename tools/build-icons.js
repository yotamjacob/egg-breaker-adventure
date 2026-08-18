#!/usr/bin/env node
// ============================================================
//  tools/build-icons.js — pixel-icon sprite sheets from Twemoji
//
//  1. Scans the game sources for every emoji literal.
//  2. Fetches the matching Twemoji SVG (CC-BY 4.0) into tools/.twemoji-cache/
//     (git-ignored; re-runs are offline once cached).
//  3. Pixelates each one at 12 / 16 / 24 / 32 px: lanczos downscale → snap to the
//     game palette → 1px dark outline. Flat, outlined vector sources are what
//     make this look drawn rather than "filtered".
//  4. Writes img/px12.png … img/px32.png (20 columns) and
//     pxicons-map.js (emoji → cell index) which the runtime (pxicons.js) uses.
//
//  Emojis with no Twemoji glyph are listed at the end and simply keep
//  rendering as emoji at runtime (the map has no entry for them).
//
//  Run: node tools/build-icons.js            (network on first run only)
//       node tools/build-icons.js --report   (just list emojis found / missing)
// ============================================================
const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, '.twemoji-cache');
const TWEMOJI = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';
const SIZES = [12, 16, 24, 32];
const COLS = 20;

// Files whose emoji literals end up on screen.
const SCAN = ['data.js', 'quotes.js', 'render.js', 'game.js', 'smash.js', 'shop.js', 'achievements.js',
  'idle.js', 'share.js', 'hammers.js', 'cloud.js', 'payments.js', 'index.html', 'itch/itch.js', 'ng/ng.js'];

// Game palette — snapping keeps 390 unrelated glyphs on one colour system.
const PALETTE = ['#1a120c','#3a2214','#6b3f1f','#9a5f2e','#c98a4b','#e8b877','#7a5300','#b8860b','#f5c542','#ffe98a','#fff8d6',
  '#2e3238','#575e68','#8b939e','#c4cbd3','#eef1f4','#5a1212','#9e1f1f','#d63a3a','#ff7b6b','#ffb3a7','#8a3d05','#d1631a','#ff9a3c','#ffc27a',
  '#1e4d22','#2f7d34','#5ec46a','#a8e6a1','#0d3b66','#1c6fb0','#4aa3ff','#a9d6ff','#3d1f73','#6b3fc4','#9b6cff','#d9c7ff','#d9c39a','#f0dcb0',
  '#fff6e0','#ffffff','#0a0a0e','#26262e','#44444f','#b03a6c','#ff6fa8','#ffb3d0','#7c5a3a','#e0c060','#2ab7a9','#0e7c86','#5b8c5a','#c2185b',
  '#ffb300','#8d6e63','#4e342e','#90a4ae','#37474f','#f48fb1','#ce93d8','#80cbc4','#a5d6a7','#fff59d','#ffab91','#bcaaa4','#b0bec5']
  .map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
function nearest(r, g, b) {
  let bi = 0, bd = 1e9;
  for (let i = 0; i < PALETTE.length; i++) { const p = PALETTE[i]; const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 * 1.1 + (p[2] - b) ** 2; if (d < bd) { bd = d; bi = i; } }
  return PALETTE[bi];
}

// Emoji extraction: pictographic + optional VS16 / ZWJ sequences / skin tones / keycaps.
const EMOJI_RE = /(?:\p{Extended_Pictographic}|[#*0-9]️⃣)(?:️|⃣|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic})*/gu;
// Things Extended_Pictographic matches that are not emoji we render as icons.
const SKIP = new Set(['©', '®', '™', '‼', '⁉', 'ℹ', '↔', '↕', '↖', '↗', '↘', '↙', '↩', '↪', '▪', '▫', '▶', '◀', '◻', '◼', '◽', '◾', '☑', '✔', '✖', '✳', '✴', '❇', '❌', '❎', '➕', '➖', '➗', '➡', '⤴', '⤵', '⬅', '⬆', '⬇', '〰', '〽', '㊗', '㊙']);

function scanEmojis() {
  const found = new Map();   // emoji → first file
  for (const f of SCAN) {
    const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(EMOJI_RE)) {
      const e = m[0];
      if (SKIP.has(e.replace(/️/g, ''))) continue;
      if (!found.has(e)) found.set(e, f);
    }
  }
  return found;
}
const codepoints = e => [...e].map(ch => ch.codePointAt(0).toString(16)).join('-');
const cpNoVS = e => [...e.replace(/️/g, '')].map(ch => ch.codePointAt(0).toString(16)).join('-');

function get(url) {
  return new Promise((res, rej) => https.get(url, r => {
    if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
    const c = []; r.on('data', d => c.push(d)); r.on('end', () => res(Buffer.concat(c)));
  }).on('error', rej));
}
async function fetchSvg(e) {
  fs.mkdirSync(CACHE, { recursive: true });
  const names = [...new Set([cpNoVS(e), codepoints(e)])];
  for (const n of names) {
    const cached = path.join(CACHE, n + '.svg');
    if (fs.existsSync(cached)) return fs.readFileSync(cached);
  }
  for (const n of names) {
    try { const buf = await get(TWEMOJI + n + '.svg'); fs.writeFileSync(path.join(CACHE, n + '.svg'), buf); return buf; }
    catch (err) { /* try next name */ }
  }
  const miss = path.join(CACHE, names[0] + '.missing');
  fs.writeFileSync(miss, '');
  return null;
}
function isKnownMissing(e) {
  return fs.existsSync(path.join(CACHE, cpNoVS(e) + '.missing')) && !fs.existsSync(path.join(CACHE, cpNoVS(e) + '.svg')) && !fs.existsSync(path.join(CACHE, codepoints(e) + '.svg'));
}

/** SVG → N×N raw RGBA: lanczos to (N-2), palette snap, 1px outline. */
async function pixelize(svg, N) {
  const inner = N - 2;
  const { data } = await sharp(svg).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(N * N * 4, 0); const solid = [];
  for (let y = 0; y < inner; y++) for (let x = 0; x < inner; x++) {
    const i = (y * inner + x) * 4; if (data[i + 3] < 120) continue;
    const c = nearest(data[i], data[i + 1], data[i + 2]);
    const o = ((y + 1) * N + (x + 1)) * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; solid.push([x + 1, y + 1]);
  }
  for (const [x, y] of solid) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const o = ((y + dy) * N + (x + dx)) * 4; if (out[o + 3] === 0) { out[o] = 0x1a; out[o + 1] = 0x12; out[o + 2] = 0x0c; out[o + 3] = 255; }
  }
  return out;
}

(async () => {
  const report = process.argv.includes('--report');
  const found = scanEmojis();
  console.log('emojis found in sources:', found.size);
  if (report) { console.log([...found.keys()].join(' ')); return; }

  const entries = []; const missing = [];
  for (const [e, file] of found) {
    if (isKnownMissing(e)) { missing.push(e); continue; }
    const svg = await fetchSvg(e);
    if (!svg) { missing.push(e); continue; }
    entries.push({ e, svg, file });
  }
  entries.sort((a, b) => a.e.localeCompare(b.e));
  const rows = Math.ceil(entries.length / COLS);
  const map = {};
  entries.forEach((en, i) => { map[en.e] = i; });

  for (const N of SIZES) {
    const sheet = Buffer.alloc(COLS * N * rows * N * 4, 0);
    for (let i = 0; i < entries.length; i++) {
      const cell = await pixelize(entries[i].svg, N);
      const cx = (i % COLS) * N, cy = Math.floor(i / COLS) * N;
      for (let y = 0; y < N; y++) cell.copy(sheet, ((cy + y) * COLS * N + cx) * 4, y * N * 4, (y + 1) * N * 4);
    }
    await sharp(sheet, { raw: { width: COLS * N, height: rows * N, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(ROOT, 'img', 'px' + N + '.png'));
  }
  const js = '// GENERATED by tools/build-icons.js — do not edit. Emoji → sprite cell index (see pxicons.js).\n' +
    '// Twemoji graphics © Twitter, Inc and contributors, CC-BY 4.0 — https://github.com/twitter/twemoji\n' +
    'const PX_ICON_COLS = ' + COLS + ';\n' +
    'const PX_ICON_MAP = ' + JSON.stringify(map) + ';\n';
  fs.writeFileSync(path.join(ROOT, 'pxicons-map.js'), js);
  console.log('sprite cells:', entries.length, '→ img/px12/16/24/32.png (' + COLS + '×' + rows + ')');
  if (missing.length) console.log('no Twemoji glyph (kept as emoji):', missing.join(' '));
})().catch(e => { console.error(e); process.exit(1); });
