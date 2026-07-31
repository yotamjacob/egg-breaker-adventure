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
// into /dist-itch (+ dist-itch.zip). `--crazy` assembles the CrazyGames
// submission build into /dist-crazy (+ dist-crazy.zip). Without a flag the
// build is identical — the Vercel/Android pipeline is untouched.
const ITCH     = process.argv.includes('--itch');
const GAMEJOLT = process.argv.includes('--gamejolt');
const CRAZY    = process.argv.includes('--crazy');

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

  if (ITCH)     await buildItch();
  if (GAMEJOLT) await buildGameJolt();
  if (CRAZY)    await buildCrazyGames();
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
async function assembleWebBuild(OUT, zipName, opts) {
  opts = opts || {};

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
    'itch/itch.css',          // → OUT/itch.css
    'itch/itch.js',           // → OUT/itch.js
    'itch/google-play-badge.png',
  ];
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

  // 3d. Inject the itch-only stylesheet (before </head>) and scripts
  //     (before </body>, after bundle.min.js has already executed).
  html = html.replace(
    '</head>',
    '  <link rel="stylesheet" href="./itch.css" />\n</head>'
  );
  html = html.replace('</body>',
    '  <script defer src="./itch.js"></script>\n</body>');

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
//
// NOTE: the CrazyGames build is NOT a substitute here. It strips cloud save,
// premium, share and the Play CTA to satisfy CrazyGames' platform rules —
// restrictions Game Jolt does not impose. Reusing it would discard the save
// sync and the entire Play Store conversion path for nothing.
async function buildGameJolt() {
  await assembleWebBuild('dist-gamejolt', 'dist-gamejolt.zip', { optimizeAssets: true });
}

// ============================================================
//  CrazyGames build  (node build.js --crazy)
//
//  CrazyGames Basic Launch requirements this build satisfies:
//    · relative paths only, never absolute
//    · no external requests (fonts, analytics, error tracking, SDKs)
//    · no external login options      → cloud save disabled
//    · no external payment providers  → premium shop hidden
//    · no off-platform cross-promotion→ Play/itch/site links removed
//    · total <= 250MB, <= 1500 files, initial download <= 50MB
//      (<= 20MB to be eligible for the mobile homepage)
//
//  The source game is never modified — every transform happens on a
//  copy, exactly like the itch build.
// ============================================================
const CRAZY_OUT = 'dist-crazy';

