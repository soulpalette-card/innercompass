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

  equipItem(itemId) {
    const state = CULT.Game.state;
    const item = CULT.Data.getEquipment(itemId);
    if (!item) return false;
    if (!state.inventory[itemId] || state.inventory[itemId] <= 0) return false;

    const previousItemId = state.equipped[item.slot];
    state.equipped[item.slot] = itemId;
    state.inventory[itemId] -= 1;
    if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
    if (previousItemId) {
      state.inventory[previousItemId] = (state.inventory[previousItemId] || 0) + 1;
    }

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  unequipItem(slot) {
    const state = CULT.Game.state;
    const itemId = state.equipped[slot];
    if (!itemId) return false;
    state.equipped[slot] = null;
    state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  equipFabao(fabaoId) {
    const state = CULT.Game.state;
    const fabao = CULT.Data.getFabao(fabaoId);
    if (!fabao) return false;
    if (!state.inventory[fabaoId] || state.inventory[fabaoId] <= 0) return false;

    const previousFabaoId = state.equippedFabao[fabao.category];
    state.equippedFabao[fabao.category] = fabaoId;
    state.inventory[fabaoId] -= 1;
    if (state.inventory[fabaoId] <= 0) delete state.inventory[fabaoId];
    if (previousFabaoId) {
      state.inventory[previousFabaoId] = (state.inventory[previousFabaoId] || 0) + 1;
    }

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  unequipFabao(category) {
    const state = CULT.Game.state;
    const fabaoId = state.equippedFabao[category];
    if (!fabaoId) return false;
    state.equippedFabao[category] = null;
    state.inventory[fabaoId] = (state.inventory[fabaoId] || 0) + 1;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
  },

  setActivePet(instanceId) {
    const state = CULT.Game.state;
    const pet = state.pets.owned.find((p) => p.instanceId === instanceId);
    if (!pet) return false;
    state.pets.activeId = instanceId;

    CULT.Game.saveNow();
    CULT.UI.refresh(state);
    return true;
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
    if (state.techniques.learned.includes(techId)) return false;
    if (state.character.spiritStones < tech.cost) return false;

    state.character.spiritStones -= tech.cost;
    state.techniques.learned.push(techId);

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
