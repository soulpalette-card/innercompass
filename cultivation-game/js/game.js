CULT.Game = {
  state: null,
  tickCount: 0,
  intervalHandle: null,

  init(state) {
    CULT.Game.state = state;
    const stats = CULT.Combat.computeStats(state);
    if (state.character.hp === null) {
      state.character.hp = stats.hp;
      state.character.hpMax = stats.hp;
    }
  },

  start() {
    if (CULT.Game.intervalHandle) return;
    CULT.Game.intervalHandle = setInterval(CULT.Game.tick, CULT.TUNING.tickIntervalMs);
  },

  tick() {
    const state = CULT.Game.state;
    const dtSeconds = CULT.TUNING.tickIntervalMs / 1000;
    const stats = CULT.Combat.computeStats(state);

    state.character.cultivation += CULT.Combat.getCultivationPerSecond(state, stats) * dtSeconds;

    CULT.Game.ensureShopFresh();

    const event = CULT.Combat.tick(state, stats);
    CULT.UI.onCombatEvent(event);

    if (state.settings.autoBreakthrough) {
      const info = CULT.Combat.getBreakthroughInfo(state);
      if (info.eligible) {
        const result = CULT.Combat.attemptBreakthrough(state);
        CULT.UI.onBreakthroughResult(result);
      }
    }

    CULT.Game.tickCount += 1;
    if (CULT.Game.tickCount % CULT.TUNING.autosaveEveryTicks === 0) {
      CULT.State.save(state);
    }

    CULT.UI.refresh(state);
  },

  saveNow() {
    CULT.State.save(CULT.Game.state);
  },

  // instanceId 指向 state.equipment.owned 里的一件装备；装备本身永远留在 owned 里，
  // 装备/卸下只是把 state.equipped[slot] 这个指针改指向谁，没有数量增减
  equipItem(instanceId) {
    const state = CULT.Game.state;
    const item = state.equipment.owned.find((e) => e.instanceId === instanceId);
    if (!item) return false;

    state.equipped[item.slot] = instanceId;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  unequipItem(slot) {
    const state = CULT.Game.state;
    if (!state.equipped[slot]) return false;
    state.equipped[slot] = null;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // 卖掉一件未装备的装备实例，按稀有度+等级给灵石；如果正好装备着，先自动卸下再卖
  sellEquipment(instanceId) {
    const state = CULT.Game.state;
    const item = state.equipment.owned.find((e) => e.instanceId === instanceId);
    if (!item) return false;

    for (const slot of Object.keys(state.equipped)) {
      if (state.equipped[slot] === instanceId) state.equipped[slot] = null;
    }
    state.character.spiritStones += CULT.Data.getEquipmentSellPrice(item);
    state.equipment.owned = state.equipment.owned.filter((e) => e.instanceId !== instanceId);

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // instanceId 指向 state.fabao.owned 里的一件法宝；法宝本身永远留在 owned 里，
  // 装备/卸下只是把 state.equippedFabao[category] 这个指针改指向谁，没有数量增减（跟装备的 equipItem 是同一个套路）
  equipFabao(instanceId) {
    const state = CULT.Game.state;
    const instance = state.fabao.owned.find((f) => f.instanceId === instanceId);
    if (!instance) return false;
    const fabao = CULT.Data.getFabao(instance.fabaoId);
    if (!fabao) return false;

    state.equippedFabao[fabao.category] = instanceId;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  unequipFabao(category) {
    const state = CULT.Game.state;
    if (!state.equippedFabao[category]) return false;
    state.equippedFabao[category] = null;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // 分解一件未装备的法宝，换回法宝点数；如果正好装备着，先自动卸下再分解
  decomposeFabao(instanceId) {
    const state = CULT.Game.state;
    const refund = CULT.Combat.decomposeFabao(state, instanceId);
    if (refund <= 0) return false;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return refund;
  },

  // 花法宝点数升级一件法宝
  upgradeFabao(instanceId) {
    const state = CULT.Game.state;
    const success = CULT.Combat.upgradeFabao(state, instanceId);
    if (!success) return false;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  activatePet(instanceId) {
    const state = CULT.Game.state;
    const pet = state.pets.owned.find((p) => p.instanceId === instanceId);
    if (!pet) return false;
    if (state.pets.activeIds.includes(instanceId)) return false;
    if (state.pets.activeIds.length >= 3) return false;
    state.pets.activeIds.push(instanceId);

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  deactivatePet(instanceId) {
    const state = CULT.Game.state;
    const idx = state.pets.activeIds.indexOf(instanceId);
    if (idx === -1) return false;
    state.pets.activeIds.splice(idx, 1);

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // 把 sacrificeIds 这些宠物献祭掉，经验按投入比例转给 targetId；出战中的宠物必须先下场才能被献祭
  fusePets(sacrificeIds, targetId) {
    const state = CULT.Game.state;
    if (!sacrificeIds || sacrificeIds.length === 0 || sacrificeIds.includes(targetId)) return false;
    const target = state.pets.owned.find((p) => p.instanceId === targetId);
    if (!target) return false;
    const sacrifices = sacrificeIds.map((id) => state.pets.owned.find((p) => p.instanceId === id));
    if (sacrifices.some((p) => !p)) return false;
    if (sacrifices.some((p) => state.pets.activeIds.includes(p.instanceId))) return false;

    const totalExp = sacrifices.reduce((sum, p) => sum + CULT.Combat.getFusionExpValue(p), 0);
    state.pets.owned = state.pets.owned.filter((p) => !sacrificeIds.includes(p.instanceId));
    CULT.Combat.grantExpToPet(state, targetId, totalExp);

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return { success: true, expGranted: totalExp };
  },

  useConsumable(itemId) {
    const state = CULT.Game.state;
    const item = CULT.Data.getConsumable(itemId);
    if (!item) return false;
    if (!state.inventory[itemId] || state.inventory[itemId] <= 0) return false;

    if (item.type === 'exp_boost') {
      state.character.cultivation += item.effect.flatExp;
    } else if (item.type === 'breakthrough_boost') {
      state.pendingBreakthroughBonus = (state.pendingBreakthroughBonus || 0) + item.effect.successChanceBonus;
    } else if (item.type === 'heal') {
      const stats = CULT.Combat.computeStats(state);
      state.character.hpMax = stats.hp;
      state.character.hp = Math.floor(state.character.hpMax * item.effect.healPercent);
    } else if (item.type === 'stat_boost') {
      state.character.alchemyBonuses[item.effect.stat] += item.effect.amount;
    }

    state.inventory[itemId] -= 1;
    if (state.inventory[itemId] <= 0) delete state.inventory[itemId];

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  learnTechnique(techId) {
    const state = CULT.Game.state;
    const tech = CULT.Data.getTechnique(techId);
    if (!tech) return false;
    if (state.techniques.learned[techId]) return false; // 已经修习过了
    if (!CULT.Data.isTechniqueUnlocked(state, tech)) return false; // 境界/层数不够，还没解锁
    if (state.character.spiritStones < tech.cost) return false;

    state.character.spiritStones -= tech.cost;
    state.techniques.learned[techId] = 1;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // 花灵石把一门已修习的功法升一级，费用 = 修习花费 * 1.5^当前等级，最高10级
  upgradeTechnique(techId) {
    const state = CULT.Game.state;
    const tech = CULT.Data.getTechnique(techId);
    if (!tech) return false;
    const level = state.techniques.learned[techId];
    if (!level) return false; // 还没修习，不能升级
    if (level >= CULT.TUNING.techniqueMaxLevel) return false;
    const cost = CULT.Data.getTechniqueUpgradeCost(tech, level);
    if (state.character.spiritStones < cost) return false;

    state.character.spiritStones -= cost;
    state.techniques.learned[techId] = level + 1;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  attemptBreakthrough() {
    const state = CULT.Game.state;
    const result = CULT.Combat.attemptBreakthrough(state);
    if (result.attempted) {
      CULT.Game.saveNow();
      CULT.UI.refresh(state);
    }
    return result;
  },

  setAutoBreakthrough(enabled) {
    CULT.Game.state.settings.autoBreakthrough = enabled;
    CULT.Game.saveNow();
  },

  selectMap(mapId) {
    const state = CULT.Game.state;
    const map = CULT.Data.getMap(mapId);
    if (!map) return false;
    if (map.realmId > state.character.realmId) return false; // 还没到那个境界，不能选

    state.selectedMapId = mapId;
    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // 选择要挑战哪个境界的秘境；不设解锁门槛，任何境界都能选
  selectSanctumRealm(realmId) {
    const state = CULT.Game.state;
    if (realmId < 0 || realmId >= CULT.REALMS.length) return false;

    state.selectedSanctumRealmId = realmId;
    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // 每天第一次进入/tick 到时，重置刷新费用并重新生成商店库存
  ensureShopFresh() {
    const state = CULT.Game.state;
    const today = CULT.utils.todayDateString();
    if (state.shop.lastRefreshDate !== today) {
      state.shop.refreshCost = CULT.TUNING.shopRefreshBaseCost;
      state.shop.lastRefreshDate = today;
      state.shop.stock = CULT.Data.generateShopStock(state);
    }
  },

  refreshShop() {
    const state = CULT.Game.state;
    const cost = state.shop.refreshCost;
    if (state.character.spiritStones < cost) return false;

    state.character.spiritStones -= cost;
    state.shop.stock = CULT.Data.generateShopStock(state);
    state.shop.refreshCost = cost * 2;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  buyShopItem(itemId) {
    const state = CULT.Game.state;
    const stockEntry = state.shop.stock.find((s) => s.itemId === itemId);
    if (!stockEntry || stockEntry.qty <= 0) return false;
    const price = CULT.Data.getShopBuyPrice(itemId);
    if (state.character.spiritStones < price) return false;

    state.character.spiritStones -= price;
    // 法宝走独立实例（同装备），不再按ID堆叠进背包
    if (itemId.startsWith('fabao_')) {
      CULT.Combat.dropFabao(state, itemId);
    } else {
      state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
    }
    stockEntry.qty -= 1;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  sellItem(itemId, count) {
    const state = CULT.Game.state;
    const sellCount = count || 1;
    if (!state.inventory[itemId] || state.inventory[itemId] < sellCount) return false;

    const price = CULT.Data.getShopSellPrice(itemId);
    state.character.spiritStones += price * sellCount;
    state.inventory[itemId] -= sellCount;
    if (state.inventory[itemId] <= 0) delete state.inventory[itemId];

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  // times: 想炼制的次数（默认1）。材料不够 times 次时，按现有材料能做多少次就做多少次。
  craftPotion(recipeId, times) {
    const state = CULT.Game.state;
    const recipe = CULT.Data.getRecipe(recipeId);
    if (!recipe) return false;

    const affordableCounts = Object.entries(recipe.materials)
      .map(([matId, needed]) => Math.floor((state.inventory[matId] || 0) / needed));
    const maxAffordable = Math.min(times || 1, ...affordableCounts);
    if (maxAffordable <= 0) return false;

    for (const [matId, needed] of Object.entries(recipe.materials)) {
      state.inventory[matId] -= needed * maxAffordable;
      if (state.inventory[matId] <= 0) delete state.inventory[matId];
    }
    state.inventory[recipe.resultId] = (state.inventory[recipe.resultId] || 0) + recipe.resultCount * maxAffordable;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return { crafted: maxAffordable };
  },

  // tier: 'elite'（默认）| 'demonlord'——魔王秘境花费更高、怪物更强、奖励更好
  // targetRealmId 可选，指定要挑战哪个境界的秘境；不传则默认玩家当前境界。
  // 不要求玩家已达到该境界——秘境挑战不设解锁门槛，能不能打得过由玩家自己判断
  startSanctumChallenge(tier, targetRealmId) {
    const sanctumTier = tier === 'demonlord' ? 'demonlord' : 'elite';
    const state = CULT.Game.state;
    if (state.combat.isEliteChallenge) return false; // 已经在挑战中（无论哪个秘境），不能再叠一层
    if (state.character.restTicksRemaining > 0) return false; // 闭关疗养中不能挑战

    const realmId = targetRealmId != null ? targetRealmId : state.character.realmId;
    if (realmId < 0 || realmId >= CULT.REALMS.length) return false;

    const cost = CULT.Data.getSanctumCost(realmId, sanctumTier);
    if (state.character.spiritStones < cost) return false;

    const bossPool = CULT.MONSTERS.filter((m) => m.tier === 'boss' && m.minRealm <= realmId);
    const elitePool = CULT.MONSTERS.filter((m) => m.tier === 'elite' && m.minRealm <= realmId);
    const pool = bossPool.length > 0 ? bossPool : (elitePool.length > 0 ? elitePool : CULT.MONSTERS);
    // 按 minRealm 距离目标境界的远近加权，避免均匀随机时挑出远低于目标境界的旧 boss（掉落也跟着变旧）
    const monsterDef = CULT.utils.weightedPick(pool, (m) => 1 / (1 + (realmId - m.minRealm)));
    const instance = CULT.Combat.instantiateMonster(monsterDef, state, CULT.Data.getSanctumExtraMult(sanctumTier), realmId);

    state.character.spiritStones -= cost;
    // 如果当前有普通战斗在进行，先把它的状态存起来，挑战结束后自动恢复
    if (state.combat.currentMonsterId) {
      state.combat.pausedMonster = {
        currentMonsterId: state.combat.currentMonsterId,
        currentMonsterName: state.combat.currentMonsterName,
        currentMonsterTier: state.combat.currentMonsterTier,
        currentMonsterHp: state.combat.currentMonsterHp,
        currentMonsterHpMax: state.combat.currentMonsterHpMax,
        currentMonsterAtk: state.combat.currentMonsterAtk,
        currentMonsterDef: state.combat.currentMonsterDef,
        currentMonsterSpd: state.combat.currentMonsterSpd,
      };
    }
    const tierLabel = sanctumTier === 'demonlord' ? '魔王秘境' : '精英秘境';
    const realmName = CULT.Data.getRealm(realmId).name;
    state.combat.currentMonsterId = instance.id;
    state.combat.currentMonsterName = instance.name + `（${realmName}·${tierLabel}）`;
    state.combat.currentMonsterTier = instance.tier;
    state.combat.currentMonsterHp = instance.hp;
    state.combat.currentMonsterHpMax = instance.hp;
    state.combat.currentMonsterAtk = instance.atk;
    state.combat.currentMonsterDef = instance.def;
    state.combat.currentMonsterSpd = instance.spd;
    state.combat.isEliteChallenge = true;
    state.combat.challengeTier = sanctumTier;
    state.combat.challengeRealmId = realmId;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  exportSave() {
    return CULT.State.exportToJson(CULT.Game.state);
  },

  importSave(jsonText) {
    const newState = CULT.State.importFromJson(jsonText); // 可能抛异常，交给调用方 (ui.js) 处理
    CULT.Game.state = newState;
    CULT.Game.init(newState);
    CULT.State.save(newState);
    CULT.UI.refresh(newState);
    return newState;
  },

  resetSave() {
    CULT.State.reset();
    location.reload();
  },
};
