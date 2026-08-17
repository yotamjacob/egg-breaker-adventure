/* ============================================================
   Egg Smash Adventures — POLISHED skin   (served at /polished only)
   polished.js — loaded AFTER bundle.min.js. Replaces makeEggSVG at
   runtime; the bundle is untouched. Delete with polished.css to revert.

   The egg is drawn the way the reference potion is drawn:
     - one dark, hue-shifted outline (per egg, not universal black)
     - four flat bands: deep → mid → base → light, offset toward the
       key light (top-left) so the shadow crescents fall bottom-right
     - a teal rim crescent on the shadow side (bounce light)
     - two hard white speculars parked on the MID band, right side —
       white on the base tone would vanish on cream/silver eggs
     - a hard cast shadow (the CSS blur is switched off in polished.css)
   Same viewBox / element sizes as the original, so layout, hit areas
   and tests/smash-animation.test.js geometry are unchanged.
   ============================================================ */
(function () {
  'use strict';
  if (typeof makeEggSVG !== 'function' || typeof EGG_REGISTRY === 'undefined') return;

  const RIM = '#79d3c7';
  const SHADOW = '#0c1524';

  // Ramps are designed against the tray field (#1e3a55). Every base tone
  // sits ≥ 3:1 against it; the outline separates the light eggs, the
  // pale outline separates the black one.
  const RAMP = {
    normal:  { ink:'#3b2c15', deep:'#8a6a2e', mid:'#c9a35a', base:'#f1e0b8', light:'#fbf3dd' },
    silver:  { ink:'#1c2531', deep:'#4b5a6e', mid:'#8394a8', base:'#cfd7e1', light:'#eef2f6' },
    gold:    { ink:'#3f2705', deep:'#8a5a08', mid:'#c8900f', base:'#f5c53a', light:'#ffe98a' },
    crystal: { ink:'#2a1657', deep:'#5b2fb3', mid:'#8f66e6', base:'#d9c8ff', light:'#f1eaff' },
    ruby:    { ink:'#2b0510', deep:'#5c0b1c', mid:'#a3162f', base:'#e0243f', light:'#f7808f' },
    black:   { ink:'#6f82a3', deep:'#07070d', mid:'#1a1c28', base:'#2b2f40', light:'#4a5068' },
    century: { ink:'#3f2705', deep:'#8a5a08', mid:'#c8900f', base:'#f5c53a', light:'#fff1b0' },
  };
  function rampFor(type) {
    if (RAMP[type]) return RAMP[type];
    // unknown / future egg: derive from the registry colours
    const c = (EGG_REGISTRY[type] || EGG_REGISTRY.normal).colors;
    return { ink: SHADOW, deep: c.sh, mid: c.s, base: c.f, light: c.h };
  }

  function rect(x, y, w, h, fill, op) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"' +
           (op != null ? ' opacity="' + op + '"' : '') + '/>';
  }
  function ell(cx, cy, rx, ry, fill, op) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' +
           (op != null ? ' opacity="' + op + '"' : '') + '/>';
  }

  makeEggSVG = function (type, damage) {
    const r = rampFor(type);
    const big = type === 'century';
    const W = big ? 100 : 72, H = big ? 120 : 88;

    // cracks in the egg's own ink so they read as part of the drawing
    let cracks = '';
    if (damage >= 1) {
      cracks += rect(36,20,3,3,r.ink) + rect(33,23,3,3,r.ink) + rect(36,26,3,3,r.ink) +
                rect(39,29,3,3,r.ink) + rect(36,32,3,3,r.ink);
    }
    if (damage >= 2) {
      cracks += rect(48,28,3,3,r.ink) + rect(45,31,3,3,r.ink) + rect(48,34,3,3,r.ink) +
                rect(45,37,3,3,r.ink) + rect(24,40,3,3,r.ink) + rect(27,43,3,3,r.ink) +
                rect(24,46,3,3,r.ink) + rect(33,35,3,3,r.ink);
    }

    // century: banded halo (two hard rings) + the original runes
    let halo = '', runes = '';
    if (big) {
      halo = ell(40,50,34,43,r.base,.10) + ell(40,50,31,40,r.base,.10);
      runes = rect(30,30,2,8,r.light,.7) + rect(48,30,2,8,r.light,.7) +
              rect(35,65,10,2,r.light,.6) + rect(38,60,4,2,r.light,.6) +
              rect(26,45,2,6,r.light,.5) + rect(52,45,2,6,r.light,.5);
    }

    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 80 96" shape-rendering="crispEdges">' +
      halo +
      ell(41,89,21,4,SHADOW,.55) +            // hard cast shadow
      ell(40,50,28,37,r.ink) +                // outline
      ell(40,50,26,35,RIM) +                  // teal rim (shows as a crescent bottom-right)
      ell(39,49,25,34,r.deep) +               // deep shadow band
      ell(38,48,23,32,r.mid) +                // mid band
      ell(37,47,20,29,r.base) +               // base
      ell(33,38,8,10,r.light) +               // key-light blob, top-left
      rect(56,38,4,12,'#ffffff') +            // specular pill on the mid band
      rect(57,54,3,4,'#ffffff',.85) +         // small specular
      runes + cracks +
    '</svg>';
  };

  // The bundle already rendered once before this script ran. Redraw the
  // tray with the new eggs — renderEggTray is safe to call again (it runs
  // on every tab switch) and defers itself if the panel has no layout yet.
  function redraw() {
    try { if (typeof renderEggTray === 'function') renderEggTray(); } catch (e) { /* cosmetic only */ }
  }
  if (document.readyState === 'complete') requestAnimationFrame(redraw);
  else window.addEventListener('load', function () { requestAnimationFrame(redraw); });
})();
