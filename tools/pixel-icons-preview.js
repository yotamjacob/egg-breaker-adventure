// ============================================================
//  Pixel-icon style preview (round 2) — NOT wired into the game.
//  Hand-authored 24×24 pixel icons: dark outline, top-left light, 3–4 tone
//  ramps, one-pixel specular. Rendered as crisp SVG next to the emoji they
//  would replace, at 48/24/16 px, on the game's panel colours.
//  Run: node tools/pixel-icons-preview.js [copy-to]  →  marketing/pixel-icons-preview.png
// ============================================================
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Palette ('.' = transparent). Ramps: dark → mid → light → highlight.
const P = {
  k: '#1a120c',              // outline
  // gold
  '1': '#7a5300', '2': '#b8860b', '3': '#f5c542', '4': '#ffe98a', '5': '#fff8d6',
  // browns / wood
  a: '#3a2214', b: '#6b3f1f', c: '#9a5f2e', d: '#c98a4b', e: '#e8b877',
  // greys / steel
  f: '#2e3238', g: '#575e68', h: '#8b939e', i: '#c4cbd3', j: '#eef1f4',
  // reds
  l: '#5a1212', m: '#9e1f1f', n: '#d63a3a', o: '#ff7b6b', p: '#ffb3a7',
  // oranges
  q: '#8a3d05', r: '#d1631a', s: '#ff9a3c', t: '#ffc27a',
  // greens
  u: '#1e4d22', v: '#2f7d34', w: '#5ec46a', x: '#a8e6a1',
  // blues
  y: '#0d3b66', z: '#1c6fb0', A: '#4aa3ff', B: '#a9d6ff',
  // purples
  C: '#3d1f73', D: '#6b3fc4', E: '#9b6cff', F: '#d9c7ff',
  // creams / whites
  G: '#d9c39a', H: '#f0dcb0', I: '#fff6e0', W: '#ffffff',
  // black shell / dark
  J: '#0a0a0e', K: '#26262e', L: '#44444f',
  // pinks
  M: '#b03a6c', N: '#ff6fa8', O: '#ffb3d0',
};

