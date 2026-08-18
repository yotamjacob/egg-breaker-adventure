// ============================================================
//  Egg Smash Adventures — Marketing screenshot capture
//  Renders the live game with a rich, populated save state and
//  captures clean phone-sized shots for the OG card, content
//  pages and press kit.
//
//  Run: node tools/capture-shots.js
//  Out: marketing/shots/*.png
//
//  Why a script and not hand-taken screenshots: the committed
//  shots were captured on an empty save (0/5 items, "???"
//  placeholders, a "Not synced" warning) which sells the game
//  badly. This makes good shots reproducible on every release.
// ============================================================

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const SITE     = process.env.SHOT_SITE || 'https://egg-breaker-adventures.vercel.app/';
const ROOT_DIR = path.join(__dirname, '..');
// SHOT_OUT overrides the output dir (e.g. captures of the Newgrounds build);
// when set, the /shots web copies for the content pages are NOT rewritten.
const OUT      = process.env.SHOT_OUT || path.join(ROOT_DIR, 'marketing', 'shots');
const VP       = { width: 390, height: 844 };

fs.mkdirSync(OUT, { recursive: true });

/** Populates G with an attractive mid-game state and re-renders. */
async function injectRichState(page) {
  await page.evaluate(() => {
    // Resources — healthy but not absurd.
    G.gold        = 48250;
    G.hammers     = 75;
    G.maxH        = 75;
    G.starPieces  = 12;
    G.crystalBananas = 6;
    G.feathers    = 3;

    // Every egg type discovered so rare eggs can actually spawn in the tray.
    G.discoveredEggs = ['normal', 'runny', 'silver', 'gold', 'crystal', 'ruby', 'century'];

    // Stats that drive tier badges / trophies.
    G.totalEggs   = 4820;
    G.totalItems  = 63;
    G.totalGold   = 214000;
    G.biggestWin  = 12500;
    G.highestMult = 50;
    G.stagesCompleted   = 3;
    G.collectionsCompleted = 3;
    G.consecutiveDays   = 9;
    G.longestStreak     = 9;

    // Progress: first monkey several stages in, early collections filled.
    const m = G.monkeys[0];
    m.unlocked    = true;
    m.stage       = Math.min(4, m.collections.length - 1);
    m.activeStage = Math.min(3, m.collections.length - 1);
    m.tiers = m.tiers.map((_, i) => (i < 3 ? 3 : i === 3 ? 2 : i === 4 ? 1 : 0));
    m.collections = m.collections.map((items, si) =>
      items.map((_, ii) => {
        if (si < 3) return true;                 // stages 1-3 complete
        if (si === 3) return ii < items.length - 1; // stage 4 nearly done
        if (si === 4) return ii < 2;             // stage 5 started
        return false;
      })
    );

    // Unlock a couple of extra monkeys so the Monkeys tab isn't a wall of locks.
    if (G.monkeys[1]) G.monkeys[1].unlocked = true;
    if (G.monkeys[2]) G.monkeys[2].unlocked = true;

    // Cosmetics owned — makes the Shop tab look lived-in.
    G.ownedHats     = ['none', 'crown', 'tophat'];
    G.ownedHammers  = ['default'];
    G.hat           = 'crown';
    G.owned_spyglass = true;
    G.owned_luckycharm = true;

    // Multipliers in hand for the mult bar at the bottom of Play.
    G.multQueue = [2, 2, 3, 5, 10];

    // Hide the "Not synced — go to Settings → Cloud Save" nag; it is a
    // support prompt, not gameplay, and it dominates the log panel.
    G._savedAt = Date.now();
    G._cloudSavedAt = Date.now();

    updateResources();
    renderAll();
  });
  await page.waitForTimeout(600);
}

