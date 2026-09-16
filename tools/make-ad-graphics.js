// ============================================================
//  Egg Smash Adventures — Play feature graphic + Google Ads images
//
//  Renders, in the same brand style as make-covers.js / make-store-shots.js:
//    feature-graphic-1024x500.png   Play Console "Feature graphic" (required;
//                                   shown above the fold, the trailer's play
//                                   button is overlaid in the CENTRE — keep it clear)
//    ad-landscape-1200x628.png      Google Ads App campaign image assets
//    ad-square-1200x1200.png
//    ad-portrait-1200x1500.png
//
//  Run: NODE_PATH=<dir with playwright> node tools/make-ad-graphics.js
//  In:  marketing/store-shots/src/smash.jpg (phone capture), img/*_crown.* (monkeys)
//  Out: marketing/covers/feature-graphic-1024x500.png, marketing/ads/ad-*.png
//  Output is flattened to 24-bit RGB (Play rejects alpha in the feature graphic).
// ============================================================

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const dataUri = f => `data:image/${path.extname(f).slice(1).replace('jpg', 'jpeg')};base64,` + fs.readFileSync(f).toString('base64');

const shot = dataUri(path.join(ROOT, 'marketing', 'store-shots', 'src', 'smash.jpg'));
const monkeys = ['mrmonkey_crown.jpeg', 'steampunk_crown.png', 'princess_crown.jpeg', 'space_crown.jpeg', 'odin_crown.jpeg', 'wukong_crown.png']
  .map(f => dataUri(path.join(ROOT, 'img', f)));

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">`;
const BASE = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { overflow:hidden; position:relative; font-family:'DM Sans',sans-serif; background:#14142a; }
  .bg { position:absolute; inset:0; background:
      radial-gradient(120% 90% at 72% 40%, rgba(21,68,120,.95) 0%, rgba(15,52,96,.72) 38%, rgba(0,0,0,0) 72%),
      linear-gradient(135deg,#16213e 0%,#1a1a2e 55%,#0b0b17 100%); }
  .grid { position:absolute; inset:0; background-image:
      linear-gradient(rgba(245,197,66,.05) 1px,transparent 1px),
      linear-gradient(90deg,rgba(245,197,66,.05) 1px,transparent 1px); }
  .glow { position:absolute; border-radius:50%;
      background:radial-gradient(circle,rgba(245,197,66,.22) 0%,rgba(245,197,66,0) 68%); }
  h1 { font-family:'Press Start 2P',monospace; color:#f5c542; line-height:1.22;
      text-shadow:0 6px 0 #a67c00,0 8px 0 rgba(0,0,0,.5),0 18px 40px rgba(0,0,0,.6); }
  h1 .sm { display:block; color:#ffe08a; text-shadow:0 4px 0 #a67c00,0 6px 0 rgba(0,0,0,.45); }
  .kicker { display:inline-flex; align-items:center; gap:10px; font-weight:700; text-transform:uppercase;
      letter-spacing:.14em; color:#0e1a10; background:linear-gradient(180deg,#4ee38a,#2ecc71);
      border-radius:999px; box-shadow:0 4px 0 #177a44,0 10px 28px rgba(46,204,113,.34); }
  .kicker .dot { border-radius:50%; background:#0e1a10; }
  .sub { color:#c9d6e8; line-height:1.4; } .sub b { color:#fff; }
  .mkrow { display:flex; }
  .mk { border-radius:50%; overflow:hidden; border:4px solid #f5c542; background:#0a0a18; box-shadow:0 10px 26px rgba(0,0,0,.55); }
  .mk img { width:100%; height:100%; object-fit:cover; display:block; }
  .phone { position:absolute; overflow:hidden; border:5px solid #f5c542; background:#0a0a18;
      box-shadow:0 34px 80px rgba(0,0,0,.66),0 0 0 1px rgba(0,0,0,.5); }
  .phone img { display:block; width:100%; height:100%; object-fit:cover; object-position:top center; }
`;
const mkrow = size => `<div class="mkrow">${monkeys.map(m => `<div class="mk" style="width:${size}px;height:${size}px"><img src="${m}"></div>`).join('')}</div>`;

// Wordmark left, monkeys under it, phone right. The centre band (x 380–650) stays
// free of text so Play's ▶ overlay does not sit on the title.
const feature = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
  body { width:1024px; height:500px; }
  .grid { background-size:40px 40px; mask-image:linear-gradient(105deg,#000 0%,#000 40%,transparent 70%); -webkit-mask-image:linear-gradient(105deg,#000 0%,#000 40%,transparent 70%); }
  .glow { width:520px; height:520px; right:60px; top:-40px; }
  .left { position:absolute; left:52px; top:0; height:100%; display:flex; flex-direction:column; justify-content:center; }
  .kicker { font-size:13px; padding:8px 16px; } .kicker .dot { width:8px; height:8px; }
  h1 { font-size:52px; margin-top:22px; } h1 .sm { font-size:30px; margin-top:12px; }
  .mkrow { gap:10px; margin-top:26px; }
  .phone { width:262px; height:566px; right:96px; top:42px; border-radius:22px; transform:rotate(-6deg); }
</style></head><body><div class="bg"></div><div class="grid"></div><div class="glow"></div>
  <div class="left"><div><span class="kicker"><span class="dot"></span> No ads · No paywalls</span></div>
    <h1>EGG SMASH<span class="sm">ADVENTURES</span></h1>${mkrow(58)}</div>
  <div class="phone"><img src="${shot}"></div>
</body></html>`;

// Ads: bigger type, one benefit line, phone on the right (landscape) or below (square/portrait).
function ad(w, h, layout) {
  const side = layout === 'side';
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
  body { width:${w}px; height:${h}px; }
  .grid { background-size:48px 48px; opacity:.8; }
  .glow { width:${Math.round(w * .8)}px; height:${Math.round(w * .8)}px; ${side ? 'right:40px; top:-80px;' : 'left:10%; top:' + Math.round(h * .35) + 'px;'} }
  .cap { position:absolute; ${side ? 'left:64px; top:0; height:100%; width:' + Math.round(w * .52) + 'px; display:flex; flex-direction:column; justify-content:center; text-align:left;'
                                     : 'left:0; right:0; top:0; height:' + Math.round(h * .42) + 'px; padding:0 64px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;'} }
  .kicker { font-size:${side ? 16 : 18}px; padding:10px 20px; } .kicker .dot { width:9px; height:9px; }
  h1 { font-size:${side ? 54 : 64}px; margin-top:26px; } h1 .sm { font-size:${side ? 30 : 36}px; margin-top:14px; }
  .sub { font-size:${side ? 26 : 30}px; margin-top:26px; max-width:${side ? 560 : 900}px; }
  .mkrow { gap:12px; margin-top:30px; ${side ? '' : 'justify-content:center;'} }
  .phone { border-radius:30px; ${side ? 'width:' + Math.round(h * .55) + 'px; height:' + Math.round(h * 1.2) + 'px; right:72px; top:60px; transform:rotate(-5deg);'
                                        : 'width:' + Math.round(w * .5) + 'px; height:' + Math.round(w * 1.08) + 'px; left:50%; margin-left:-' + Math.round(w * .25) + 'px; top:' + Math.round(h * .46) + 'px;'} }
  .fade { position:absolute; left:0; right:0; bottom:0; height:${Math.round(h * .12)}px; background:linear-gradient(to bottom,rgba(20,20,42,0),#12122b); }
</style></head><body><div class="bg"></div><div class="grid"></div><div class="glow"></div>
  <div class="cap"><div><span class="kicker"><span class="dot"></span> Free on Google Play</span></div>
    <h1>EGG SMASH<span class="sm">ADVENTURES</span></h1>
    <p class="sub">Smash eggs, win prizes, fill the album. <b>No ads. No paywalls.</b></p>${mkrow(side ? 64 : 76)}</div>
  <div class="phone"><img src="${shot}"></div>${side ? '' : '<div class="fade"></div>'}
</body></html>`;
}

const TARGETS = [
  { out: 'marketing/covers/feature-graphic-1024x500.png', html: feature, w: 1024, h: 500 },
  { out: 'marketing/ads/ad-landscape-1200x628.png',  html: ad(1200, 628, 'side'),  w: 1200, h: 628 },
  { out: 'marketing/ads/ad-square-1200x1200.png',    html: ad(1200, 1200, 'stack'), w: 1200, h: 1200 },
  { out: 'marketing/ads/ad-portrait-1200x1500.png',  html: ad(1200, 1500, 'stack'), w: 1200, h: 1500 },
];

(async () => {
  const browser = await chromium.launch();
  for (const t of TARGETS) {
    const page = await browser.newPage({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 });
    await page.setContent(t.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const dest = path.join(ROOT, t.out);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await page.screenshot({ path: dest, omitBackground: false });
    await page.close();
    // Flatten to 24-bit RGB (no alpha channel) — Play's feature graphic requirement.
    execFileSync('python3', ['-c', `from PIL import Image; im=Image.open(${JSON.stringify(dest)}).convert('RGB'); im.save(${JSON.stringify(dest)}, optimize=True); print(im.size, im.mode)`], { stdio: 'inherit' });
    console.log('wrote', t.out);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