async function buildCrazyGames() {
  const sharp = require('sharp');

  fs.rmSync(CRAZY_OUT, { recursive: true, force: true });
  fs.mkdirSync(CRAZY_OUT, { recursive: true });

  // 1. Flat runtime files. icon-192/512 are referenced by the splash screen
  //    and the favicon links — omitting them 404s on every load.
  for (const f of [
    'bundle.min.js',
    'bundle.min.css',
    'favicon.ico',
    'icon-192.png',
    'icon-512.png',
    'crazygames/crazygames.css',
    'crazygames/crazygames.js',
    'crazygames/press-start-2p.woff2',
  ]) {
    fs.copyFileSync(f, path.join(CRAZY_OUT, path.basename(f)));
  }

  // 2. Images — the source PNGs are 1024x1024 masters up to 4.9MB each and
  //    are never displayed above ~300px. Downscaling to 512 keeps them crisp
  //    on retina while taking the image payload from ~51MB to a few MB, which
  //    is what makes the 20MB mobile-homepage threshold reachable at all.
  //    Filenames and extensions are preserved because data.js references
  //    them by path.
  const imgOut = path.join(CRAZY_OUT, 'img');
  let imgBefore = 0, imgAfter = 0;
  for (const rel of listFiles('img')) {
    const src = path.join('img', rel);
    const dst = path.join(imgOut, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    imgBefore += fs.statSync(src).size;

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
    imgAfter += fs.statSync(dst).size;
  }

  // 3. Audio — six music tracks at ~2-4MB each. Re-encoded to 96kbps mono,
  //    which is transparent enough for chiptune-style loops and roughly
  //    quarters the payload. Skipped gracefully if ffmpeg is unavailable.
  const audOut = path.join(CRAZY_OUT, 'audio');
  fs.mkdirSync(audOut, { recursive: true });
  let audBefore = 0, audAfter = 0, reencoded = 0;
  const haveFfmpeg = (() => {
    try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch (e) { return false; }
  })();
  for (const rel of listFiles('audio')) {
    const src = path.join('audio', rel);
    const dst = path.join(audOut, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    audBefore += fs.statSync(src).size;
    if (haveFfmpeg && path.extname(rel).toLowerCase() === '.mp3') {
      try {
        execSync(`ffmpeg -y -i "${src}" -ac 1 -b:a 96k "${dst}"`, { stdio: 'ignore' });
        reencoded++;
      } catch (e) {
        fs.copyFileSync(src, dst);
      }
    } else {
      fs.copyFileSync(src, dst);
    }
    audAfter += fs.statSync(dst).size;
  }
  if (!haveFfmpeg) console.warn('  crazy: ffmpeg not found — audio copied at full size');

  // 4. index.html → CrazyGames-safe variant.
  let html = fs.readFileSync('index.html', 'utf8');

  // 4a. Root-absolute asset paths → relative. CrazyGames serves the game
  //     from a subpath, and absolute paths "will fail to load".
  html = html.replace(/(["'(])\/(icon-512\.png|icon-192\.png|favicon\.ico)/g, '$1./$2');

  // 4b. Drop the PWA manifest and the service worker. A SW scoped to "/"
  //     cannot register from a subpath and only adds failure modes.
  html = html.replace(/\s*<link rel="manifest"[^>]*>\n?/, '\n');
  html = html.replace(/\s*<script>\s*if \('serviceWorker' in navigator\)[\s\S]*?<\/script>/, '');

  // 4c. Remove every third-party request.
  //     Supabase and Sentry are both guarded by `typeof` checks upstream,
  //     so removing the tags disables cloud save and error tracking
  //     cleanly rather than throwing.
  html = html
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.[^>]*>/g, '')
    .replace(/\s*<link rel="preload"[^>]*fonts\.googleapis[^>]*>/g, '')
    .replace(/\s*<noscript><link[^>]*fonts\.googleapis[^>]*><\/noscript>/g, '')
    .replace(/\s*<script[^>]*cloud\.umami\.is[^>]*><\/script>/g, '')
    .replace(/\s*<script[^>]*browser\.sentry-cdn\.com[^>]*><\/script>/g, '')
    .replace(/\s*<script[^>]*cdn\.jsdelivr\.net[^>]*><\/script>/g, '');

  // 4d. Drop the Sentry init block (now dead) and the JSON-LD / social meta,
  //     which only carry absolute URLs pointing back at the public site.
  html = html.replace(/\s*<script>\s*\/\/ ── Error tracking[\s\S]*?<\/script>/, '');
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  html = html.replace(/\s*<meta (?:property="og:|name="twitter:)[^>]*>/g, '');
  html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  html = html.replace(/\s*<meta name="google-site-verification"[^>]*>/g, '');

  // 4e. Remove the off-platform links outright rather than only hiding them,
  //     so they are not present in the DOM for a reviewer to find.
  html = html.replace(/\s*<!-- Content pages\.[\s\S]*?-->\s*/, '\n          ');
  html = html.replace(/\s*<a class="settings-menu-btn settings-link-btn"[\s\S]*?<\/a>/g, '');
  html = html.replace(/\s*<button class="settings-menu-btn settings-play-btn"[\s\S]*?<\/button>/g, '');

  // 4f. Hard network guard, inline in <head> so it runs before the bundle.
  //     Cloud save already disables itself without the Supabase SDK, but the
  //     push-notification paths call the Supabase functions endpoint directly
  //     and are gated only on localStorage flags — so a returning player could
  //     still emit an off-platform request. Rather than chase every call site
  //     in shared code, block the hosts outright. Resolving with 204 keeps
  //     callers' .then/.catch chains well-behaved.
  const NET_GUARD = [
    '  <script>',
    '    // CrazyGames: no third-party requests may leave the game.',
    '    (function () {',
    '      var BLOCK = /supabase\\.co|umami\\.is|glitchtip\\.com|google-analytics|googletagmanager|play\\.google\\.com/i;',
    '      var of = window.fetch;',
    '      window.fetch = function (input) {',
    '        var u = typeof input === "string" ? input : (input && input.url) || "";',
    '        // 204 forbids a body — passing "" throws and would abort the caller.',
    '        if (BLOCK.test(u)) return Promise.resolve(new Response(null, { status: 204 }));',
    '        return of.apply(this, arguments);',
    '      };',
    '      var oo = XMLHttpRequest.prototype.open;',
    '      XMLHttpRequest.prototype.open = function (m, u) {',
    '        this.__blocked = BLOCK.test(String(u || ""));',
    '        return oo.apply(this, arguments);',
    '      };',
    '      var os = XMLHttpRequest.prototype.send;',
    '      XMLHttpRequest.prototype.send = function () {',
    '        if (this.__blocked) return;',
    '        return os.apply(this, arguments);',
    '      };',
    '    })();',
    '  </script>',
  ].join('\n');
  html = html.replace('</head>', NET_GUARD + '\n</head>');

  // 4g. Inject the CrazyGames stylesheet + shim.
  html = html.replace('</head>', '  <link rel="stylesheet" href="./crazygames.css" />\n</head>');
  html = html.replace('</body>', '  <script defer src="./crazygames.js"></script>\n</body>');

  fs.writeFileSync(path.join(CRAZY_OUT, 'index.html'), html);

  // 5. Zip with index.html at the archive ROOT.
  fs.rmSync('dist-crazy.zip', { force: true });
  execSync('zip -r -X ../dist-crazy.zip .', { cwd: CRAZY_OUT, stdio: 'ignore' });

  // 6. Report against CrazyGames' published limits.
  const list  = listFiles(CRAZY_OUT);
  const total = list.reduce((s, f) => s + fs.statSync(path.join(CRAZY_OUT, f)).size, 0);
  console.log('\nbuild → ' + CRAZY_OUT + '/  (+ dist-crazy.zip)');
  console.log(`  img:   ${kb(imgBefore)} → ${kb(imgAfter)}  (${pct(imgBefore, imgAfter)} smaller)`);
  console.log(`  audio: ${kb(audBefore)} → ${kb(audAfter)}  (${pct(audBefore, audAfter)} smaller, ${reencoded} re-encoded)`);
  console.log(`  files: ${list.length} / 1500 limit`);
  console.log(`  total: ${kb(total)} / 250MB limit`);
  const mb = total / 1024 / 1024;
  console.log(`  mobile-homepage eligibility (<=20MB): ${mb <= 20 ? 'YES' : 'NO — ' + mb.toFixed(1) + 'MB'}`);
  console.log('  index.html at root: ' + (fs.existsSync(path.join(CRAZY_OUT, 'index.html')) ? 'YES' : 'NO'));
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
