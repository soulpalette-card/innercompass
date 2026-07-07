CULT.SAVE_KEY = 'cultivation_game_save_v1';
CULT.CURRENT_SAVE_VERSION = 3;

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
      equipped: { weapon: null, armor: null, accessory: null, boots: null, gloves: null }, // 存的是 equipment.owned 里某个实例的 instanceId
      equippedFabao: { attack: null, defense: null, boost: null },
      equipment: { owned: [] }, // owned: [{ instanceId, slot, level, rarity, bonuses, name }]，掉落时现场生成，不再是按ID堆叠的目录
      inventory: {}, // itemId -> count (covers fabao, consumables, materials; 装备已搬到 state.equipment)
      techniques: { learned: ['tech_basic_qi'] }, // 所有已修习功法同时叠加生效
      pets: { owned: [], activeIds: [] }, // owned: [{ instanceId, speciesId, level, exp, quality }]; activeIds: 最多3个出战宠物
      combat: { currentMonsterId: null, currentMonsterHp: null, log: [], isEliteChallenge: false, challengeTier: null, pausedMonster: null },
      shop: { stock: [], refreshCost: 2, lastRefreshDate: '' },
      selectedMapId: null, // 未选择地图时，掉落倍率按 1 计算（见 CULT.Data.getMapLootMultiplier）
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

    // v2 -> v3：装备从"按ID堆叠的固定目录"改成"掉落时现场生成的实例"。
    // 这里写死一份旧目录的快照，因为迁移逻辑不能依赖 data.js 里可能已经被删除/改掉的当前数据。
    3: (s) => {
      const LEGACY_EQUIPMENT = {
        eq_sword_qingfeng: { name: '青锋剑', slot: 'weapon', rarity: 'common', bonuses: { atk: 15 } },
        eq_sword_moyin: { name: '墨隐剑', slot: 'weapon', rarity: 'epic', bonuses: { atk: 220, spd: 10 } },
        eq_armor_xuantie: { name: '玄铁甲', slot: 'armor', rarity: 'uncommon', bonuses: { def: 20, hp: 120 } },
        eq_armor_xuanming: { name: '玄冥战袍', slot: 'armor', rarity: 'rare', bonuses: { def: 60, hp: 400 } },
        eq_ring_lingxi: { name: '灵犀指环', slot: 'accessory', rarity: 'uncommon', bonuses: { spd: 12, hp: 60 } },
        eq_ring_ziyan: { name: '紫炎戒', slot: 'accessory', rarity: 'epic', bonuses: { atk: 90, def: 30 } },
        eq_boots_yunxing: { name: '云行靴', slot: 'boots', rarity: 'uncommon', bonuses: { spd: 15 } },
        eq_boots_pojun: { name: '破军战靴', slot: 'boots', rarity: 'rare', bonuses: { spd: 30, hp: 150 } },
        eq_gloves_longzhua: { name: '龙爪手套', slot: 'gloves', rarity: 'uncommon', bonuses: { atk: 25 } },
        eq_gloves_jinlin: { name: '金鳞护手', slot: 'gloves', rarity: 'rare', bonuses: { atk: 45, def: 20 } },
      };
      // 与 CULT.TUNING.baseStats / statGrowthPerLevel 一致的写死快照，不读当前 data.js
      const LEGACY_BASE_STATS = { hp: 60, atk: 9, def: 4, spd: 5 };
      const LEGACY_STAT_GROWTH_PER_LEVEL = 1.115;
      const LEGACY_REALM_SUBLEVELS = [9, 9, 9, 9, 9, 9, 9, 9, 13];

      const globalLevelIndex = (realmId, subLevel) => {
        let idx = 0;
        for (let i = 0; i < realmId; i++) idx += LEGACY_REALM_SUBLEVELS[i] || 9;
        return idx + (subLevel - 1);
      };

      const character = s.character || {};
      const idx = globalLevelIndex(character.realmId || 0, character.subLevel || 1);
      const growth = Math.pow(LEGACY_STAT_GROWTH_PER_LEVEL, idx);
      const currentBase = {
        hp: LEGACY_BASE_STATS.hp * growth,
        atk: LEGACY_BASE_STATS.atk * growth,
        def: LEGACY_BASE_STATS.def * growth,
        spd: LEGACY_BASE_STATS.spd * growth,
      };
      const migratedLevel = idx + 1;

      s.equipment = s.equipment || { owned: [] };

      // 把旧的固定数值换算成等价的百分比加成：flat / 当前该属性的基础值 ≈ 百分比，封顶200%防止极端情况
      const convertLegacyInstance = (legacyId) => {
        const legacy = LEGACY_EQUIPMENT[legacyId];
        if (!legacy) return null;
        const bonuses = {};
        for (const [stat, flat] of Object.entries(legacy.bonuses)) {
          const pct = CULT.utils.clamp(flat / (currentBase[stat] || 1), 0, 2);
          bonuses[`${stat}Mult`] = Math.round(pct * 10000) / 10000;
        }
        return {
          instanceId: `${legacyId}_migrated_${CULT.utils.now()}_${Math.floor(Math.random() * 10000)}`,
          slot: legacy.slot,
          level: migratedLevel,
          rarity: legacy.rarity,
          bonuses,
          name: legacy.name,
        };
      };

      // 已装备的：逐槽位转换成新实例，槽位改指向新的 instanceId
      if (s.equipped) {
        for (const slot of Object.keys(s.equipped)) {
          const oldId = s.equipped[slot];
          if (!oldId) continue;
          const instance = convertLegacyInstance(oldId);
          if (instance) {
            s.equipment.owned.push(instance);
            s.equipped[slot] = instance.instanceId;
          } else {
            s.equipped[slot] = null; // 未知 id，安全起见清空
          }
        }
      }

      // 背包里按数量堆叠的装备：每一件拆成独立实例，不占槽位
      if (s.inventory) {
        for (const [id, count] of Object.entries(s.inventory)) {
          if (!LEGACY_EQUIPMENT[id]) continue;
          for (let i = 0; i < count; i++) {
            const instance = convertLegacyInstance(id);
            if (instance) s.equipment.owned.push(instance);
          }
          delete s.inventory[id];
        }
      }

      s.saveVersion = 3;
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
