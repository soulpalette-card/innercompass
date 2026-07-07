CULT.Combat = {
  // 计算装备/功法加成后的最终属性
  computeStats(state) {
    const base = CULT.Data.getBaseStats(state.character.realmId, state.character.subLevel);

    const alchemyBonuses = state.character.alchemyBonuses || {};
    const flatHp = alchemyBonuses.hp || 0;
    const flatAtk = alchemyBonuses.atk || 0;
    const flatDef = alchemyBonuses.def || 0;
    const flatSpd = alchemyBonuses.spd || 0;

    let hpMult = 0, atkMult = 0, defMult = 0, spdMult = 0, cultivationSpeedMult = 0, flatCultivationPerSecond = 0;
    // 功法可以逐级升级，等级越高同一个功法的加成越强（1级=基础值，每多1级再多叠加一部分基础值）
    for (const [techId, level] of Object.entries(state.techniques.learned)) {
      const tech = CULT.Data.getTechnique(techId);
      if (!tech) continue;
      const levelMult = 1 + (Math.max(1, level) - 1) * CULT.TUNING.techniqueLevelBonusPct;
      hpMult += (tech.bonuses.hpMult || 0) * levelMult;
      atkMult += (tech.bonuses.atkMult || 0) * levelMult;
      defMult += (tech.bonuses.defMult || 0) * levelMult;
      spdMult += (tech.bonuses.spdMult || 0) * levelMult;
      cultivationSpeedMult += (tech.bonuses.cultivationSpeedMult || 0) * levelMult;
    }

    // 装备：掉落时生成的百分比加成，跟法宝、功法用同一套 xxxMult 累加方式，不会随数值膨胀而失效
    for (const slot of Object.keys(state.equipped)) {
      const instanceId = state.equipped[slot];
      if (!instanceId) continue;
      const item = state.equipment.owned.find((e) => e.instanceId === instanceId);
      if (!item) continue;
      hpMult += item.bonuses.hpMult || 0;
      atkMult += item.bonuses.atkMult || 0;
      defMult += item.bonuses.defMult || 0;
      spdMult += item.bonuses.spdMult || 0;
    }

    // 法宝也是掉落/购买时生成的独立实例，可以单独升级；等级越高加成越强，跟功法用同一套比例公式
    for (const category of Object.keys(state.equippedFabao)) {
      const instanceId = state.equippedFabao[category];
      if (!instanceId) continue;
      const instance = state.fabao.owned.find((f) => f.instanceId === instanceId);
      if (!instance) continue;
      const fabao = CULT.Data.getFabao(instance.fabaoId);
      if (!fabao) continue;
      const levelMult = 1 + (instance.level || 0) * CULT.TUNING.fabaoLevelBonusPct;
      hpMult += (fabao.bonuses.hpMult || 0) * levelMult;
      atkMult += (fabao.bonuses.atkMult || 0) * levelMult;
      defMult += (fabao.bonuses.defMult || 0) * levelMult;
      spdMult += (fabao.bonuses.spdMult || 0) * levelMult;
    }

    // 出战宠物（最多3只）按类型把加成投入不同的地方：
    // 陆地->气血/防御，飞行->每秒固定修为（不是百分比，见 flatCultivationPerSecond），海洋->自身出手伤害（见 getPetRoundDamage，这里不处理）
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
        flatCultivationPerSecond += petBonus * CULT.TUNING.petFlyingCultivationWeight * CULT.TUNING.petFlyingCultivationFlatBase;
      }
      // sea 型宠物的加成完全体现在 getPetRoundDamage 里，这里不叠加任何 mult
    }

    return {
      hp: Math.floor((base.hp + flatHp) * (1 + hpMult)),
      atk: Math.floor((base.atk + flatAtk) * (1 + atkMult)),
      def: Math.floor((base.def + flatDef) * (1 + defMult)),
      spd: Math.floor((base.spd + flatSpd) * (1 + spdMult)),
      cultivationSpeedMult,
      flatCultivationPerSecond,
    };
  },

  // 对比某件未装备的装备实例 vs 当前槽位已装备的实例，返回每个属性的增减值（百分比）
  getEquipmentDelta(state, instanceId) {
    const item = state.equipment.owned.find((e) => e.instanceId === instanceId);
    const currentId = state.equipped[item.slot];
    const current = currentId ? state.equipment.owned.find((e) => e.instanceId === currentId) : null;
    const delta = {};
    for (const stat of ['hpMult', 'atkMult', 'defMult', 'spdMult']) {
      delta[stat] = (item.bonuses[stat] || 0) - (current ? current.bonuses[stat] || 0 : 0);
    }
    return delta;
  },

  // 法宝实例当前的实际加成（已按等级放大过），法宝页展示、对比增减都用这份
  getFabaoEffectiveBonuses(instance) {
    const fabao = CULT.Data.getFabao(instance.fabaoId);
    if (!fabao) return {};
    const levelMult = 1 + (instance.level || 0) * CULT.TUNING.fabaoLevelBonusPct;
    const result = {};
    for (const [key, val] of Object.entries(fabao.bonuses)) result[key] = val * levelMult;
    return result;
  },

  // 同上（对比某件未装备的法宝实例 vs 当前槽位已装备的实例），都按实际加成（含等级）比较
  getFabaoDelta(state, instanceId) {
    const instance = state.fabao.owned.find((f) => f.instanceId === instanceId);
    const fabao = CULT.Data.getFabao(instance.fabaoId);
    const currentId = state.equippedFabao[fabao.category];
    const current = currentId ? state.fabao.owned.find((f) => f.instanceId === currentId) : null;
    const itemBonuses = CULT.Combat.getFabaoEffectiveBonuses(instance);
    const currentBonuses = current ? CULT.Combat.getFabaoEffectiveBonuses(current) : {};
    const delta = {};
    for (const stat of ['hpMult', 'atkMult', 'defMult', 'spdMult']) {
      delta[stat] = (itemBonuses[stat] || 0) - (currentBonuses[stat] || 0);
    }
    return delta;
  },

  // 掉落/购买一件法宝：0级的新实例，跟装备/宠物一样，掉落时才生成独立个体
  dropFabao(state, fabaoId) {
    const instance = { instanceId: `${fabaoId}_${CULT.utils.now()}_${Math.floor(Math.random() * 10000)}`, fabaoId, level: 0, pointsInvested: 0 };
    state.fabao.owned.push(instance);
    return instance;
  },

  // 分解一件法宝，换回法宝点数：基础点数（按稀有度）+ 这件法宝已经投入升级的全部点数
  decomposeFabao(state, instanceId) {
    const instance = state.fabao.owned.find((f) => f.instanceId === instanceId);
    if (!instance) return 0;
    const fabao = CULT.Data.getFabao(instance.fabaoId);
    const basePoints = CULT.TUNING.fabaoDecomposeBasePoints[fabao ? fabao.rarity : 'common'] || 0;
    const refund = basePoints + (instance.pointsInvested || 0);
    for (const category of Object.keys(state.equippedFabao)) {
      if (state.equippedFabao[category] === instanceId) state.equippedFabao[category] = null;
    }
    state.fabao.owned = state.fabao.owned.filter((f) => f.instanceId !== instanceId);
    state.character.fabaoPoints = (state.character.fabaoPoints || 0) + refund;
    return refund;
  },

  // 花法宝点数把一件法宝升一级，花费 = 该法宝稀有度的基础花费 * 1.5^当前等级，随等级递增
  getFabaoUpgradeCost(instance) {
    const fabao = CULT.Data.getFabao(instance.fabaoId);
    const baseCost = CULT.TUNING.fabaoLevelBaseCost[fabao ? fabao.rarity : 'common'] || 0;
    return Math.floor(baseCost * Math.pow(CULT.TUNING.fabaoLevelCostGrowth, instance.level || 0));
  },

  upgradeFabao(state, instanceId) {
    const instance = state.fabao.owned.find((f) => f.instanceId === instanceId);
    if (!instance) return false;
    if (instance.level >= CULT.TUNING.fabaoMaxLevel) return false;
    const cost = CULT.Combat.getFabaoUpgradeCost(instance);
    if ((state.character.fabaoPoints || 0) < cost) return false;
    state.character.fabaoPoints -= cost;
    instance.level += 1;
    instance.pointsInvested = (instance.pointsInvested || 0) + cost;
    return true;
  },

  // 掉落一件装备：按部位+怪物等级现场生成属性，推入 owned 并返回，跟 capturePet 是同一个套路
  dropEquipment(state, slot, monsterLevel) {
    const stats = CULT.Data.generateEquipmentStats(slot, monsterLevel);
    const instance = { instanceId: `eq_${slot}_${CULT.utils.now()}_${Math.floor(Math.random() * 10000)}`, ...stats };
    state.equipment.owned.push(instance);
    return instance;
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
    const idx = CULT.Data.getGlobalLevelIndex(state.character.realmId, state.character.subLevel);
    const levelGrowth = Math.pow(CULT.TUNING.cultivationPerSecondLevelGrowth, idx);
    const mult = 1 + (stats ? stats.cultivationSpeedMult : 0);
    // 飞行宠物的加成是每秒固定修为，不参与百分比乘算，直接加在最后
    const flatBonus = stats ? (stats.flatCultivationPerSecond || 0) : 0;
    return CULT.TUNING.cultivationPerSecondBase * levelGrowth * mult + flatBonus;
  },

  // 根据玩家当前境界基础属性 + 怪物倍率 + 难度系数，生成一只怪物的战斗属性快照
  // extraMult 可选，供精英关卡等场景在原有难度系数上再乘一个强化倍率
  // overrideRealmId 可选，供秘境挑战指定境界（挑战别的境界的秘境时，不按玩家自己当前境界算）
  instantiateMonster(monsterDef, state, extraMult, overrideRealmId) {
    const playerBase = overrideRealmId != null
      ? CULT.Data.getBaseStats(overrideRealmId, CULT.Data.getMaxSubLevel(overrideRealmId))
      : CULT.Data.getBaseStats(state.character.realmId, state.character.subLevel);
    const tierMult = (CULT.TUNING.monsterDifficultyByTier[monsterDef.tier] || 1) * (extraMult || 1);
    // 怪物数据目前没有单独配速度倍率，没配的话就借用攻击倍率——避免给现有22只怪物逐个补字段
    const spdMult = monsterDef.mult.spd != null ? monsterDef.mult.spd : monsterDef.mult.atk;
    return {
      id: monsterDef.id,
      name: monsterDef.name,
      tier: monsterDef.tier,
      hp: Math.max(1, Math.floor(playerBase.hp * monsterDef.mult.hp * tierMult)),
      atk: Math.max(1, Math.floor(playerBase.atk * monsterDef.mult.atk * tierMult)),
      def: Math.max(0, Math.floor(playerBase.def * monsterDef.mult.def * tierMult)),
      spd: Math.max(1, Math.floor(playerBase.spd * spdMult * tierMult)),
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
      equipmentSlots: [], // 只记录"掉了哪个部位"，具体属性由 dropEquipment 在拿到怪物等级后现场生成
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
      if (Math.random() < Math.min(1, eq.chance * equipMult)) result.equipmentSlots.push(eq.slot);
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
      state.combat.currentMonsterSpd = instance.spd;
      return { type: 'monster_spawned', monster: instance };
    }

    const basePlayerDamage = Math.max(1, stats.atk - state.combat.currentMonsterDef);
    const baseMonsterDamage = Math.max(1, state.combat.currentMonsterAtk - stats.def);
    const petDamage = CULT.Combat.getActivePetsRoundDamage(state);

    // 速度快的一方本回合先出手；如果先手这下就能分出胜负，另一方这回合就不再补刀
    const playerSpd = stats.spd;
    const monsterSpd = state.combat.currentMonsterSpd || 1;
    const playerFirst = playerSpd >= monsterSpd;
    const extraAttackChance = (fastSpd, slowSpd) => Math.min(
      CULT.TUNING.extraAttackChanceCap,
      Math.max(0, (fastSpd - slowSpd) / slowSpd) * CULT.TUNING.extraAttackSpeedFactor
    );
    const playerExtraHit = playerFirst && Math.random() < extraAttackChance(playerSpd, monsterSpd);
    const monsterExtraHit = !playerFirst && Math.random() < extraAttackChance(monsterSpd, playerSpd);
    const playerDamage = basePlayerDamage * (playerExtraHit ? 2 : 1);
    const monsterDamage = baseMonsterDamage * (monsterExtraHit ? 2 : 1);

    let playerDamageDealt = 0;
    let monsterDamageDealt = 0;
    if (playerFirst) {
      state.combat.currentMonsterHp -= (playerDamage + petDamage);
      playerDamageDealt = playerDamage + petDamage;
      if (state.combat.currentMonsterHp > 0) {
        character.hp -= monsterDamage; // 宠物不承受怪物的反击，只有玩家自己会掉血
        monsterDamageDealt = monsterDamage;
      }
    } else {
      character.hp -= monsterDamage;
      monsterDamageDealt = monsterDamage;
      if (character.hp > 0) {
        state.combat.currentMonsterHp -= (playerDamage + petDamage);
        playerDamageDealt = playerDamage + petDamage;
      }
    }

    const event = {
      type: 'round',
      playerDamage: playerDamageDealt,
      petDamage,
      monsterDamage: monsterDamageDealt,
      monsterName: state.combat.currentMonsterName,
      playerFirst,
      playerExtraHit,
      monsterExtraHit,
    };

    if (state.combat.currentMonsterHp <= 0) {
      const monsterDef = CULT.MONSTERS.find((m) => m.id === state.combat.currentMonsterId);
      // 秘境挑战按选定的境界算掉落等级，不按玩家自己的境界（否则挑战低境界秘境也能刷到跟玩家等级绑定的装备，失去分境界的意义）
      const lootLevelOverride = state.combat.isEliteChallenge ? state.combat.challengeRealmId : null;
      const monsterLevel = CULT.Data.getMonsterLevel(state, monsterDef.tier, lootLevelOverride); // 装备要按这只怪的等级生成，提前算好
      const loot = CULT.Combat.rollLoot(monsterDef, state);
      character.cultivation += loot.exp;
      character.spiritStones += loot.stones;
      for (const matId of loot.materials) {
        state.inventory[matId] = (state.inventory[matId] || 0) + 1;
      }
      const droppedEquipment = loot.equipmentSlots.map((slot) => CULT.Combat.dropEquipment(state, slot, monsterLevel));
      if (state.combat.isEliteChallenge) {
        const isDemonLord = state.combat.challengeTier === 'demonlord';
        // 魔王秘境奖励更好：额外多roll一次法宝，且稀有度分布向精良/极品倾斜
        loot.fabao.push(CULT.Data.rollWeightedFabao(isDemonLord).id);
        if (isDemonLord) loot.fabao.push(CULT.Data.rollWeightedFabao(true).id);
        state.combat.isEliteChallenge = false;
        state.combat.challengeTier = null;
        state.combat.challengeRealmId = null;
      }
      for (const fbId of loot.fabao) {
        CULT.Combat.dropFabao(state, fbId);
      }
      const capturedPets = loot.pets.map((speciesId) => CULT.Combat.capturePet(state, speciesId, monsterLevel));
      state.stats.totalBattlesWon += 1;
      CULT.Combat.awardPetExp(state, CULT.TUNING.petExpPerVictory);

      event.type = 'victory';
      event.monsterName = state.combat.currentMonsterName;
      event.loot = loot;
      event.droppedEquipment = droppedEquipment;
      event.capturedPets = capturedPets;

      CULT.Combat.endEncounter(state);
    } else if (character.hp <= 0) {
      character.hp = 0;
      character.restTicksRemaining = CULT.TUNING.restTicksAfterDefeat;
      state.combat.isEliteChallenge = false; // 挑战失败：灵石已消耗，不补发，清掉标记避免遗留
      state.combat.challengeTier = null;
      state.combat.challengeRealmId = null;
      CULT.Combat.endEncounter(state);

      event.type = 'defeat';
    }

    return event;
  },
};
