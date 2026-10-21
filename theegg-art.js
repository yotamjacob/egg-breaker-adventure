// ============================================================
//  Egg Smash Adventures — The Egg pixel art (v3.12.0)
//  theegg-art.js  (bundled right before theegg.js)
//
//  Every sprite in The Egg is drawn here at native pixel size from shapes
//  (ellipses, rotated rects, lines) with palette ramps, ordered (Bayer)
//  dithering and a 1px dark outline — the same chunky look as the game's
//  portraits — then cached as small canvases. theegg.js composes them into
//  a low-res buffer that is upscaled with smoothing off, so every pixel of
//  the scene sits on one grid.
//
//  No DOM at load time; all module state is `var` (TDZ rule, see idle.js).
// ============================================================

var EA_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
var EA_OUTLINE = '#1c0f06';
var EA_RAMPS = {
  fur:    ['#3b200e', '#5a3318', '#7a4824', '#965d31', '#b07642'],
  face:   ['#a86e44', '#cf9663', '#e8b582', '#f6d3a6'],
  wing:   ['#8f8574', '#bdb29b', '#e3dac3', '#fffbef'],
  steel:  ['#3e4552', '#69737f', '#9aa4b0', '#cbd3dc', '#f0f4f8'],
  wood:   ['#4f2c12', '#7a4a22', '#a36a35'],
  gold:   ['#4a3205', '#6e4c08', '#9a6c0a', '#c48d12', '#e2ae1f', '#f4cb3c', '#fde27a', '#fff6cf'],
  brass:  ['#5c3c0e', '#8a5e1c', '#c08a2c', '#e8b955'],
  goose:  ['#7a5208', '#b07d10', '#dda424', '#f5c94a', '#ffe68a', '#fff8d6'],
  crow:   ['#0d0812', '#1d1229', '#2f2043', '#4a3866', '#6b5891'],
  sack:   ['#4a2c12', '#6e4520', '#946233', '#b8844c'],
  banana: ['#8a6a08', '#d6ad12', '#f5d630', '#fff08a'],
  nest:   ['#3a210c', '#5c3816', '#8a5a24', '#b58237', '#d9a94c', '#f0cf73'],
};
// Shell tiers: every 10 layers the egg grows a new shell (theEggTier).
var EA_TIERS = [
  { name: 'GOLD',      ramp: ['#4a3205', '#6e4c08', '#9a6c0a', '#c48d12', '#e2ae1f', '#f4cb3c', '#fde27a', '#fff6cf'], gem: ['#5a0a18', '#b01e36', '#ff5a72', '#ffd0d8'], aura: '#f5c542' },
  { name: 'ROSE GOLD', ramp: ['#41181a', '#6a2a28', '#94443a', '#bb634f', '#d98468', '#eca586', '#f8c9ad', '#fff0e6'], gem: ['#063b24', '#0f7a44', '#38c977', '#c9ffd9'], aura: '#ff9f86' },
  { name: 'PLATINUM',  ramp: ['#1f2430', '#3a4152', '#5c6578', '#828c9f', '#a8b1c2', '#c9d0dd', '#e5e9f1', '#ffffff'], gem: ['#0b1f5c', '#1d47b8', '#4f8cff', '#d2e2ff'], aura: '#bcd4ff' },
  { name: 'EMERALD',   ramp: ['#062a1c', '#0b4a30', '#13704a', '#1f9862', '#3cbb7d', '#6fd89f', '#a8f0c4', '#e9fff1'], gem: ['#5c3a05', '#b8860b', '#ffd34d', '#fff6cf'], aura: '#5ce0a0' },
  { name: 'OBSIDIAN',  ramp: ['#0a070f', '#15101e', '#221a30', '#33284a', '#4a3c66', '#6a5a8c', '#9285b5', '#d6cff0'], gem: ['#3b0b5c', '#8a2be2', '#c77dff', '#f3e0ff'], aura: '#b48cff', veins: '#f5c542' },
  { name: 'COSMIC',    ramp: ['#0a0624', '#170e45', '#25176a', '#36248f', '#4c35b0', '#6e55cf', '#9c86ea', '#e2dcff'], gem: ['#004a5c', '#00a3c4', '#5ff0ff', '#e0fcff'], aura: '#7de8ff', stars: true },
];