const ICONS = {
coin: { emoji: '🪙', name: 'Gold', rows: [
'........................',
'........kkkkkkkk........',
'......kk34444443kk......',
'.....k3445555544433k....',
'....k34455444444433k....',
'...k3445544kkkk443332k..',
'...k344554k3333k43332k..',
'..k34455k33kkkk33k3322k.',
'..k3445k33k2222k33k322k.',
'..k3444k3k222222k3k322k.',
'..k3444k3k222222k3k322k.',
'..k3344k3k222222k3k222k.',
'..k3344k3k222222k3k222k.',
'..k3334k33k2222k33k221k.',
'..k33333k33kkkk33k2211k.',
'...k33333k333333k2211k..',
'...k333333kkkkkk22111k..',
'....k3333333322221111k..',
'.....k32222222211111k...',
'......kk111111111kk.....',
'........kkkkkkkk........',
'........................',
'........................',
'........................',
]},
hammer: { emoji: '🔨', name: 'Hammer', rows: [
'........................',
'........kkkkkkkkkkkk....',
'.......kiijjiiihhhhgk...',
'......kiijjiiiihhhggfk..',
'......kiiiiiiihhhggffk..',
'......khhhiiihhhgggffk..',
'......kgghhhhhggggfffk..',
'......kkgggggggffffkkk..',
'........kkkkkkkkkkk.....',
'..........kdedck........',
'..........kdecbk........',
'..........kdecbk........',
'.........kdeccbk........',
'.........kdecbak........',
'.........kdecbak........',
'........kdeccbak........',
'........kdecbbak........',
'........kdecbak.........',
'.......kdeccbak.........',
'.......kdecbbak.........',
'.......kdcbbak..........',
'.......kkkkkk...........',
'........................',
'........................',
]},
star: { emoji: '⭐', name: 'Star piece', rows: [
'........................',
'...........kk...........',
'..........k34k..........',
'..........k344k.........',
'.........k3445k.........',
'.........k34445k........',
'........k334445k........',
'.kkkkkkkk3344445kkkkkkk.',
'.k33333333444445333332k.',
'..k3333333444445333322k.',
'...k33333344444533322k..',
'....k333334444453322k...',
'.....k3333444445322k....',
'.....k33334444453322k...',
'....k3333344444533322k..',
'....k33333344455332222k.',
'...k333333333k5k32222k..',
'...k33333333k...k2222k..',
'..k3333333kk.....kk222k.',
'..k33333k...........k2k.',
'..k333kk.............kk.',
'..kkkk..................',
'........................',
'........................',
]},
feather: { emoji: '🪶', name: 'Feather', rows: [
'........................',
'..............kkkk......',
'.............kBBWWk.....',
'............kBBBWWBk....',
'...........kABBBWBBAk...',
'..........kAABBWBBAAk...',
'.........kAAABBWBBAAzk..',
'........kzAAABWBBAAAzk..',
'........kzAAABWBBAAzzk..',
'.......kzzAABWBBAAAzzk..',
'.......kzAAABWBBAAzzk...',
'......kzzAABWBBAAAzzk...',
'......kzAAABWBBAAzzk....',
'.....kzzAABWBBAAAzzk....',
'.....kzAAABWBBAAzzk.....',
'....kzzAABWBBAAzzk......',
'....kzAABWBBAAzzk.......',
'....kzAABWBAAzzk........',
'.....kzABWBAzzk.........',
'......kkBWkkk...........',
'.......kddk.............',
'.......kcbk.............',
'......kcbk..............',
'......kkk...............',
]},
banana: { emoji: '🍌', name: 'Crystal banana', rows: [
'........................',
'..................kk....',
'.................kbak...',
'................kk3ak...',
'...............k5433k...',
'..............k54433k...',
'.............k544333k...',
'............k5443332k...',
'...........k54433322k...',
'..........k544333322k...',
'.........k5443333221k...',
'........k54433332221k...',
'.......k544333322211k...',
'......k5443333222111k...',
'.....k54433332222111k...',
'....k544333322221111k...',
'...k5443333222211111k...',
'...k4433332222111111k...',
'...k433332222111111kk...',
'...k33322222111111kk....',
'...kk22221111111kkk.....',
'....kkk111111kkkk.......',
'......kkkkkkkk..........',
'........................',
]},
gem: { emoji: '💎', name: 'Peak Diamond', rows: [
'........................',
'........................',
'......kkkkkkkkkkkk......',
'.....kFFFWFEEFEEDDk.....',
'....kFFWWFEEEFEEDDDk....',
'...kFFWFFEEEFEEEDDDCk...',
'..kFFWFEEEFEEEEDDDCCCk..',
'.kkkkkkkkkkkkkkkkkkkkkk.',
'.kEEFEEDkEEEDDkDDCCCCCk.',
'..kEEEEDkEEDDDkDCCCCCk..',
'...kEEEDkEEDDDkCCCCCk...',
'....kEEDkEDDDkCCCCCk....',
'.....kEDkEDDDkCCCCk.....',
'......kDkDDDkCCCCk......',
'.......kkDDDkCCk........',
'........kDDkCCk.........',
'.........kDkCk..........',
'..........kkk...........',
'........................',
'........................',
'........................',
'........................',
'........................',
'........................',
]},
trophy: { emoji: '🏆', name: 'Trophy', rows: [
'........................',
'.....kkkkkkkkkkkkkk.....',
'...kkk344433333332kkk...',
'..k32k3455433333322k23k.',
'.k332k3455433333322k223k',
'.k332k3454433333322k222k',
'.k332k3444433333322k222k',
'.k332k3344433333322k222k',
'..k32k3334433333322k22k.',
'..kkkk3334433333322kkkk.',
'.....k33344333333222k...',
'......k3334433332222k...',
'.......k333443332221k...',
'........k33443332221k...',
'.........k3344322221k...',
'..........k344322221k...',
'..........k344322221k...',
'.........kk3443222211kk.',
'........k223333222211k..',
'.......kddeeddddccbbbk..',
'.......kccddddccbbbbak..',
'.......kbbbbbbbbbaaaak..',
'........kkkkkkkkkkkkk...',
'........................',
]},
mango: { emoji: '🥭', name: 'Mango', rows: [
'........................',
'..................kk....',
'.................kwvk...',
'................kwvk....',
'...............kvuk.....',
'..............kkuk......',
'............kkk3kkk.....',
'..........kk3444433kk...',
'.........k34455443333k..',
'........k3445544333333k.',
'.......k34455443333333k.',
'.......k3455443333333sk.',
'......k34544433333ssrk..',
'......k3444433333ssrrk..',
'......k34443333ssrrrrk..',
'......k3443333ssrrrnnk..',
'......k333333ssrrrnnnk..',
'......k33333ssrrrnnnmk..',
'.......k333ssrrrnnnmk...',
'.......k33ssrrnnnmmlk...',
'........kssrrnnnmmlk....',
'.........kkrnnmmlkk.....',
'...........kkkkkk.......',
'........................',
]},
coconut: { emoji: '🥥', name: 'Coconut', rows: [
'........................',
'........kkkkkkkk........',
'......kkddeeddccbkk.....',
'.....kdeeIIIHHdccbbk....',
'....kdeIIWWIHHHdccbbk...',
'...kdeIIWWIIHHHGdccbbk..',
'...kdeIWWIIHHHGGGccbak..',
'..kdeIIWIIHHHHGGGGcbbak.',
'..kdeIIIIHHHHGGGGGcbbak.',
'..kdeIIHHHHHGGGGGGcbbak.',
'..kdeIHHHHHHGGGGGGcbbak.',
'..kddeHHHHGGGGGGGccbbak.',
'..kcddeHHHGGGGGGccbbbak.',
'..kccddeGGGGGGGccbbbaak.',
'..kbccddeeeeeeeccbbbaak.',
'..kbbccdddddccccbbbaaak.',
'...kbbcccccccccbbbaaak..',
'...kabbbbccbbbbbbaaaak..',
'....kabbbbbbbbbbaaaak...',
'.....kaabbbbbbaaaaak....',
'......kkaaaaaaaakk......',
'........kkkkkkkk........',
'........................',
'........................',
]},
pineapple: { emoji: '🍍', name: 'Pineapple', rows: [
'...........kk...........',
'......kk..kwvk..kk......',
'.....kwvk.kwvk.kwvk.....',
'.....kxwvkkwvkkvwvk.....',
'......kwvvkwvkvvwk......',
'.......kwvvwvvvwk.......',
'........kvvvvvvk........',
'........kkkkkkkk........',
'.......k34324323k.......',
'......k3423432342k......',
'.....k342343234233k.....',
'.....k243234233423k.....',
'....k34323423342334k....',
'....k42343234233423k....',
'....k34233423342334k....',
'....k24334233423323k....',
'....k34323423342234k....',
'.....k23342334233k2k....',
'.....k32233422322k1.....',
'......k2233223221k......',
'.......k22322222k.......',
'........kk1111kk........',
'..........kkkk..........',
'........................',
]},
chest: { emoji: '🧰', name: 'Treasure chest', rows: [
'........................',
'........................',
'.....kkkkkkkkkkkkkk.....',
'....kddeeeeeeeeeeddk....',
'...kdd3ddddddddd3ddck...',
'..kdd33dccccccccd33dcbk.',
'..kd23ddcccccccddd32cbk.',
'..kd23ddcccccccddd32cbk.',
'..kkkkkkkkkkkkkkkkkkkkk.',
'..k22kdddddkkkkdddddk2k.',
'..k22kdccccdk3kdcccck2k.',
'..k22kdcccckk3kkccccck2k',
'..k22kdccbbk333kbbbcck2k',
'..k22kdcbbbkk3kkbbbcck2k',
'..k22kdcbbbbk3kbbbbcck2k',
'..k22kdcbbbbbkkbbbbcck2k',
'..k22kdcbbbbbbbbbbbcck2k',
'..k22kdcbbbbbbbbbbbcck2k',
'..k11kdcbbbbbbbbbbbcck1k',
'..k11kccbbbbaaaabbbcck1k',
'..kkkkkkkkkkkkkkkkkkkkk.',
'........................',
'........................',
'........................',
]},
key: { emoji: '🗝️', name: 'Ancient key', rows: [
'........................',
'....kkkkkk..............',
'..kk344333kk............',
'.k3445kkk332k...........',
'.k345k...k32k...........',
'k345k.....k32k..........',
'k34k.......k2k..........',
'k34k.......k2k..........',
'k34k.......k2k..........',
'.k34k.....k32k..........',
'.k334k...k322k..........',
'..k3344kk3322kk.........',
'...k333333322k32k.......',
'....kkkkkkkk.k322k......',
'..............k322k.....',
'...............k322k....',
'................k322k...',
'.................k322kkk',
'..................k3221k',
'...................k32kk',
'....................k1k.',
'.....................k..',
'........................',
'........................',
]},
egg_gold: { emoji: '🌟', name: 'Gold egg', rows: [
'........................',
'.........kkkkkk.........',
'.......kk344443kk.......',
'......k3455544433k......',
'.....k34555444433k......',
'....k345554444433k......',
'....k34554444433322k....',
'...k3455444444333322k...',
'...k3454444443333322k...',
'...k34444444433333221k..',
'..k344444444333333221k..',
'..k344444443333332211k..',
'..k34444443333333221k...',
'..k34444433333332221k...',
'..k3444333333332222k....',
'..k3433333333322221k....',
'...k33333333322221k.....',
'...k3333333222221k......',
'....k33332222211k.......',
'.....k322222111k........',
'......kk11111kk.........',
'........kkkkk...........',
'........................',
'........................',
]},
egg_black: { emoji: '🖤', name: 'Black egg', rows: [
'........................',
'.........kkkkkk.........',
'.......kkLLKKKKkk.......',
'......kLLLLKKKKKJk......',
'.....kLLLLKKKKKJJk......',
'....kLLLLKKKKKJJJk......',
'....kLLLKKKKKKJJJJJk....',
'...kLLLKKKKKKKJJJJJk....',
'...kLLKKKKKKKKJJJJJJk...',
'...kLKKKKKDKKKJJJJJJk...',
'..kLKKKKKDEDKKJJJJJJk...',
'..kKKKKKKKDKKKJJJJJJJk..',
'..kKKKKKKKKKKKJJJJJJJk..',
'..kKKKKKKKKKKJJJJJJJk...',
'..kKKKKKKKKKJJJJJJJJk...',
'..kKKKKKKKKJJJJJJJJk....',
'...kKKKKKKJJJJJJJJk.....',
'...kKKKKJJJJJJJJJk......',
'....kKKJJJJJJJJJk.......',
'.....kJJJJJJJJJk........',
'......kkJJJJJkk.........',
'........kkkkk...........',
'........................',
'........................',
]},
mult: { emoji: '✖️', name: 'x5 multiplier', rows: [
'........................',
'....kkkkkkkkkkkkkkkk....',
'...kEEEEEEEEEEEEEEEDk...',
'..kEFFEEEEEEEEEEEEDDDk..',
'..kEFEEEEEEEEEEEEEDDDk..',
'..kEEEEkk...kkEEEEDDDk..',
'..kEEEEEkk.kkEEEEEDDDk..',
'..kEEEEEEkkkEEEEEEDDDk..',
'..kEEEEEEkkkEEEEEEDDDk..',
'..kEEEEEkk.kkEEEEEDDDk..',
'..kEEEEkk...kkEEEEDDDk..',
'..kEEEEEEEEEEEEEEEDDDk..',
'..kEEEEEEkkkkkkEEEDDDk..',
'..kEEEEEEkWWWWWkEEDDDk..',
'..kEEEEEEkWkkkkkEEDDDk..',
'..kEEEEEEkWWWWkEEEDDDk..',
'..kEEEEEEkkkkkWkEEDDDk..',
'..kEEEEEEkWkkkWkEEDDDk..',
'..kEEEEEEkkWWWkkEEDDDk..',
'..kDEEEEEEkkkkkEEDDDCk..',
'..kDDDDDDDDDDDDDDDCCCk..',
'...kCDDDDDDDDDDDDCCCk...',
'....kkkkkkkkkkkkkkkk....',
'........................',
]},
orange: { emoji: '🍊', name: 'Blood orange', rows: [
'........................',
'..............kk........',
'.............kwvk.......',
'............kwvk........',
'.........kkkkukkk.......',
'.......kkstttsssskk.....',
'......ksttWWtsssssrk....',
'.....ksttWWttssssrrrk...',
'....ksttWWtsssssrrrrqk..',
'....kstttssssssrrrrrqk..',
'...ksttsssssssrrrrrrqqk.',
'...kstsssssssrrrrrrqqqk.',
'...kssssssssrrrrrrqqqqk.',
'...kssssssrrrrrrrqqqqqk.',
'...ksssssrrrrrrrqqqqqqk.',
'...ksssrrrrrrrrqqqqqqqk.',
'....ksrrrrrrrrqqqqqqqk..',
'....krrrrrrrrqqqqqqqqk..',
'.....krrrrrrqqqqqqqqk...',
'......krrrqqqqqqqqqk....',
'.......kkqqqqqqqqkk.....',
'.........kkkkkkkk.......',
'........................',
'........................',
]},
};

