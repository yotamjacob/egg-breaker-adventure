// Analytics invariants (v3.12.10).
// 1. Exactly one `function track(` across the bundled sources. A second declaration
//    later in the bundle wins by hoisting and silently disables the boot-time queue
//    in analytics.js (this zeroed `game-started` until v3.12.10).
// 2. Boot-time events are queued until Umami's deferred script loads, then flushed.
// 3. first-smash fires once per player: its flag is persisted in DEFAULT_STATE.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const build = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
const listMatch = build.match(/JS_FILES\s*=\s*\[([\s\S]*?)\]/);
const JS_FILES = listMatch ? [...listMatch[1].matchAll(/'([^']+\.js)'/g)].map(m => m[1]) : [];

test('build.js lists the bundled JS files', () => {
  assert.ok(JS_FILES.length > 5, 'could not read JS_FILES from build.js');
});

test('track() is declared exactly once across the bundle', () => {
  const hits = [];
  for (const f of JS_FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const n = (src.match(/^\s*(async\s+)?function\s+track\s*\(/gm) || []).length;
    if (n) hits.push(`${f} x${n}`);
  }
  assert.deepStrictEqual(hits, ['analytics.js x1'], 'track() must live only in analytics.js, found: ' + hits.join(', '));
});

test('events fired before Umami loads are queued and flushed once it loads', () => {
  const sent = [];
  const sandbox = { window: {}, console, setInterval, clearInterval, setTimeout, clearTimeout };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'analytics.js'), 'utf8') + '\nthis.track = track; this._flush = _flushTrackQueue;', sandbox);
  sandbox.track('game-started', { source: 'direct' });
  assert.strictEqual(sent.length, 0);
  sandbox.window.umami = { track: (n, d) => sent.push(n) };
  sandbox._flush();
  sandbox.track('first-smash');
  assert.deepStrictEqual(sent, ['game-started', 'first-smash']);
});

test('first-smash flag is persisted (in DEFAULT_STATE) and used by smash.js', () => {
  const game = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
  const def = game.slice(game.indexOf('const DEFAULT_STATE'), game.indexOf('\n};', game.indexOf('const DEFAULT_STATE')));
  assert.match(def, /firstSmashAt\s*:/);
  const smash = fs.readFileSync(path.join(ROOT, 'smash.js'), 'utf8');
  assert.match(smash, /!G\.firstSmashAt/);
  assert.doesNotMatch(smash, /G\._firstSmashAt/);
});
