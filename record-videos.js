const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const OUT   = '/tmp/game-videos';
const SITE  = 'https://egg-breaker-adventures.vercel.app/';
const VP    = { width: 390, height: 844 };

fs.mkdirSync(OUT, { recursive: true });

// ── helpers ────────────────────────────────────────────────────────────────

async function boot(page) {
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  // dismiss welcome overlay
  await page.evaluate(() => {
    const oc = document.getElementById('overlay-confirm');
    if (oc) oc.classList.add('hidden');
  });
  await page.waitForTimeout(600);
}

async function injectState(page, overrides) {
  await page.evaluate((ov) => {
    Object.assign(G, ov);
    updateResources();
    renderAll();
  }, overrides);
  await page.waitForTimeout(400);
}

async function clickTab(page, name) {
  await page.evaluate((n) => {
    const el = document.querySelector(`[data-tab="${n}"]`);
    if (el) el.click();
  }, name);
  await page.waitForTimeout(700);
}

async function clickEggs(page, count, delay = 180) {
  for (let i = 0; i < count; i++) {
    const slots = await page.evaluate(() => {
      const tray = document.getElementById('egg-tray');
      if (!tray) return [];
      return Array.from(tray.querySelectorAll('.egg-slot:not(.broken)')).map(s => {
        const r = s.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    });
    if (slots.length) {
      const s = slots[Math.floor(Math.random() * slots.length)];
      await page.mouse.click(s.x, s.y);
    }
    await page.waitForTimeout(delay + Math.random() * 40);
  }
}

async function scrollDown(page, selector, amount = 400) {
  await page.evaluate((sel, amt) => {
    const el = document.querySelector(sel);
    if (el) el.scrollBy({ top: amt, behavior: 'smooth' });
    else window.scrollBy({ top: amt, behavior: 'smooth' });
  }, selector, amount);
}

async function record(id, fn) {
  console.log(`▶  ${id}`);
  const browser = await chromium.launch();
  const tmpDir  = path.join(OUT, '_tmp_' + id);
  fs.mkdirSync(tmpDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VP,
    recordVideo: { dir: tmpDir, size: VP }
  });
  const page = await context.newPage();
  try {
    await boot(page);
    await fn(page);
    await page.waitForTimeout(1200);
  } catch(e) { console.error('  ✗', e.message); }
  const raw = await page.video().path();
  await context.close();
  await browser.close();
  const dest = path.join(OUT, id + '.webm');
  fs.renameSync(raw, dest);
  console.log(`  ✓ saved → ${dest}`);
}

// ── 25 videos ──────────────────────────────────────────────────────────────

const VIDEOS = [

  // ── CORE GAMEPLAY ────────────────────────────────────
  {
    id: '01-basic-gameplay',
    title: 'Tap. Crack. Collect.',
    hook: 'This mobile game has no ads. No timers. Just this.',
    desc: 'Core gameplay loop — tapping eggs to smash them on the Tropical Paradise stage.',
    fn: async (page) => {
      await injectState(page, { gold: 5000, hammers: 75, maxH: 75 });
      await clickEggs(page, 35, 160);
    }
  },

  {
    id: '02-item-discovered',
    title: 'New item unlocked!',
    hook: 'The item pop is so satisfying. Every single time.',
    desc: 'Discovering a new item from a cracked egg — the collection popup reveal.',
    fn: async (page) => {
      // smash many eggs to trigger item discoveries
      await injectState(page, { gold: 9999, hammers: 75, maxH: 75 });
      await clickEggs(page, 60, 120);
    }
  },

  {
    id: '03-rare-eggs',
    title: 'Gold egg just dropped 👀',
    hook: 'When the gold egg appears you HAVE to smash it.',
    desc: 'Rare gold and crystal eggs glowing in the egg tray — smashing them for big rewards.',
    fn: async (page) => {
      // inject round with gold eggs by manipulating discovered eggs and gold
      await injectState(page, {
        gold: 99999,
        hammers: 75,
        maxH: 75,
        discoveredEggs: ['normal','runny','silver','gold','crystal','ruby','century'],
      });
      // force a new round so rare eggs can spawn
      await page.evaluate(() => { newRound(); });
      await page.waitForTimeout(800);
      await clickEggs(page, 30, 200);
    }
  },

  {
    id: '04-multiplier-chain',
    title: 'x2 + x3 + x5 = x10 combo',
    hook: 'Stack multipliers before smashing a gold egg. Brain rot.',
    desc: 'Building a multiplier chain by tapping the chips, then unleashing on eggs.',
    fn: async (page) => {
      await injectState(page, { gold: 9999, hammers: 75, maxH: 75 });
      // click multiplier chips
      for (const val of [2, 3, 5]) {
        await page.evaluate((v) => {
          const btn = Array.from(document.querySelectorAll('.mult-chip')).find(b => b.textContent.includes(`x${v}`));
          if (btn) btn.click();
        }, val);
        await page.waitForTimeout(500);
      }
      await clickEggs(page, 20, 200);
    }
  },

  {
    id: '05-starfall',
    title: 'STARFALL ⭐',
    hook: 'Fill 7 stars and watch every egg explode at once.',
    desc: 'Starfall event triggered — all eggs on screen smash simultaneously with particle effects.',
    fn: async (page) => {
      await injectState(page, {
        gold: 99999, hammers: 75, maxH: 75, starPieces: 7,
      });
      // unlock starfall: complete mr monkey stage 1 to tier 3
      await page.evaluate(() => {
        G.monkeys[0].tiers[0] = 3;
        updateResources();
        renderAll();
      });
      await page.waitForTimeout(600);
      // click starfall button (star icon in resource bar or trigger directly)
      const triggered = await page.evaluate(() => {
        if (typeof useStarfall === 'function') { useStarfall(); return true; }
        // try clicking the star button
        const btn = document.querySelector('#starfall-btn, .starfall-btn, [onclick*="starfall"]');
        if (btn) { btn.click(); return true; }
        return false;
      });
      await page.waitForTimeout(4000);
      await clickEggs(page, 10, 250);
    }
  },

  // ── SKILLS ───────────────────────────────────────────
  {
    id: '06-monkey-rage',
    title: 'MONKEY RAGE 🔥',
    hook: 'Unlimited hammers for 10 seconds. Pure chaos.',
    desc: 'Monkey Rage skill active — hammers don\'t deplete, enabling rapid-fire egg smashing.',
    fn: async (page) => {
      await injectState(page, {
        gold: 99999, hammers: 75, maxH: 75, feathers: 999,
        skillsUnlocked: [true, true, true],
        skillLastUsedAt: [-99999, -99999, -99999],
      });
      await page.evaluate(() => {
        if (typeof startMonkeyRage === 'function') startMonkeyRage();
        else if (typeof activateSkill === 'function') activateSkill(0);
        else {
          const btn = document.querySelector('[onclick*="Rage"], [onclick*="rage"]');
          if (btn) btn.click();
        }
      });
      await page.waitForTimeout(500);
      await clickEggs(page, 40, 120);
    }
  },

  {
    id: '07-golden-goose',
    title: 'Golden Goose 🪙',
    hook: 'Every egg becomes gold for 15 seconds. Cha-ching.',
    desc: 'Golden Goose skill — transforms all eggs to gold tier, flooding the tray with rare drops.',
    fn: async (page) => {
      await injectState(page, {
        gold: 99999, hammers: 75, maxH: 75, feathers: 999,
        skillsUnlocked: [true, true, true],
        skillLastUsedAt: [-99999, -99999, -99999],
      });
      await page.evaluate(() => {
        if (typeof startGoldenGoose === 'function') startGoldenGoose();
        else if (typeof activateSkill === 'function') activateSkill(1);
        else {
          const btn = document.querySelector('[onclick*="Goose"], [onclick*="goose"]');
          if (btn) btn.click();
        }
      });
      await page.waitForTimeout(600);
      await clickEggs(page, 30, 170);
    }
  },

  {
    id: '08-banana-shake',
    title: 'Banana Shake 🍌',
    hook: 'Drops Crystal Bananas on every smash. Stacks fast.',
    desc: 'Banana Shake skill active — Crystal Bananas rain down with each egg smash.',
    fn: async (page) => {
      await injectState(page, {
        gold: 99999, hammers: 75, maxH: 75, feathers: 999,
        skillsUnlocked: [true, true, true],
        skillLastUsedAt: [-99999, -99999, -99999],
      });
      await page.evaluate(() => {
        if (typeof startBananaShake === 'function') startBananaShake();
        else if (typeof activateSkill === 'function') activateSkill(2);
        else {
          const btn = document.querySelector('[onclick*="Banana"], [onclick*="banana"]');
          if (btn) btn.click();
        }
      });
      await page.waitForTimeout(500);
      await clickEggs(page, 30, 180);
    }
  },

  // ── MONKEY WORLDS ─────────────────────────────────────
  {
    id: '09-mr-monkey-world',
    title: 'Mr. Monkey — Tropical Paradise 🌴',
    hook: 'World 1. Where it all begins.',
    desc: 'Mr. Monkey\'s jungle world — lush tropical background, normal to gold egg drops.',
    fn: async (page) => {
      await injectState(page, { gold: 9999, hammers: 75, maxH: 75 });
      await page.evaluate(() => { G.activeMonkey = 0; newRound(); renderAll(); });
      await page.waitForTimeout(800);
      await clickEggs(page, 28, 200);
    }
  },

  {
    id: '10-steampunk-world',
    title: 'Steampunk Monkey — The Workshop ⚙️',
    hook: 'Gears, cogs, and golden eggs. This world hits different.',
    desc: 'Steampunk Monkey\'s industrial world — mechanical aesthetics, unique item collection.',
    fn: async (page) => {
      await injectState(page, { gold: 99999, hammers: 75, maxH: 75 });
      await page.evaluate(() => {
        G.monkeys[1].unlocked = true;
        switchMonkey(1);
      });
      await page.waitForTimeout(1000);
      await clickEggs(page, 28, 200);
    }
  },

  {
    id: '11-princess-world',
    title: 'Princess Monkey — The Royal Court 👑',
    hook: 'Pink palace vibes. Eggs with crowns.',
    desc: 'Princess Monkey\'s royal world — pastel colours, crown and wand themed item drops.',
    fn: async (page) => {
      await injectState(page, { gold: 99999, hammers: 75, maxH: 75 });
      await page.evaluate(() => {
        G.monkeys[1].unlocked = true;
        G.monkeys[2].unlocked = true;
        switchMonkey(2);
      });
      await page.waitForTimeout(1000);
      await clickEggs(page, 28, 200);
    }
  },

  {
    id: '12-space-world',
    title: 'Space Cadette — The Cosmos 🚀',
    hook: 'Smashing eggs in outer space. Name a better combo.',
    desc: 'Space Cadette\'s cosmic world — stars and nebula backdrop, sci-fi item collection.',
    fn: async (page) => {
      await injectState(page, { gold: 99999, hammers: 75, maxH: 75 });
      await page.evaluate(() => {
        for (let i = 0; i <= 3; i++) G.monkeys[i].unlocked = true;
        switchMonkey(3);
      });
      await page.waitForTimeout(1000);
      await clickEggs(page, 28, 200);
    }
  },

  {
    id: '13-odin-world',
    title: 'Odin Grímnir — Norse Realm ⚡',
    hook: 'Mjölnir hammer. Norse mythology. Egg smashing.',
    desc: 'Odin\'s Norse world — Viking-themed background, mythology-inspired item drops.',
    fn: async (page) => {
      await injectState(page, { gold: 99999, hammers: 75, maxH: 75 });
      await page.evaluate(() => {
        for (let i = 0; i <= 4; i++) G.monkeys[i].unlocked = true;
        switchMonkey(4);
      });
      await page.waitForTimeout(1000);
      await clickEggs(page, 28, 200);
    }
  },

  {
    id: '14-wukong-world',
    title: 'Sun Wukong — The Monkey King 🌸',
    hook: 'The final world. The Monkey King has arrived.',
    desc: 'Sun Wukong\'s world — Chinese mythology aesthetic, the rarest and hardest collection.',
    fn: async (page) => {
      await injectState(page, { gold: 99999, hammers: 75, maxH: 75 });
      await page.evaluate(() => {
        for (let i = 0; i <= 5; i++) G.monkeys[i].unlocked = true;
        switchMonkey(5);
      });
      await page.waitForTimeout(1000);
      await clickEggs(page, 28, 200);
    }
  },

  // ── COLLECTION ───────────────────────────────────────
  {
    id: '15-album-stages',
    title: 'The Album 📖',
    hook: '9 stages × 6 worlds = 54 collections to complete.',
    desc: 'Album tab — stage selection grid showing Mr. Monkey\'s 9 worlds from Tropical Paradise to Cloud Kingdom.',
    fn: async (page) => {
      await clickTab(page, 'album');
      await page.waitForTimeout(600);
      // scroll slowly through stages
      for (let i = 0; i < 3; i++) {
        await scrollDown(page, '.album-stages, .stage-list, #panel-album', 150);
        await page.waitForTimeout(800);
      }
    }
  },

  {
    id: '16-album-items',
    title: 'Gotta collect them all 🗂️',
    hook: 'Hundreds of items across 6 worlds. You won\'t collect them all in a day.',
    desc: 'Album items view — discovered items revealed, undiscovered shown as question marks.',
    fn: async (page) => {
      // give some collected items
      await page.evaluate(() => {
        const m = G.monkeys[0];
        // mark first stage first 3 items as collected
        if (m && m.collections && m.collections[0]) {
          m.collections[0][0] = true;
          m.collections[0][1] = true;
          m.collections[0][2] = true;
        }
        renderAll();
      });
      await clickTab(page, 'album');
      await page.waitForTimeout(700);
      // click stage 1 to open items
      await page.evaluate(() => {
        const stage = document.querySelector('.stage-chip, .stage-btn, [data-stage="0"]');
        if (stage) stage.click();
      });
      await page.waitForTimeout(800);
      for (let i = 0; i < 3; i++) {
        await scrollDown(page, '.album-items, #panel-album', 200);
        await page.waitForTimeout(700);
      }
    }
  },

  {
    id: '17-stage-complete',
    title: 'Stage complete! 🎉',
    hook: 'The progress bar fills up and then... satisfaction.',
    desc: 'Completing a full stage — the progress bar fills, tier advances from Bronze to Silver.',
    fn: async (page) => {
      await injectState(page, { gold: 99999, hammers: 75, maxH: 75 });
      // set 4 out of 5 items collected so the next smash completes it
      await page.evaluate(() => {
        const m = G.monkeys[0];
        if (m && m.collections && m.collections[0]) {
          m.collections[0][0] = true;
          m.collections[0][1] = true;
          m.collections[0][2] = true;
          m.collections[0][3] = true;
        }
        newRound(); renderAll();
      });
      await page.waitForTimeout(600);
      await clickEggs(page, 50, 130);
    }
  },

  {
    id: '18-trophies',
    title: 'Achievements 🏆',
    hook: 'Dozens of trophies. Some are hidden. Good luck.',
    desc: 'Trophies tab — achievement grid showing locked and unlocked accomplishments.',
    fn: async (page) => {
      await injectState(page, {
        totalEggs: 500, totalItems: 20, totalGold: 50000,
        achieved: ['first_egg','first_item','broke_10','broke_100'],
      });
      await clickTab(page, 'achieve');
      await page.waitForTimeout(700);
      for (let i = 0; i < 4; i++) {
        await scrollDown(page, '#panel-achieve, .achieve-grid', 250);
        await page.waitForTimeout(600);
      }
    }
  },

  // ── SHOP ─────────────────────────────────────────────
  {
    id: '19-shop-consumables',
    title: 'The Shop 🛒',
    hook: 'Buy hammers, star pieces, multipliers. All with in-game gold.',
    desc: 'Shop consumables — +5 Hammers, Star Piece, x5 Multiplier. All free with gold earned in-game.',
    fn: async (page) => {
      await injectState(page, { gold: 999999, hammers: 75, maxH: 75 });
      await clickTab(page, 'shop');
      await page.waitForTimeout(700);
      // buy something to show the interaction
      await page.evaluate(() => {
        const btns = document.querySelectorAll('.shop-item, .shop-btn');
        if (btns[0]) btns[0].click();
      });
      await page.waitForTimeout(500);
      await scrollDown(page, '#panel-shop', 300);
      await page.waitForTimeout(800);
    }
  },

  {
    id: '20-special-hammers',
    title: 'Special Hammers 🔨',
    hook: 'Mjölnir. Crystal. Rainbow. Which one is YOUR hammer?',
    desc: 'Special hammers section — Drumstick, Bat, Crystal, Golden, Mjölnir and more. Permanent unlocks.',
    fn: async (page) => {
      await injectState(page, { gold: 999999, hammers: 75, maxH: 75 });
      await clickTab(page, 'shop');
      await page.waitForTimeout(600);
      // scroll past consumables and upgrades to reach special hammers
      for (let i = 0; i < 5; i++) {
        await scrollDown(page, '#panel-shop', 250);
        await page.waitForTimeout(500);
      }
    }
  },

  {
    id: '21-premium-shop',
    title: 'Premium Shop 💎',
    hook: 'One-time purchases. No subscriptions. No loot boxes.',
    desc: 'Premium shop — optional one-time upgrades with no paywalls. The full game is free.',
    fn: async (page) => {
      await clickTab(page, 'premium');
      await page.waitForTimeout(700);
      for (let i = 0; i < 3; i++) {
        await scrollDown(page, '#panel-premium', 300);
        await page.waitForTimeout(700);
      }
    }
  },

  // ── MONKEYS & CUSTOMIZATION ───────────────────────────
  {
    id: '22-monkey-selection',
    title: '6 Worlds. 6 Monkeys. 🐵',
    hook: 'Each monkey is a whole new game inside a game.',
    desc: 'Monkey selection screen — all 6 monkey worlds displayed with their unique themes and unlock costs.',
    fn: async (page) => {
      await injectState(page, { gold: 99999, crystalBananas: 50 });
      await page.evaluate(() => {
        for (let i = 0; i <= 5; i++) G.monkeys[i].unlocked = true;
        renderAll();
      });
      await clickTab(page, 'monkeys');
      await page.waitForTimeout(700);
      for (let i = 0; i < 3; i++) {
        await scrollDown(page, '#panel-monkeys', 250);
        await page.waitForTimeout(700);
      }
    }
  },

  {
    id: '23-hat-customization',
    title: 'Choose your hat 🎩',
    hook: 'Cosmetic hats that also buff your stats. Best of both worlds.',
    desc: 'Hat customization — switching between Chef, Crown, Pirate, Top Hat and Wizard hats on Mr. Monkey.',
    fn: async (page) => {
      await injectState(page, { gold: 99999 });
      await page.evaluate(() => {
        G.ownedHats = ['none','chef','crown','pirate','tophat','wizard'];
        renderAll();
      });
      await clickTab(page, 'monkeys');
      await page.waitForTimeout(700);
      // click through different hats
      for (const hat of ['chef', 'crown', 'pirate', 'tophat', 'wizard', 'none']) {
        await page.evaluate((h) => {
          const btn = Array.from(document.querySelectorAll('[onclick*="selectHat"], .hat-btn, [data-hat]'))
            .find(b => b.dataset.hat === h || (b.onclick && b.onclick.toString().includes(h)));
          if (btn) btn.click();
          else if (typeof selectHat === 'function') selectHat(h);
        }, hat);
        await page.waitForTimeout(700);
      }
    }
  },

  {
    id: '24-skills-tab',
    title: '3 Active Skills ⚡',
    hook: 'Unlock these and the game changes completely.',
    desc: 'Skills tab — Monkey Rage, Golden Goose, and Banana Shake. Unlocked with feathers earned by collecting.',
    fn: async (page) => {
      await injectState(page, {
        feathers: 9999, gold: 999999,
        skillsUnlocked: [true, true, true],
        skillUpgrades: [2, 2, 2],
        skillLastUsedAt: [-99999, -99999, -99999],
      });
      await page.evaluate(() => {
        if (typeof renderSkills === 'function') renderSkills();
      });
      await clickTab(page, 'skills');
      await page.waitForTimeout(700);
      for (let i = 0; i < 2; i++) {
        await scrollDown(page, '#panel-skills', 300);
        await page.waitForTimeout(800);
      }
    }
  },

  {
    id: '25-daily-rewards',
    title: 'Daily Rewards 📅',
    hook: '7-day streak = Double Daily bonus. Log in every day.',
    desc: 'Daily rewards calendar — escalating streak rewards with Double Daily bonus for consecutive logins.',
    fn: async (page) => {
      await injectState(page, {
        consecutiveDays: 5, longestStreak: 12, totalDailyClaims: 30,
        dailyClaimed: false, gold: 9999,
      });
      await clickTab(page, 'daily');
      await page.waitForTimeout(700);
      for (let i = 0; i < 2; i++) {
        await scrollDown(page, '#panel-daily', 250);
        await page.waitForTimeout(700);
      }
    }
  },

  {
    id: '26-settings',
    title: 'Settings ⚙️',
    hook: 'Cloud save, push notifs, zero ads. Just settings that respect you.',
    desc: 'Settings menu — cloud save via Google, push notifications, and the Rate on Google Play button.',
    fn: async (page) => {
      await page.evaluate(() => openSettings());
      await page.waitForTimeout(800);
      // slowly scroll settings
      for (let i = 0; i < 3; i++) {
        await scrollDown(page, '.settings-menu', 100);
        await page.waitForTimeout(700);
      }
    }
  },

];

// ── run all ────────────────────────────────────────────────────────────────
(async () => {
  const meta = [];
  for (const v of VIDEOS) {
    await record(v.id, v.fn);
    meta.push({ id: v.id, title: v.title, hook: v.hook, desc: v.desc });
  }
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('\n✅ All done. meta.json written.');
})();
