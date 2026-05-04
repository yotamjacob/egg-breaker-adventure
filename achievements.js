// ============================================================
//  Egg Smash Adventures — Achievements
//  achievements.js  (requires game.js loaded first)
//  Achievement checking, bonus accumulation, and rewards.
// ============================================================

// ==================== ACHIEVEMENTS ====================
let toastTimeout = null;

function grantAchievementReward(a) {
  if (!a.reward) return;
  const r = a.reward;
  if (r.type === 'maxH')       { G.maxH += r.val; if (G.hammers < G.maxH) G.hammers = Math.min(G.maxH, G.hammers + r.val); }
  if (r.type === 'gold')       { G.gold += r.val; G.totalGold += r.val; }
  if (r.type === 'feathers')   { G.feathers += r.val; G.totalFeathers += r.val; }
  if (r.type === 'starPieces') { G.starPieces += r.val; G.totalStarPieces += r.val; }
  // goldPct, itemPct, starPct are passive — applied in getAchievementBonuses()
}

// Sum all percentage bonuses from unlocked achievements (cached)
function getAchievementBonuses() {
  if (_achieveBonusCache) return _achieveBonusCache;
  let goldPct = 0, itemPct = 0, starPct = 0;
  for (const id of G.achieved) {
    const a = ACHIEVEMENT_DATA.find(a => a.id === id);
    if (!a || !a.reward) continue;
    if (a.reward.type === 'goldPct') goldPct += a.reward.val;
    if (a.reward.type === 'itemPct') itemPct += a.reward.val;
    if (a.reward.type === 'starPct') starPct += a.reward.val;
  }
  _achieveBonusCache = { goldPct, itemPct, starPct };
  return _achieveBonusCache;
}

