// ============================================================
//  Egg Smash Adventures — Smash Animation Tests
//  Run: node --test tests/smash-animation.test.js
//
//  Guards the tap-feedback animation, which broke twice without
//  anything failing, erroring or logging:
//
//   1. v3.2.1 (ef754f5) replaced `slot.classList.add('smashing')`
//      with shake() on the normal smash path. `smashing` drives
//      egg-smash-retro — the squash-and-rotate wiggle. It survived
//      only on the rage/starfall paths. The class and its keyframes
//      stayed in play.css, orphaned, so the CSS looked healthy.
//
//   2. `.egg-slot.idle-wiggle` (0,2,0) silently outranked the
//      `.shake-*` rules (0,1,0), so a tap landing inside an egg's
//      0.5s idle wiggle showed no reaction at all.
//
//  Both are cascade failures: two rules set `animation` on the same
//  element and the loser vanishes with no diagnostic. Source greps
//  cannot catch that — only the RESOLVED style can. So the real
//  assertions below read getComputedStyle().animationName after a
//  genuine tap, which catches any future rule that outranks the
//  smash feedback no matter which file introduces it.
// ============================================================

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// The animation each path is required to resolve to.
const NORMAL_ANIM  = 'egg-smash-retro';  // .egg-slot.smashing
const SPECIAL_ANIM = 'egg-crunch';       // .egg-slot.egg-crunching