var _eaRgbCache = {};
function _eaRgb(hex) {
  let c = _eaRgbCache[hex];
  if (c) return c;
  const h = hex.replace('#', '');
  c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255];
  _eaRgbCache[hex] = c;
  return c;
}
function _eaBayer(x, y) { return (EA_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }

// ---- grid primitives ----
function eaGrid(w, h) { return { w, h, c: new Array(w * h).fill(null) }; }
function eaSet(g, x, y, col) {
  x = Math.floor(x); y = Math.floor(y);
  if (x >= 0 && y >= 0 && x < g.w && y < g.h && col) g.c[y * g.w + x] = col;
}
function eaGet(g, x, y) { return (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.c[y * g.w + x] : null; }

/**
 * Pick a ramp colour for light level t (0 dark … 1 bright). Clean bands with
 * ordered dithering only along the seams between them (the classic pixel-art
 * look; dithering the whole surface reads as noise). dither: 0 = none,
 * undefined = seam (width 0.36), or a number = seam width.
 */
function eaRamp(ramp, t, x, y, dither) {
  const f = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
  let i = Math.floor(f);
  const fr = f - i, w = dither === undefined ? 0.36 : dither;
  if (w > 0 && Math.abs(fr - 0.5) < w / 2) { if ((fr - 0.5 + w / 2) / w > _eaBayer(x, y)) i++; }
  else if (fr > 0.5) i++;
  return ramp[Math.max(0, Math.min(ramp.length - 1, i))];
}
/** Lambert light on a sphere point (nx, ny in -1..1), light from the top-left front. */
function eaLight(nx, ny) {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const l = -0.45 * nx - 0.62 * ny + 0.64 * nz;   // L = normalize(-0.45,-0.62,0.64)
  return Math.max(0, Math.min(1, 0.5 + l * 0.55));
}
/** Filled, optionally rotated ellipse. paint: colour string or fn(nx, ny, x, y) → colour|null. */
function eaEllipse(g, cx, cy, rx, ry, paint, ang) {
  const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0), r = Math.max(rx, ry) + 1;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry;
      if (u * u + v * v > 1) continue;
      eaSet(g, x, y, typeof paint === 'function' ? paint(u, v, x, y) : paint);
    }
  }
}
/** Shaded ball with a ramp. */
function eaBall(g, cx, cy, rx, ry, ramp, ang, bias, dither) {
  eaEllipse(g, cx, cy, rx, ry, (u, v, x, y) => eaRamp(ramp, eaLight(u, v) + (bias || 0), x, y, dither === undefined ? 0.2 : dither), ang);
}
/** Rotated rectangle centred at (cx, cy): half-length hu along `ang`, half-width hv. */
function eaQuad(g, cx, cy, ang, hu, hv, paint) {
  const ca = Math.cos(ang), sa = Math.sin(ang), r = Math.hypot(hu, hv) + 1;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if (Math.abs(u) > hu || Math.abs(v) > hv) continue;
      eaSet(g, x, y, typeof paint === 'function' ? paint(u / hu, v / hv, x, y) : paint);
    }
  }
}
function eaLine(g, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 400; n++) {
    eaSet(g, x0, y0, col);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
/** 1px outline around everything drawn (4-neighbour: rounder than 8). */
function eaOutline(g, col) {
  const add = [];
  for (let y = -1; y <= g.h; y++) for (let x = -1; x <= g.w; x++) {
    if (eaGet(g, x, y)) continue;
    if (eaGet(g, x - 1, y) || eaGet(g, x + 1, y) || eaGet(g, x, y - 1) || eaGet(g, x, y + 1)) add.push([x, y]);
  }
  for (const [x, y] of add) eaSet(g, x, y, col || EA_OUTLINE);
  return g;
}
function eaMap(g, fn) {
  const o = eaGrid(g.w, g.h);
  for (let i = 0; i < g.c.length; i++) o.c[i] = g.c[i] ? fn(g.c[i], i % g.w, Math.floor(i / g.w)) : null;
  return o;
}
function _eaLum(hex) { const c = _eaRgb(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
/** Recolour a grid onto a ramp by luminance (gold clones, hit flashes). */
function eaTint(g, ramp) {
  // contrast-stretched so eyes, face mask and wing feathers stay readable in gold
  return eaMap(g, (c, x, y) => c === EA_OUTLINE ? '#3a2504' : eaRamp(ramp, (_eaLum(c) - 0.12) * 1.45, x, y, 0));
}

/** Grid → canvas (optionally mirrored). */
function eaCanvas(g, flip) {
  const cv = document.createElement('canvas');
  cv.width = g.w; cv.height = g.h;
  const cx = cv.getContext('2d'), img = cx.createImageData(g.w, g.h), d = img.data;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const col = g.c[y * g.w + (flip ? g.w - 1 - x : x)];
    if (!col) continue;
    const c = _eaRgb(col), i = (y * g.w + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
  }
  cx.putImageData(img, 0, 0);
  return cv;
}
var _eaCache = {};
function eaCached(key, build) {
  let s = _eaCache[key];
  if (!s) s = _eaCache[key] = build();
  return s;
}
/** Seeded RNG (mulberry32) — cracks and textures stay put across reloads. */
function eaRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------
// The flying monkey (faces right; mirrored for the left side)
//   wing:   0 up · 1 mid · 2 down · 3 mid      (flap cycle)
//   hammer: 0 rest · 1 wind-up · 2 strike
//   hat:    '' | steampunk | princess | space | odin | sun_wukong
// ---------------------------------------------------------------
var EA_MONKEY_W = 36, EA_MONKEY_H = 30;
var EA_MONKEY_ANCHOR = [17, 17];    // body centre inside the sprite
var EA_WING_ANG = [-2.05, -2.6, 2.85, -2.6];
var EA_HAMMER_ANG = [-0.95, -2.35, 0.55];

/** Feathered wing: a fan of primaries from the shoulder, light on top, darker underneath. */
function _eaWing(g, ang) {
  const sx = 13.2, sy = 16.8, W = EA_RAMPS.wing;
  const fan = [[-0.55, 6.6, 0.55], [-0.2, 8.4, 0.75], [0.15, 9.2, 0.9], [0.48, 8.2, 0.65]];
  for (const [da, len, lit] of fan) {
    const a = ang + da, cx = sx + Math.cos(a) * len / 2, cy = sy + Math.sin(a) * len / 2;
    eaEllipse(g, cx, cy, len / 2 + 0.6, 1.75, (u, v, x, y) => (Math.abs(v) > 0.72 && u > -0.2 ? W[1] : eaRamp(W, lit - v * 0.18 + u * 0.06, x, y, 0)), a);
  }
  eaEllipse(g, sx + Math.cos(ang) * 1.6, sy + Math.sin(ang) * 1.6, 3.0, 2.4, (u, v, x, y) => eaRamp(W, 0.8 - v * 0.2, x, y, 0), ang);   // coverts
}
function _eaHammer(g, ang) {
  const hx = 23.6, hy = 19.2, d = [Math.cos(ang), Math.sin(ang)];
  const pp = [-d[1] * 0.5, d[0] * 0.5];
  for (let s = 0; s <= 7; s += 0.35) {                          // 2px wooden handle, lit edge on top
    eaSet(g, hx + d[0] * s - pp[0], hy + d[1] * s - pp[1], EA_RAMPS.wood[2]);
    eaSet(g, hx + d[0] * s + pp[0], hy + d[1] * s + pp[1], EA_RAMPS.wood[1]);
  }
  const hcx = hx + d[0] * 8.4, hcy = hy + d[1] * 8.4, S = EA_RAMPS.steel;
  // head: perpendicular to the handle — lit top face, darker body, dark striking faces at both ends
  eaQuad(g, hcx, hcy, ang, 2.1, 3.6, (u, v) => (Math.abs(v) > 0.72 ? S[1] : u < -0.35 ? S[4] : u < 0.3 ? S[3] : S[2]));
}
function eaMonkeyGrid(wing, hammer, hat) {
  const g = eaGrid(EA_MONKEY_W, EA_MONKEY_H), F = EA_RAMPS.fur, Fc = EA_RAMPS.face;
  _eaWing(g, EA_WING_ANG[wing]);
  if (hammer === 1) _eaHammer(g, EA_HAMMER_ANG[1]);          // raised behind the head
  // tail curl
  [[13, 21], [12, 22], [11, 22], [10, 21.5], [9.5, 20.5], [9.6, 19.4], [10.5, 18.8], [11.4, 19.2]].forEach(([x, y]) => eaEllipse(g, x, y, 0.95, 0.95, F[1]));
  eaBall(g, 17, 20.5, 4.8, 4.6, F);                             // body
  eaBall(g, 18.2, 21.3, 2.7, 3.0, Fc, 0, 0.12);                 // belly
  eaBall(g, 15.2, 25.2, 1.9, 1.3, F);                           // feet
  eaBall(g, 19.6, 25.2, 1.9, 1.3, F);
  eaBall(g, 10.8, 12.2, 2.4, 2.4, F);                           // back ear
  eaEllipse(g, 11, 12.4, 1.2, 1.3, Fc[0]);
  eaBall(g, 17, 11.6, 6.6, 6.0, F);                             // head
  eaBall(g, 23.6, 12.2, 1.9, 2.1, F);                           // front ear
  eaEllipse(g, 23.5, 12.3, 0.9, 1.1, Fc[0]);
  // face mask: two eye patches + muzzle (3/4 view to the right)
  const mask = (u, v, x, y) => eaRamp(Fc, 0.74 - v * 0.2 + u * 0.04, x, y, 0);
  eaEllipse(g, 17.4, 10.9, 2.6, 2.6, mask);
  eaEllipse(g, 21.0, 10.9, 2.4, 2.6, mask);
  eaEllipse(g, 19.5, 14.3, 3.6, 2.5, mask);
  // eyes: white + pupil looking at the egg
  for (const ex of [16.6, 20.3]) {
    eaSet(g, ex, 10, '#ffffff'); eaSet(g, ex + 1, 10, '#140a04');
    eaSet(g, ex, 11, '#140a04'); eaSet(g, ex + 1, 11, '#140a04');
  }
  eaLine(g, 15.6, 8.6, 17.6, 8.6, F[1]); eaLine(g, 19.6, 8.6, 21.4, 8.6, F[1]);   // brows
  eaSet(g, 19.5, 13.2, F[1]); eaSet(g, 21, 13.2, F[1]);         // nostrils
  eaLine(g, 18, 15.4, 21, 15.4, F[0]); eaSet(g, 17.4, 14.8, F[0]); eaSet(g, 21.6, 14.8, F[0]);   // smile
  eaSet(g, 15.6, 13.4, '#e7907a');                               // cheek
  // hats
  if (hat === 'steampunk') {
    eaLine(g, 11, 7.6, 23, 7.6, '#3a2010'); eaLine(g, 11, 8.4, 23, 8.4, '#5a3416');
    for (const gx of [15.6, 19.8]) { eaEllipse(g, gx, 7.4, 2.1, 2.1, EA_RAMPS.brass[2]); eaEllipse(g, gx, 7.4, 1.2, 1.2, '#7fd6e0'); eaSet(g, gx - 0.8, 6.7, '#e8ffff'); }
  } else if (hat === 'princess') {
    const gd = EA_RAMPS.gold;
    eaLine(g, 13, 5.6, 21, 5.6, gd[4]); eaLine(g, 13, 6.4, 21, 6.4, gd[3]);
    [[13.4, 4.6], [15.4, 3.6], [17.4, 2.6], [19.4, 3.6], [21, 4.6]].forEach(([x, y]) => { eaSet(g, x, y, gd[6]); eaSet(g, x, y + 1, gd[5]); });
    eaSet(g, 17.4, 4.6, '#ff4f8b'); eaSet(g, 17.4, 5.6, '#c0185b');
  } else if (hat === 'odin') {
    eaEllipse(g, 17, 7.2, 6.6, 3.6, (u, v, x, y) => (y < 8 ? eaRamp(EA_RAMPS.steel, 0.75 - v * 0.3 - u * 0.15, x, y) : null));
    eaLine(g, 10.6, 8, 23.4, 8, EA_RAMPS.steel[1]);
    [[10, 6], [9, 5], [8.6, 3.8], [9, 2.8]].forEach(([x, y]) => eaSet(g, x, y, '#efe4c6'));
    [[24, 6], [25, 5], [25.4, 3.8], [25, 2.8]].forEach(([x, y]) => eaSet(g, x, y, '#efe4c6'));
    eaEllipse(g, 17.4, 10.6, 1.7, 1.6, '#140a04');               // eye patch
    eaLine(g, 12, 9.2, 22.5, 9.4, '#2a1a10');
  } else if (hat === 'sun_wukong') {
    const gd = EA_RAMPS.gold;
    eaLine(g, 11, 7.2, 23.2, 7.2, gd[5]); eaLine(g, 11, 8, 23.2, 8, gd[3]);
    eaSet(g, 10.4, 8.6, gd[4]); eaSet(g, 9.8, 9.4, gd[3]); eaSet(g, 23.8, 8.6, gd[4]);
    eaSet(g, 17, 7.2, '#ff3b3b');
  }
  if (hammer !== 1) {
    eaBall(g, 22.4, 19.6, 1.9, 1.6, F);                         // arm
    _eaHammer(g, EA_HAMMER_ANG[hammer]);
  } else {
    eaBall(g, 21.6, 17.4, 1.7, 1.8, F);                         // arm up
  }
  eaOutline(g);
  if (hat === 'space') {                                        // glass bubble over the head
    const hg = eaGrid(g.w, g.h);
    eaEllipse(hg, 17.2, 11.4, 9.0, 8.4, (u, v) => (u * u + v * v > 0.86 ? '#d9f8ff' : '#9fe6ff44'));
    for (let i = 0; i < g.c.length; i++) if (hg.c[i]) g.c[i] = (hg.c[i] === '#d9f8ff' || !g.c[i]) ? hg.c[i] : g.c[i];
    [[12.2, 6.6], [13, 5.6], [14, 4.9], [11.6, 7.8]].forEach(([x, y]) => eaSet(g, x, y, '#ffffff'));
    eaLine(g, 13, 20, 21.6, 20, '#8a96a8');                      // collar
  }
  return g;
}
function eaMonkey(wing, hammer, hat, facing, gold) {
  return eaCached('m' + wing + hammer + (hat || '') + facing + (gold ? 'g' : ''), () => {
    let g = eaMonkeyGrid(wing, hammer, hat);
    if (gold) g = eaTint(g, EA_RAMPS.gold);
    return eaCanvas(g, facing < 0);
  });
}

// ---------------------------------------------------------------
// Event creatures + props
// ---------------------------------------------------------------
/** Royal golden goose (as in the Golden Goose skill art), flying right. frame 0..3 */
function eaGoose(frame) {
  return eaCached('goose' + frame, () => {
    const g = eaGrid(40, 30), R = EA_RAMPS.goose;
    const wa = [-2.0, -2.5, 2.7, -2.5][frame];
    // back wing
    for (let i = 2; i >= 0; i--) { const d = 3 + i * 3; eaEllipse(g, 17 + Math.cos(wa + 0.35) * d, 15 + Math.sin(wa + 0.35) * d, 3.6 - i * 0.4, 2, (u, v, x, y) => eaRamp(R, 0.45 - i * 0.08, x, y), wa + 0.35); }
    eaBall(g, 17, 18, 9, 5.4, R);                                // body
    eaEllipse(g, 8, 17, 3, 2, (u, v, x, y) => eaRamp(R, 0.5, x, y), 0.4);   // tail
    for (let s = 0; s < 7; s++) eaEllipse(g, 25 + s * 0.9, 16 - s * 1.1, 2.2, 2.2, (u, v, x, y) => eaRamp(R, eaLight(u, v) + 0.1, x, y));   // neck
    eaBall(g, 32, 8, 3.4, 3.0, R, 0, 0.1);                       // head
    eaEllipse(g, 36.2, 8.8, 2.3, 1.2, '#f08a1c'); eaLine(g, 35, 9.6, 38, 9.6, '#b5560a');   // beak
    eaSet(g, 32.6, 7.2, '#140a04');                              // eye
    // crown
    const gd = EA_RAMPS.gold;
    eaLine(g, 29.6, 4.6, 34, 4.6, gd[3]);
    [[29.6, 3.6], [31.8, 2.8], [34, 3.6]].forEach(([x, y]) => eaSet(g, x, y, gd[6]));
    eaSet(g, 31.8, 3.8, '#ff4f6b');
    eaEllipse(g, 15, 23.6, 1.6, 0.9, '#f08a1c'); eaEllipse(g, 19, 23.6, 1.6, 0.9, '#f08a1c');   // feet
    // front wing
    for (let i = 2; i >= 0; i--) { const d = 2.5 + i * 3.2; eaEllipse(g, 19 + Math.cos(wa) * d, 15 + Math.sin(wa) * d, 4 - i * 0.45, 2.2, (u, v, x, y) => eaRamp(R, 0.85 - i * 0.12 - v * 0.2, x, y), wa); }
    eaOutline(g, '#3a2504');
    return eaCanvas(g, false);
  });
}
/** Shard thief: a crow carrying a sack of shards, flying left. frame 0..3 */
function eaCrow(frame) {
  return eaCached('crow' + frame, () => {
    const g = eaGrid(34, 32), R = EA_RAMPS.crow, S = EA_RAMPS.sack;
    const wa = [-2.0, -2.5, 2.75, -2.5][frame];
    for (let i = 2; i >= 0; i--) { const d = 2.5 + i * 3; eaEllipse(g, 15 + Math.cos(wa + 0.3) * d, 11 + Math.sin(wa + 0.3) * d, 3.4 - i * 0.4, 1.9, (u, v, x, y) => eaRamp(R, 0.3 - i * 0.05, x, y), wa + 0.3); }
    eaEllipse(g, 7, 13.5, 3.4, 1.6, (u, v, x, y) => eaRamp(R, 0.35, x, y), 0.25);   // tail
    eaBall(g, 15, 13, 6.6, 4.2, R);
    eaBall(g, 22.4, 9.6, 3.6, 3.2, R, 0, 0.05);
    eaEllipse(g, 26.6, 10.4, 2.4, 1.0, '#9aa0a8'); eaSet(g, 28.4, 10.6, '#5a6068');
    eaSet(g, 23.2, 8.6, '#ffd93b'); eaSet(g, 23.2, 9.6, '#c99a10');
    // sack hanging from the claws
    eaLine(g, 16, 17, 16, 19, '#2a1a10');
    eaBall(g, 16, 24, 5, 4.4, S);
    eaLine(g, 13.6, 20.4, 18.4, 20.4, S[0]);
    eaSet(g, 15, 23, '#ffe27a'); eaSet(g, 16, 22, '#fff6cf'); eaSet(g, 17, 23, '#f5c542'); eaSet(g, 16, 24, '#c48d12');
    for (let i = 2; i >= 0; i--) { const d = 2.2 + i * 3.1; eaEllipse(g, 16 + Math.cos(wa) * d, 11 + Math.sin(wa) * d, 3.7 - i * 0.45, 2.0, (u, v, x, y) => eaRamp(R, 0.75 - i * 0.12 - v * 0.2, x, y), wa); }
    eaOutline(g, '#05030a');
    return eaCanvas(g, true);
  });
}
function eaBanana(rot) {
  return eaCached('ban' + rot, () => {
    const g = eaGrid(12, 12), B = EA_RAMPS.banana;
    for (let t = 0; t <= 1; t += 0.06) {
      const a = Math.PI * (0.15 + 0.7 * t), x = 6 + Math.cos(a) * 4.2, y = 2.6 + Math.sin(a) * 6;
      const w = 1.4 * Math.sin(Math.PI * t) + 0.4;
      eaEllipse(g, x, y, w, w, (u, v, xx, yy) => eaRamp(B, 0.75 - v * 0.3, xx, yy));
    }
    eaSet(g, 9.5, 3.4, '#5a3a10'); eaSet(g, 2.4, 3.4, '#5a3a10');
    eaOutline(g, '#3a2504');
    if (rot === 0) return eaCanvas(g, false);
    const cv = document.createElement('canvas'); cv.width = 12; cv.height = 12;
    const c = cv.getContext('2d'); c.translate(6, 6); c.rotate(rot * Math.PI / 2); c.drawImage(eaCanvas(g, false), -6, -6);
    return cv;
  });
}
/** Golden shard (the currency). size 'sm' 7px · 'lg' 11px */
function eaShardGrid(big) {
  const n = big ? 11 : 7, g = eaGrid(n, n), h = (n - 1) / 2, R = EA_RAMPS.gold;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = Math.abs(x - h), dy = Math.abs(y - h) * 0.72;
    if (dx + dy > h * 0.9) continue;
    const facet = (x <= h ? 0.25 : -0.1) + (y <= h ? 0.2 : -0.15);
    eaSet(g, x, y, eaRamp(R, 0.6 + facet, x, y, 0));
  }
  eaSet(g, h - 1, h - 1, '#ffffff');
  eaOutline(g, '#3a2504');
  return g;
}
function eaShard(big) { return eaCached('shard' + (big ? 'L' : 'S'), () => eaCanvas(eaShardGrid(big), false)); }
/** 4-point impact star. size 0 small · 1 big */
function eaImpact(size, col) {
  return eaCached('imp' + size + col, () => {
    const n = size ? 13 : 9, g = eaGrid(n, n), h = (n - 1) / 2;
    for (let i = -h; i <= h; i++) { eaSet(g, h + i, h, col); eaSet(g, h, h + i, col); }
    for (let i = -Math.floor(h / 2); i <= Math.floor(h / 2); i++) { eaSet(g, h + i, h + i, col); eaSet(g, h + i, h - i, col); }
    eaSet(g, h, h, '#ffffff'); eaSet(g, h - 1, h, '#ffffff'); eaSet(g, h + 1, h, '#ffffff'); eaSet(g, h, h - 1, '#ffffff'); eaSet(g, h, h + 1, '#ffffff');
    return eaCanvas(g, false);
  });
}

// ---------------------------------------------------------------
// THE EGG — ornate shell, one look per tier, cracks that grow
// ---------------------------------------------------------------
/** Shell tier for a layer number (every 10 layers). */
function eaTierFor(layer) { return Math.max(0, Math.min(EA_TIERS.length - 1, Math.floor((layer - 1) / 10))); }

/** Is (x,y) inside an egg of half-width rx / half-height ry centred at (cx,cy)? Returns sphere normal or null. */
function eaEggNormal(x, y, cx, cy, rx, ry) {
  const ny = (y + 0.5 - cy) / ry;
  if (ny < -1 || ny > 1) return null;
  const half = rx * Math.sqrt(1 - ny * ny) * (1 + 0.17 * ny);   // narrow top, full bottom
  if (half <= 0) return null;
  const nx0 = (x + 0.5 - cx) / half;
  if (nx0 < -1 || nx0 > 1) return null;
  const sx = nx0 * Math.sqrt(1 - ny * ny);                       // sphere-space x
  return { u: nx0, sx, ny };
}

/** Crack paths for a layer (seeded): [[x,y]…] in egg-local coords (-1..1). */
function eaCrackPaths(layer) {
  const rnd = eaRng(layer * 7919 + 17), out = [];
  for (let c = 0; c < 8; c++) {
    let a = rnd() * Math.PI * 2, r = 0.92, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.95;
    const pts = [[x, y]];
    let dir = a + Math.PI + (rnd() - 0.5) * 0.9;
    const n = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      dir += (rnd() - 0.5) * 1.1;
      const step = 0.1 + rnd() * 0.08;
      x += Math.cos(dir) * step; y += Math.sin(dir) * step;
      pts.push([x, y]);
      if (rnd() < 0.25 && i > 1) {                               // a short branch
        const bd = dir + (rnd() < 0.5 ? 1 : -1) * (0.7 + rnd() * 0.5);
        pts.push([x + Math.cos(bd) * 0.1, y + Math.sin(bd) * 0.1], [x, y]);
      }
    }
    out.push(pts);
  }
  return out;
}

/**
 * The egg grid — a jewelled treasure egg. `dmg` 0..1 = damage on the current
 * layer (cracks grow with it, glowing from inside). `flash` = white hit
 * silhouette. rx/ry in art pixels. Ornaments are curves in egg space that bow
 * downward in the middle, as if seen slightly from above.
 */
function eaEggGrid(layer, rx, ry, dmg, flash) {
  const T = EA_TIERS[eaTierFor(layer)], R = T.ramp, top = R.length - 1;
  const W = Math.ceil(rx * 2 + 4), H = Math.ceil(ry * 2 + 4), cx = W / 2, cy = H / 2;
  const g = eaGrid(W, H), N = {};
  const rnd = eaRng(layer * 31 + 5);
  const star = {};
  if (T.stars) for (let i = 0; i < 34; i++) star[Math.floor(rnd() * W) + ',' + Math.floor(rnd() * H)] = rnd() < 0.3 ? '#ffffff' : '#9ff4ff';
  const bow = (u, base, k) => base + k * (1 - u * u);
  const onCurve = (ny, y0, w) => Math.abs(ny - y0) * ry < (w || 0.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = eaEggNormal(x, y, cx, cy, rx, ry);
    if (!n) continue;
    N[x + ',' + y] = n;
    if (flash) { eaSet(g, x, y, '#ffffff'); continue; }
    // lighting: strong form — bright upper-left, deep terminator lower-right
    let t = Math.pow(Math.max(0, (eaLight(n.sx, n.ny) - 0.1) * 1.15), 1.45);   // gamma: only a cap reaches the palest gold
    if (n.ny > 0.5) t -= (n.ny - 0.5) * 0.4;                   // contact shadow in the nest
    const li = Math.max(0, Math.min(top, Math.round(t * top)));
    let col = eaRamp(R, t, x, y, 0.45);
    // glossy window reflection down the left side
    if (n.sx < -0.7 && n.sx > -0.86 && n.ny > -0.55 && n.ny < 0.05) col = R[Math.min(top, li + 2)];
    // jewelled belt: lit lip, dark groove, shadow under
    const yb = bow(n.u, 0.06, 0.08);
    const d = (n.ny - yb) * ry;
    if (d > -2 && d <= -1) col = R[Math.min(top, li + 2)];
    else if (d > -1 && d <= 1) col = R[Math.max(0, li - 2)];
    else if (d > 1 && d <= 2) col = R[Math.max(0, li - 3)];
    // garland: thin ring with scallops hanging from it
    const yu = bow(n.u, -0.44, 0.06);
    const sc = yu + 0.1 * Math.abs(Math.sin(Math.PI * (n.u + 1) / 0.36));
    if (onCurve(n.ny, yu, 0.5) || onCurve(n.ny, sc, 0.55)) col = R[Math.max(0, li - 2)];
    if (onCurve(n.ny, yu - 1 / ry, 0.5)) col = R[Math.min(top, li + 1)];
    // beaded lower ring
    const yl = bow(n.u, 0.6, 0.05);
    if (onCurve(n.ny, yl, 0.5)) col = R[Math.max(0, li - 2)];
    if (onCurve(n.ny, yl + 1.5 / ry, 0.5) && x % 3 === 0) col = R[Math.min(top, li + 2)];
    if (star[x + ',' + y] && t < 0.7) col = star[x + ',' + y];
    eaSet(g, x, y, col);
  }
  if (!flash) {
    if (T.veins) {                                               // molten gold veins in a dark shell
      const vr = eaRng(layer * 13 + 3);
      for (let k = 0; k < 6; k++) {
        let a = vr() * Math.PI * 2, x = cx + Math.cos(a) * rx * 0.85, y = cy + Math.sin(a) * ry * 0.85, dir = a + Math.PI + (vr() - 0.5);
        for (let i = 0; i < 16; i++) {
          if (eaGet(g, Math.round(x), Math.round(y))) eaSet(g, x, y, i % 4 === 0 ? '#fff1a8' : T.veins);
          dir += (vr() - 0.5) * 0.9; x += Math.cos(dir) * 1.3; y += Math.sin(dir) * 1.3;
        }
      }
    }
    const at = (u, ny) => {
      const half = rx * Math.sqrt(Math.max(0, 1 - ny * ny)) * (1 + 0.17 * ny);
      return [Math.round(cx + u * half - 0.5), Math.round(cy + ny * ry - 0.5)];
    };
    // pearls between the gems, cabochon gems on the belt
    for (const u of [-0.9, -0.45, 0, 0.45, 0.9]) {
      const [x, y] = at(u, bow(u, 0.06, 0.08));
      eaSet(g, x, y, '#fffaf0'); eaSet(g, x + 1, y, '#d8cfc0');
    }
    const G = T.gem;
    for (const u of [-0.68, -0.22, 0.22, 0.68]) {
      const [x, y] = at(u, bow(u, 0.06, 0.08)), big = Math.abs(u) < 0.5;
      const r = big ? 2.3 : 1.6;
      eaEllipse(g, x + 0.5, y + 0.5, r * (big ? 1 : 0.8), r, (uu, vv, xx, yy) => (uu + vv < -0.6 ? G[2] : uu + vv > 0.7 ? G[0] : G[1]));
      eaSet(g, x - (big ? 1 : 0), y - (big ? 1 : 1), G[3]);
      if (big) { eaSet(g, x - 2, y, R[1]); eaSet(g, x + 2, y, R[1]); eaSet(g, x, y - 2, R[1]); eaSet(g, x, y + 2, R[1]); }   // gold setting
    }
    // apex jewel
    const [ax, ay] = at(0, -0.9);
    eaSet(g, ax, ay, G[2]); eaSet(g, ax + 1, ay, G[1]); eaSet(g, ax, ay + 1, G[1]); eaSet(g, ax + 1, ay + 1, G[0]); eaSet(g, ax, ay - 1, R[top]);
    // specular: soft highlight + crisp core
    eaEllipse(g, cx - rx * 0.4, cy - ry * 0.5, Math.max(1.6, rx * 0.15), Math.max(2.6, ry * 0.2), (u, v, x, y) => (u * u + v * v < 0.4 ? R[top] : (eaGet(g, x, y) && _eaBayer(x, y) < 0.5 ? R[top] : null)), -0.45);
    eaSet(g, cx - rx * 0.44, cy - ry * 0.56, '#ffffff'); eaSet(g, cx - rx * 0.44, cy - ry * 0.56 + 1, '#ffffff'); eaSet(g, cx - rx * 0.44 + 1, cy - ry * 0.56, '#ffffff');
    // rim light from the aura along the right/bottom edge
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = N[x + ',' + y];
      if (!n || n.sx < 0.55 || n.ny < -0.35) continue;
      if (!N[(x + 1) + ',' + y] || !N[x + ',' + (y + 1)]) eaSet(g, x, y, T.aura);
    }
    // cracks that grow with damage, glowing from inside
    const paths = eaCrackPaths(layer);
    let budget = 0;
    paths.forEach(p => { budget += p.length - 1; });
    let left = Math.floor(Math.max(0, Math.min(1, dmg)) * budget);
    const core = '#fff1a8';
    for (const p of paths) {
      for (let i = 1; i < p.length && left > 0; i++, left--) {
        const x0 = cx + p[i - 1][0] * rx * 0.88, y0 = cy + p[i - 1][1] * ry * 0.88, x1 = cx + p[i][0] * rx * 0.88, y1 = cy + p[i][1] * ry * 0.88;
        const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
        for (let s2 = 0; s2 <= steps; s2++) {
          const x = Math.round(x0 + (x1 - x0) * s2 / steps), y = Math.round(y0 + (y1 - y0) * s2 / steps);
          if (!N[x + ',' + y]) continue;
          eaSet(g, x, y, i === 1 && s2 === 0 ? R[0] : core);
          // dark lips on every side the glow doesn't already cover
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const k = (y + oy) * W + x + ox;
            if (N[(x + ox) + ',' + (y + oy)] && g.c[k] !== core) g.c[k] = oy < 0 || ox < 0 ? R[1] : R[0];
          }
        }
      }
    }
  }
  eaOutline(g, flash ? '#ffffff' : '#160c02');
  return g;
}
function eaEgg(layer, rx, ry, dmg, flash) {
  const crackStep = Math.floor(Math.max(0, Math.min(1, dmg)) * 60);   // re-render only when cracks visibly grow
  return eaCached('egg' + layer + ':' + rx + ':' + ry + ':' + crackStep + (flash ? 'F' : ''), () => eaCanvas(eaEggGrid(layer, rx, ry, crackStep / 60, flash), false));
}
/** Free the egg cache entries (they are per layer/size). */
function eaFlushEggs() { for (const k in _eaCache) if (k.indexOf('egg') === 0) delete _eaCache[k]; }

