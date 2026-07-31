// ============================================================
//  Egg Smash Adventures — Open Graph share card generator
//  Renders a 1200x630 share card from REAL gameplay screenshots
//  (marketing/shots/*) rather than the app icon, which converts
//  poorly when the link is pasted into iMessage/WhatsApp/X.
//
//  Run: node tools/capture-shots.js && node tools/make-og.js
//  Out: og-image.png  (served from the site root)
// ============================================================

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const ROOT  = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'marketing', 'shots');
const OUT   = path.join(ROOT, 'og-image.png');

const W = 1200, H = 630;

function dataUri(file) {
  const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,` + fs.readFileSync(file).toString('base64');
}

const play   = dataUri(path.join(SHOTS, 'play.png'));
const album  = dataUri(path.join(SHOTS, 'album.png'));
const monkey = dataUri(path.join(ROOT, 'img', 'mrmonkey_crown.jpeg'));

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${W}px; height:${H}px; overflow:hidden;
    font-family:'DM Sans', sans-serif;
    background:#1a1a2e;
    position:relative;
  }
  /* Layered game-palette background */
  .bg {
    position:absolute; inset:0;
    background:
      radial-gradient(120% 90% at 78% 42%, rgba(21,68,120,.95) 0%, rgba(15,52,96,.75) 38%, rgba(0,0,0,0) 70%),
      linear-gradient(135deg, #16213e 0%, #1a1a2e 55%, #0d0d1c 100%);
  }
  /* Faint pixel grid — reads as texture, not noise, at share-card size */
  .grid {
    position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(245,197,66,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,197,66,.045) 1px, transparent 1px);
    background-size:32px 32px;
    mask-image:linear-gradient(105deg, #000 0%, #000 46%, transparent 76%);
    -webkit-mask-image:linear-gradient(105deg, #000 0%, #000 46%, transparent 76%);
  }
  .glow {
    position:absolute; width:520px; height:520px; border-radius:50%;
    background:radial-gradient(circle, rgba(245,197,66,.20) 0%, rgba(245,197,66,0) 68%);
    right:120px; top:40px;
  }

  .wrap { position:relative; display:flex; height:100%; align-items:center; }

  /* ── Left column ── */
  .left { width:640px; padding:0 0 0 64px; }

  .kicker {
    display:inline-flex; align-items:center; gap:9px;
    font-size:14px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    color:#0e1a10; background:linear-gradient(180deg,#4ee38a,#2ecc71);
    padding:8px 15px; border-radius:999px;
    box-shadow:0 3px 0 #177a44, 0 8px 22px rgba(46,204,113,.34);
  }
  .kicker .dot {
    width:8px; height:8px; border-radius:50%; background:#0e1a10;
    box-shadow:0 0 0 3px rgba(14,26,16,.22);
  }

  h1 {
    font-family:'Press Start 2P', monospace;
    font-size:52px; line-height:1.24; margin:26px 0 0;
    color:#f5c542;
    text-shadow:0 4px 0 #a67c00, 0 5px 0 rgba(0,0,0,.5), 0 12px 30px rgba(0,0,0,.6);
    letter-spacing:-.5px;
  }
  h1 .sm { display:block; font-size:34px; color:#ffe08a; margin-top:14px;
           text-shadow:0 3px 0 #a67c00, 0 4px 0 rgba(0,0,0,.45); }

  .sub {
    margin-top:26px; font-size:23px; line-height:1.48; color:#c9d6e8;
    max-width:530px; font-weight:400;
  }
  .sub b { color:#fff; font-weight:700; }

  .chips { margin-top:26px; display:flex; gap:9px; flex-wrap:wrap; }
  .chip {
    font-size:15px; font-weight:600; color:#dbe6f5;
    background:rgba(15,52,96,.85); border:1.5px solid #2b4d7e;
    padding:9px 14px; border-radius:9px; white-space:nowrap;
  }
  .chip b { color:#f5c542; }

  /* ── Right column: tilted device shots ── */
  .right { position:relative; flex:1; height:100%; }
  .phone {
    position:absolute; border-radius:20px; overflow:hidden;
    border:4px solid #f5c542;
    box-shadow:0 26px 60px rgba(0,0,0,.62), 0 0 0 1px rgba(0,0,0,.5);
    background:#0a0a18;
  }
  .phone img { display:block; width:100%; height:100%; object-fit:cover; object-position:top center; }

  .phone.back  { width:243px; height:526px; right:38px;  top:36px;  transform:rotate(7.5deg);  opacity:.97; }
  .phone.front { width:271px; height:586px; right:236px; top:22px;  transform:rotate(-5.5deg); }

  /* Monkey badge overlapping the shots */
  .monkey {
    position:absolute; left:-52px; bottom:36px;
    width:124px; height:124px; border-radius:20px; overflow:hidden;
    border:4px solid #f5c542; background:#0a0a18;
    box-shadow:0 16px 38px rgba(0,0,0,.6);
    transform:rotate(-5.5deg);
  }
  .monkey img { display:block; width:100%; height:100%; object-fit:cover; }

  /* Decorative eggs */
  .egg {
    position:absolute; border-radius:50% 50% 48% 48% / 62% 62% 38% 38%;
    background:linear-gradient(160deg,#fffdf5 0%,#f3ead1 52%,#d9cba6 100%);
    box-shadow:inset -5px -8px 14px rgba(0,0,0,.16), 0 10px 22px rgba(0,0,0,.42);
  }
  /* Positioned inside the vertical channel between the copy and the phones
     (.right starts at x=640; the front phone's left edge lands near x=693),
     so they read as floating props instead of being clipped by the canvas. */
  .egg.a { width:42px; height:54px; left:6px;   top:92px;  transform:rotate(15deg);  opacity:.95; }
  .egg.b { width:28px; height:36px; left:-26px; top:462px; transform:rotate(-13deg); opacity:.8; }
  .egg.c { width:21px; height:27px; left:34px;  top:556px; transform:rotate(24deg);  opacity:.58; }

  /* Bottom-left URL strip */
  .url {
    position:absolute; left:64px; bottom:34px;
    font-size:18px; font-weight:700; color:#8fa6c4; letter-spacing:.02em;
  }
  .url span { color:#f5c542; }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="grid"></div>
  <div class="glow"></div>

  <div class="wrap">
    <div class="left">
      <div class="kicker"><span class="dot"></span> Play free — no install</div>
      <h1>EGG SMASH<span class="sm">ADVENTURES</span></h1>
      <p class="sub">The <b>Facebook egg-breaking classic</b>, rebuilt for the browser. Smash eggs, win prizes, finish the collection.</p>
      <div class="chips">
        <div class="chip"><b>9</b> stages</div>
        <div class="chip"><b>6</b> monkeys</div>
        <div class="chip"><b>200+</b> collectibles</div>
        <div class="chip">No ads</div>
      </div>
    </div>

    <div class="right">
      <div class="egg a"></div>
      <div class="egg b"></div>
      <div class="egg c"></div>
      <div class="phone back"><img src="${album}"></div>
      <div class="phone front">
        <img src="${play}">
        <div class="monkey"><img src="${monkey}"></div>
      </div>
    </div>
  </div>

  <div class="url">egg-breaker-adventures<span>.vercel.app</span></div>
</body>
</html>`;

(async () => {
  const sharp = require('sharp');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const raw = await page.screenshot();
  await browser.close();

  // Palette-quantise: ~580KB → ~170KB with no visible banding at card size.
  // Scrapers refetch this on every share, so the bytes are worth saving.
  await sharp(raw).png({ compressionLevel: 9, palette: true }).toFile(OUT);

  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`og-image.png  ${W}x${H}  ${kb}KB`);
})().catch(e => { console.error(e); process.exit(1); });
