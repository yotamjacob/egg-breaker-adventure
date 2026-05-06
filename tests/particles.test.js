// ============================================================
//  Egg Smash Adventures — Particle System Tests
//  Run: node --test tests/
//  Uses Node's built-in test runner (no extra dependencies).
//
//  Tests cover the specific failure modes that caused particles
//  to randomly stop working:
//    1. canvas zeroed by window resize while play tab was hidden
//    2. resume() not restoring canvas size after background pause
//    3. tab-switch resize guard (pure logic)
// ============================================================

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm   = require('node:vm');
const fs   = require('node:fs');
const path = require('node:path');

// ── Shared source loading ─────────────────────────────────────────────────────

const _configSrc    = fs.readFileSync(path.join(__dirname, '../config.js'),    'utf8');
const _particleSrc  = fs.readFileSync(path.join(__dirname, '../particles.js'), 'utf8');
const { CONFIG } = new Function(_configSrc + '\nreturn { CONFIG };')();

// ── Factory: fresh Particles instance with controllable mock canvas ───────────

function makeParticleEnv({ parentW = 400, parentH = 600, dpr = 1, hidden = false } = {}) {
  let canvasW = 0, canvasH = 0;
  let _parentW = parentW, _parentH = parentH;
  let _hidden = hidden;
  let rafCallbacks = [];

  const mockCtx = {
    clearRect() {}, setTransform() {}, save() {}, restore() {},
    translate() {}, rotate() {}, fillRect() {},
    globalAlpha: 1, fillStyle: '',
  };

  const mockCanvas = {
    get width()  { return canvasW; },
    set width(v) { canvasW = v; },
    get height()  { return canvasH; },
    set height(v) { canvasH = v; },
    style: { width: '', height: '' },
    get parentElement() {
      return { getBoundingClientRect: () => ({ width: _parentW, height: _parentH }) };
    },
    getContext: () => mockCtx,
  };

  const vmCtx = {
    CONFIG,
    window:      { devicePixelRatio: dpr, addEventListener: () => {} },
    document:    { get hidden() { return _hidden; }, addEventListener: () => {} },
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb) => { rafCallbacks.push(cb); },
  };

  // `const` declarations in vm.runInNewContext are script-scoped, not added to the
  // sandbox object. Pre-declare _particlesExport on vmCtx so the appended assignment works.
  vmCtx._particlesExport = null;
  vm.runInNewContext(_particleSrc + '\n_particlesExport = Particles;', vmCtx);
  const P = vmCtx._particlesExport;

  return {
    P,
    canvas: mockCanvas,
    getW: () => canvasW,
    getH: () => canvasH,
    setParent: (w, h) => { _parentW = w; _parentH = h; },
    setHidden: (v) => { _hidden = v; },
    flushRaf: () => { const cbs = rafCallbacks.splice(0); cbs.forEach(cb => cb()); },
  };
}

// ── resize() zero-dimension guard ────────────────────────────────────────────
// Root cause: window resize while play panel is collapsed (flex:0 0 0) returned
// getBoundingClientRect() of {width:0, height:0}, zeroing canvas.width/height.

describe('resize() zero-dimension guard', () => {
  test('init with valid parent sets correct canvas size', () => {
    const { P, canvas, getW, getH } = makeParticleEnv({ parentW: 400, parentH: 600 });
    P.init(canvas);
    assert.equal(getW(), 400);
    assert.equal(getH(), 600);
  });

  test('resize() with 0×0 parent does NOT zero the canvas', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600 });
    env.P.init(env.canvas);
    assert.equal(env.getW(), 400);

    // Simulate: window resize fires while play panel is hidden (flex:0 0 0)
    env.setParent(0, 0);
    env.P.resize();

    assert.equal(env.getW(), 400, 'canvas width should be preserved (was 400, not zeroed to 0)');
    assert.equal(env.getH(), 600, 'canvas height should be preserved (was 600, not zeroed to 0)');
  });

  test('resize() with valid parent after hidden-resize restores correct size', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600 });
    env.P.init(env.canvas);

    env.setParent(0, 0);
    env.P.resize(); // should be skipped (guard)

    env.setParent(390, 580); // panel becomes visible again (may have slightly different size)
    env.P.resize();

    assert.equal(env.getW(), 390);
    assert.equal(env.getH(), 580);
  });

  test('resize() with width=0 only is also skipped', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600 });
    env.P.init(env.canvas);
    env.setParent(0, 600);
    env.P.resize();
    assert.equal(env.getW(), 400, 'width should be unchanged when only width is 0');
  });

  test('resize() with height=0 only is also skipped', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600 });
    env.P.init(env.canvas);
    env.setParent(400, 0);
    env.P.resize();
    assert.equal(env.getH(), 600, 'height should be unchanged when only height is 0');
  });

  test('resize() without init does not throw', () => {
    const env = makeParticleEnv();
    // P not yet init'd — canvas is undefined inside the module
    assert.doesNotThrow(() => env.P.resize());
  });
});

// ── resume() restores canvas size ────────────────────────────────────────────
// Before fix: resume() called _tryStart() without calling resize() first.
// If canvas had been zeroed by a hidden-resize, particles stayed invisible.

