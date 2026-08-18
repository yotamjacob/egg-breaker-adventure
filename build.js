// ============================================================
//  Egg Smash Adventures — Build Script
//  Concatenates + minifies JS and CSS into two bundle files.
//  Run: node build.js
//  Output: bundle.min.js, bundle.min.css
// ============================================================

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// `node build.js --itch` also assembles an upload-ready itch.io build
// into /dist-itch (+ dist-itch.zip). `--gamejolt` does the same for Game
// Jolt (+ dist-gamejolt.zip). Without a flag the build is identical — the
// Vercel/Android pipeline is untouched.
const ITCH       = process.argv.includes('--itch');
const GAMEJOLT   = process.argv.includes('--gamejolt');
// `--newgrounds` assembles the Newgrounds build into /dist-newgrounds
// (+ dist-newgrounds.zip): no Play-Store funnel, Newgrounds.io medals +
// scoreboards, portal pacing. Shim lives in /ng and is never bundled.
const NEWGROUNDS = process.argv.includes('--newgrounds');

const JS_FILES = [
  'lz-string.min.js',
  'config.js',
  'analytics.js',
  'quotes.js',
  'data.js',
  'audio.js',
  'particles.js',
  'hammers.js',
  'render.js',
  'game.js',
  // AFTER game.js: share.js reads referral params on load and must run
  // after trackGameStarted() has classified the traffic source, because
  // it strips those params from the URL afterwards.
  'share.js',
  'smash.js',
  'shop.js',
  'achievements.js',
  // AFTER game.js/smash.js/shop.js/achievements.js: its boot block runs the
  // offline Auto-Smasher simulation and needs all of them executed.
  'idle.js',
  'payments.js',
  'cloud.js',
];

const CSS_FILES = [
  'style.css',
  'play.css',
  'tabs.css',
  'components.css',
];

