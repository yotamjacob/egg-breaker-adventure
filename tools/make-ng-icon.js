// ============================================================
//  Egg Smash Adventures — Newgrounds project icon (4:3, 1240x930)
//  Same visual language as make-covers.js. Built for thumbnail size:
//  one big hero face, one huge title, no phone UI (a "Premium" tab in a
//  screenshot is exactly what NG shouldn't see on the icon).
//
//  Run: node tools/make-ng-icon.js [outfile]
//  Out: marketing/covers/ng-icon-1240x930.png (and the optional outfile)
// ============================================================
const { chromium } = require('playwright');
const path  = require('path');
const fs    = require('fs');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT  = path.join(ROOT, 'marketing', 'covers', 'ng-icon-1240x930.png');
const EXTRA_OUT = process.argv[2];
const W = 1240, H = 930;

function dataUri(file) {
  const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,` + fs.readFileSync(file).toString('base64');
}
const hero  = dataUri(path.join(ROOT, 'img', 'mrmonkey_crown.jpeg'));
const monkeys = ['steampunk_crown.png','princess_crown.jpeg','space_crown.jpeg','odin_crown.jpeg','wukong_crown.png']
  .map(f => dataUri(path.join(ROOT, 'img', f)));

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${W}px; height:${H}px; overflow:hidden; position:relative; font-family:'DM Sans',sans-serif; background:#14142a; }
  .bg { position:absolute; inset:0;
    background:
      radial-gradient(90% 80% at 74% 46%, rgba(21,68,120,.95) 0%, rgba(15,52,96,.7) 40%, rgba(0,0,0,0) 74%),
      linear-gradient(135deg,#16213e 0%,#1a1a2e 55%,#0b0b17 100%); }
  .grid { position:absolute; inset:0; background-image:
      linear-gradient(rgba(245,197,66,.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,197,66,.05) 1px, transparent 1px); background-size:40px 40px; }
  .glow { position:absolute; width:760px; height:760px; left:560px; top:60px; border-radius:50%;
    background:radial-gradient(circle, rgba(245,197,66,.28) 0%, rgba(245,197,66,0) 66%); }
  .hero { position:absolute; left:640px; top:120px; width:520px; height:520px; border-radius:50%;
    overflow:hidden; border:12px solid #f5c542; background:#0a0a18;
    box-shadow:0 0 0 6px #a67c00, 0 40px 90px rgba(0,0,0,.7); }
  .hero img { width:100%; height:100%; object-fit:cover; display:block; transform:scale(1.04); }
  .egg { position:absolute; border-radius:50% 50% 48% 48% / 62% 62% 38% 38%;
    background:linear-gradient(160deg,#fffdf5 0%,#f3ead1 52%,#d9cba6 100%);
    box-shadow:inset -8px -12px 20px rgba(0,0,0,.16), 0 16px 32px rgba(0,0,0,.45); }
  .egg.gold { background:linear-gradient(160deg,#ffe97a 0%,#f5c542 50%,#b8860b 100%); }
  .egg.silver { background:linear-gradient(160deg,#f2f5f8 0%,#d8dde3 50%,#98a5b3 100%); }
  .egg.black { background:linear-gradient(160deg,#4a4a5a 0%,#1a1a1a 55%,#000 100%); box-shadow:0 0 30px rgba(139,92,246,.6), 0 16px 32px rgba(0,0,0,.45); }
  .egg .crack { position:absolute; left:42%; top:22%; width:20%; height:40%;
    border-left:6px solid #a67c00; border-radius:2px; transform:skewX(-18deg); opacity:.85; }
  h1 { position:absolute; left:64px; top:250px; font-family:'Press Start 2P',monospace; color:#f5c542;
    font-size:74px; line-height:1.22; letter-spacing:-1px;
    text-shadow:0 6px 0 #a67c00, 0 7px 0 rgba(0,0,0,.5), 0 18px 40px rgba(0,0,0,.6); }
  h1 .sm { display:block; font-size:44px; color:#ffe08a; margin-top:20px;
    text-shadow:0 5px 0 #a67c00, 0 6px 0 rgba(0,0,0,.45); }
  .tag { position:absolute; left:66px; top:520px; font-size:34px; font-weight:500; color:#c9d6e8; line-height:1.4; }
  .tag b { color:#fff; font-weight:700; }
  .mkrow { position:absolute; left:66px; top:640px; display:flex; gap:20px; }
  .mk { width:96px; height:96px; border-radius:50%; overflow:hidden; border:5px solid #f5c542; background:#0a0a18;
    box-shadow:0 10px 26px rgba(0,0,0,.55); }
  .mk img { width:100%; height:100%; object-fit:cover; display:block; }
  .chips { position:absolute; left:66px; top:790px; display:flex; gap:16px; }
  .chip { font-weight:700; font-size:26px; color:#dbe6f5; background:rgba(15,52,96,.92);
    border:3px solid #2b4d7e; border-radius:14px; padding:14px 22px; white-space:nowrap; }
  .chip b { color:#f5c542; }
  .sprite { position:absolute; filter:drop-shadow(0 14px 24px rgba(0,0,0,.6)); }
</style></head><body>
  <div class="bg"></div><div class="grid"></div><div class="glow"></div>

  <div class="egg silver" style="left:1010px;top:80px;width:110px;height:140px;transform:rotate(14deg)"></div>
  <div class="egg gold"   style="left:1040px;top:600px;width:150px;height:190px;transform:rotate(12deg)"><div class="crack"></div></div>
  <div class="egg black"  style="left:600px;top:640px;width:120px;height:152px;transform:rotate(-10deg)"></div>
  <div class="egg silver" style="left:800px;top:700px;width:100px;height:128px;transform:rotate(6deg)"></div>
  <div class="egg"        style="left:640px;top:40px;width:96px;height:122px;transform:rotate(-20deg)"></div>

  <div class="hero"><img src="${hero}"></div>

  <h1>EGG SMASH<span class="sm">ADVENTURES</span></h1>
  <div class="tag">Smash eggs. Win prizes.<br><b>Complete the album.</b></div>
  <div class="mkrow">${monkeys.map(m => `<div class="mk"><img src="${m}"></div>`).join('')}</div>
  <div class="chips"><div class="chip"><b>53</b> stages</div><div class="chip"><b>353</b> collectibles</div><div class="chip"><b>12</b> medals</div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const raw = await page.screenshot();
  await browser.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await sharp(raw).png({ compressionLevel: 9 }).toFile(OUT);
  if (EXTRA_OUT) fs.copyFileSync(OUT, EXTRA_OUT);
  console.log('wrote', OUT, EXTRA_OUT ? '+ ' + EXTRA_OUT : '');
})();
