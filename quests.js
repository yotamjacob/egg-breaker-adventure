// ============================================================
//  Egg Smash Adventures — Quests
//  quests.js  (bundled after achievements.js; before idle.js)
//
//  3 daily quests + 1 weekly quest, drawn deterministically from
//  CONFIG.quests so everyone gets the same set on a given day/week.
//  Progress = (counter now) − (counter when assigned): nothing new is
//  tracked. Rewards are claimed by hand in the Quests tab; at reset,
//  completed-but-unclaimed quests are auto-claimed so nothing is lost.
//
//  All module-level state is `var` (see CLAUDE.md, TDZ rule).
// ============================================================

// ---- keys ----------------------------------------------------------
function questDayKey(d) { return localDateStr(d || new Date()); }
/** ISO-ish week key: the Monday of the week, local time. */
function questWeekKey(d) {
  const t = new Date(d || new Date());
  const day = (t.getDay() + 6) % 7;          // Mon=0 … Sun=6
  t.setDate(t.getDate() - day);
  return localDateStr(t);
}
function _questMsUntilTomorrow() {
  const n = new Date(); const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return t - n;
}
function _questMsUntilNextWeek() {
  const n = new Date(); const day = (n.getDay() + 6) % 7;
  const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + (7 - day));
  return t - n;
}

// ---- metrics --------------------------------------------------------
function questMetric(name) {
  if (name === 'skillUses') return (G.totalRageUses || 0) + (G.totalGooseUses || 0) + (G.totalShakeUses || 0);
  const v = G[name];
  return typeof v === 'number' ? v : 0;
}
function _questNeedMet(need) {
  if (!need) return true;
  if (need === 'starfall') return typeof isStarfallUnlocked === 'function' && isStarfallUnlocked();
  if (need === 'skills')   return !!(G.skillsUnlocked && G.skillsUnlocked.some(Boolean));
  if (need === 'autotap')  return !!(G.autoTap && G.autoTap.unlocked);
  if (need === 'monkey2')  return !!(G.monkeys && G.monkeys.filter(m => m.unlocked).length >= 2);
  return true;
}