async function build() {
  // JS — concat then minify syntax+whitespace only.
  // NOTE: identifiers are NOT mangled because inline onclick="fn()" handlers
  // in index.html reference global function names directly.
  const jsSource = JS_FILES.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const { code: jsOut } = await esbuild.transform(jsSource, {
    loader: 'js',
    minifySyntax: true,
    minifyWhitespace: true,
  });
  fs.writeFileSync('bundle.min.js', jsOut);

  // CSS — full minification is safe (no external references)
  const cssSource = CSS_FILES.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const { code: cssOut } = await esbuild.transform(cssSource, {
    loader: 'css',
    minify: true,
  });
  fs.writeFileSync('bundle.min.css', cssOut);

  const jsBefore  = JS_FILES.reduce((s, f)  => s + fs.statSync(f).size, 0);
  const cssBefore = CSS_FILES.reduce((s, f) => s + fs.statSync(f).size, 0);
  const jsAfter   = fs.statSync('bundle.min.js').size;
  const cssAfter  = fs.statSync('bundle.min.css').size;

  console.log(`JS:  ${kb(jsBefore)} → ${kb(jsAfter)}  (${pct(jsBefore, jsAfter)} smaller)`);
  console.log(`CSS: ${kb(cssBefore)} → ${kb(cssAfter)}  (${pct(cssBefore, cssAfter)} smaller)`);

  // Auto-sync sw.js CACHE_VERSION to match config.js VERSION — eliminates the
  // class of CI failures caused by bumping one file but forgetting the other.
  const ver = jsSource.match(/const VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (ver) {
    const sw    = fs.readFileSync('sw.js', 'utf8');
    const swNew = sw.replace(/const CACHE_VERSION\s*=\s*'[^']*'/, `const CACHE_VERSION = '${ver}'`);
    if (swNew !== sw) {
      fs.writeFileSync('sw.js', swNew);
      console.log(`sw.js CACHE_VERSION synced → ${ver}`);
    }
  }

  buildSitemap();

  console.log('Build complete.');

  if (ITCH)       await buildItch();
  if (GAMEJOLT)   await buildGameJolt();
  if (NEWGROUNDS) await buildNewgrounds();
}

// ============================================================
//  sitemap.xml
//  Generated rather than hand-maintained so a new content page
//  cannot silently go unlisted. `lastmod` comes from each file's
//  mtime, so it only moves when the page actually changes.
//  Clean URLs (no .html) — vercel.json sets cleanUrls:true and
//  308-redirects the .html form, which wastes crawl budget.
// ============================================================
const SITE_ORIGIN = 'https://egg-breaker-adventures.vercel.app';

// TODO(owner): hreflang. The site is English-only today, so there are no
// alternate-language URLs to declare and hreflang tags would be invalid.
// The Play listings ARE localised (marketing/store-listings/) — that is a
// Play Console concern and needs no site change.
// If localised pages are ever added, emit <xhtml:link rel="alternate"
// hreflang="..."> per URL here AND matching <link rel="alternate"> tags in
// each page head; a sitemap-only declaration is ignored by Google unless
// every language version points back at all the others.

const SITEMAP_PAGES = [
  { file: 'index.html',                        url: '/',                            priority: '1.0', changefreq: 'weekly'  },
  { file: 'play-egg-breaker-online.html',      url: '/play-egg-breaker-online',     priority: '0.9', changefreq: 'monthly' },
  { file: 'what-happened-to-egg-breaker.html', url: '/what-happened-to-egg-breaker', priority: '0.9', changefreq: 'monthly' },
  { file: 'egg-breaker-guide.html',            url: '/egg-breaker-guide',           priority: '0.8', changefreq: 'monthly' },
  { file: 'egg-breaker-vs-original.html',      url: '/egg-breaker-vs-original',     priority: '0.7', changefreq: 'monthly' },
  { file: 'press.html',                        url: '/press',                       priority: '0.6', changefreq: 'monthly' },
  { file: 'privacy.html',                      url: '/privacy',                     priority: '0.3', changefreq: 'yearly'  },
  { file: 'terms.html',                        url: '/terms',                       priority: '0.3', changefreq: 'yearly'  },
  { file: 'refund.html',                       url: '/refund',                      priority: '0.3', changefreq: 'yearly'  },
];

function buildSitemap() {
  const entries = SITEMAP_PAGES
    .filter(p => {
      if (fs.existsSync(p.file)) return true;
      console.warn(`  sitemap: skipping ${p.file} (not found)`);
      return false;
    })
    .map(p => {
      const lastmod = fs.statSync(p.file).mtime.toISOString().slice(0, 10);
      return [
        '  <url>',
        `    <loc>${SITE_ORIGIN}${p.url}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${p.changefreq}</changefreq>`,
        `    <priority>${p.priority}</priority>`,
        '  </url>',
      ].join('\n');
    });

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') + '\n' +
    '</urlset>\n';

  fs.writeFileSync('sitemap.xml', xml);
  console.log(`sitemap.xml written (${entries.length} URLs)`);
}

// ============================================================
//  Static web build target  (itch.io)
//  Produces a clean, upload-ready static build with index.html at
//  the ROOT, plus a zip. Source files (index.html, render.js, …)
//  are never modified — the transform happens on a copy in memory.
//  Injects the itch.css stylesheet + itch.js CTA script.
// ============================================================
// ── Shared asset optimisation ─────────────────────────────────
// The source art is 1024x1024 PNG masters up to 4.9MB each, never displayed
// above ~300px, and the music is 2-4MB stereo MP3. Untouched, a web build is
// ~78MB. Downscaling to 512px palette PNGs and 96kbps mono audio takes it to
// ~11MB with no visible or audible loss — which is the difference between a
// browser-portal player waiting and a browser-portal player leaving.
// Source files are never modified; this only writes into the output dir.
async function optimizeImages(outDir) {
  const sharp = require('sharp');
  let before = 0, after = 0;
  for (const rel of listFiles('img')) {
    const src = path.join('img', rel);
    const dst = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    before += fs.statSync(src).size;
    const ext = path.extname(rel).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      let pipe = sharp(src).resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true });
      pipe = (ext === '.png')
        ? pipe.png({ compressionLevel: 9, palette: true })
        : pipe.jpeg({ quality: 82, mozjpeg: true });
      await pipe.toFile(dst);
    } else {
      fs.copyFileSync(src, dst);   // svg / webp pass through untouched
    }
    after += fs.statSync(dst).size;
  }
  return { before, after };
}

