CULT.Offline = {
  // 用怪物池的加权平均值估算离线期间的"平均一只怪"，避免逐秒模拟导致的性能问题
  getAverageMonsterProfile(state) {
    const pool = CULT.Data.getEligibleMonsters(state.character.realmId);
    const monsters = pool.length > 0 ? pool : CULT.MONSTERS.filter((m) => m.minRealm === 0);
    const tierWeight = { weak: 1.2, normal: 1.0, elite: 0.4, boss: 0.08 };

    const weights = monsters.map((m) => {
      const distance = state.character.realmId - m.minRealm;
      return (1 / (1 + distance)) * (tierWeight[m.tier] || 1);
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

    let hp = 0, atk = 0, def = 0, expMid = 0, stonesMid = 0;
    const materialChances = {};
    const equipmentChances = {};

    monsters.forEach((m, i) => {
      const w = weights[i] / totalWeight;
      const instance = CULT.Combat.instantiateMonster(m, state);
      hp += instance.hp * w;
      atk += instance.atk * w;
      def += instance.def * w;
      expMid += ((m.loot.expRange[0] + m.loot.expRange[1]) / 2) * w;
      stonesMid += ((m.loot.stonesRange[0] + m.loot.stonesRange[1]) / 2) * w;
      for (const mat of m.loot.materials || []) {
        materialChances[mat.id] = (materialChances[mat.id] || 0) + mat.chance * w;
      }
      for (const eq of m.loot.equipment || []) {
        equipmentChances[eq.id] = (equipmentChances[eq.id] || 0) + eq.chance * w;
      }
    });

    return { hp, atk, def, expMid, stonesMid, materialChances, equipmentChances };
  },

  // 期望次数的整数部分直接发放，小数部分按概率再抽一次，避免离线时间越长掉落量越"确定"而失真
  grantExpectedCount(expectedCount) {
    const whole = Math.floor(expectedCount);
    const remainder = expectedCount - whole;
    return whole + (Math.random() < remainder ? 1 : 0);
  },

  computeProgress(state, nowMs) {
    const elapsedMs = Math.max(0, nowMs - state.lastSavedAt);
    const cappedMs = Math.min(elapsedMs, CULT.TUNING.offlineCapHours * 3600 * 1000);
    const effectiveSeconds = (cappedMs / 1000) * CULT.TUNING.offlineEfficiency;

    const stats = CULT.Combat.computeStats(state);
    const cultivationPerSecond = CULT.Combat.getCultivationPerSecond(state, stats);
    const meditationExp = cultivationPerSecond * effectiveSeconds;

    const avgMonster = CULT.Offline.getAverageMonsterProfile(state);
    const playerDamage = Math.max(1, stats.atk - avgMonster.def);
    const roundsToKill = Math.max(1, Math.ceil(avgMonster.hp / playerDamage));
    const secondsPerKill = roundsToKill * (CULT.TUNING.tickIntervalMs / 1000);
    const estimatedKills = Math.floor(effectiveSeconds / secondsPerKill);

    const combatExp = estimatedKills * avgMonster.expMid;
    const stonesGained = Math.floor(estimatedKills * avgMonster.stonesMid);

    const materialsGained = {};
    for (const [matId, chance] of Object.entries(avgMonster.materialChances)) {
      const count = CULT.Offline.grantExpectedCount(estimatedKills * chance);
      if (count > 0) materialsGained[matId] = count;
    }
    const equipmentGained = {};
    for (const [eqId, chance] of Object.entries(avgMonster.equipmentChances)) {
      const count = CULT.Offline.grantExpectedCount(estimatedKills * chance);
      if (count > 0) equipmentGained[eqId] = count;
    }

    const cultivationGained = meditationExp + combatExp;

    return {
      elapsedMs,
      cappedMs,
      effectiveSeconds,
      cultivationGained,
      stonesGained,
      materialsGained,
      equipmentGained,
      estimatedKills,
      shouldShow: elapsedMs >= CULT.TUNING.offlineMinSecondsToShowSummary * 1000,
    };
  },

  // 把计算结果实际写回 state，并在开启自动突破时连续尝试突破
  applyProgress(state, progress) {
    state.character.cultivation += progress.cultivationGained;
    state.character.spiritStones += progress.stonesGained;
    for (const [id, count] of Object.entries(progress.materialsGained)) {
      state.inventory[id] = (state.inventory[id] || 0) + count;
    }
    for (const [id, count] of Object.entries(progress.equipmentGained)) {
      state.inventory[id] = (state.inventory[id] || 0) + count;
    }

    let breakthroughs = 0;
    if (state.settings.autoBreakthrough) {
      const MAX_ITERATIONS = 500;
      while (breakthroughs < MAX_ITERATIONS) {
        const info = CULT.Combat.getBreakthroughInfo(state);
        if (!info.eligible) break;
        const result = CULT.Combat.attemptBreakthrough(state);
        if (result.success) breakthroughs += 1;
        else break; // 失败后不再无脑重试，交还给玩家决定
      }
    }
    progress.breakthroughsDuringOffline = breakthroughs;
    return progress;
  },
};