/** Stepped glow around the egg: three egg-shaped bands of the tier colour. k 0..2 = pulse. */
function eaAura(color, rx, ry, k) {
  return eaCached('aura' + color + rx + ':' + ry + ':' + k, () => {
    const ext = 1.75 + k * 0.08, W = Math.ceil(rx * ext * 2 + 4), H = Math.ceil(ry * ext * 2 + 4), cx = W / 2, cy = H / 2;
    const g = eaGrid(W, H), c = color.replace('#', '');
    const bands = [[1.16 + k * 0.03, '70'], [1.38 + k * 0.05, '38'], [ext, '18']];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ny = (y + 0.5 - cy) / ry, half = rx * (1 + 0.17 * Math.max(-1, Math.min(1, ny)));
      const d = Math.hypot((x + 0.5 - cx) / half, ny);
      for (const [lim, a] of bands) if (d <= lim) { eaSet(g, x, y, '#' + c + a); break; }
    }
    return eaCanvas(g, false);
  });
}

/** Woven golden nest, split in back/front halves so the egg sits inside it. */
function eaNest(rx, part) {
  return eaCached('nest' + rx + part, () => {
    const ry = Math.max(5, Math.round(rx * 0.24)), W = Math.ceil(rx * 2 + 8), H = ry * 2 + 6, cx = W / 2, cy = H / 2;
    const g = eaGrid(W, H), N = EA_RAMPS.nest, rnd = eaRng(4242 + rx);
    eaEllipse(g, cx, cy, rx, ry, (u, v, x, y) => {
      const inner = u * u / 0.62 + (v + 0.55) * (v + 0.55) / 0.5 < 1;     // hollow top
      if (inner) return null;
      const weave = Math.sin(x * 0.9 + y * 2.3) + Math.sin(x * 0.45 - y * 1.7);
      return eaRamp(N, 0.42 - v * 0.28 + weave * 0.12, x, y);
    });
    for (let i = 0; i < 40; i++) {                                // loose straws
      const x = cx + (rnd() * 2 - 1) * rx * 0.95, y = cy + (rnd() * 2 - 1) * ry * 0.7, len = 2 + rnd() * 4, a = (rnd() - 0.5) * 0.7;
      if (!eaGet(g, Math.round(x), Math.round(y))) continue;
      eaLine(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, rnd() < 0.5 ? N[5] : N[1]);
    }
    for (const [sx, dir] of [[cx - rx + 1, -1], [cx + rx - 2, 1]]) eaLine(g, sx, cy - 1, sx + dir * 4, cy - 3, N[3]);   // twigs
    eaOutline(g, '#1c0f06');
    if (part === 'back') { for (let y = Math.round(cy); y < H; y++) for (let x = 0; x < W; x++) g.c[y * W + x] = null; }
    else { for (let y = 0; y < Math.round(cy); y++) for (let x = 0; x < W; x++) g.c[y * W + x] = null; }
    return eaCanvas(g, false);
  });
}

