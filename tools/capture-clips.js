#!/usr/bin/env node
// ============================================================
//  Egg Smash Adventures — gameplay clips for X and YouTube Shorts
//  Records short vertical clips of the real game (this checkout, served
//  locally) with a rich mid-game save, then trims and encodes them to
//  H.264 MP4 at 1080x1920.
//
//  Run:  node tools/capture-clips.js            # all clips
//        node tools/capture-clips.js smash      # one clip by name
//  Out:  clips/<name>.mp4  (served at https://www.eggbreakeradventure.com/clips/<name>.mp4,
//        which is where the X posting task and the YouTube uploader fetch them)
//  Needs: ffmpeg with libx264 on PATH; Chromium via playwright
//        (CHROMIUM_PATH overrides the browser binary, e.g. /opt/pw-browsers/chromium).
//
//  Analytics, error reporting, cloud save and ad pixels are blocked so a
//  recording never counts as a visit.
// ============================================================
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'clips');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'eba-clips-'));
const PORT = 8790;
const VIEW = { width: 360, height: 640 };      // 9:16
const SCALE = 3;                               // -> 1080x1920
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    if (!path.extname(p)) p += '.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', TYPES[path.extname(f)] || 'text/html');
    fs.createReadStream(f).pipe(res);
  }).listen(PORT);
}

async function richState(page, opts = {}) {
  await page.evaluate((o) => {
    try { _noSyncWarned = true; } catch (e) {}
    G.gold = 48250; G.hammers = 150; G.maxH = 150; G.starPieces = 12; G.crystalBananas = 9; G.feathers = 3;
    G.discoveredEggs = ['normal', 'runny', 'silver', 'gold', 'crystal', 'ruby', 'century'];
    G.totalEggs = 4820; G.totalItems = 63; G.totalGold = 214000; G.biggestWin = 12500; G.highestMult = 50;
    G.stagesCompleted = 9; G.collectionsCompleted = 3; G.consecutiveDays = 9; G.longestStreak = 9;
    G.beginnerBoostSeen = true; G.firstSmashAt = Date.now() - 86400000 * 30; G.firstPlayDate = Date.now() - 86400000 * 30;
    const m = G.monkeys[0];
    m.unlocked = true;
    m.stage = o.eggUnlocked ? Math.max(CONFIG.theEgg.unlockStage, 8) : Math.min(4, m.collections.length - 1);
    m.activeStage = Math.min(3, m.collections.length - 1);
    m.tiers = m.tiers.map((_, i) => (i < 3 ? 3 : i === 3 ? 2 : i === 4 ? 1 : 0));
    m.collections = m.collections.map((items, si) => items.map((_, ii) => si < 3 ? true : si === 3 ? ii < items.length - 1 : si === 4 ? ii < 2 : false));
    if (G.monkeys[1]) G.monkeys[1].unlocked = true;
    if (G.monkeys[2]) G.monkeys[2].unlocked = true;
    G.ownedHats = ['none', 'crown', 'tophat']; G.hat = 'crown';
    G.owned_spyglass = true; G.owned_luckycharm = true;
    G.multQueue = [2, 3, 5, 10];
    G._savedAt = Date.now(); G._cloudSavedAt = Date.now(); G._welcomeDone = true; G._firstRareSeen = true;
    updateResources(); renderAll();
  }, opts);
}

async function hideNoise(page) {
  await page.evaluate(() => {
    if (!document.getElementById('clip-css')) {
      const st = document.createElement('style'); st.id = 'clip-css';
      // Milestone popups, the welcome card, banners: not what a clip should show.
      st.textContent = '.overlay,#web-banner,.web-card,.referral-banner,.news-card,#news-card{display:none!important}';
      document.head.appendChild(st);
    }
    for (const id of ['overlay-welcome', 'overlay-confirm']) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
    const sp = document.getElementById('splash-screen'); if (sp) sp.style.display = 'none';
    document.querySelectorAll('#web-banner, .web-card, .referral-banner, #news-card, .news-card').forEach(el => el.style.display = 'none');
  });
}

async function tab(page, name) {
  await page.evaluate(n => { const el = document.querySelector(`[data-tab="${n}"]`); if (el) el.click(); }, name);
  await page.waitForTimeout(700);
}

async function tapEggs(page, ms, gap = 280) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const box = await page.evaluate(() => {
      const eggs = [...document.querySelectorAll('#egg-tray .egg-slot:not(.broken)')];
      const e = eggs[Math.floor(Math.random() * eggs.length)];
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (box) await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(gap);
  }
}

