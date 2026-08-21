// ============================================================
//  CSS cascade lint — the generalized guard for the project's
//  signature silent bug class.
//
//  Twice the smash feedback vanished (v3.2.1 egg wiggle, v3.11.10
//  frozen hammer swing) because a rule with higher specificity set
//  `animation` on the same element and won the cascade. Nothing
//  errors, nothing logs — the animation just stops resolving.
//
//  tests/smash-animation.test.js catches the KNOWN cases in a real
//  browser. This suite catches the UNKNOWN future ones statically:
//  every rule that sets `animation`/`animation-name` where the
//  selector's subject is `.egg-slot` or `#hammer` must be explicitly
//  allowlisted here. Adding such a rule is no longer silent — this
//  test fails and tells you what to check before extending the list.
//
//  Runs on the source stylesheets AND bundle.min.css (order matters
//  in the bundle, and a stale bundle ships the bug anyway).
// ============================================================
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Every selector whose SUBJECT is the egg slot and whose body sets
// animation/animation-name. Before adding to this list, prove the new
// rule cannot outrank `.egg-slot.smashing` / `.egg-slot.egg-crunching`
// (see "Smash animation invariants" in CLAUDE.md): prefer animating a
// child (`.egg-slot.foo > svg`), keep ties BEFORE .smashing in source
// order, and verify with tests/smash-animation.test.js's resolved checks.
const EGG_SLOT_ALLOW = new Set([
  '.egg-slot.egg-crunching',
  '.egg-slot.runny',
  '.egg-slot.runny.broken',
  '.egg-slot.timed',
  '.egg-slot.timed.broken',
  '.egg-slot.idle-wiggle',
  '.egg-slot.balloon',
  '.egg-slot.balloon.inflating',
  '.egg-slot.smashing',
  '.egg-slot.tele-in',
]);

// State rules that tie with `.egg-slot.smashing` at (0,2,0): they must
// come BEFORE it in source order so the tap feedback wins the tie.
const MUST_PRECEDE_SMASHING = [
  '.egg-slot.egg-crunching', // specials must opt out via egg-crunch, not win by order
  '.egg-slot.idle-wiggle',
  '.egg-slot.runny',
  '.egg-slot.timed',
  '.egg-slot.balloon',
];

// The four stylesheets that make up bundle.min.css (content.css is not
// part of the game bundle and styles no game elements).
const SOURCE_SHEETS = ['style.css', 'play.css', 'tabs.css', 'components.css'];

// ---------- tiny CSS walker (comments stripped, @keyframes skipped,
// @media/@supports descended) ----------
function parseRules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;

  function skipBlock() {
    let depth = 1;
    while (i < css.length && depth > 0) {
      const ch = css[i++];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
  }

  function walk() {
    while (i < css.length) {
      const open = css.indexOf('{', i);
      const close = css.indexOf('}', i);
      if (close !== -1 && (open === -1 || close < open)) { i = close + 1; return; }
      if (open === -1) return;
      const sel = css.slice(i, open).trim();
      i = open + 1;
      if (/^@(-\w+-)?keyframes\b/.test(sel) || /^@font-face\b/.test(sel)) {
        skipBlock();
      } else if (/^@(media|supports)\b/.test(sel)) {
        walk();
      } else {
        const bodyEnd = css.indexOf('}', i);
        rules.push({ selector: sel, body: css.slice(i, bodyEnd), index: open });
        i = bodyEnd + 1;
      }
    }
  }

  walk();
  return rules;
}

// Split a selector list on top-level commas.
function splitSelectors(sel) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// The subject of a selector: its last compound (what the rule styles).
function subjectOf(sel) {
  let depth = 0;
  const parts = [''];
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0 && /[\s>+~]/.test(ch)) {
      if (parts[parts.length - 1] !== '') parts.push('');
    } else {
      parts[parts.length - 1] += ch;
    }
  }
  return parts.filter(Boolean).pop() || '';
}

const setsAnimation = body => /(^|[;\s])animation(-name)?\s*:/.test(body);

