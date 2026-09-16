// ============================================================
//  Egg Smash Adventures — Play Store screenshot generator
//
//  Frames raw phone captures in the brand style used by
//  make-covers.js (same palette, grid, glow, gold device frame,
//  Press Start 2P wordmark) and puts ONE big caption on each,
//  so the Play carousel tells a story instead of showing menus.
//
//  Run: node tools/make-store-shots.js
//  In:  marketing/store-shots/src/*.jpg   (raw 1080x2340 captures)
//  Out: marketing/store-shots/NN-<name>.png  (1080x1920, 9:16)
//
//  The "away report" frame has no raw capture — the modal only
//  appears after a real absence — so it is captured here from the
//  live game with an injected save and a synthetic report.
//  Set SKIP_AWAY=1 to reuse the last capture.
// ============================================================

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const ROOT = path.join(__dirname, '..');
const DIR  = path.join(ROOT, 'marketing', 'store-shots');
const SRC  = path.join(DIR, 'src');
const SITE = process.env.SHOT_SITE || 'https://egg-breaker-adventures.vercel.app/';

fs.mkdirSync(SRC, { recursive: true });

function dataUri(file) {
  const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,` + fs.readFileSync(file).toString('base64');
}

// Order = carousel order. Play shows ~2.5 on a phone, so the first
// three carry the pitch: the loop, the collection, the characters.
const SHOTS = [
  { name: 'smash',   src: 'smash.jpg',   h1: 'SMASH EGGS',           sub: 'Crack them open for <b>gold and rare prizes</b>' },
  { name: 'album',   src: 'album.jpg',   h1: 'FILL THE ALBUM',       sub: '<b>353 items</b> across six worlds. Finish a stage, unlock the next' },
  { name: 'monkeys', src: 'monkeys.jpg', h1: 'SIX MONKEYS',          sub: 'Every companion has a bonus that <b>changes how you play</b>' },
  { name: 'away',    src: 'away.png',    h1: 'PLAYS WHILE YOU SLEEP', sub: 'The Auto-Smasher keeps cracking. Come back to a <b>full report</b>' },
  { name: 'noads',   src: 'noads.jpg',   h1: 'NO ADS.',              sub: 'Hammers regenerate on their own. <b>Nothing is locked</b> behind a paywall' },
];

const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
`;

// 1080x1920. Caption block on top, device below bleeding off the bottom
// edge behind a fade (same trick as the portrait cover) so the phone
// stays large and the crop reads as designed.
function frameHtml(shot, img) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1920px; overflow:hidden; position:relative;
    font-family:'DM Sans', sans-serif; background:#14142a; }
  .bg { position:absolute; inset:0;
    background:
      radial-gradient(120% 70% at 50% 28%, rgba(21,68,120,.95) 0%, rgba(15,52,96,.72) 38%, rgba(0,0,0,0) 72%),
      linear-gradient(135deg, #16213e 0%, #1a1a2e 55%, #0b0b17 100%); }
  .grid { position:absolute; inset:0; background-size:48px 48px;
    background-image:
      linear-gradient(rgba(245,197,66,.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,197,66,.05) 1px, transparent 1px);
    mask-image:linear-gradient(#000 0%,#000 30%,transparent 62%);
    -webkit-mask-image:linear-gradient(#000 0%,#000 30%,transparent 62%); }
  .glow { position:absolute; width:1100px; height:1100px; left:-10px; top:440px; border-radius:50%;
    background:radial-gradient(circle, rgba(245,197,66,.20) 0%, rgba(245,197,66,0) 68%); }
  .egg { position:absolute; border-radius:50% 50% 48% 48% / 62% 62% 38% 38%;
    background:linear-gradient(160deg,#fffdf5 0%,#f3ead1 52%,#d9cba6 100%);
    box-shadow:inset -6px -9px 16px rgba(0,0,0,.16), 0 12px 26px rgba(0,0,0,.42); }
  .egg.a { width:70px; height:90px; left:64px;  top:28px;  transform:rotate(-14deg); opacity:.9; }
  .egg.b { width:50px; height:64px; right:70px; top:56px; transform:rotate(16deg);  opacity:.8; }

  .cap { position:absolute; left:0; right:0; top:0; height:484px; padding:0 64px;
    display:flex; flex-direction:column; justify-content:flex-end; align-items:center; text-align:center; }
  h1 { font-family:'Press Start 2P', monospace; color:#f5c542; font-size:64px; line-height:1.3;
    text-shadow:0 6px 0 #a67c00, 0 8px 0 rgba(0,0,0,.5), 0 18px 40px rgba(0,0,0,.6); }
  .sub { margin-top:36px; font-size:42px; line-height:1.4; color:#c9d6e8; max-width:900px; }
  .sub b { color:#fff; }

  .phone { position:absolute; left:50%; width:780px; margin-left:-390px; top:540px; height:1690px;
    border-radius:44px; overflow:hidden; border:7px solid #f5c542; background:#0a0a18;
    box-shadow:0 34px 80px rgba(0,0,0,.66), 0 0 0 1px rgba(0,0,0,.5); }
  .phone img { display:block; width:100%; height:100%; object-fit:cover; object-position:top center; }
  .fade { position:absolute; left:0; right:0; bottom:0; height:220px; z-index:5;
    background:linear-gradient(to bottom, rgba(20,20,42,0) 0%, rgba(17,17,36,.88) 62%, #12122b 100%); }
</style></head><body>
  <div class="bg"></div><div class="grid"></div><div class="glow"></div>
  <div class="egg a"></div><div class="egg b"></div>
  <div class="cap">
    <h1>${shot.h1}</h1>
    <p class="sub">${shot.sub}</p>
  </div>
  <div class="phone"><img src="${img}"></div>
  <div class="fade"></div>
</body></html>`;
}

// ── Away-report capture from the live game ────────────────────
async function captureAway(browser, out) {
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => { try { _noSyncWarned = true; } catch (e) {} });
  // Welcome modal is on a fixed ~4.8s timer — wait it out, then hide chrome.
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    for (const id of ['overlay-welcome', 'overlay-confirm']) {
      const el = document.getElementById(id); if (el) el.classList.add('hidden');
    }
    const sp = document.getElementById('splash-screen'); if (sp) sp.style.display = 'none';
    document.querySelectorAll('.ng-loginbar, #web-banner, .referral-banner').forEach(el => el.remove());
    G._welcomeDone = true; G._firstRareSeen = true;
    // A lived-in but early save: matches the other captures (stage 1-4 range).
    G.gold = 4210; G.hammers = 61; G.maxH = 84; G.starPieces = 2;
    G.discoveredEggs = ['normal', 'silver', 'gold'];
    const m = G.monkeys[0]; m.unlocked = true; m.stage = 1; m.activeStage = 1;
    m.collections = m.collections.map((items, si) => items.map((_, ii) => si === 0 || (si === 1 && ii < 2)));
    m.tiers = m.tiers.map((_, i) => (i === 0 ? 3 : 0));
    if (G.autoTap) G.autoTap.unlocked = true;
    updateResources(); renderAll();
    const play = document.querySelector('[data-tab="play"]'); if (play) play.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    showOfflineReport({
      taps: 412, eggs: 388, gold: 6140, stars: 1, feathers: 2, hammers: 9, mults: 1,
      items: [{ emoji: '🦜' }, { emoji: '🐒' }, { emoji: '🥥' }],
      elapsed: 7 * 3600 + 25 * 60, simulated: 7 * 3600 + 25 * 60, capped: false,
    });
  });
  // Rows count up staggered (220 + 8*260 + 700 ms) — let them land.
  await page.waitForTimeout(4200);
  await page.screenshot({ path: out });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();

  const awayPath = path.join(SRC, 'away.png');
  if (!process.env.SKIP_AWAY || !fs.existsSync(awayPath)) {
    process.stdout.write('capturing away report from live game… ');
    await captureAway(browser, awayPath);
    console.log('ok');
  }

  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  let n = 0;
  for (const shot of SHOTS) {
    const src = path.join(SRC, shot.src);
    if (!fs.existsSync(src)) { console.log(`skip ${shot.name}: missing ${shot.src}`); continue; }
    n++;
    const out = path.join(DIR, `${String(n).padStart(2, '0')}-${shot.name}.png`);
    await page.setContent(frameHtml(shot, dataUri(src)), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    // Nothing in the caption block may overflow — that is the whole point.
    const clip = await page.evaluate(() => {
      const h = document.querySelector('h1'), s = document.querySelector('.sub');
      return { h1: h.scrollWidth > h.clientWidth + 1, sub: s.scrollHeight > s.clientHeight + 1, capBottom: document.querySelector('.cap').getBoundingClientRect().bottom };
    });
    if (clip.h1 || clip.sub) console.warn(`  ! ${shot.name}: caption overflows`, clip);
    await page.screenshot({ path: out });
    console.log('wrote', path.relative(ROOT, out));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