function checkAchievements() {
  const checks = {
    // Eggs smashed
    first_smash:  () => G.totalEggs >= 1,
    smash_50:     () => G.totalEggs >= 50,
    smash_200:    () => G.totalEggs >= 200,
    smash_1000:   () => G.totalEggs >= 1000,
    smash_5000:   () => G.totalEggs >= 5000,
    smash_10000:  () => G.totalEggs >= 10000,
    smash_50000:  () => G.totalEggs >= 25000,
    // Gold earned
    gold_1000:    () => G.totalGold >= 1000,
    gold_50000:   () => G.totalGold >= 50000,
    gold_500000:  () => G.totalGold >= 500000,
    gold_2000000: () => G.totalGold >= 2000000,
    // Star pieces
    stars_10:     () => G.totalStarPieces >= 10,
    stars_50:     () => G.totalStarPieces >= 50,
    stars_200:    () => G.totalStarPieces >= 200,
    // Starfall
    starfall_1:   () => G.starfallsUsed >= 1,
    starfall_10:  () => G.starfallsUsed >= 10,
    starfall_50:  () => G.starfallsUsed >= 50,
    // Collections
    coll_1:       () => G.collectionsCompleted >= 1,
    coll_5:       () => G.collectionsCompleted >= 5,
    coll_15:      () => G.collectionsCompleted >= 15,
    coll_30:      () => G.collectionsCompleted >= 30,
    // Items found
    items_10:     () => G.totalItems >= 10,
    items_50:     () => G.totalItems >= 50,
    items_100:    () => G.totalItems >= 100,
    items_200:    () => G.totalItems >= 200,
    // Stages
    stage_1:      () => G.stagesCompleted >= 1,
    stage_9:      () => G.stagesCompleted >= 9,
    stage_18:     () => G.stagesCompleted >= 18,
    stage_36:     () => G.stagesCompleted >= 36,
    stage_all:    () => G.stagesCompleted >= 53,
    // Monkeys
    monkey_2:     () => G.monkeys.filter(m => m.unlocked).length >= 2,
    monkey_all:   () => G.monkeys.every(m => m.unlocked),
    // Feathers
    feathers_50:  () => G.totalFeathers >= 50,
    feathers_500: () => G.totalFeathers >= 500,
    feather_buy:  () => (G.feathersBought || 0) >= 1,
    feather_buy10:() => (G.feathersBought || 0) >= 10,
    // Multipliers
    mult_found:   () => G.highestMult >= 2,
    mult_50:      () => G.highestMult >= 50,
    mult_123:     () => G.highestMult >= 123,
    mult_stack:   () => (G._lastMultCount || 0) >= 3,
    mult_big:     () => (G.maxMultUsed || 0) >= 20,
    // Silver & Gold eggs
    silver_10:    () => (G.silverSmashed || 0) >= 10,
    silver_100:   () => (G.silverSmashed || 0) >= 100,
    gold_egg_10:  () => (G.goldSmashed || 0) >= 10,
    gold_egg_50:  () => (G.goldSmashed || 0) >= 50,
    crystal_1:    () => (G.crystalSmashed || 0) >= 1,
    crystal_25:   () => (G.crystalSmashed || 0) >= 25,
    ruby_1:       () => (G.rubySmashed || 0) >= 1,
    ruby_25:      () => (G.rubySmashed || 0) >= 25,
    black_1:      () => (G.blackSmashed || 0) >= 1,
    black_10:     () => (G.blackSmashed || 0) >= 10,
    // Daily login
    streak_5:     () => G.consecutiveDays >= 5,
    daily_10:     () => G.consecutiveDays >= 7,
    // Shopping
    buy_hammer:   () => G.ownedHammers.length > 1,
    buy_hat:      () => G.ownedHats.length > 1,
    buy_all_h:    () => G.ownedHammers.length >= SHOP_HAMMERS.length,
    buy_all_hat:  () => G.ownedHats.length >= SHOP_HATS.length,
    shop_10:      () => (G.purchases || 0) >= 10,
    // Rounds
    round_clear:  () => G.roundClears >= 1,
    round_50:     () => G.roundClears >= 50,
    round_500:    () => G.roundClears >= 500,
    // Biggest win
    bigwin_500:   () => G.biggestWin >= 500,
    bigwin_5000:  () => G.biggestWin >= 5000,
    bigwin_50000: () => G.biggestWin >= 50000,
    // Hammer overflow
    overflow:     () => G.hammers > G.maxH,
    // Empties
    empty_10:     () => (G.totalEmpties || 0) >= 10,
    empty_50:     () => (G.totalEmpties || 0) >= 50,
    empty_200:    () => (G.totalEmpties || 0) >= 200,
    empty_500:    () => (G.totalEmpties || 0) >= 500,
    // Egg effects
    runny_1:      () => (G.runnySmashed || 0) >= 1,
    runny_25:     () => (G.runnySmashed || 0) >= 25,
    runny_100:    () => (G.runnySmashed || 0) >= 100,
    timer_1:      () => (G.timerSmashed || 0) >= 1,
    timer_25:     () => (G.timerSmashed || 0) >= 25,
    timer_100:    () => (G.timerSmashed || 0) >= 100,
    timer_close:  () => (G.timerCloseCall || 0) >= 1,
    missed_1:     () => (G.timerMissed || 0) >= 1,
    missed_10:    () => (G.timerMissed || 0) >= 10,
    combo_effect: () => (G.comboSmashed || 0) >= 1,
    century_1:    () => (G.centurySmashed || 0) >= 1,
    hex_1:        () => (G.hexesHit || 0) >= 1,
    hex_10:       () => (G.hexesHit || 0) >= 10,
    hex_50:       () => (G.hexesHit || 0) >= 50,
    balloon_1:    () => (G.balloonPopped || 0) >= 1,
    balloon_10:   () => (G.balloonPopped || 0) >= 10,
    balloon_50:   () => (G.balloonPopped || 0) >= 50,
    // Premium
    premium_first:     () => (G.premiumPurchases || 0) >= 1,
    premium_starter:   () => !!G.premium_starter_pack,
    premium_supporter: () => (G.premiumPurchases || 0) >= 3,
    // Skills
    skill_first:    () => (G.skillsUnlocked || []).filter(Boolean).length >= 1,
    skill_all:      () => (G.skillsUnlocked || []).every(Boolean),
    rage_first:     () => (G.totalRageUses  || 0) >= 1,
    rage_10:        () => (G.totalRageUses  || 0) >= 10,
    rage_upgrade1:  () => ((G.skillUpgrades || [0,0,0])[0] || 0) >= 1,
    rage_maxed:     () => ((G.skillUpgrades || [0,0,0])[0] || 0) >= 2,
    goose_first:    () => (G.totalGooseUses || 0) >= 1,
    goose_10:       () => (G.totalGooseUses || 0) >= 10,
    goose_upgrade:  () => ((G.skillUpgrades || [0,0,0])[1] || 0) >= 1,
    shake_first:    () => (G.totalShakeUses || 0) >= 1,
    shake_10:       () => (G.totalShakeUses || 0) >= 10,
    shake_upgrade:  () => ((G.skillUpgrades || [0,0,0])[2] || 0) >= 1,
    skills_maxed:   () => (G.skillsUnlocked || []).every(Boolean) && (G.skillUpgrades || [0,0,0]).every(u => u >= 2),
    // Secrets
    secret_speed:    () => G._secretSpeed,
    secret_sweep:    () => G._secretSweep,
    secret_ouch:     () => G._secretOuch,
    secret_chicken:  () => G._secretChicken,
    secret_midnight: () => G._secretMidnight,
    secret_leet:     () => G._secretLeet,
    secret_strikes:  () => G._secretStrikes,
    secret_chef:     () => G._secretChef,
  };

  const allAchievements = ACHIEVEMENT_DATA.concat(SECRET_ACHIEVEMENTS);
  for (const a of allAchievements) {
    if (G.achieved.includes(a.id)) continue;
    const fn = checks[a.id];
    if (fn && fn()) {
      G.achieved.push(a.id);
      invalidateAchieveCache();
      grantAchievementReward(a);
      const isSecret = SECRET_ACHIEVEMENTS.some(s => s.id === a.id);
      msg((isSecret ? '🔮 Secret: ' : '🏆 Trophy: ') + a.name + (a.reward ? ' — ' + a.reward.label : ''), 'trophies');
      SFX.play('achieve');
    }
  }
}

