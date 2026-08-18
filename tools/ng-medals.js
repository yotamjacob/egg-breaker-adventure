#!/usr/bin/env node
// ============================================================
//  tools/ng-medals.js — print the suggested Newgrounds medal set
//
//  Newgrounds gives every game a 500-point medal budget (5/10/25/50/100
//  per medal). The game has ~130 achievements; this picks a curated set
//  that spans the whole progression, prints them as a table you can
//  copy into API Tools → Medals, and emits a ready-to-paste `medals: {}`
//  block for ng/ng-config.js (ids left as 0 until you create them).
//
//  Run:  node tools/ng-medals.js            (table + config template)
//        node tools/ng-medals.js --csv      (CSV: name,description,points,secret)
// ============================================================
const fs = require('fs');
const vm = require('vm');

// data.js depends on CONFIG (config.js) — evaluate both in a sandbox.
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ['config.js', 'quotes.js', 'data.js']) {
  vm.runInContext(fs.readFileSync(f, 'utf8') + '\nthis.__x = { ACHIEVEMENT_DATA: typeof ACHIEVEMENT_DATA!=="undefined"?ACHIEVEMENT_DATA:null, SECRET_ACHIEVEMENTS: typeof SECRET_ACHIEVEMENTS!=="undefined"?SECRET_ACHIEVEMENTS:null };', ctx, { filename: f });
}
const ALL = (ctx.__x.ACHIEVEMENT_DATA || []).concat(ctx.__x.SECRET_ACHIEVEMENTS || []);
const byId = Object.fromEntries(ALL.map(a => [a.id, a]));

// id → points. Total must stay ≤ 500.
const PICK = [
  // early hooks (a judge should see 2–3 of these in the first minutes)
  ['first_smash',   5], ['smash_50',     5], ['round_clear', 5],
  ['stage_1',      10], ['items_10',    10], ['starfall_1',  10],
  ['buy_hammer',    5], ['silver_10',   5], ['gold_egg_10', 10],
  // mid game
  ['smash_1000',   10], ['coll_5',      10], ['stage_9',    25], ['monkey_2',   10],
  ['items_100',    25], ['crystal_1',   10], ['ruby_1',     10], ['black_1',    25],
  ['skill_first',  10], ['bigwin_5000', 10], ['streak_5',   10], ['mult_50',    25],
  // long tail
  ['stage_18',     25], ['stage_36',    50], ['coll_30',    25], ['smash_10000', 25],
  ['monkey_all',   50], ['skills_maxed', 25], ['stage_all', 50],
  // one secret to reward curiosity
  ['secret_chicken', 5],
];

const rows = [];
let total = 0, missing = [];
for (const [id, pts] of PICK) {
  const a = byId[id];
  if (!a) { missing.push(id); continue; }
  const secret = (ctx.__x.SECRET_ACHIEVEMENTS || []).some(s => s.id === id);
  rows.push({ id, name: a.name, desc: a.desc, pts, secret });
  total += pts;
}

if (process.argv.includes('--csv')) {
  console.log('name,description,points,secret');
  for (const r of rows) console.log([r.name, r.desc, r.pts, r.secret ? 'yes' : 'no'].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
} else {
  console.log(`Suggested Newgrounds medals — ${rows.length} medals, ${total}/500 points\n`);
  const w = Math.max(...rows.map(r => r.name.length));
  for (const r of rows) console.log(`  ${String(r.pts).padStart(3)} pts  ${r.name.padEnd(w)}  ${r.desc}${r.secret ? '  (secret)' : ''}`);
  console.log('\nPaste into ng/ng-config.js once the medals exist (replace 0 with each medal id):\n');
  console.log('  medals: {');
  for (const r of rows) console.log(`    ${(r.id + ':').padEnd(16)} 0,   // ${r.name}`);
  console.log('  },');
}
if (missing.length) console.error('\n⚠ unknown achievement ids (retuned data.js?):', missing.join(', '));
if (total > 500) { console.error(`\n✖ ${total} points exceeds the 500-point budget`); process.exit(1); }