// ============================================================
//  1. Source guards — cheap, and they pin the exact regression
// ============================================================
describe('smash animation — source guards', () => {
  const smashSrc  = read('smash.js');
  const playCss   = read('play.css');
  const bundleCss = read('bundle.min.css');
  const bundleJs  = read('bundle.min.js');

  test('the normal smash path still applies the `smashing` class', () => {
    // This is the exact thing ef754f5 deleted. Its absence is invisible at
    // runtime — the egg simply stops reacting.
    const fn = smashSrc.slice(smashSrc.indexOf('function smashEgg'));
    assert.match(
      fn, /punchEgg\(slot\)|classList\.add\('smashing'\)/,
      'smashEgg() no longer applies the `smashing` class — the tap wiggle is gone (see ef754f5)'
    );
  });

  test('punchEgg() restarts the animation rather than just adding the class', () => {
    // Rage batches every 450ms against a 450ms animation, so without the
    // remove → reflow → add dance an egg still mid-wiggle would never restart.
    const gameSrc = read('game.js');
    const fn = gameSrc.slice(gameSrc.indexOf('function punchEgg('));
    const body = fn.slice(0, 500);
    assert.match(body, /classList\.remove\([^)]*'smashing'/, 'punchEgg must clear `smashing` first');
    assert.match(body, /offsetWidth/,                       'punchEgg must force a reflow between remove and add');
    assert.match(body, /classList\.add\('smashing'\)/,      'punchEgg must add `smashing`');
    assert.match(body, /'animationend'/,                    'punchEgg must clear the class on animationend');
  });

  test('no path removes `smashing` on a hardcoded timeout', () => {
    // The animation duration lives in play.css. A timeout that predates a
    // duration change silently truncates the wiggle — this is how the rage
    // and starfall paths ended up showing 55% of it.
    for (const [name, src] of [['game.js', read('game.js')], ['smash.js', smashSrc]]) {
      assert.doesNotMatch(
        src, /setTimeout\(\(\) => \w+\.classList\.remove\('smashing'\)/,
        `${name} removes 'smashing' on a timeout — use punchEgg() so play.css owns the duration`
      );
    }
  });

  test('play.css defines the rule and keyframes `smashing` depends on', () => {
    assert.match(playCss, /\.egg-slot\.smashing\s*\{[^}]*animation:\s*egg-smash-retro/,
      '.egg-slot.smashing must animate egg-smash-retro');
    assert.match(playCss, /@keyframes\s+egg-smash-retro\s*\{/,
      '@keyframes egg-smash-retro is missing');
    assert.match(playCss, /@keyframes\s+egg-crunch\s*\{/,
      '@keyframes egg-crunch is missing');
  });

  test('shake() clears idle-wiggle before applying its own class', () => {
    // Without this the .shake-* rules lose to .egg-slot.idle-wiggle.
    const gameSrc = read('game.js');
    const fn = gameSrc.slice(gameSrc.indexOf('function shake('));
    assert.match(fn.slice(0, 900), /classList\.remove\([^)]*'idle-wiggle'/,
      'shake() must strip idle-wiggle, which outranks the .shake-* rules');
  });

  test('the built bundles are not stale', () => {
    // A correct source with a stale bundle ships the bug anyway.
    assert.match(bundleCss, /\.egg-slot\.smashing\{animation:egg-smash-retro/,
      'bundle.min.css is stale — run `node build.js`');
    assert.match(bundleJs, /classList\.add\("smashing"\)|classList\.add\('smashing'\)/,
      'bundle.min.js is stale — run `node build.js`');
  });
});

// ============================================================
//  2. Resolved-cascade tests — the real guard
// ============================================================
describe('smash animation — resolved cascade', () => {
  let chromium, browser, page, unavailable = null;

  before(async () => {
    try {
      ({ chromium } = require('playwright'));
      browser = await chromium.launch();
    } catch (e) {
      // Missing browser binary is an environment gap, not a product failure.
      // CI installs chromium explicitly so these always run there.
      unavailable = e.message.split('\n')[0];
      return;
    }
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    });
    page = await ctx.newPage();
    await page.goto('file://' + path.join(ROOT, 'index.html'));

    // Wait for the game to finish booting rather than sleeping a fixed time.
    await page.waitForFunction(
      () => typeof G !== 'undefined' && G.roundEggs && G.roundEggs.length > 0 &&
            document.getElementById('egg-tray').children.length > 0,
      null, { timeout: 30_000 }
    );
    // Dismiss onboarding the way a player would. Never remove overlay nodes —
    // updateResources() writes into #overall-pct, which lives inside one.
    await page.evaluate(() => {
      document.querySelectorAll('.overlay:not(.hidden)').forEach(o => o.classList.add('hidden'));
    });
  });

  after(async () => { if (browser) await browser.close(); });

  /**
   * Puts a known egg in slot 0, taps it for real, and reports the animation
   * the cascade actually resolved to plus the transform it produced.
   * `extraClass` simulates a tap landing while another class is live.
   */
  async function tapSlot0({ type = 'normal', extraClass = null } = {}) {
    return page.evaluate(async ({ type, extraClass }) => {
      G.hammers = 500; G.maxH = 500;
      // `_smashing` is a 300ms re-entry lock. It survives between tests and
      // makes smashEgg() early-return, which looks exactly like a dead
      // animation — clear it so each case starts from a known state.
      Object.assign(G.roundEggs[0], {
        type, hp: 5, maxHp: 5, broken: false, expired: false, effects: [],
        _smashing: false,
      });
      renderEggTray();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const slot = document.getElementById('egg-tray').children[0];
      if (extraClass) slot.classList.add(extraClass);

      const started = [];
      const onStart = e => { if (e.target === slot) started.push(e.animationName); };
      document.addEventListener('animationstart', onStart, true);

      slot.click();
      await new Promise(r => setTimeout(r, 80));
      document.removeEventListener('animationstart', onStart, true);

      const cs = getComputedStyle(slot);
      return { resolved: cs.animationName, transform: cs.transform, started };
    }, { type, extraClass });
  }

  test('a tap on a normal egg resolves to the squash-and-rotate wiggle', async (t) => {
    if (unavailable) return t.skip(unavailable);
    const r = await tapSlot0();
    assert.equal(r.resolved, NORMAL_ANIM,
      `tap resolved to "${r.resolved}" — some rule is outranking .egg-slot.smashing`);
    assert.ok(r.started.includes(NORMAL_ANIM),
      `${NORMAL_ANIM} never started (started: ${r.started.join(', ') || 'nothing'})`);
  });

  test('the wiggle actually moves the egg — not an identity transform', async (t) => {
    if (unavailable) return t.skip(unavailable);
    const r = await tapSlot0();
    assert.notEqual(r.transform, 'none', 'no transform applied mid-animation');
    const m = r.transform.match(/matrix\(([^)]+)\)/);
    assert.ok(m, `unexpected transform: ${r.transform}`);
    const [a, b] = m[1].split(',').map(Number);
    // egg-smash-retro scales past 1.1 and rotates; a pure translate (the old
    // shake) leaves a=1,b=0, which is what "muted to invisible" looked like.
    assert.ok(Math.abs(a) > 1.05 || Math.abs(b) > 0.05,
      `transform ${r.transform} shows no scale or rotation — is this still a translate-only shake?`);
  });

  test('the wiggle reaches its intended peak, not a muted fraction of it', async (t) => {
    if (unavailable) return t.skip(unavailable);
    // Authored keyframe values are not what the screen shows: steps(6) holds
    // each pose for a sub-step, and at the old .35s the peak pose lasted under
    // one frame at 60fps and was routinely skipped — sampling peaked at
    // 1.125/-6.67deg against an authored 1.15/-8deg. That gap is what "it looks
    // a bit muted" was. Assert the RENDERED peak so a duration, timing-function
    // or amplitude change cannot quietly walk it back.
    const peak = await page.evaluate(async () => {
      G.hammers = 500; G.maxH = 500;
      Object.assign(G.roundEggs[0], {
        type: 'normal', hp: 9, maxHp: 9, broken: false, expired: false,
        effects: [], _smashing: false,
      });
      renderEggTray();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const slot = document.getElementById('egg-tray').children[0];
      slot.click();

      let maxScale = 0, maxRot = 0;
      const t0 = performance.now();
      return new Promise(res => {
        const tick = () => {
          const m = getComputedStyle(slot).transform.match(/matrix\(([^)]+)\)/);
          if (m) {
            const [a, b] = m[1].split(',').map(Number);
            maxScale = Math.max(maxScale, Math.hypot(a, b));
            maxRot   = Math.max(maxRot, Math.abs(Math.atan2(b, a) * 180 / Math.PI));
          }
          if (performance.now() - t0 < 600) requestAnimationFrame(tick);
          else res({ maxScale: +maxScale.toFixed(3), maxRot: +maxRot.toFixed(2) });
        };
        requestAnimationFrame(tick);
      });
    });
    assert.ok(peak.maxScale >= 1.15,
      `peak scale only reached ${peak.maxScale} (want >= 1.15) — the wiggle is muted again`);
    assert.ok(peak.maxRot >= 8,
      `peak rotation only reached ${peak.maxRot}deg (want >= 8) — the wiggle is muted again`);
  });

  // The class list an alive egg slot can legitimately carry alongside a tap.
  // Each of these previously had, or could acquire, a rule that outranks the
  // smash feedback. Balloon eggs are excluded: they use long-press, not tap.
  for (const cls of ['idle-wiggle', 'runny', 'timed']) {
    test(`the wiggle still wins when the slot carries .${cls}`, async (t) => {
      if (unavailable) return t.skip(unavailable);
      const r = await tapSlot0({ extraClass: cls });
      assert.equal(r.resolved, NORMAL_ANIM,
        `.${cls} outranks the smash feedback — tap resolved to "${r.resolved}"`);
    });
  }

  test('special eggs resolve to the crunch, including mid-wiggle', async (t) => {
    if (unavailable) return t.skip(unavailable);
    for (const extraClass of [null, 'idle-wiggle']) {
      const r = await tapSlot0({ type: 'crystal', extraClass });
      assert.equal(r.resolved, SPECIAL_ANIM,
        `crystal egg${extraClass ? ' with .' + extraClass : ''} resolved to "${r.resolved}" — ` +
        '`smashing` must not steal the cascade from `egg-crunching`');
    }
  });

  test('the idle-wiggle loop resumes after a smash interrupts it', async (t) => {
    if (unavailable) return t.skip(unavailable);
    // shake()/smashEgg() strip idle-wiggle mid-animation, which fires
    // animationcancel rather than animationend. _scheduleWiggle() rehooks off
    // any animationend on the slot, so the smash animation must supply one —
    // otherwise eggs silently stop wiggling for the rest of the session.
    const wiggles = await page.evaluate(() => new Promise(resolve => {
      const slot = document.getElementById('egg-tray').children[1];
      let n = 0;
      document.addEventListener('animationstart', e => {
        if (e.target === slot && e.animationName === 'egg-idle-wiggle') n++;
      }, true);
      slot.classList.add('idle-wiggle');
      setTimeout(() => shake(slot, 'sm'), 100);   // interrupt it
      // _scheduleWiggle waits 2-7s, and one skipped turn reschedules for
      // another 2-7s, so 15s covers the worst case with room to spare.
      setTimeout(() => resolve(n), 15_000);
    }));
    assert.ok(wiggles > 0,
      'no idle wiggle after an interrupt — the reschedule loop is dead');
  });

  test('a full round of tapping raises no page errors', async (t) => {
    if (unavailable) return t.skip(unavailable);
    const errors = [];
    const onErr = e => errors.push(e.message);
    page.on('pageerror', onErr);
    await page.evaluate(async () => {
      G.hammers = 500; G.maxH = 500;
      for (let i = 0; i < G.roundEggs.length; i++) {
        for (let k = 0; k < 8 && !G.roundEggs[i].broken; k++) {
          smashEgg(i);
          await new Promise(r => setTimeout(r, 340));
        }
      }
    });
    page.off('pageerror', onErr);
    assert.deepEqual(errors, [], `page errors during play: ${errors.join(' | ')}`);
  });
});
