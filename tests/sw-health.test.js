// ============================================================
//  Egg Smash Adventures — Service Worker Health Tests
//  Guards against the SW-freeze incident (v2.4.61 → v2.6.2):
//  stale STATIC_ASSETS 404'd during install, cache.addAll's
//  atomicity rejected every install, clients froze on an ancient
//  worker and served a fossilized v1.x design / ERR_TIMED_OUT.
//
//  Static checks validate the repo; production checks validate
//  the live deployment. Runs with smoke tests (3× daily + push).
// ============================================================

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const { execFileSync } = require('node:child_process');

const APP  = 'https://egg-breaker-adventures.vercel.app';
const MS   = 30_000;
const ROOT = path.join(__dirname, '..');

const swSrc     = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const configSrc = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
const indexSrc  = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

async function GET(url, fetchOpts = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), MS);
  try   { return await fetch(url, { signal: c.signal, ...fetchOpts }); }
  finally { clearTimeout(t); }
}

/** Parses the STATIC_ASSETS array out of a sw.js source string. */
function parseStaticAssets(src) {
  const m = src.match(/const STATIC_ASSETS = \[([\s\S]*?)\]/);
  assert.ok(m, 'STATIC_ASSETS array not found in sw.js');
  const assets = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  assert.ok(assets.length > 0, 'STATIC_ASSETS is empty');
  return assets;
}

/** Maps a clean URL from STATIC_ASSETS to its file in the repo. */
function assetToRepoFile(asset) {
  if (asset === '/') return 'index.html';
  const rel = asset.replace(/^\//, '');
  return fs.existsSync(path.join(ROOT, rel)) ? rel : rel + '.html';
}

// ── Repo-side (static) checks ─────────────────────────────────────────────────

describe('sw.js static health', () => {
  test('sw.js has valid syntax', () => {
    // A parse error in sw.js makes every SW update fail silently,
    // freezing all clients on whatever worker they already have.
    execFileSync(process.execPath, ['--check', path.join(ROOT, 'sw.js')]);
  });

  test('install never uses atomic cache.addAll', () => {
    // addAll rejects the whole install if ONE asset 404s — this froze
    // clients for 100+ versions. Assets must be cached individually.
    assert.ok(!/\baddAll\s*\(/.test(swSrc),
      'cache.addAll found in sw.js — see CLAUDE.md "Service worker invariants"');
    assert.match(swSrc, /Promise\.allSettled/,
      'install must cache assets individually via Promise.allSettled');
  });

  test('every STATIC_ASSETS entry exists in the repo', () => {
    for (const asset of parseStaticAssets(swSrc)) {
      const file = assetToRepoFile(asset);
      assert.ok(fs.existsSync(path.join(ROOT, file)),
        `STATIC_ASSETS lists ${asset} but ${file} does not exist — ` +
        'remove deleted files from STATIC_ASSETS in the same commit');
    }
  });

  test('STATIC_ASSETS uses clean URLs (no .html)', () => {
    // vercel.json cleanUrls:true 308-redirects .html paths; cache.add
    // rejects on non-200, so .html entries poison the install.
    for (const asset of parseStaticAssets(swSrc)) {
      assert.ok(!asset.endsWith('.html'),
        `${asset} — use the clean URL (cleanUrls redirects .html to 308)`);
    }
  });

  test('CACHE_VERSION matches config.js VERSION', () => {
    const sw  = swSrc.match(/CACHE_VERSION = '([^']+)'/);
    const cfg = configSrc.match(/const VERSION = '([^']+)'/);
    assert.ok(sw && cfg, 'version constants not found');
    assert.equal(sw[1], cfg[1],
      'sw.js CACHE_VERSION out of sync — run `node build.js` after bumping config.js');
  });

  test('fetch handler can never hang or dead-end', () => {
    // The old handler had no timeout and could respondWith(undefined),
    // which renders the browser error page (ERR_TIMED_OUT in the WebView).
    assert.match(swSrc, /NETWORK_TIMEOUT_MS/, 'network fetch must race a timeout');
    assert.match(swSrc, /Response\.error\(\)/,
      'fallback chain must end in Response.error(), never respondWith(undefined)');
    assert.match(swSrc, /caches\.match\('\/'\)/,
      'navigations must fall back to the cached app shell');
  });

  test('index.html has the version watchdog', () => {
    // The watchdog force-updates any client pinned to an old version
    // while online — the last line of defense against fossil designs.
    assert.match(indexSrc, /CACHE_VERSION = '\(\[\^'\]\+\)'/,
      'version watchdog missing from index.html SW registration block');
    assert.match(indexSrc, /_vwTarget/, 'watchdog reload-loop guard missing');
  });
});

// ── Production checks ─────────────────────────────────────────────────────────

describe('sw production health', () => {
  test('every live STATIC_ASSET returns 200 with no redirect', async () => {
    // Parse assets from the LIVE sw.js — that is what installing clients fetch.
    const liveSw = await (await GET(`${APP}/sw.js`, { cache: 'no-store' })).text();
    for (const asset of parseStaticAssets(liveSw)) {
      const r = await GET(`${APP}${asset}`, { redirect: 'manual' });
      assert.equal(r.status, 200,
        `${asset} → ${r.status} — a non-200 asset breaks SW install for every client`);
    }
  });

  test('live sw.js and live bundle agree on version', async () => {
    const sw     = (await (await GET(`${APP}/sw.js`)).text()).match(/CACHE_VERSION = '([^']+)'/);
    const bundle = (await (await GET(`${APP}/bundle.min.js`)).text()).match(/VERSION\s*=\s*["']([^"']+)["']/);
    assert.ok(sw && bundle, 'live version constants not found');
    assert.equal(sw[1], bundle[1], 'live sw.js and bundle.min.js versions diverge');
  });

  test('live page is the current design — the old design must never surface', async () => {
    const html = await (await GET(`${APP}/`, { cache: 'no-store' })).text();
    // Markers of the current design era
    assert.match(html, /nav-sections/, 'current nav markup missing from live page');
    assert.match(html, /splash-screen/, 'current splash markup missing from live page');
    assert.match(html, /update-banner/, 'update banner missing from live page');
    const bundle = await (await GET(`${APP}/bundle.min.js`)).text();
    assert.match(bundle, /eggBreaker_v2/, 'live bundle does not use the v2 save key');
  });

  test('live CSP keeps required origins', async () => {
    const csp = (await GET(`${APP}/`)).headers.get('content-security-policy') ?? '';
    assert.match(csp, /gateway\.umami\.is/, 'analytics endpoint missing from connect-src');
    assert.match(csp, /frame-ancestors[^;]*yotam-jacob\.com/, 'portfolio domain missing from frame-ancestors');
  });
});
