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

    const activePet = state.pets.owned.find((p) => p.instanceId === state.pets.activeId);
    if (activePet) {
      const stage = CULT.Data.getPetStage(activePet.level);
      const petBonus = stage.bonusMult + (activePet.level - stage.minLevel) * CULT.TUNING.petBonusPerLevel;
      hpMult += petBonus;
      atkMult += petBonus;
      defMult += petBonus;
      spdMult += petBonus;
    }

    return {
      hp: Math.floor((base.hp + flatHp) * (1 + hpMult)),
      atk: Math.floor((base.atk + flatAtk) * (1 + atkMult)),
      def: Math.floor((base.def + flatDef) * (1 + defMult)),
      spd: Math.floor((base.spd + flatSpd) * (1 + spdMult)),
      cultivationSpeedMult,
    };
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
  instantiateMonster(monsterDef, state) {
    const playerBase = CULT.Data.getBaseStats(state.character.realmId, state.character.subLevel);
    const tierMult = CULT.TUNING.monsterDifficultyByTier[monsterDef.tier] || 1;
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

  rollLoot(monsterDef) {
    const loot = monsterDef.loot;
    const result = {
      exp: CULT.utils.randInt(loot.expRange[0], loot.expRange[1]),
      stones: CULT.utils.randInt(loot.stonesRange[0], loot.stonesRange[1]),
      materials: [],
      equipment: [],
      fabao: [],
      pets: [],
    };
    for (const mat of loot.materials || []) {
      if (Math.random() < mat.chance) result.materials.push(mat.id);
    }
    for (const eq of loot.equipment || []) {
      if (Math.random() < eq.chance) result.equipment.push(eq.id);
    }
    for (const fb of loot.fabao || []) {
      if (Math.random() < fb.chance) result.fabao.push(fb.id);
    }
    for (const pet of loot.pets || []) {
      if (Math.random() < pet.chance) result.pets.push(pet.id);
    }
    return result;
  },

  // 出战宠物获得经验，可能连续跨越多个等级（沿用突破的"循环检查阈值"思路）
  awardPetExp(state, amount) {
    const pet = state.pets.owned.find((p) => p.instanceId === state.pets.activeId);
    if (!pet) return;
    pet.exp += amount;
    let threshold = CULT.Data.getPetExpThreshold(pet.level);
    while (pet.exp >= threshold) {
      pet.exp -= threshold;
      pet.level += 1;
      threshold = CULT.Data.getPetExpThreshold(pet.level);
    }
  },

  capturePet(state, speciesId) {
    const instanceId = `${speciesId}_${CULT.utils.now()}_${Math.floor(Math.random() * 10000)}`;
    const instance = { instanceId, speciesId, level: 1, exp: 0 };
    state.pets.owned.push(instance);
    if (!state.pets.activeId) state.pets.activeId = instanceId;
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

    state.combat.currentMonsterHp -= playerDamage;
    character.hp -= monsterDamage;

    const event = {
      type: 'round',
      playerDamage,
      monsterDamage,
      monsterName: state.combat.currentMonsterName,
    };

    if (state.combat.currentMonsterHp <= 0) {
      const monsterDef = CULT.MONSTERS.find((m) => m.id === state.combat.currentMonsterId);
      const loot = CULT.Combat.rollLoot(monsterDef);
      character.cultivation += loot.exp;
      character.spiritStones += loot.stones;
      for (const matId of loot.materials) {
        state.inventory[matId] = (state.inventory[matId] || 0) + 1;
      }
      for (const eqId of loot.equipment) {
        state.inventory[eqId] = (state.inventory[eqId] || 0) + 1;
      }
      for (const fbId of loot.fabao) {
        state.inventory[fbId] = (state.inventory[fbId] || 0) + 1;
      }
      const capturedPets = loot.pets.map((speciesId) => CULT.Combat.capturePet(state, speciesId));
      state.stats.totalBattlesWon += 1;
      CULT.Combat.awardPetExp(state, CULT.TUNING.petExpPerVictory);

      event.type = 'victory';
      event.monsterName = state.combat.currentMonsterName;
      event.loot = loot;
      event.capturedPets = capturedPets;

      state.combat.currentMonsterId = null;
      state.combat.currentMonsterHp = null;
    } else if (character.hp <= 0) {
      character.hp = 0;
      character.restTicksRemaining = CULT.TUNING.restTicksAfterDefeat;
      state.combat.currentMonsterId = null;
      state.combat.currentMonsterHp = null;

      event.type = 'defeat';
    }

    return event;
  },
};
