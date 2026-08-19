#!/usr/bin/env node
// ============================================================
//  Regenerate the DEPLOYED img/ and audio/ from the hi-res masters in
//  art-masters/ (v3.10.9). Same pipeline as the itch build: images are
//  downscaled to ≤512px (palette PNG / mozjpeg 82), music re-encoded to
//  96 kbps mono. The masters (2048² PNGs up to 5 MB, stereo MP3s) are never
//  served — a cold mobile visitor used to pull ~43 MB of them.
//
//  Run after adding or replacing any master:   node tools/optimize-assets.js
//  (idempotent; requires `sharp` from package.json and ffmpeg on PATH)
// ============================================================
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const MASTERS = path.join(ROOT, 'art-masters');
const MAX_PX = 512;

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? listFiles(path.join(dir, d.name)).map(f => path.join(d.name, f)) : [d.name]);
}

async function images() {
  const srcDir = path.join(MASTERS, 'img'), outDir = path.join(ROOT, 'img');
  let before = 0, after = 0;
  for (const rel of listFiles(srcDir)) {
    const src = path.join(srcDir, rel), dst = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    before += fs.statSync(src).size;
    const ext = path.extname(rel).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      let pipe = sharp(src).resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true });
      pipe = ext === '.png' ? pipe.png({ compressionLevel: 9, palette: true })
                            : pipe.jpeg({ quality: 82, mozjpeg: true });
      await pipe.toFile(dst);
    } else {
      fs.copyFileSync(src, dst);
    }
    after += fs.statSync(dst).size;
  }
  return { before, after };
}

function audio() {
  const srcDir = path.join(MASTERS, 'audio'), outDir = path.join(ROOT, 'audio');
  let before = 0, after = 0;
  let ffmpeg = true;
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); } catch (e) { ffmpeg = false; console.warn('ffmpeg not found — audio copied at full size'); }
  for (const rel of listFiles(srcDir)) {
    const src = path.join(srcDir, rel), dst = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    before += fs.statSync(src).size;
    if (ffmpeg && path.extname(rel).toLowerCase() === '.mp3') {
      try { execSync(`ffmpeg -y -i "${src}" -ac 1 -b:a 96k "${dst}"`, { stdio: 'ignore' }); }
      catch (e) { fs.copyFileSync(src, dst); }
    } else fs.copyFileSync(src, dst);
    after += fs.statSync(dst).size;
  }
  return { before, after };
}

(async () => {
  const mb = n => (n / 1048576).toFixed(1) + 'MB';
  const i = await images(); console.log(`img/   ${mb(i.before)} → ${mb(i.after)}`);
  const a = audio();        console.log(`audio/ ${mb(a.before)} → ${mb(a.after)}`);
})().catch(e => { console.error(e); process.exit(1); });