// ---- deterministic pick ----------------------------------------------
function _questHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function _questRng(seed) {
  let s = seed || 1;
  return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
/** Pick `n` distinct templates from `pool` for `key`, skipping unmet needs (deterministic). */
function questPick(pool, n, key) {
  const eligible = pool.filter(t => _questNeedMet(t.need));
  const rng = _questRng(_questHash('q:' + key));
  const arr = eligible.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr.slice(0, n);
}
function questTemplate(id) {
  const q = CONFIG.quests;
  return q.daily.find(t => t.id === id) || q.weekly.find(t => t.id === id) || null;
}

// ---- state --------------------------------------------------------------
function _questAssign(t) { return { id: t.id, base: questMetric(t.metric), claimed: false }; }

/** Make sure G.quests matches today/this week; roll over (auto-claiming completed) when not. */
function ensureQuests() {
  const cfg = CONFIG.quests;
  if (!cfg) return null;
  const day = questDayKey(), week = questWeekKey();
  let q = G.quests;
  if (!q || typeof q !== 'object') q = G.quests = { day: null, daily: [], week: null, weekly: null };
  let changed = false;
  if (q.day !== day) {
    if (q.day && Array.isArray(q.daily)) q.daily.forEach(a => _questAutoClaim(a));
    q.day = day;
    q.daily = questPick(cfg.daily, cfg.dailyCount, day).map(_questAssign);
    changed = true;
  }
  if (q.week !== week) {
    if (q.week && q.weekly) _questAutoClaim(q.weekly);
    q.week = week;
    const w = questPick(cfg.weekly, 1, 'w' + week)[0];
    q.weekly = w ? _questAssign(w) : null;
    changed = true;
  }
  if (changed) { saveGame(); updateQuestPip(); }
  return q;
}
function _questAutoClaim(a) {
  if (!a || a.claimed) return;
  const t = questTemplate(a.id); if (!t) return;
  if (questProgress(a, t) >= t.target) {
    _questGrant(t);
    a.claimed = true;
    msg('📜 Quest auto-claimed: ' + t.name, 'trophies');
  }
}
function questProgress(a, t) {
  return Math.max(0, questMetric(t.metric) - (a.base || 0));
}
function questGoldReward(t) {
  const g = t.reward && t.reward.gold; if (!g) return 0;
  const cfg = CONFIG.quests;
  const scale = Math.min(1 + (G.stagesCompleted || 0) * cfg.goldScale, cfg.goldScaleMax + 1);
  return Math.round(g * scale / 10) * 10;
}
function questRewardLabel(t) {
  const r = t.reward || {}; const parts = [];
  if (r.gold)       parts.push('+' + formatNum(questGoldReward(t)) + ' 🪙');
  if (r.feathers)   parts.push('+' + r.feathers + ' 🪶');
  if (r.starPieces) parts.push('+' + r.starPieces + ' ⭐');
  if (r.hammers)    parts.push('+' + r.hammers + ' 🔨');
  if (r.maxHammers) parts.push('+' + r.maxHammers + ' max 🔨');
  return parts.join('  ');
}
function _questGrant(t) {
  const r = t.reward || {};
  const gold = questGoldReward(t);
  if (gold) {
    G.gold += gold; G.totalGold += gold;
    // Don't let quest gold count towards "earn gold" quests
    _questBumpBases('totalGold', gold);
  }
  if (r.feathers)   { G.feathers += r.feathers; G.totalFeathers += r.feathers; }
  if (r.starPieces) { G.starPieces += r.starPieces; G.totalStarPieces += r.starPieces; }
  if (r.hammers)    { G.hammers += r.hammers; }
  if (r.maxHammers) { G.maxH += r.maxHammers; G.hammers += r.maxHammers; }
  G.questsCompleted = (G.questsCompleted || 0) + 1;
}

/** Shift the baseline of every active quest on `metric` by `amount` (reward gold must not self-progress). */
function _questBumpBases(metric, amount) {
  const q = G.quests; if (!q) return;
  const bump = a => { if (!a) return; const t = questTemplate(a.id); if (t && t.metric === metric) a.base = (a.base || 0) + amount; };
  (q.daily || []).forEach(bump); bump(q.weekly);
}

/** Claim button handler. kind: 'daily' index or 'weekly'. */
function claimQuest(kind, idx) {
  const q = ensureQuests(); if (!q) return;
  const a = kind === 'weekly' ? q.weekly : q.daily[idx];
  if (!a || a.claimed) return;
  const t = questTemplate(a.id); if (!t) return;
  if (questProgress(a, t) < t.target) return;
  _questGrant(t);
  a.claimed = true;
  SFX.play('achieve');
  msg('📜 Quest complete: ' + t.name + ' — ' + questRewardLabel(t), 'trophies');
  if (typeof checkAchievements === 'function') checkAchievements();
  updateResources();
  saveGame();
  renderQuests();
  updateQuestPip();
}

function questsClaimable() {
  const q = G.quests; if (!q) return 0;
  let n = 0;
  const check = a => { if (!a || a.claimed) return; const t = questTemplate(a.id); if (t && questProgress(a, t) >= t.target) n++; };
  (q.daily || []).forEach(check); check(q.weekly);
  return n;
}
/** Nav pip: highlight the Quests tab when something can be claimed. */
function updateQuestPip() {
  const btn = document.querySelector('.nav-tab[data-tab="quests"]');
  if (!btn) return;
  btn.classList.toggle('quest-ready', questsClaimable() > 0);
}

// ---- rendering ---------------------------------------------------------
function _questFmtLeft(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + mm + 'm';
  return mm + 'm';
}
function _questCard(a, t, kind, idx) {
  const prog = Math.min(questProgress(a, t), t.target);
  const done = prog >= t.target;
  const pct = Math.floor(prog / t.target * 100);
  return '<div class="quest-card' + (a.claimed ? ' claimed' : done ? ' done' : '') + '">' +
    '<div class="quest-top"><span class="quest-icon">' + t.icon + '</span>' +
      '<div class="quest-text"><div class="quest-name">' + t.name + '</div><div class="quest-desc">' + t.desc + '</div></div>' +
      (a.claimed
        ? '<span class="quest-status">✅</span>'
        : done
          ? '<button class="quest-claim" onclick="claimQuest(\'' + kind + '\',' + idx + ')">Claim</button>'
          : '<span class="quest-count">' + formatNum(prog) + '/' + formatNum(t.target) + '</span>') +
    '</div>' +
    '<div class="m-prog-track quest-track"><div class="m-prog-fill' + (done ? ' done' : '') + '" style="width:' + pct + '%"></div></div>' +
    '<div class="quest-reward">' + (a.claimed ? 'Claimed' : questRewardLabel(t)) + '</div>' +
  '</div>';
}
function renderQuests() {
  const el = $id('quests-list'); if (!el) return;
  const q = ensureQuests(); if (!q) { el.innerHTML = ''; return; }
  let html = '<div class="quest-header">📜 Daily Quests <span class="quest-timer">resets in ' + _questFmtLeft(_questMsUntilTomorrow()) + '</span></div>';
  q.daily.forEach((a, i) => { const t = questTemplate(a.id); if (t) html += _questCard(a, t, 'daily', i); });
  html += '<div class="quest-header quest-header-weekly">🏔️ Weekly Quest <span class="quest-timer">resets in ' + _questFmtLeft(_questMsUntilNextWeek()) + '</span></div>';
  if (q.weekly) { const t = questTemplate(q.weekly.id); if (t) html += _questCard(q.weekly, t, 'weekly', 0); }
  html += '<div class="quest-foot">Completed quests: ' + (G.questsCompleted || 0) + '</div>';
  el.innerHTML = html;
}

// ---- full activity log (moved out of the old Log tab into a sub-modal) ----
function openFullLog() {
  const ov = $id('overlay-fulllog'); if (!ov) return;
  if (typeof renderFullLog === 'function') renderFullLog();
  ov.classList.remove('hidden');
}

// ---- boot --------------------------------------------------------------
(function _questsBoot() {
  try { ensureQuests(); updateQuestPip(); } catch (e) { console.error('quests boot failed', e); }
  // Re-check for day/week rollover and claimable state periodically
  setInterval(function () { try { ensureQuests(); updateQuestPip(); } catch (e) {} }, 60000);
})();
