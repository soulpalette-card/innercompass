CULT.Combat = {
  // 计算装备/功法加成后的最终属性
  computeStats(state) {
    const base = CULT.Data.getBaseStats(state.character.realmId, state.character.subLevel);

    let flatHp = 0, flatAtk = 0, flatDef = 0, flatSpd = 0;
    for (const slot of Object.keys(state.equipped)) {
      const itemId = state.equipped[slot];
      if (!itemId) continue;
      const item = CULT.Data.getEquipment(itemId);
      if (!item) continue;
      flatHp += item.bonuses.hp || 0;
      flatAtk += item.bonuses.atk || 0;
      flatDef += item.bonuses.def || 0;
      flatSpd += item.bonuses.spd || 0;
    }

    const alchemyBonuses = state.character.alchemyBonuses || {};
    flatHp += alchemyBonuses.hp || 0;
    flatAtk += alchemyBonuses.atk || 0;
    flatDef += alchemyBonuses.def || 0;
    flatSpd += alchemyBonuses.spd || 0;

    let hpMult = 0, atkMult = 0, defMult = 0, spdMult = 0, cultivationSpeedMult = 0;
    for (const techId of state.techniques.learned) {
      const tech = CULT.Data.getTechnique(techId);
      if (!tech) continue;
      hpMult += tech.bonuses.hpMult || 0;
      atkMult += tech.bonuses.atkMult || 0;
      defMult += tech.bonuses.defMult || 0;
      spdMult += tech.bonuses.spdMult || 0;
      cultivationSpeedMult += tech.bonuses.cultivationSpeedMult || 0;
    }

    for (const category of Object.keys(state.equippedFabao)) {
      const fabaoId = state.equippedFabao[category];
      if (!fabaoId) continue;
      const fabao = CULT.Data.getFabao(fabaoId);
      if (!fabao) continue;
      hpMult += fabao.bonuses.hpMult || 0;
      atkMult += fabao.bonuses.atkMult || 0;
      defMult += fabao.bonuses.defMult || 0;
      spdMult += fabao.bonuses.spdMult || 0;
    }

    // 出战宠物（最多3只）按类型把加成投入不同的地方：
    // 陆地->气血/防御，飞行->修炼速度，海洋->自身出手伤害（见 getPetRoundDamage，这里不处理）
    for (const petId of (state.pets.activeIds || []).slice(0, 3)) {
      const pet = state.pets.owned.find((p) => p.instanceId === petId);
      if (!pet) continue;
      const stage = CULT.Data.getPetStage(pet.level);
      const quality = CULT.Data.getPetQuality(pet.quality); // 旧存档没有 quality 字段时会兜底为"普通"
      const petBonus = (stage.bonusMult + (pet.level - stage.minLevel) * CULT.TUNING.petBonusPerLevel) * quality.statMult;
      const type = CULT.Data.getPetType(pet).id;
      if (type === 'land') {
        hpMult += petBonus * CULT.TUNING.petLandStatWeight;
        defMult += petBonus * CULT.TUNING.petLandStatWeight;
      } else if (type === 'flying') {
        cultivationSpeedMult += petBonus * CULT.TUNING.petFlyingCultivationWeight;
      }
      // sea 型宠物的加成完全体现在 getPetRoundDamage 里，这里不叠加任何 mult
    }

    return {
      hp: Math.floor((base.hp + flatHp) * (1 + hpMult)),
      atk: Math.floor((base.atk + flatAtk) * (1 + atkMult)),
      def: Math.floor((base.def + flatDef) * (1 + defMult)),
      spd: Math.floor((base.spd + flatSpd) * (1 + spdMult)),
      cultivationSpeedMult,
    };
  },

  // 对比某件未装备的装备 vs 当前槽位已装备的物品，返回每个属性的增减值
  getEquipmentDelta(state, itemId) {
    const item = CULT.Data.getEquipment(itemId);
    const currentId = state.equipped[item.slot];
    const current = currentId ? CULT.Data.getEquipment(currentId) : null;
    const delta = {};
    for (const stat of ['hp', 'atk', 'def', 'spd']) {
      delta[stat] = (item.bonuses[stat] || 0) - (current ? current.bonuses[stat] || 0 : 0);
    }
    return delta;
  },

  // 同上，针对法宝（百分比加成）
  getFabaoDelta(state, fabaoId) {
    const fabao = CULT.Data.getFabao(fabaoId);
    const currentId = state.equippedFabao[fabao.category];
    const current = currentId ? CULT.Data.getFabao(currentId) : null;
    const delta = {};
    for (const stat of ['hpMult', 'atkMult', 'defMult', 'spdMult']) {
      delta[stat] = (fabao.bonuses[stat] || 0) - (current ? current.bonuses[stat] || 0 : 0);
    }
    return delta;
  },

  // 单只出战宠物每回合造成的伤害：玩家自身基础攻击的一个比例，随宠物阶段/品质/等级放大
  getPetRoundDamage(state, pet) {
    const stage = CULT.Data.getPetStage(pet.level);
    const quality = CULT.Data.getPetQuality(pet.quality);
    const playerBase = CULT.Data.getBaseStats(state.character.realmId, state.character.subLevel);
    const raw = playerBase.atk * CULT.TUNING.petAtkFractionOfPlayerBase
      * (1 + stage.bonusMult * 2) * quality.statMult
      * (1 + (pet.level - stage.minLevel) * CULT.TUNING.petBonusPerLevel);
    // 海洋型宠物把加成整个投入到这里，陆地/飞行型的加成已经投入别处，这里打折扣
    const type = CULT.Data.getPetType(pet).id;
    const typeMult = type === 'sea' ? CULT.TUNING.petSeaDamageMult : CULT.TUNING.petNonSeaDamageMult;
    return Math.max(0, Math.floor(raw * typeMult));
  },

  // 出战宠物本回合的总伤害（用于战斗结算和离线估算，两处保持一致）
  getActivePetsRoundDamage(state) {
    return (state.pets.activeIds || []).slice(0, 3).reduce((sum, petId) => {
      const pet = state.pets.owned.find((p) => p.instanceId === petId);
      return sum + (pet ? CULT.Combat.getPetRoundDamage(state, pet) : 0);
    }, 0);
  },

  getCultivationPerSecond(state, stats) {
    const realmGrowth = Math.pow(
      CULT.TUNING.cultivationPerSecondRealmGrowth,
      state.character.realmId
    );
    const mult = 1 + (stats ? stats.cultivationSpeedMult : 0);
    return CULT.TUNING.cultivationPerSecondBase * realmGrowth * mult;
  },

  // 根据玩家当前境界基础属性 + 怪物倍率 + 难度系数，生成一只怪物的战斗属性快照
  // extraMult 可选，供精英关卡等场景在原有难度系数上再乘一个强化倍率
  instantiateMonster(monsterDef, state, extraMult) {
    const playerBase = CULT.Data.getBaseStats(state.character.realmId, state.character.subLevel);
    const tierMult = (CULT.TUNING.monsterDifficultyByTier[monsterDef.tier] || 1) * (extraMult || 1);
    return {
      id: monsterDef.id,
      name: monsterDef.name,
      tier: monsterDef.tier,
      hp: Math.max(1, Math.floor(playerBase.hp * monsterDef.mult.hp * tierMult)),
      atk: Math.max(1, Math.floor(playerBase.atk * monsterDef.mult.atk * tierMult)),
      def: Math.max(0, Math.floor(playerBase.def * monsterDef.mult.def * tierMult)),
    };
  },

  pickMonster(state) {
    const eligible = CULT.Data.getEligibleMonsters(state.character.realmId);
    const pool = eligible.length > 0 ? eligible : CULT.MONSTERS.filter((m) => m.minRealm === 0);
    const tierWeight = { weak: 1.2, normal: 1.0, elite: 0.4, boss: 0.08 };
    return CULT.utils.weightedPick(pool, (m) => {
      const distance = state.character.realmId - m.minRealm;
      const proximityWeight = 1 / (1 + distance);
      return proximityWeight * (tierWeight[m.tier] || 1);
    });
  },

  // state 用于读取当前选择的地图，按地图的掉落侧重调整各类概率（未选地图时倍率均为1，行为和之前完全一样）
  rollLoot(monsterDef, state) {
    const loot = monsterDef.loot;
    const mapId = state ? state.selectedMapId : null;
    const result = {
      exp: CULT.utils.randInt(loot.expRange[0], loot.expRange[1]),
      stones: CULT.utils.randInt(loot.stonesRange[0], loot.stonesRange[1]),
      materials: [],
      equipment: [],
      fabao: [],
      pets: [],
    };
    const materialMult = CULT.Data.getMapLootMultiplier(mapId, 'material');
    const equipMult = CULT.Data.getMapLootMultiplier(mapId, 'equipment');
    const fabaoMult = CULT.Data.getMapLootMultiplier(mapId, 'fabao');
    const petMult = CULT.Data.getMapLootMultiplier(mapId, 'pet');
    for (const mat of loot.materials || []) {
      if (Math.random() < Math.min(1, mat.chance * materialMult)) result.materials.push(mat.id);
    }
    for (const eq of loot.equipment || []) {
      if (Math.random() < Math.min(1, eq.chance * equipMult)) result.equipment.push(eq.id);
    }
    for (const fb of loot.fabao || []) {
      if (Math.random() < Math.min(1, fb.chance * fabaoMult)) result.fabao.push(fb.id);
    }
    for (const pet of loot.pets || []) {
      if (Math.random() < Math.min(1, pet.chance * petMult)) result.pets.push(pet.id);
    }
    return result;
  },

  // 给指定的一只宠物加经验，可能连续跨越多个等级（沿用突破的"循环检查阈值"思路）
  // 独立于出战状态，因为融合的目标宠物往往并未出战
  grantExpToPet(state, instanceId, amount) {
    const pet = state.pets.owned.find((p) => p.instanceId === instanceId);
    if (!pet) return;
    pet.exp += amount;
    let threshold = CULT.Data.getPetExpThreshold(pet.level);
    while (pet.exp >= threshold) {
      pet.exp -= threshold;
      pet.level += 1;
      threshold = CULT.Data.getPetExpThreshold(pet.level);
    }
  },

  // 所有出战宠物各自获得完整的经验（不按出战数量拆分）
  awardPetExp(state, amount) {
    for (const petId of state.pets.activeIds || []) {
      CULT.Combat.grantExpToPet(state, petId, amount);
    }
  },

  // 已投入某只宠物的总经验（历史消耗的所有阈值总和 + 当前已存的经验），供融合计算价值
  getPetTotalInvestedExp(pet) {
    let total = pet.exp;
    for (let lvl = 1; lvl < pet.level; lvl++) {
      total += CULT.Data.getPetExpThreshold(lvl);
    }
    return total;
  },

  getFusionExpValue(pet) {
    return Math.floor(CULT.Combat.getPetTotalInvestedExp(pet) * CULT.TUNING.petFusionConversionRate);
  },

  capturePet(state, speciesId, sourceMonsterLevel) {
    const instanceId = `${speciesId}_${CULT.utils.now()}_${Math.floor(Math.random() * 10000)}`;
    const level = Math.max(1, Math.floor((sourceMonsterLevel || 1) * 0.5));
    const quality = CULT.Data.rollPetQuality().id;
    const instance = { instanceId, speciesId, level, exp: 0, quality };
    state.pets.owned.push(instance);
    if (state.pets.activeIds.length < 3) state.pets.activeIds.push(instanceId);
    return instance;
  },

  // 突破所需信息：是否达到阈值、成功率、是跨大境界还是境界内小层
  getBreakthroughInfo(state) {
    const { realmId, subLevel, cultivation } = state.character;
    const maxSubLevel = CULT.Data.getMaxSubLevel(realmId);
    const isRealmCross = subLevel >= maxSubLevel;
    if (isRealmCross && CULT.Data.isMaxRealm(realmId)) {
      return { eligible: false, isMaxRealm: true };
    }
    const threshold = CULT.Data.getExpThreshold(realmId, subLevel);
    const ready = cultivation >= threshold;
    const overflowRatio = ready ? (cultivation - threshold) / threshold : 0;
    const overflowBonus = Math.min(
      CULT.TUNING.breakthroughOverflowBonusCap,
      overflowRatio * CULT.TUNING.breakthroughOverflowBonusPerHundredPercent
    );
    const baseChance = isRealmCross
      ? CULT.TUNING.breakthroughRealmCrossChance
      : CULT.TUNING.breakthroughBaseChance;
    const chance = CULT.utils.clamp(
      baseChance + overflowBonus + (state.pendingBreakthroughBonus || 0),
      0,
      1
    );
    return { eligible: ready, isRealmCross, threshold, chance, isMaxRealm: false };
  },

  // 执行突破，返回结果供 UI 展示。会直接修改 state。
  attemptBreakthrough(state) {
    const info = CULT.Combat.getBreakthroughInfo(state);
    if (!info.eligible) return { attempted: false, info };

    const success = Math.random() < info.chance;
    const character = state.character;

    if (success) {
      character.cultivation -= info.threshold;
      const maxSubLevel = CULT.Data.getMaxSubLevel(character.realmId);
      if (character.subLevel < maxSubLevel) {
        character.subLevel += 1;
      } else {
        character.realmId += 1;
        character.subLevel = 1;
      }
      state.stats.totalBreakthroughs += 1;
    } else {
      character.cultivation -= character.cultivation * CULT.TUNING.breakthroughFailPenaltyPercent;
      state.stats.totalBreakthroughFails += 1;
    }

    state.pendingBreakthroughBonus = 0;
    return { attempted: true, success, info };
  },

  // 结束当前遭遇战：如果之前有一场被精英挑战暂停的普通战斗，原样恢复它（同样的怪物/血量），
  // 否则清空当前怪物，让下一次 tick 重新遇怪
  endEncounter(state) {
    if (state.combat.pausedMonster) {
      Object.assign(state.combat, state.combat.pausedMonster);
      state.combat.pausedMonster = null;
    } else {
      state.combat.currentMonsterId = null;
      state.combat.currentMonsterHp = null;
    }
  },

  // 每个 tick 推进一次战斗（一回合），返回本回合发生的事件供 UI 生成日志/弹窗
  tick(state, stats) {
    const character = state.character;
    character.hpMax = stats.hp;

    if (character.hp === null) character.hp = character.hpMax;
    character.hp = Math.min(character.hp, character.hpMax);

    if (character.restTicksRemaining > 0) {
      character.restTicksRemaining -= 1;
      if (character.restTicksRemaining === 0) {
        character.hp = character.hpMax;
        return { type: 'rest_complete' };
      }
      return { type: 'resting' };
    }

    if (!state.combat.currentMonsterId) {
      const monsterDef = CULT.Combat.pickMonster(state);
      const instance = CULT.Combat.instantiateMonster(monsterDef, state);
      state.combat.currentMonsterId = instance.id;
      state.combat.currentMonsterName = instance.name;
      state.combat.currentMonsterTier = instance.tier;
      state.combat.currentMonsterHp = instance.hp;
      state.combat.currentMonsterHpMax = instance.hp;
      state.combat.currentMonsterAtk = instance.atk;
      state.combat.currentMonsterDef = instance.def;
      return { type: 'monster_spawned', monster: instance };
    }

    const playerDamage = Math.max(1, stats.atk - state.combat.currentMonsterDef);
    const monsterDamage = Math.max(1, state.combat.currentMonsterAtk - stats.def);
    const petDamage = CULT.Combat.getActivePetsRoundDamage(state);

    state.combat.currentMonsterHp -= (playerDamage + petDamage);
    character.hp -= monsterDamage; // 宠物不承受怪物的反击，只有玩家自己会掉血

    const event = {
      type: 'round',
      playerDamage,
      petDamage,
      monsterDamage,
      monsterName: state.combat.currentMonsterName,
    };

    if (state.combat.currentMonsterHp <= 0) {
      const monsterDef = CULT.MONSTERS.find((m) => m.id === state.combat.currentMonsterId);
      const loot = CULT.Combat.rollLoot(monsterDef, state);
      character.cultivation += loot.exp;
      character.spiritStones += loot.stones;
      for (const matId of loot.materials) {
        state.inventory[matId] = (state.inventory[matId] || 0) + 1;
      }
      for (const eqId of loot.equipment) {
        state.inventory[eqId] = (state.inventory[eqId] || 0) + 1;
      }
      if (state.combat.isEliteChallenge) {
        const isDemonLord = state.combat.challengeTier === 'demonlord';
        // 魔王秘境奖励更好：额外多roll一次法宝，且稀有度分布向精良/极品倾斜
        loot.fabao.push(CULT.Data.rollWeightedFabao(isDemonLord).id);
        if (isDemonLord) loot.fabao.push(CULT.Data.rollWeightedFabao(true).id);
        state.combat.isEliteChallenge = false;
        state.combat.challengeTier = null;
      }
      for (const fbId of loot.fabao) {
        state.inventory[fbId] = (state.inventory[fbId] || 0) + 1;
      }
      const monsterLevel = CULT.Data.getMonsterLevel(state, monsterDef.tier);
      const capturedPets = loot.pets.map((speciesId) => CULT.Combat.capturePet(state, speciesId, monsterLevel));
      state.stats.totalBattlesWon += 1;
      CULT.Combat.awardPetExp(state, CULT.TUNING.petExpPerVictory);

      event.type = 'victory';
      event.monsterName = state.combat.currentMonsterName;
      event.loot = loot;
      event.capturedPets = capturedPets;

      CULT.Combat.endEncounter(state);
    } else if (character.hp <= 0) {
      character.hp = 0;
      character.restTicksRemaining = CULT.TUNING.restTicksAfterDefeat;
      state.combat.isEliteChallenge = false; // 挑战失败：灵石已消耗，不补发，清掉标记避免遗留
      state.combat.challengeTier = null;
      CULT.Combat.endEncounter(state);

      event.type = 'defeat';
    }

    return event;
  },
};
