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
// into /dist-itch (+ dist-itch.zip). `node build.js --ng` assembles the
// Newgrounds build into /dist-ng (+ dist-ng.zip) — same static build plus
// the newgrounds.io integration script. Without a flag the build is
// identical to before — the Vercel/Android pipeline is untouched.
const ITCH = process.argv.includes('--itch');
const NG   = process.argv.includes('--ng');

const JS_FILES = [
  'lz-string.min.js',
  'config.js',
  'quotes.js',
  'data.js',
  'audio.js',
  'particles.js',
  'hammers.js',
  'render.js',
  'game.js',
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

  console.log('Build complete.');

  if (ITCH) buildItch();
  if (NG)   buildNewgrounds();
}

// ============================================================
//  Static web build targets  (itch.io / Newgrounds)
//  Produce a clean, upload-ready static build with index.html at
//  the ROOT, plus a zip. Source files (index.html, render.js, …)
//  are never modified — the transform happens on a copy in memory.
// ============================================================
//
//  assembleWebBuild(outDir, zipName, opts)
//    opts.extraFiles  : [paths]  copied (flattened) into outDir
//    opts.bodyScripts : [html]   injected before </body> (in order)
//  Always injects the itch.css stylesheet + itch.js CTA script; the
//  Newgrounds build appends newgrounds.js on top of that.
//
function assembleWebBuild(OUT, zipName, opts) {
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
  ].concat(opts.extraFiles || []);
  for (const f of FILES) {
    fs.copyFileSync(f, path.join(OUT, path.basename(f)));
  }
  const DIRS = ['img', 'audio'];
  for (const d of DIRS) {
    fs.cpSync(d, path.join(OUT, d), { recursive: true });
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
  const bodyScripts = ['  <script defer src="./itch.js"></script>']
    .concat(opts.bodyScripts || []);
  html = html.replace('</body>', bodyScripts.join('\n') + '\n</body>');

  fs.writeFileSync(path.join(OUT, 'index.html'), html);

  // 4. Zip with index.html at the archive ROOT (not nested).
  fs.rmSync(zipName, { force: true });
  execSync('zip -r -X ../' + zipName + ' .', { cwd: OUT, stdio: 'ignore' });

  // 5. Report.
  const list = listFiles(OUT).sort();
  const total = list.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
  console.log('\nbuild → ' + OUT + '/  (+ ' + zipName + ')');
  console.log('  files: ' + list.length + '   total: ' + kb(total));
  console.log('  index.html at root: ' + (fs.existsSync(path.join(OUT, 'index.html')) ? 'YES' : 'NO'));
}

// itch.io build  (node build.js --itch)
function buildItch() {
  assembleWebBuild('dist-itch', 'dist-itch.zip', {});
}

// Newgrounds build  (node build.js --ng) — itch build + newgrounds.io API
function buildNewgrounds() {
  assembleWebBuild('dist-ng', 'dist-ng.zip', {
    extraFiles: ['newgrounds/newgrounds.js'],
    bodyScripts: ['  <script defer src="./newgrounds.js"></script>'],
  });
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
