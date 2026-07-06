CULT.SAVE_KEY = 'cultivation_game_save_v1';
CULT.CURRENT_SAVE_VERSION = 2;

CULT.State = {
  createDefault() {
    const now = CULT.utils.now();
    return {
      saveVersion: CULT.CURRENT_SAVE_VERSION,
      createdAt: now,
      lastSavedAt: now,
      character: {
        realmId: 0,
        subLevel: 1,
        cultivation: 0,
        spiritStones: 0,
        hp: null, // filled in by combat.recomputeStats on first load
        hpMax: null,
        restTicksRemaining: 0,
        alchemyBonuses: { hp: 0, atk: 0, def: 0, spd: 0 },
      },
      equipped: { weapon: null, armor: null, accessory: null, boots: null, gloves: null },
      equippedFabao: { attack: null, defense: null, boost: null },
      inventory: {}, // itemId -> count (covers equipment, fabao, consumables, materials)
      techniques: { learned: ['tech_basic_qi'] }, // 所有已修习功法同时叠加生效
      pets: { owned: [], activeIds: [] }, // owned: [{ instanceId, speciesId, level, exp, quality }]; activeIds: 最多3个出战宠物
      combat: { currentMonsterId: null, currentMonsterHp: null, log: [], isEliteChallenge: false },
      shop: { stock: [], refreshCost: 2, lastRefreshDate: '' },
      settings: { autoBreakthrough: false },
      stats: { totalBattlesWon: 0, totalBreakthroughs: 0, totalBreakthroughFails: 0 },
      pendingBreakthroughBonus: 0, // consumed by next breakthrough attempt
    };
  },

  // 只做加法：把默认结构里存在、但存档里缺失的字段补全，不覆盖已有值
  mergeWithDefaults(saved) {
    return CULT.utils.deepMerge(CULT.State.createDefault(), saved);
  },

  MIGRATIONS: {
    // v1 -> v2：单出战宠物 activeId 改为最多3个的 activeIds 数组
    2: (s) => {
      if (s.pets && s.pets.activeId && !s.pets.activeIds) {
        s.pets.activeIds = [s.pets.activeId];
      }
      if (s.pets && !s.pets.activeIds) {
        s.pets.activeIds = [];
      }
      if (s.pets) delete s.pets.activeId;
      s.saveVersion = 2;
      return s;
    },
  },

  migrate(saved) {
    let s = saved;
    while (s.saveVersion < CULT.CURRENT_SAVE_VERSION) {
      const step = CULT.State.MIGRATIONS[s.saveVersion + 1];
      if (!step) break; // 没有对应迁移步骤，交给 mergeWithDefaults 兜底
      s = step(s);
    }
    return s;
  },

  load() {
    const raw = localStorage.getItem(CULT.SAVE_KEY);
    if (!raw) {
      return { state: CULT.State.createDefault(), isNew: true, corrupted: false };
    }
    try {
      let parsed = JSON.parse(raw);
      parsed = CULT.State.migrate(parsed);
      const merged = CULT.State.mergeWithDefaults(parsed);
      return { state: merged, isNew: false, corrupted: false };
    } catch (e) {
      console.error('存档解析失败，使用新存档。原始数据已保留在 localStorage 备份中。', e);
      localStorage.setItem(CULT.SAVE_KEY + '_corrupt_backup', raw);
      return { state: CULT.State.createDefault(), isNew: true, corrupted: true };
    }
  },

  save(state) {
    state.lastSavedAt = CULT.utils.now();
    localStorage.setItem(CULT.SAVE_KEY, JSON.stringify(state));
  },

  exportToJson(state) {
    return JSON.stringify(state, null, 2);
  },

  importFromJson(jsonText) {
    const parsed = JSON.parse(jsonText); // 抛出的异常交给调用方处理并提示用户
    const migrated = CULT.State.migrate(parsed);
    return CULT.State.mergeWithDefaults(migrated);
  },

  reset() {
    localStorage.removeItem(CULT.SAVE_KEY);
  },
};
