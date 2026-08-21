// ============================================================
//  Text overflow guard — project rule: truncated text is not allowed.
//
//  Walks every tab (and every shop sub-tab) in a real browser with a
//  rich save injected so all cards render real content, and fails on
//  any leaf element whose text overflows its box while clipped
//  (scrollWidth/Height beyond the client box, or an ellipsis actually
//  engaging). v3.11.17: the Mjölnir L10 mastery row wrapped to two
//  lines inside a one-line row and clipped silently — this makes that
//  class of regression fail loudly.
//
//  Drives Chromium like smash-animation.test.js: CI installs the
//  browser; locally it skips with a warning if the binary is absent.
// ============================================================
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('text overflow — no clipped text on any tab', () => {
  let browser, page, unavailable = null;

  before(async () => {
    try {
      const { chromium } = require('playwright');
      browser = await chromium.launch();
    } catch (e) {
      unavailable = e.message.split('\n')[0];
      return;
    }
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    page = await ctx.newPage();
    await page.goto('file://' + path.join(ROOT, 'index.html'));
    await page.waitForFunction(
      () => typeof G !== 'undefined' && G.roundEggs && document.getElementById('egg-tray').children.length > 0,
      null, { timeout: 30_000 }
    );
    await page.evaluate(() => {
      const sp = document.getElementById('splash-screen'); if (sp) sp.remove();
      document.querySelectorAll('.overlay:not(.hidden)').forEach(o => o.classList.add('hidden'));
      // Rich state so every surface renders its fullest content: all hammers
      // owned at mixed mastery levels (incl. L10 perk rows), currencies high
      // enough that no card collapses to a locked stub.
      G.gold = 99999999; G.feathers = 500; G.starPieces = 6;
      G.ownedHammers = ['default','drumstick','bat','crystal','golden','rainbow','cucumber','mjolnir','gavel'];
      G.hammerXp = { drumstick: 999999, bat: 50, crystal: 2000, golden: 999999, rainbow: 12000, cucumber: 999999, mjolnir: 999999, gavel: 400 };
      G.hammer = 'mjolnir';
      renderAll(); renderShop(); renderPremiumShop();
    });
    await page.waitForTimeout(300);
  });

  after(async () => { if (browser) await browser.close(); });

  async function scanActivePanel(label) {
    return page.evaluate((label) => {
      const out = [];
      const panel = document.querySelector('.tab-panel.active, #app');
      for (const el of panel.querySelectorAll('*')) {
        if (el.children.length > 0) continue;            // leaf text nodes only
        const txt = (el.textContent || '').trim();
        if (!txt || txt.length < 3) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;   // hidden
        const cs = getComputedStyle(el);
        const clipsX = el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible';
        const clipsY = el.scrollHeight > el.clientHeight + 2 && cs.overflowY !== 'visible';
        const ellipsis = cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
        if (clipsX || clipsY || ellipsis) {
          out.push(`${label}: <${el.tagName.toLowerCase()} class="${el.className}"> "${txt.slice(0, 50)}" ` +
                   `(scroll ${el.scrollWidth}x${el.scrollHeight} vs client ${el.clientWidth}x${el.clientHeight})`);
        }
      }
      return out;
    }, label);
  }

  const TABS = ['play', 'album', 'monkeys', 'quests', 'daily', 'premium', 'achieve'];
  for (const t of TABS) {
    test(`no clipped text on the ${t} tab`, async (tc) => {
      if (unavailable) return tc.skip(unavailable);
      const ok = await page.evaluate(tab => {
        const btn = document.querySelector('[data-tab="' + tab + '"]');
        if (!btn) return false;
        btn.click();
        return true;
      }, t);
      assert.ok(ok, `tab button for "${t}" is missing`);
      await page.waitForTimeout(200);
      const clipped = await scanActivePanel(t);
      assert.deepEqual(clipped, [],
        `clipped text found — shorten the text at its source or let it wrap in a taller row:\n${clipped.join('\n')}`);
    });
  }

  test('no clipped text in any shop sub-tab', async (tc) => {
    if (unavailable) return tc.skip(unavailable);
    await page.evaluate(() => document.querySelector('[data-tab="shop"]').click());
    const clipped = [];
    for (const sub of ['consumables', 'upgrades', 'autotap', 'hammers', 'hats']) {
      await page.evaluate(s => setShopTab(s), sub);
      await page.waitForTimeout(120);
      clipped.push(...await scanActivePanel('shop/' + sub));
    }
    assert.deepEqual(clipped, [],
      `clipped text found — shorten the text at its source or let it wrap in a taller row:\n${clipped.join('\n')}`);
  });
});