/** Painted backdrop for a w×h art-pixel scene: night sky, moon, hills, distant peaks. */
function eaBackdrop(w, h, horizon) {
  return eaCached('bg' + w + 'x' + h + ':' + horizon, () => {
    const g = eaGrid(w, h), rnd = eaRng(99);
    const sky = ['#0a0820', '#120e33', '#1c1548', '#281d5c', '#35266b', '#46307a'];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) eaSet(g, x, y, eaRamp(sky, (y / horizon) * 0.95, x, y));
    // moon
    const mx = Math.round(w * 0.82), my = Math.round(h * 0.17), mr = Math.max(5, Math.round(h * 0.07));
    eaEllipse(g, mx, my, mr + 3, mr + 3, (u, v, x, y) => (_eaBayer(x, y) < 0.22 ? '#3d3170' : null));
    eaEllipse(g, mx, my, mr, mr, (u, v, x, y) => eaRamp(['#cfc39a', '#e9dfb8', '#fff6d8'], eaLight(u, v), x, y));
    [[-0.3, -0.2, 1.2], [0.35, 0.25, 1], [-0.1, 0.45, 0.8]].forEach(([u, v, r]) => eaEllipse(g, mx + u * mr, my + v * mr, r, r, '#c4b78c'));
    // distant peaks
    let ph = horizon - h * 0.12;
    for (let x = 0; x < w; x++) {
      ph += (rnd() - 0.5) * 2.2; ph = Math.max(horizon - h * 0.24, Math.min(horizon - h * 0.04, ph));
      for (let y = Math.round(ph); y < h; y++) eaSet(g, x, y, y === Math.round(ph) ? '#4a3a7a' : '#2c2152');
    }
    // near hill (where the nest sits)
    for (let x = 0; x < w; x++) {
      const t = (x - w / 2) / (w * 0.75);
      const top = Math.round(horizon + t * t * h * 0.5);
      for (let y = top; y < h; y++) eaSet(g, x, y, y === top ? '#2f6a63' : y === top + 1 ? '#1f4a4a' : eaRamp(['#0c1626', '#132238', '#1a2d45'], 0.6 - (y - top) / (h - top), x, y));
      if (rnd() < 0.18) { eaSet(g, x, top - 1, '#3f8a77'); }
    }
    return eaCanvas(g, false);
  });
}
/** Little drifting cloud. */
function eaCloud(i) {
  return eaCached('cloud' + i, () => {
    const rnd = eaRng(300 + i), w = 26 + Math.floor(rnd() * 14), g = eaGrid(w, 12);
    for (let k = 0; k < 5; k++) eaEllipse(g, 4 + rnd() * (w - 8), 6 + rnd() * 2, 3 + rnd() * 4, 2.5 + rnd() * 1.5, (u, v, x, y) => (v < -0.1 ? '#5b4a8f' : '#3e3272'));
    return eaCanvas(g, false);
  });
}

