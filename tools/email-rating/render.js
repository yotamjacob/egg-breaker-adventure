#!/usr/bin/env node
// Renders the animated GIFs for the top-players email from hero.html / stars.html.
// Each page exposes render(t) + DUR; we screenshot every frame and let ffmpeg build
// an optimised palette GIF. Output: email/rate-hero.gif, email/rate-stars.gif
//
//   NODE_PATH=<dir with playwright> node tools/email-rating/render.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'email');
const FPS = 20;

const JOBS = [
  // firstAt: the frame Outlook (which shows only frame 1) should display
  { page: 'hero.html',  out: 'rate-hero.gif',  w: 600, h: 340, firstAt: 0 },
  { page: 'stars.html', out: 'rate-stars.gif', w: 320, h: 64,  firstAt: 2.4 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const job of JOBS) {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'egif-'));
    const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(__dirname, job.page));
    await page.evaluate(() => document.fonts.ready);
    const dur = await page.evaluate(() => window.DUR);
    const n = Math.round(dur * FPS);
    const start = Math.round(job.firstAt * FPS);
    for (let i = 0; i < n; i++) {
      const t = ((start + i) % n) / FPS;
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`), clip: { x: 0, y: 0, width: job.w, height: job.h } });
    }
    await page.close();
    const dst = path.join(OUT, job.out);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
      '-loop', '0', dst]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(job.out, n + ' frames', Math.round(fs.statSync(dst).size / 1024) + ' KB');
  }
  await browser.close();
})();