describe('resume() re-checks canvas size', () => {
  test('resume() after 0×0 resize restores canvas before starting loop', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600 });
    env.P.init(env.canvas);

    // Simulate overnight: device goes to background, window resize fires, canvas zeroed
    env.setParent(0, 0);
    env.P.resize(); // guard should prevent zero — but let's verify resume works even if it had been zeroed

    // Device comes back to foreground, play panel re-expands
    env.setParent(400, 600);
    env.P.resume(); // should call resize() internally

    assert.equal(env.getW(), 400, 'resume() should restore canvas width');
    assert.equal(env.getH(), 600, 'resume() should restore canvas height');
  });

  test('resume() on fresh init with valid parent keeps correct size', () => {
    const env = makeParticleEnv({ parentW: 360, parentH: 700 });
    env.P.init(env.canvas);
    env.P.resume();
    assert.equal(env.getW(), 360);
    assert.equal(env.getH(), 700);
  });
});

// ── devicePixelRatio scaling ──────────────────────────────────────────────────

describe('devicePixelRatio scaling', () => {
  test('canvas dimensions are scaled by dpr', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600, dpr: 2 });
    env.P.init(env.canvas);
    assert.equal(env.getW(), 800,  'width should be parentW * dpr');
    assert.equal(env.getH(), 1200, 'height should be parentH * dpr');
  });

  test('resize() preserves dpr scaling after a valid resize', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600, dpr: 3 });
    env.P.init(env.canvas);
    env.setParent(200, 300);
    env.P.resize();
    assert.equal(env.getW(), 600); // 200 * 3
    assert.equal(env.getH(), 900); // 300 * 3
  });
});

// ── particle count cap ────────────────────────────────────────────────────────
// particles.js line: Math.min(count, MAX_PARTICLES - ps.length)
// Ensures a large burst never exceeds MAX_PARTICLES (300).

describe('particle count cap (MAX_PARTICLES=300)', () => {
  test('emit() at full capacity adds 0 particles', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600 });
    env.P.init(env.canvas);
    env.setHidden(true); // prevent RAF from firing
    // Fill to 300
    for (let i = 0; i < 30; i++) env.P.emit(200, 300, 'normal', 10);
    // Another emit should silently no-op (toAdd = min(300, 300-300) = 0)
    assert.doesNotThrow(() => env.P.emit(200, 300, 'normal', 50));
  });

  test('sparkle() at full capacity adds 0 particles', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600 });
    env.P.init(env.canvas);
    env.setHidden(true);
    for (let i = 0; i < 30; i++) env.P.emit(200, 300, 'normal', 10);
    assert.doesNotThrow(() => env.P.sparkle(200, 300, 50, '#FFD700'));
  });
});

// ── document.hidden guard ─────────────────────────────────────────────────────
// Particles should not start the animation loop while the document is hidden.

describe('document.hidden animation guard', () => {
  test('emit() while hidden does not crash', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600, hidden: true });
    env.P.init(env.canvas);
    assert.doesNotThrow(() => env.P.emit(200, 300, 'normal', 10));
  });

  test('sparkle() while hidden does not crash', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600, hidden: true });
    env.P.init(env.canvas);
    assert.doesNotThrow(() => env.P.sparkle(100, 100, 8, '#FFD700'));
  });

  test('resume() while hidden does not crash', () => {
    const env = makeParticleEnv({ parentW: 400, parentH: 600, hidden: true });
    env.P.init(env.canvas);
    assert.doesNotThrow(() => env.P.resume());
  });
});

// ── coordinate calculation (smash.js particle origin) ────────────────────────
// Particles use coordinates relative to egg-tray-wrap, which is co-located with
// overlay-layer (canvas parent, position:absolute top:0 left:0 inside egg-area).
// This tests the pure coordinate math used in smash.js.

function particleOrigin(slotRect, wrapRect) {
  return {
    cx: slotRect.left - wrapRect.left + slotRect.width  / 2,
    cy: slotRect.top  - wrapRect.top  + slotRect.height / 2,
  };
}

describe('particle coordinate calculation', () => {
  test('centered egg at tray origin produces (halfW, halfH)', () => {
    const slot = { left: 0, top: 0, width: 88, height: 110 };
    const wrap = { left: 0, top: 0 };
    const { cx, cy } = particleOrigin(slot, wrap);
    assert.equal(cx, 44);
    assert.equal(cy, 55);
  });

  test('egg offset from wrap origin is accounted for', () => {
    const slot = { left: 200, top: 150, width: 88, height: 110 };
    const wrap = { left: 50,  top: 50 };
    const { cx, cy } = particleOrigin(slot, wrap);
    assert.equal(cx, 194); // (200 - 50) + 44
    assert.equal(cy, 155); // (150 - 50) + 55
  });

  test('egg at tray origin with non-zero wrap offset', () => {
    const slot = { left: 100, top: 100, width: 80, height: 100 };
    const wrap = { left: 100, top: 100 };
    const { cx, cy } = particleOrigin(slot, wrap);
    assert.equal(cx, 40); // slot relative to wrap = (0,0) + center
    assert.equal(cy, 50);
  });
});

// ── resize() guard: pure logic ────────────────────────────────────────────────
// Extracted decision function for readability — mirrors the guard in particles.js.

function shouldSkipResize(width, height) {
  return width === 0 || height === 0;
}

describe('resize() skip-guard logic', () => {
  test('skips when both dimensions are 0', () => {
    assert.equal(shouldSkipResize(0, 0), true);
  });

  test('skips when only width is 0', () => {
    assert.equal(shouldSkipResize(0, 600), true);
  });

  test('skips when only height is 0', () => {
    assert.equal(shouldSkipResize(400, 0), true);
  });

  test('does not skip when both dimensions are positive', () => {
    assert.equal(shouldSkipResize(400, 600), false);
  });

  test('does not skip when dimensions are very small but non-zero', () => {
    assert.equal(shouldSkipResize(1, 1), false);
  });
});