function svgFor(rows, px) {
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]; if (ch === '.') continue;
      const c = P[ch]; if (!c) continue;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}" shape-rendering="crispEdges">${rects}</svg>`;
}

const cards = Object.entries(ICONS).map(([id, ic]) => `
  <div class="card">
    <div class="pair"><div class="cell"><span class="emo">${ic.emoji}</span></div><div class="arrow">→</div><div class="cell">${svgFor(ic.rows, 48)}</div></div>
    <div class="row-small">${svgFor(ic.rows, 96)}${svgFor(ic.rows, 24)}${svgFor(ic.rows, 16)}</div>
    <div class="name">${ic.name}</div>
  </div>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
  body{margin:0;background:#1a1a2e;font-family:'Press Start 2P',monospace;color:#f5c542;padding:18px;width:1000px}
  h1{font-size:12px;margin:0 0 6px}
  p{font-size:8px;color:#9aa3ad;line-height:1.7;margin:0 0 14px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .card{background:linear-gradient(180deg,#1a4080,#0f3460);border:3px solid #a67c00;border-radius:2px;padding:10px 8px;box-shadow:3px 3px 0 #0a0a18,inset 2px 2px 0 rgba(255,255,255,.08);text-align:center}
  .pair{display:flex;align-items:center;justify-content:center;gap:8px}
  .cell{width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:#0a0a18;border:2px solid #a67c00;border-radius:2px}
  .emo{font-size:40px;line-height:1;font-family:system-ui,'Apple Color Emoji','Segoe UI Emoji'}
  .arrow{color:#9aa3ad;font-size:10px}
  .row-small{display:flex;align-items:flex-end;justify-content:center;gap:12px;margin-top:8px}
  .name{font-size:7px;color:#fff;margin-top:8px}
  .strip{margin-top:16px;background:#0f3460;border:3px solid #a67c00;padding:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .res{display:flex;align-items:center;gap:4px;background:#1a1a2e;border:2px solid #a67c00;padding:4px 8px;font-size:9px;color:#f5c542}
  .item{background:#1a4080;border:2px solid #2b4d7e;padding:6px;display:flex;gap:6px;align-items:center;font-size:7px;color:#fff;min-width:150px}
  .item .badge{background:#2ecc71;color:#0a0a18;padding:2px 4px;border-radius:2px;font-size:6px}
  .item.rare .badge{background:#f5c542}
</style></head><body>
<h1>Pixel icon style — preview round 2 (not in game)</h1>
<p>24×24 hand-drawn icons: dark outline, top-left light, 3–4 tone ramps, single-pixel speculars. Each card: emoji → icon at 48px, then 96 / 24 / 16 px.</p>
<div class="grid">${cards}</div>
<div class="strip">
  <div class="res">${svgFor(ICONS.coin.rows, 18)} 48.2K</div>
  <div class="res">${svgFor(ICONS.hammer.rows, 18)} 75/75</div>
  <div class="res">${svgFor(ICONS.star.rows, 18)} 12/7</div>
  <div class="res">${svgFor(ICONS.feather.rows, 18)} 6</div>
  <div class="res">${svgFor(ICONS.banana.rows, 18)} 3</div>
  <div class="item">${svgFor(ICONS.mango.rows, 22)}<div>Mango<br><span class="badge">Common</span></div></div>
  <div class="item">${svgFor(ICONS.coconut.rows, 22)}<div>Coconut<br><span class="badge">Common</span></div></div>
  <div class="item rare">${svgFor(ICONS.gem.rows, 22)}<div>Peak Diamond<br><span class="badge">Rare</span></div></div>
  <div class="item">${svgFor(ICONS.key.rows, 22)}<div>Ancient Key<br><span class="badge">Uncommon</span></div></div>
</div>
</body></html>`;

(async () => {
  const out = path.join(__dirname, '..', 'marketing', 'pixel-icons-preview.png');
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2 });
  await pg.setContent(html, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out, fullPage: true });
  await b.close();
  const extra = process.argv[2]; if (extra) fs.copyFileSync(out, extra);
  console.log('wrote', out, extra || '');
})();
