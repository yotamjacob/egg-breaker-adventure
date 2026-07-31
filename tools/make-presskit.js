// ============================================================
//  Egg Smash Adventures — Press kit ZIP builder
//  Assembles every downloadable asset a journalist or creator
//  might want into press-kit.zip at the site root, so /press can
//  offer a single "download everything" link.
//
//  Run: node tools/make-presskit.js
//  Out: press-kit.zip
//
//  Committed rather than generated at deploy time: build.js only
//  shells out to `zip` behind the --itch/--ng flags, which Vercel
//  never passes, so the binary's availability in the Vercel build
//  image is unproven. Building locally keeps the deploy dependency-free.
// ============================================================

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT  = path.join(__dirname, '..');
const STAGE = path.join(ROOT, '.press-kit-build');
const OUT   = path.join(ROOT, 'press-kit.zip');

const VERSION = (fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8')
  .match(/const VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1] || 'unknown';

// [source, destination-inside-zip]
const ASSETS = [
  ['icon-512.png',                    'logo/icon-512.png'],
  ['icon-192.png',                    'logo/icon-192.png'],
  ['og-image.png',                    'logo/share-card-1200x630.png'],
  ['marketing/shots/play.png',        'screenshots/01-gameplay.png'],
  ['marketing/shots/album.png',       'screenshots/02-collection-album.png'],
  ['marketing/shots/monkeys.png',     'screenshots/03-monkey-companions.png'],
  ['marketing/shots/shop.png',        'screenshots/04-shop.png'],
  ['marketing/shots/trophies.png',    'screenshots/05-trophies.png'],
  ['promo/egg-smash-gameplay.gif',    'video/gameplay.gif'],
  ['promo/egg-smash-clip.mp4',        'video/gameplay.mp4'],
];

const FACT_SHEET = `EGG SMASH ADVENTURES — PRESS KIT
=================================================
Version ${VERSION}

ONE-LINE PITCH
The classic Egg Breaker Facebook game, rebuilt free for browser and
Android — smash eggs, win prizes, complete collections.

SHORT DESCRIPTION
Egg Smash Adventures is a pixel-art idle collector where you smash eggs
to discover items across six themed monkey worlds. No ads, no energy
timers, no paywalls. Free in any browser and on Android.

LONG DESCRIPTION
The original Egg Breaker was a Facebook game published around 2008 by
LabPixies. It was retired when the studio wound down its Facebook titles
around 2016, and whatever survived stopped working entirely when browsers
dropped Flash at the end of 2020. No announcement, no successor.

Egg Smash Adventures is an independent fan revival built by a solo
developer who played the original for years. It keeps the loop that made
it work — spend a hammer, crack an egg, roll a prize, fill a collection,
unlock the next stage — and drops what did not age well: no interstitial
ads, no rewarded video, no eight-hour energy waits.

The revival adds six monkey companions, each with their own themed world
of 8-9 stages, a passive bonus and a full collection to complete, for 353
collectible items in total. Seven egg tiers run from the everyday Normal
egg to the 100-hit Century Egg. Hats and hammers carry real stat effects,
three active skills add moment-to-moment decisions, and optional Google
cloud save carries progress across devices and reinstalls.

KEY FACTS
- Developer:      YotJac (Yotam Jacob), solo developer
- Platforms:      Web browser (instant play), Android 6.0+
- Price:          Free. Optional one-time in-app purchases, nothing gated.
- Released:       2025 (web), May 2026 (Android)
- Engine:         Hand-written HTML5 / JavaScript, no game engine
- Monetisation:   No ads, no energy timers, no paywalls

FEATURES
- 6 monkey companions, each with a themed world and passive bonus
- 8-9 stages per monkey, 353 collectible items in total
- 7 egg tiers, from Normal up to the mythical Century Egg
- 9 hammers and 5 hats, all with real stat effects
- 3 active skills: Monkey Rage, Golden Goose, Banana Shake
- Starfall bonus rounds and stacking multipliers
- Daily rewards with an escalating streak
- Optional Google cloud save; plays offline after first load

LINKS
- Play free (web):  https://egg-breaker-adventures.vercel.app/
- Google Play:      https://play.google.com/store/apps/details?id=com.eggbreakeradventures.app
- itch.io:          https://yotamjac.itch.io/egg-smash-adventures
- Press page:       https://egg-breaker-adventures.vercel.app/press

CONTACT
yotamjacob@gmail.com

PERMISSIONS
All assets in this kit may be used freely for editorial and review
coverage of Egg Smash Adventures.

Egg Smash Adventures is an independent fan revival. It is not affiliated
with, endorsed by, or connected to LabPixies or Meta.
`;

// ── Build ─────────────────────────────────────────────────────
fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });

const missing = [];
for (const [src, dest] of ASSETS) {
  const from = path.join(ROOT, src);
  if (!fs.existsSync(from)) { missing.push(src); continue; }
  const to = path.join(STAGE, dest);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.writeFileSync(path.join(STAGE, 'README.txt'), FACT_SHEET);

fs.rmSync(OUT, { force: true });
execSync(`zip -r -X "${OUT}" .`, { cwd: STAGE, stdio: 'ignore' });
fs.rmSync(STAGE, { recursive: true, force: true });

const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`press-kit.zip  ${mb}MB  (${ASSETS.length - missing.length} assets + README.txt)`);
if (missing.length) {
  console.warn('  WARNING — missing assets skipped:');
  missing.forEach(m => console.warn('    ' + m));
  process.exitCode = 1;
}
