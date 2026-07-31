// ============================================================
//  Egg Smash Adventures — Store cover art generator
//
//  Renders the two cover sizes Game Jolt asks for:
//    landscape 16:9  1920x1080
//    portrait  2:3    800x1200
//
//  Run: node tools/capture-shots.js && node tools/make-covers.js
//  Out: marketing/covers/*.png
//
//  Covers are browse thumbnails first and artwork second — they get
//  scaled down hard in listings, so the wordmark is oversized and
//  high-contrast and body copy is kept to a minimum. Unlike the OG
//  card these are NOT palette-quantised: at this size the background
//  gradients band visibly under a 256-colour palette.
// ============================================================

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const ROOT  = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'marketing', 'shots');
const OUT   = path.join(ROOT, 'marketing', 'covers');

fs.mkdirSync(OUT, { recursive: true });

function dataUri(file) {
  const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,` + fs.readFileSync(file).toString('base64');
}

const play   = dataUri(path.join(SHOTS, 'play.png'));
const album  = dataUri(path.join(SHOTS, 'album.png'));
const monkeys = [
  'mrmonkey_crown.jpeg',
  'steampunk_crown.png',
  'princess_crown.jpeg',
  'space_crown.jpeg',
  'odin_crown.jpeg',
  'wukong_crown.png',
].map(f => dataUri(path.join(ROOT, 'img', f)));

// Shared visual language: same palette, grid, glow and egg props as the
// OG card, so every surface reads as one brand.
const BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { overflow:hidden; font-family:'DM Sans', sans-serif; background:#14142a; position:relative; }
  .bg { position:absolute; inset:0;
    background:
      radial-gradient(120% 90% at 72% 40%, rgba(21,68,120,.95) 0%, rgba(15,52,96,.72) 38%, rgba(0,0,0,0) 72%),
      linear-gradient(135deg, #16213e 0%, #1a1a2e 55%, #0b0b17 100%); }
  .grid { position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(245,197,66,.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,197,66,.05) 1px, transparent 1px); }
  .glow { position:absolute; border-radius:50%;
    background:radial-gradient(circle, rgba(245,197,66,.22) 0%, rgba(245,197,66,0) 68%); }
  h1 { font-family:'Press Start 2P', monospace; color:#f5c542; letter-spacing:-1px; }
  .phone { position:absolute; border-radius:26px; overflow:hidden; border:5px solid #f5c542;
    box-shadow:0 34px 80px rgba(0,0,0,.66), 0 0 0 1px rgba(0,0,0,.5); background:#0a0a18; }
  .phone img { display:block; width:100%; height:100%; object-fit:cover; object-position:top center; }
  .egg { position:absolute; border-radius:50% 50% 48% 48% / 62% 62% 38% 38%;
    background:linear-gradient(160deg,#fffdf5 0%,#f3ead1 52%,#d9cba6 100%);
    box-shadow:inset -6px -9px 16px rgba(0,0,0,.16), 0 12px 26px rgba(0,0,0,.42); }
  .mk { border-radius:50%; overflow:hidden; border:4px solid #f5c542; background:#0a0a18;
    box-shadow:0 10px 26px rgba(0,0,0,.55); }
  .mk img { width:100%; height:100%; object-fit:cover; display:block; }
  .kicker { display:inline-flex; align-items:center; gap:12px; font-weight:700;
    text-transform:uppercase; letter-spacing:.14em; color:#0e1a10;
    background:linear-gradient(180deg,#4ee38a,#2ecc71); border-radius:999px;
    box-shadow:0 4px 0 #177a44, 0 10px 28px rgba(46,204,113,.34); }
  .kicker .dot { border-radius:50%; background:#0e1a10; }
  .chip { font-weight:700; color:#dbe6f5; background:rgba(15,52,96,.9);
    border:2px solid #2b4d7e; border-radius:12px; white-space:nowrap; }
  .chip b { color:#f5c542; }
`;

const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
`;

// ── Landscape 1920x1080 ───────────────────────────────────────
const landscape = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
${BASE_CSS}
  body { width:1920px; height:1080px; }
  .grid { background-size:52px 52px;
    mask-image:linear-gradient(105deg,#000 0%,#000 44%,transparent 74%);
    -webkit-mask-image:linear-gradient(105deg,#000 0%,#000 44%,transparent 74%); }
  .glow { width:840px; height:840px; right:170px; top:60px; }
  .left { position:absolute; left:104px; top:0; height:100%; width:1000px;
    display:flex; flex-direction:column; justify-content:center; }
  .kicker { font-size:22px; padding:14px 26px; }
  .kicker .dot { width:13px; height:13px; }
  h1 { font-size:96px; line-height:1.22; margin:38px 0 0;
    text-shadow:0 7px 0 #a67c00, 0 9px 0 rgba(0,0,0,.5), 0 20px 46px rgba(0,0,0,.6); }
  h1 .sm { display:block; font-size:60px; color:#ffe08a; margin-top:22px;
    text-shadow:0 5px 0 #a67c00, 0 7px 0 rgba(0,0,0,.45); }
  .sub { margin-top:38px; font-size:34px; line-height:1.45; color:#c9d6e8; max-width:820px; }
  .sub b { color:#fff; }
  .mkrow { display:flex; gap:18px; margin-top:44px; }
  .mkrow .mk { width:96px; height:96px; }
  .chips { display:flex; gap:14px; margin-top:40px; }
  .chip { font-size:24px; padding:14px 22px; }
  .phone.back  { width:404px; height:874px; right:96px;  top:70px;  transform:rotate(7.5deg); opacity:.97; }
  .phone.front { width:448px; height:970px; right:430px; top:44px;  transform:rotate(-5.5deg); }
  .egg.a { width:74px; height:94px; left:1140px; top:150px; transform:rotate(15deg); }
  .egg.b { width:50px; height:64px; left:1092px; top:830px; transform:rotate(-13deg); opacity:.85; }
</style></head><body>
  <div class="bg"></div><div class="grid"></div><div class="glow"></div>
  <div class="left">
    <div><span class="kicker"><span class="dot"></span> Play free — no install</span></div>
    <h1>EGG SMASH<span class="sm">ADVENTURES</span></h1>
    <p class="sub">The <b>Facebook egg-breaking classic</b>, rebuilt. Smash eggs, win prizes, finish the album.</p>
    <div class="mkrow">${monkeys.map(m => `<div class="mk"><img src="${m}"></div>`).join('')}</div>
    <div class="chips">
      <div class="chip"><b>353</b> collectibles</div>
      <div class="chip"><b>6</b> monkeys</div>
      <div class="chip">No ads</div>
    </div>
  </div>
  <div class="egg a"></div><div class="egg b"></div>
  <div class="phone back"><img src="${album}"></div>
  <div class="phone front"><img src="${play}"></div>
</body></html>`;

// ── Portrait 800x1200 ─────────────────────────────────────────
// Strict top-to-bottom stack so nothing overlaps anything else:
//   kicker → wordmark → monkey row → chips → device.
// The device is anchored last and deliberately runs off the bottom edge,
// faded out, so the crop reads as intentional rather than as clipping.
// Earlier revision floated the monkeys and chips ON TOP of the device,
// which buried the gameplay and looked accidental at thumbnail size.
const portrait = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
${BASE_CSS}
  body { width:800px; height:1200px; }
  .grid { background-size:40px 40px;
    mask-image:linear-gradient(#000 0%,#000 34%,transparent 66%);
    -webkit-mask-image:linear-gradient(#000 0%,#000 34%,transparent 66%); }
  .glow { width:820px; height:820px; left:-10px; top:420px; }

  .kicker { font-size:19px; padding:12px 24px; position:absolute; left:50%;
    transform:translateX(-50%); top:52px; }
  .kicker .dot { width:11px; height:11px; }

  h1 { position:absolute; left:0; right:0; top:120px; text-align:center;
    font-size:104px; line-height:1.14;
    text-shadow:0 7px 0 #a67c00, 0 9px 0 rgba(0,0,0,.5), 0 18px 40px rgba(0,0,0,.6); }
  h1 .sm { display:block; font-size:56px; color:#ffe08a; margin-top:20px;
    text-shadow:0 5px 0 #a67c00, 0 7px 0 rgba(0,0,0,.45); }

  .mkrow { position:absolute; left:0; right:0; top:508px;
    display:flex; gap:14px; justify-content:center; }
  .mkrow .mk { width:92px; height:92px; }

  .chips { position:absolute; left:0; right:0; top:634px;
    display:flex; gap:12px; justify-content:center; }
  .chip { font-size:22px; padding:13px 18px; }

  /* Device anchored below everything, bleeding off the bottom edge. */
  .phone.hero { width:388px; height:840px; left:50%; margin-left:-194px; top:740px;
    transform:rotate(-3deg); }
  /* Soft fade into the background so the bottom crop looks designed. */
  .fade { position:absolute; left:0; right:0; bottom:0; height:190px; z-index:5;
    background:linear-gradient(to bottom, rgba(20,20,42,0) 0%, rgba(17,17,36,.86) 62%, #12122b 100%); }

  .egg.a { width:64px; height:82px; left:52px;  top:170px; transform:rotate(-14deg); opacity:.9; }
  .egg.b { width:46px; height:58px; right:54px; top:286px; transform:rotate(16deg); opacity:.8; }
</style></head><body>
  <div class="bg"></div><div class="grid"></div><div class="glow"></div>
  <div class="egg a"></div><div class="egg b"></div>
  <span class="kicker"><span class="dot"></span> Play free</span>
  <h1>EGG<br>SMASH<span class="sm">ADVENTURES</span></h1>
  <div class="mkrow">${monkeys.map(m => `<div class="mk"><img src="${m}"></div>`).join('')}</div>
  <div class="chips">
    <div class="chip"><b>353</b> items</div>
    <div class="chip"><b>6</b> monkeys</div>
    <div class="chip">No ads</div>
  </div>
  <div class="phone hero"><img src="${play}"></div>
  <div class="fade"></div>
</body></html>`;

const TARGETS = [
  { name: 'cover-landscape-1920x1080.png', html: landscape, w: 1920, h: 1080 },
  { name: 'cover-portrait-800x1200.png',   html: portrait,  w: 800,  h: 1200 },
];

(async () => {
  const sharp = require('sharp');
  const browser = await chromium.launch();
  for (const t of TARGETS) {
    const page = await browser.newPage({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 });
    await page.setContent(t.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const raw = await page.screenshot();
    await page.close();
    const dest = path.join(OUT, t.name);
    // Full-colour PNG: palette quantisation bands the gradients at this size.
    await sharp(raw).png({ compressionLevel: 9 }).toFile(dest);
    const meta = await sharp(dest).metadata();
    console.log(`  ${t.name}  ${meta.width}x${meta.height}  ${Math.round(fs.statSync(dest).size / 1024)}KB`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
