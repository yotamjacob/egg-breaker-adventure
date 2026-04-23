// ============================================================
//  Egg Smash Adventures — Build Script
//  Concatenates + minifies JS and CSS into two bundle files.
//  Run: node build.js
//  Output: bundle.min.js, bundle.min.css
// ============================================================

const esbuild = require('esbuild');
const fs = require('fs');

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
}

const kb  = n => Math.round(n / 1024) + 'KB';
const pct = (before, after) => Math.round((1 - after / before) * 100) + '%';

build().catch(e => { console.error(e); process.exit(1); });