function optimizeAudio(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  let before = 0, after = 0, reencoded = 0;
  const haveFfmpeg = (() => {
    try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch (e) { return false; }
  })();
  if (!haveFfmpeg) console.warn('  ffmpeg not found — audio copied at full size');
  for (const rel of listFiles('audio')) {
    const src = path.join('audio', rel);
    const dst = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    before += fs.statSync(src).size;
    if (haveFfmpeg && path.extname(rel).toLowerCase() === '.mp3') {
      try { execSync(`ffmpeg -y -i "${src}" -ac 1 -b:a 96k "${dst}"`, { stdio: 'ignore' }); reencoded++; }
      catch (e) { fs.copyFileSync(src, dst); }
    } else {
      fs.copyFileSync(src, dst);
    }
    after += fs.statSync(dst).size;
  }
  return { before, after, reencoded };
}

// opts.optimizeAssets — re-encode img/ and audio/ into the build (see above).
// Off by default so the itch build keeps byte-for-byte parity with what is
// already published there.
// opts.shim — { files: [...], head: '<link…>', body: '<script…>' } to swap the
// itch.io shim for another portal's. Defaults to the itch shim.
async function assembleWebBuild(OUT, zipName, opts) {
  opts = opts || {};
  const shim = opts.shim || ITCH_SHIM;

  // 1. Clean output dir.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 2. Copy the only files the web game needs at runtime.
  const FILES = [
    'bundle.min.js',
    'bundle.min.css',
    'favicon.ico',
    'icon-192.png',
    'icon-512.png',
  ].concat(shim.files);      // e.g. itch/itch.css → OUT/itch.css
  for (const f of FILES) {
    fs.copyFileSync(f, path.join(OUT, path.basename(f)));
  }
  let assetReport = null;
  if (opts.optimizeAssets) {
    const img = await optimizeImages(path.join(OUT, 'img'));
    const aud = optimizeAudio(path.join(OUT, 'audio'));
    assetReport = { img, aud };
  } else {
    for (const d of ['img', 'audio']) {
      fs.cpSync(d, path.join(OUT, d), { recursive: true });
    }
  }

  // 3. Transform index.html → sandbox-safe variant.
  let html = fs.readFileSync('index.html', 'utf8');

  // 3a. Root-absolute icon/favicon paths → relative (the game is
  //     served from a subpath, so leading-slash paths 404).
  html = html
    .replace(/(["'(])\/(icon-512\.png|icon-192\.png|favicon\.ico)/g, '$1./$2');

  // 3b. Remove the PWA manifest link (no manifest in static builds).
  html = html.replace(/\s*<link rel="manifest"[^>]*>\n?/, '\n');

  // 3c. Strip the service-worker registration block entirely — a SW
  //     scoped to "/" cannot register from a subpath and only adds
  //     failure modes inside the sandboxed iframe.
  html = html.replace(
    /\s*<script>\s*if \('serviceWorker' in navigator\)[\s\S]*?<\/script>/,
    ''
  );

  // 3d. Inject the portal-only stylesheet (before </head>) and scripts
  //     (before </body>, after bundle.min.js has already executed).
  html = html.replace('</head>', shim.head + '</head>');
  html = html.replace('</body>', shim.body + '</body>');

  fs.writeFileSync(path.join(OUT, 'index.html'), html);

  // 4. Zip with index.html at the archive ROOT (not nested).
  fs.rmSync(zipName, { force: true });
  execSync('zip -r -X ../' + zipName + ' .', { cwd: OUT, stdio: 'ignore' });

  // 5. Report.
  const list = listFiles(OUT).sort();
  const total = list.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
  console.log('\nbuild → ' + OUT + '/  (+ ' + zipName + ')');
  if (assetReport) {
    const { img, aud } = assetReport;
    console.log(`  img:   ${kb(img.before)} → ${kb(img.after)}  (${pct(img.before, img.after)} smaller)`);
    console.log(`  audio: ${kb(aud.before)} → ${kb(aud.after)}  (${pct(aud.before, aud.after)} smaller, ${aud.reencoded} re-encoded)`);
  }
  console.log('  files: ' + list.length + '   total: ' + kb(total));
  console.log('  index.html at root: ' + (fs.existsSync(path.join(OUT, 'index.html')) ? 'YES' : 'NO'));
}

const ITCH_SHIM = {
  files: ['itch/itch.css', 'itch/itch.js', 'itch/google-play-badge.png'],
  head:  '  <link rel="stylesheet" href="./itch.css" />\n',
  body:  '  <script defer src="./itch.js"></script>\n',
};

// Newgrounds shim: config → NGIO library → ng.js, all deferred so they run
// after bundle.min.js (ng.js hooks globals the bundle defines).
const NG_SHIM = {
  files: ['ng/ng.css', 'ng/ng-config.js', 'ng/NewgroundsIO.min.js', 'ng/ng.js'],
  head:  '  <link rel="stylesheet" href="./ng.css" />\n',
  body:  '  <script defer src="./ng-config.js"></script>\n' +
         '  <script defer src="./NewgroundsIO.min.js"></script>\n' +
         '  <script defer src="./ng.js"></script>\n',
};

// itch.io build  (node build.js --itch)
// Assets left untouched so the package stays identical to what is already
// published on itch. Pass optimizeAssets:true to shrink it ~6x if that build
// is ever re-uploaded.
async function buildItch() {
  await assembleWebBuild('dist-itch', 'dist-itch.zip');
}

// Game Jolt build  (node build.js --gamejolt)
// Identical feature set to the itch build — Game Jolt permits outbound links,
// so cloud save, the premium shop and the Google Play CTA all stay. The only
// difference is optimised assets: Game Jolt is a browser-games portal where
// load time is most of the first impression, and 78MB is not a first
// impression worth having.
async function buildGameJolt() {
  await assembleWebBuild('dist-gamejolt', 'dist-gamejolt.zip', { optimizeAssets: true });
}

// Newgrounds build  (node build.js --newgrounds)
// Same static assembly, different shim: NG rejects games that funnel to an
// external store, so ng.js removes the Premium tab / Play banner and instead
// wires Newgrounds.io medals + scoreboards (see ng/README.md). Optimised
// assets — it is a browser portal, load time is the first impression.
// App ID / encryption key are NOT committed (public repo). They come from
// the git-ignored ng/ng.secrets.json ({ "appId", "encKey" }) or the env vars
// NG_APP_ID / NG_ENC_KEY, and are written into dist-newgrounds/ng-config.js
// only. Medal/scoreboard ids stay in ng/ng-config.js — they are not secret.
async function buildNewgrounds() {
  await assembleWebBuild('dist-newgrounds', 'dist-newgrounds.zip', { optimizeAssets: true, shim: NG_SHIM });
  let secrets = {};
  try { secrets = JSON.parse(fs.readFileSync('ng/ng.secrets.json', 'utf8')); } catch (e) {}
  const appId  = process.env.NG_APP_ID  || secrets.appId  || '';
  const encKey = process.env.NG_ENC_KEY || secrets.encKey || '';
  const cfgPath = path.join('dist-newgrounds', 'ng-config.js');
  let cfg = fs.readFileSync(cfgPath, 'utf8');
  cfg = cfg.replace(/appId:\s*'[^']*'/, "appId:  '" + appId.replace(/'/g, '') + "'")
           .replace(/encKey:\s*'[^']*'/, "encKey: '" + encKey.replace(/'/g, '') + "'");
  fs.writeFileSync(cfgPath, cfg);
  // Re-zip so the archive carries the injected config.
  fs.rmSync('dist-newgrounds.zip', { force: true });
  execSync('zip -r -X ../dist-newgrounds.zip .', { cwd: 'dist-newgrounds', stdio: 'ignore' });
  if (!appId) console.warn('\n  ⚠ No Newgrounds appId (ng/ng.secrets.json or NG_APP_ID) — medals/scoreboards will be disabled in this build.');
  else console.log('  ng-config: appId + encKey injected' + (encKey ? '' : ' (no encKey)'));
}

function listFiles(dir, base) {
  base = base || dir;
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

const kb  = n => Math.round(n / 1024) + 'KB';
const pct = (before, after) => Math.round((1 - after / before) * 100) + '%';

build().catch(e => { console.error(e); process.exit(1); });