// Every (selector, index) pair that sets animation, across a stylesheet.
function animationSetters(css) {
  const out = [];
  for (const rule of parseRules(css)) {
    if (!setsAnimation(rule.body)) continue;
    for (const sel of splitSelectors(rule.selector)) {
      out.push({ sel, subject: subjectOf(sel), index: rule.index });
    }
  }
  return out;
}

function lintSheet(name, css) {
  const setters = animationSetters(css);

  test(`${name}: every animation rule targeting .egg-slot itself is allowlisted`, () => {
    for (const { sel, subject } of setters) {
      if (!subject.includes('.egg-slot')) continue; // child subjects (svg, labels) are the SAFE pattern
      assert.ok(EGG_SLOT_ALLOW.has(sel),
        `${name}: "${sel}" sets animation on the egg slot itself and is not allowlisted.\n` +
        `This is the silent cascade bug class (CLAUDE.md → Smash animation invariants): ` +
        `it can outrank .egg-slot.smashing / .egg-slot.egg-crunching and kill the tap feedback ` +
        `with no error anywhere.\n` +
        `Preferred fix: animate a child instead ("${sel} > svg").\n` +
        `If the slot itself truly must animate: keep specificity at (0,2,0), place the rule ` +
        `BEFORE .egg-slot.smashing, verify with tests/smash-animation.test.js, then add it to ` +
        `EGG_SLOT_ALLOW in tests/css-cascade.test.js.`);
    }
  });

  test(`${name}: no animation rule targets #hammer itself`, () => {
    for (const { sel, subject } of setters) {
      assert.ok(!subject.includes('#hammer'),
        `${name}: "${sel}" sets animation on #hammer itself. At id specificity it outranks ` +
        `.hammer-anim's hammer-swing and freezes the tap swing at its initial pose ` +
        `(the v3.11.10 L10-prism bug). Animate the SVG child instead ("#hammer.foo svg").`);
    }
  });

  test(`${name}: .egg-slot.smashing wins its specificity ties by source order`, () => {
    const at = wanted => {
      const hit = setters.find(s => s.sel === wanted);
      return hit ? hit.index : null;
    };
    const smashing = at('.egg-slot.smashing');
    if (smashing === null) {
      // The rule lives in play.css (and therefore the bundle). In sheets
      // without it there is no tie to order — but none of the tied state
      // rules may live here either, or the bundle order (style → play →
      // tabs → components) would put them after it.
      const stray = MUST_PRECEDE_SMASHING.filter(sel => at(sel) !== null && name !== 'play.css' && name !== 'style.css');
      assert.deepEqual(stray, [],
        `${name}: ${stray.join(', ')} would land after .egg-slot.smashing in bundle order`);
      return;
    }
    for (const sel of MUST_PRECEDE_SMASHING) {
      const idx = at(sel);
      if (idx === null) continue; // rule may legitimately be retired
      assert.ok(idx < smashing,
        `${name}: "${sel}" comes after .egg-slot.smashing — they tie at (0,2,0), so it now ` +
        `wins the cascade and the tap wiggle disappears on eggs carrying that state.`);
    }
  });
}

describe('CSS cascade lint — animation ownership', () => {
  for (const sheet of SOURCE_SHEETS) lintSheet(sheet, read(sheet));

  // The bundle is what players actually load; lint it too so a stale or
  // misordered bundle can't ship what the sources no longer contain.
  lintSheet('bundle.min.css', read('bundle.min.css'));

  test('the hammer swing rule itself still exists', () => {
    const setters = animationSetters(read('play.css'));
    assert.ok(setters.some(s => s.sel === '.hammer-anim'),
      'play.css: .hammer-anim no longer sets the hammer-swing animation');
  });

  // Sanity: the linter must actually see the known rules — an empty parse
  // would make every check above pass vacuously.
  test('the linter parses the real stylesheets (self-check)', () => {
    const setters = animationSetters(read('play.css'));
    assert.ok(setters.some(s => s.sel === '.egg-slot.smashing'), 'parser missed .egg-slot.smashing');
    assert.ok(setters.some(s => s.subject === 'svg' && s.sel.includes('#hammer.hlv-prism')),
      'parser missed #hammer.hlv-prism svg — the child-subject pattern this suite exists to enforce');
    assert.ok(setters.length >= 15, `parser found only ${setters.length} animation rules in play.css — parsing is broken`);
  });
});