async function boot(page) {
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 });

  // Suppress the "Not synced" log nag before its 3s timer fires. The bundle
  // is concatenated and un-mangled, so this top-level binding is reachable
  // from the page's global scope.
  await page.evaluate(() => {
    try { _noSyncWarned = true; } catch (e) {}
  });

  // The welcome modal is scheduled with a fixed 4.8s setTimeout at load, so it
  // cannot be pre-empted by flipping G._welcomeDone — wait it out, then close.
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    for (const id of ['overlay-welcome', 'overlay-confirm']) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
    const sp = document.getElementById('splash-screen');
    if (sp) sp.style.display = 'none';
    if (typeof G === 'object' && G) { G._welcomeDone = true; G._firstRareSeen = true; }
  });
  await page.waitForTimeout(500);
}

/** Hides one-off popups/bars that can fire on a timer between steps. */
async function clean(page) {
  await page.evaluate(() => {
    const c = document.getElementById('overlay-confirm');
    if (c) c.classList.add('hidden');
    document.querySelectorAll('.ng-loginbar').forEach(el => el.remove());
  });
}

async function clickTab(page, name) {
  await page.evaluate((n) => {
    const el = document.querySelector(`[data-tab="${n}"]`);
    if (el) el.click();
  }, name);
  await page.waitForTimeout(900);
}

/** Smash a few eggs so the log panel shows real prize messages. */
async function smashSome(page, count) {
  for (let i = 0; i < count; i++) {
    // Eggs are .egg-slot (see render.js) — NOT .egg, which matches nothing
    // and would make this silently do nothing.
    await page.evaluate(() => {
      const egg = document.querySelector('#egg-tray .egg-slot:not(.broken)');
      if (egg) egg.click();
    });
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VP,
    deviceScaleFactor: 3,          // crisp on retina / when scaled into the OG card
    isMobile: true,
    hasTouch: true,
  });

  await boot(page);
  await injectRichState(page);

  // ── Play tab ──
  // Smash first so the log fills with real prize messages, then start a fresh
  // round so the tray is full again: populated log AND a full board of eggs.
  await clickTab(page, 'play');
  await smashSome(page, 8);
  await page.evaluate(() => { newRound(); });
  await page.waitForTimeout(1200);
  await clean(page);
  await page.screenshot({ path: path.join(OUT, 'play.png') });

  // ── Album: collections filled in ──
  await clickTab(page, 'album');
  await clean(page);
  await page.screenshot({ path: path.join(OUT, 'album.png') });

  // ── Monkeys ──
  await clickTab(page, 'monkeys');
  await clean(page);
  await page.screenshot({ path: path.join(OUT, 'monkeys.png') });

  // ── Shop ──
  await clickTab(page, 'shop');
  await clean(page);
  await page.screenshot({ path: path.join(OUT, 'shop.png') });

  // ── Trophies ──
  await clickTab(page, 'achieve');
  await clean(page);
  await page.screenshot({ path: path.join(OUT, 'trophies.png') });

  await browser.close();

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`captured ${files.length} shots → marketing/shots/  (full-res, for the press kit)`);
  for (const f of files) {
    const kb = Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
    console.log(`  ${f}  ${kb}KB`);
  }

  // ── Web-sized copies for the content pages ──────────────────────
  // The full-res 1170x2532 captures are 300-700KB each. Content pages
  // are the top of the funnel and must stay fast, so they get 440px-wide
  // palette-quantised copies (~40-70KB) served from /shots/.
  if (process.env.SHOT_OUT) return;
  const sharp = require('sharp');
  const WEB = path.join(ROOT_DIR, 'shots');
  fs.mkdirSync(WEB, { recursive: true });
  let webTotal = 0;
  for (const f of files) {
    const dest = path.join(WEB, f);
    await sharp(path.join(OUT, f))
      .resize({ width: 440 })
      .png({ compressionLevel: 9, palette: true })
      .toFile(dest);
    webTotal += fs.statSync(dest).size;
  }
  console.log(`web copies → shots/  (${files.length} files, ${Math.round(webTotal / 1024)}KB total)`);
})().catch(e => { console.error(e); process.exit(1); });