// Each scenario returns after the action; `mark()` sets the trim start.
const SCENES = {
  // Fast smashing with a multiplier stacked: prizes, gold popping, eggs cracking.
  smash: { secs: 11, eggUnlocked: false, run: async (page, mark) => {
    await tab(page, 'play');
    await page.evaluate(() => { try { newRound(); } catch (e) {} });
    await page.waitForTimeout(900);
    mark();
    await tapEggs(page, 11500, 260);
  } },
  // A second smashing clip with multipliers in play (x2 / x3 pops, CAUGHT! bonuses).
  combo: { secs: 9, eggUnlocked: false, run: async (page, mark) => {
    await tab(page, 'play');
    await page.evaluate(() => { try { newRound(); } catch (e) {} });
    await page.waitForTimeout(800);
    mark();
    await tapEggs(page, 1500, 300);
    await page.evaluate(() => { try { G.crystalBananas = 99; activateMonkeyRage(); } catch (e) { console.log('rage failed', e.message); } });
    await tapEggs(page, 8000, 200);
  } },
  // The Egg: the flying-monkey swarm on the golden egg.
  theegg: { secs: 10, eggUnlocked: true, run: async (page, mark) => {
    await tab(page, 'play');
    await page.evaluate(() => { try { const st = theEggState(); st.swarm = Math.max(st.swarm || 0, 10); openTheEgg(); } catch (e) { console.log('egg failed', e.message); } });
    await page.waitForTimeout(1500);
    mark();
    // tap the egg a few times in the middle of the scene
    for (let i = 0; i < 24; i++) {
      await page.mouse.click(VIEW.width / 2 + (Math.random() * 30 - 15), VIEW.height * 0.42 + (Math.random() * 30 - 15));
      await page.waitForTimeout(420);
    }
  } },
};

// Chrome's screencast at device pixels (1080x1920). Playwright's recordVideo
// records at CSS size and pads to the requested size, which left the game in a
// third of the frame.
async function startCast(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async f => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEW.width * SCALE, maxHeight: VIEW.height * SCALE, everyNthFrame: 1 });
  return { frames, stop: () => cdp.send('Page.stopScreencast').catch(() => {}) };
}

function encode(frames, startT, secs, out) {
  const dir = fs.mkdtempSync(path.join(TMP, 'f-'));
  const used = frames.filter(f => f.t >= startT && f.t <= startT + secs + 0.5);
  if (used.length < 10) throw new Error('only ' + used.length + ' frames captured');
  const list = [];
  used.forEach((f, i) => {
    const file = path.join(dir, String(i).padStart(5, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    const next = used[i + 1] ? used[i + 1].t : f.t + 1 / 30;
    list.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  list.push(`file '${path.join(dir, String(used.length - 1).padStart(5, '0') + '.jpg')}'`);
  const listFile = path.join(dir, 'list.txt');
  fs.writeFileSync(listFile, list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-t', String(secs),
    '-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25',
    '-movflags', '+faststart', '-an', out]);
}

async function record(browser, name) {
  const scene = SCENES[name];
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route(/umami|sentry|glitchtip|supabase|facebook|googletagmanager/, r => r.abort());
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(6200);           // splash + welcome timers
  await hideNoise(page);
  await richState(page, { eggUnlocked: scene.eggUnlocked });
  await page.waitForTimeout(500);
  await hideNoise(page);
  const cast = await startCast(page);
  await page.waitForTimeout(300);
  let start = 0;
  await scene.run(page, () => { start = Date.now() / 1000; });
  await page.waitForTimeout(400);
  await cast.stop();
  await ctx.close();
  // CDP timestamps are wall-clock seconds; align the mark to them.
  const out = path.join(OUT, `${name}.mp4`);
  encode(cast.frames, start, scene.secs, out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  ${name}.mp4  ${scene.secs}s  ${cast.frames.length} frames  ${kb}KB`);
}

(async () => {
  const want = process.argv.slice(2).filter(a => SCENES[a]);
  const names = want.length ? want : Object.keys(SCENES);
  const srv = serve();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
  console.log('recording clips -> clips/');
  for (const n of names) {
    try { await record(browser, n); } catch (e) { console.log(`  ${n} FAILED: ${e.message}`); }
  }
  await browser.close();
  srv.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})();
