CULT.SAVE_KEY = 'cultivation_game_save_v1';
CULT.CURRENT_SAVE_VERSION = 1;

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
      },
      equipped: { weapon: null, armor: null, accessory: null },
      inventory: {}, // itemId -> count (covers both equipment and consumables)
      techniques: { learned: ['tech_basic_qi'] }, // 所有已修习功法同时叠加生效
      combat: { currentMonsterId: null, currentMonsterHp: null, log: [] },
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
    // 1: 当前版本，无需迁移。以后格式变更时，在这里加 2: (s) => {...}
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