// ---------------------------------------------------------------
// UI icons (12×12 art pixels, shown at 2×) — upgrade cards, HUD
// ---------------------------------------------------------------
function eaIconGrid(name) {
  const g = eaGrid(12, 12);
  if (name === 'swarm') {
    eaBall(g, 6, 6.5, 4.4, 4.2, EA_RAMPS.fur); eaBall(g, 1.8, 6, 1.3, 1.4, EA_RAMPS.fur); eaBall(g, 10.2, 6, 1.3, 1.4, EA_RAMPS.fur);
    eaEllipse(g, 4.7, 6, 1.6, 1.7, EA_RAMPS.face[2]); eaEllipse(g, 7.3, 6, 1.6, 1.7, EA_RAMPS.face[2]); eaEllipse(g, 6, 8.4, 2.4, 1.5, EA_RAMPS.face[2]);
    eaSet(g, 4.6, 5.6, '#140a04'); eaSet(g, 7.4, 5.6, '#140a04'); eaLine(g, 5, 9, 7, 9, EA_RAMPS.fur[0]);
  } else if (name === 'power') {
    for (let s = 0; s < 7; s++) eaSet(g, 2 + s, 10 - s, EA_RAMPS.wood[1 + (s % 2)]);
    eaQuad(g, 8.2, 3.8, -0.785, 1.6, 3.2, (u, v, x, y) => eaRamp(EA_RAMPS.steel, 0.6 - v * 0.3, x, y));
  } else if (name === 'wings') {
    for (const [da, len, lit] of [[-0.6, 7, 0.6], [-0.2, 9, 0.75], [0.2, 9.6, 0.9], [0.55, 8, 0.7]]) {
      const a = -2.3 + da; eaEllipse(g, 9.6 + Math.cos(a) * len / 2, 9.6 + Math.sin(a) * len / 2, len / 2 + 0.4, 1.4, (u, v, x, y) => eaRamp(EA_RAMPS.wing, lit - v * 0.2, x, y, 0), a);
    }
    eaEllipse(g, 9.4, 9.4, 2.2, 1.8, EA_RAMPS.wing[2], -2.3);
  } else if (name === 'luck') {
    const L = ['#1d5c2a', '#2e8a3e', '#4cbf5a', '#9bea8f'];
    eaLine(g, 6, 6, 8.6, 11.4, '#1d5c2a');
    for (const [x, y] of [[3.9, 3.9], [8.1, 3.9], [3.9, 8.1], [8.1, 8.1]]) eaBall(g, x, y, 2.1, 2.1, L, 0, 0.1, 0);
    eaLine(g, 6, 1.6, 6, 10.4, '#1d5c2a'); eaLine(g, 1.6, 6, 10.4, 6, '#1d5c2a');
    eaSet(g, 6, 6, '#9bea8f');
  } else if (name === 'tap') {
    const Y = '#ffe27a';
    for (let i = -5; i <= 5; i++) { eaSet(g, 6 + i, 6, Y); eaSet(g, 6, 6 + i, Y); }
    for (let i = -3; i <= 3; i++) { eaSet(g, 6 + i, 6 + i, '#f5a742'); eaSet(g, 6 + i, 6 - i, '#f5a742'); }
    eaEllipse(g, 6.5, 6.5, 2, 2, '#ffffff');
  } else if (name === 'magnet') {
    eaEllipse(g, 6, 5, 4.6, 4.2, (u, v, x, y) => (u * u + v * v > 0.25 && v < 0.6 ? eaRamp(['#7a0f16', '#c41f2a', '#ff5a5a'], 0.6 - v * 0.3 - u * 0.2, x, y) : null));
    for (const x of [1.6, 2.6, 9.4, 10.4]) for (const y of [8, 9, 10]) eaSet(g, x, y, y === 10 ? EA_RAMPS.steel[1] : EA_RAMPS.steel[3]);
  } else if (name === 'scroll') {
    eaQuad(g, 6, 6, 0, 3.6, 4.4, (u, v, x, y) => eaRamp(['#a8814a', '#d9b77a', '#f2dcab'], 0.7 - u * 0.15, x, y));
    eaEllipse(g, 6, 1.6, 4.6, 1.3, '#b8915a'); eaEllipse(g, 6, 10.4, 4.6, 1.3, '#b8915a');
    for (const y of [4, 6, 8]) eaLine(g, 4, y, 8, y, '#8a6a3a');
    eaSet(g, 6, 10.4, '#c41f2a');
  }
  eaOutline(g);
  return g;
}
/** Data URL for an icon, upscaled `s`× with hard pixels (for <img>). */
function eaIconUrl(name, s) {
  return eaCached('url' + name + (s || 2), () => {
    const src = name === 'shard' ? eaCanvas(eaShardGrid(false), false) : name === 'flyer' ? eaMonkey(0, 0, '', 1, true) : eaCanvas(eaIconGrid(name), false);
    const k = s || 2, cv = document.createElement('canvas');
    cv.width = src.width * k; cv.height = src.height * k;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    c.drawImage(src, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/png');
  });
}
