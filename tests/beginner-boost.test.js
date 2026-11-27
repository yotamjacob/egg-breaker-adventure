// Beginner boost (v3.12.11): new players refill faster until they finish
// CONFIG.beginnerBoost.stages stages or CONFIG.beginnerBoost.hours pass.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const game = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
function extract(name) {
  const i = game.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name + ' not found in game.js');
  const j = game.indexOf('\nfunction ', i + 10);
  return game.slice(i, j);
}
const cfgSrc = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');

function sandbox(G, theEggCut) {
  const ctx = { G, theEggBonus: () => theEggCut || 0, Date, isNaN, Math };
  vm.createContext(ctx);
  vm.runInContext(cfgSrc + '\nthis.CONFIG = CONFIG;', ctx);
  vm.runInContext(extract('beginnerBoostActive') + extract('regenIntervalSec') +
    '\nthis.active = beginnerBoostActive; this.regen = regenIntervalSec;', ctx);
  return ctx;
}
const HOUR = 3600000;

test('new player gets the beginner refill rate', () => {
  const c = sandbox({ stagesCompleted: 0, firstPlayDate: Date.now() - HOUR, fastRegen: false });
  assert.strictEqual(c.active(), true);
  assert.strictEqual(c.regen(), c.CONFIG.beginnerBoost.regenInterval);
});

test('boost ends after the configured number of stages', () => {
  const c = sandbox({ stagesCompleted: 3, firstPlayDate: Date.now() - HOUR, fastRegen: false });
  assert.strictEqual(c.active(), false);
  assert.strictEqual(c.regen(), c.CONFIG.regenInterval);
});

test('boost ends after the configured hours even with few stages', () => {
  const c = sandbox({ stagesCompleted: 1, firstPlayDate: Date.now() - 73 * HOUR, fastRegen: false });
  assert.strictEqual(c.active(), false);
  assert.strictEqual(c.regen(), c.CONFIG.regenInterval);
});

test('veterans with the fast-regen upgrade keep their own rate', () => {
  const c = sandbox({ stagesCompleted: 40, firstPlayDate: Date.now() - 900 * HOUR, fastRegen: true });
  assert.strictEqual(c.regen(), c.CONFIG.fastRegenInterval);
});

test('never slower than the normal rate and never below the 5 s floor', () => {
  const c = sandbox({ stagesCompleted: 0, firstPlayDate: Date.now(), fastRegen: true }, 20);
  assert.ok(c.regen() <= c.CONFIG.beginnerBoost.regenInterval);
  assert.ok(c.regen() >= 5);
});

test('legacy string firstPlayDate is understood', () => {
  const d = new Date(Date.now() - 2 * HOUR).toISOString().slice(0, 10);
  const c = sandbox({ stagesCompleted: 0, firstPlayDate: d, fastRegen: false });
  assert.strictEqual(typeof c.active(), 'boolean');
});
