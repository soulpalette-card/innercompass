// 静态数值表。调整数值只需改这个文件，不用碰逻辑代码。

CULT.REALMS = [
  { id: 0, name: '练气', subLevels: 9, baseExpToNext: 20, growth: 1.35 },
  { id: 1, name: '筑基', subLevels: 9, baseExpToNext: 800, growth: 1.32 },
  { id: 2, name: '金丹', subLevels: 9, baseExpToNext: 15000, growth: 1.30 },
  { id: 3, name: '元婴', subLevels: 9, baseExpToNext: 260000, growth: 1.28 },
  { id: 4, name: '化神', subLevels: 9, baseExpToNext: 4200000, growth: 1.26 },
  { id: 5, name: '炼虚', subLevels: 9, baseExpToNext: 70000000, growth: 1.25 },
  { id: 6, name: '合体', subLevels: 9, baseExpToNext: 1100000000, growth: 1.24 },
  { id: 7, name: '大乘', subLevels: 9, baseExpToNext: 1.8e10, growth: 1.23 },
  { id: 8, name: '渡劫', subLevels: 13, baseExpToNext: 3e11, growth: 1.22 },
];

CULT.TUNING = {
  tickIntervalMs: 1000,
  autosaveEveryTicks: 10,

  cultivationPerSecondBase: 3,
  cultivationPerSecondRealmGrowth: 1.06, // 每跨一个大境界，基础修炼速度略微提升

  baseStats: { hp: 60, atk: 9, def: 4, spd: 5 },
  statGrowthPerLevel: 1.115, // 每小层的属性成长率（作用于全局层数）

  breakthroughBaseChance: 0.85, // 境界内小层突破
  breakthroughRealmCrossChance: 0.55, // 跨大境界突破
  breakthroughOverflowBonusPerHundredPercent: 0.15, // 修为每超出阈值100%，成功率+15%（有上限）
  breakthroughOverflowBonusCap: 0.3,
  breakthroughFailPenaltyPercent: 0.3, // 突破失败扣除已囤积修为的比例

  monsterDifficultyByTier: { weak: 0.6, normal: 0.85, elite: 1.1, boss: 1.35 },
  monsterRealmWindowBehind: 2, // 选怪时，向下最多兼容几个大境界的杂兵

  restTicksAfterDefeat: 8, // 被打败后休整的 tick 数（不会真正死亡/清空进度）

  offlineCapHours: 8,
  offlineEfficiency: 0.5,
  offlineMinSecondsToShowSummary: 60,
};

// 怪物：数值以"相对玩家当前基础属性的倍率"表示，自动随玩家境界缩放
CULT.MONSTERS = [
  { id: 'slime', name: '灵雾史莱姆', minRealm: 0, tier: 'weak', emoji: '\u{1F4A7}',
    mult: { hp: 0.5, atk: 0.4, def: 0.3 },
    loot: { expRange: [4, 8], stonesRange: [2, 5], materials: [{ id: 'mat_slime_core', chance: 0.25 }], equipment: [] } },
  { id: 'wolf', name: '妖狼', minRealm: 0, tier: 'normal', emoji: '\u{1F43A}',
    mult: { hp: 0.8, atk: 0.7, def: 0.55 },
    loot: { expRange: [8, 16], stonesRange: [5, 12], materials: [{ id: 'mat_wolf_fang', chance: 0.3 }], equipment: [{ id: 'eq_sword_qingfeng', chance: 0.015 }] } },
  { id: 'boar', name: '铁鬃野猪', minRealm: 0, tier: 'normal', emoji: '\u{1F417}',
    mult: { hp: 1.0, atk: 0.6, def: 0.8 },
    loot: { expRange: [10, 18], stonesRange: [6, 14], materials: [{ id: 'mat_boar_hide', chance: 0.3 }], equipment: [{ id: 'eq_armor_xuantie', chance: 0.012 }] } },
  { id: 'elite_fox', name: '九尾妖狐', minRealm: 1, tier: 'elite', emoji: '\u{1F98A}',
    mult: { hp: 1.4, atk: 1.2, def: 0.9 },
    loot: { expRange: [30, 55], stonesRange: [20, 40], materials: [{ id: 'mat_fox_bead', chance: 0.2 }], equipment: [{ id: 'eq_ring_lingxi', chance: 0.02 }] } },
  { id: 'boss_jindan', name: '金丹魔君', minRealm: 2, tier: 'boss', emoji: '\u{1F479}',
    mult: { hp: 2.2, atk: 1.6, def: 1.2 },
    loot: { expRange: [200, 350], stonesRange: [150, 260], materials: [{ id: 'mat_demon_core', chance: 0.5 }], equipment: [{ id: 'eq_sword_moyin', chance: 0.05 }] } },
  { id: 'crane', name: '玄羽仙鹤', minRealm: 3, tier: 'normal', emoji: '\u{1F54A}️',
    mult: { hp: 0.9, atk: 0.9, def: 0.7 },
    loot: { expRange: [80, 140], stonesRange: [60, 110], materials: [{ id: 'mat_crane_feather', chance: 0.25 }], equipment: [] } },
  { id: 'elite_python', name: '玄冥蛟蟒', minRealm: 3, tier: 'elite', emoji: '\u{1F40D}',
    mult: { hp: 1.5, atk: 1.3, def: 1.0 },
    loot: { expRange: [180, 300], stonesRange: [120, 220], materials: [{ id: 'mat_python_scale', chance: 0.2 }], equipment: [{ id: 'eq_armor_xuanming', chance: 0.02 }] } },
  { id: 'boss_yuanying', name: '元婴期魔尊', minRealm: 3, tier: 'boss', emoji: '\u{1F47A}',
    mult: { hp: 2.5, atk: 1.8, def: 1.3 },
    loot: { expRange: [900, 1500], stonesRange: [700, 1200], materials: [{ id: 'mat_demon_core', chance: 0.6 }], equipment: [{ id: 'eq_ring_ziyan', chance: 0.05 }] } },
  { id: 'phantom', name: '化神虚影', minRealm: 4, tier: 'normal', emoji: '\u{1F47B}',
    mult: { hp: 1.0, atk: 1.0, def: 0.8 },
    loot: { expRange: [500, 900], stonesRange: [400, 700], materials: [{ id: 'mat_phantom_dust', chance: 0.25 }], equipment: [] } },
  { id: 'boss_huashen', name: '化神大能', minRealm: 4, tier: 'boss', emoji: '\u{1F47F}',
    mult: { hp: 2.8, atk: 2.0, def: 1.4 },
    loot: { expRange: [6000, 10000], stonesRange: [5000, 8000], materials: [{ id: 'mat_demon_core', chance: 0.7 }], equipment: [{ id: 'eq_sword_moyin', chance: 0.08 }] } },
];

// 装备：flat 加成
CULT.EQUIPMENT = [
  { id: 'eq_sword_qingfeng', name: '青锋剑', slot: 'weapon', rarity: 'common', bonuses: { atk: 15 } },
  { id: 'eq_sword_moyin', name: '墨隐剑', slot: 'weapon', rarity: 'epic', bonuses: { atk: 220, spd: 10 } },
  { id: 'eq_armor_xuantie', name: '玄铁甲', slot: 'armor', rarity: 'uncommon', bonuses: { def: 20, hp: 120 } },
  { id: 'eq_armor_xuanming', name: '玄冥战袍', slot: 'armor', rarity: 'rare', bonuses: { def: 60, hp: 400 } },
  { id: 'eq_ring_lingxi', name: '灵犀指环', slot: 'accessory', rarity: 'uncommon', bonuses: { spd: 12, hp: 60 } },
  { id: 'eq_ring_ziyan', name: '紫炎戒', slot: 'accessory', rarity: 'epic', bonuses: { atk: 90, def: 30 } },
];

// 消耗品
CULT.CONSUMABLES = [
  { id: 'pill_ju_qi', name: '聚气丹', type: 'exp_boost', desc: '立即获得一定修为。', effect: { flatExp: 500 } },
  { id: 'pill_po_jing', name: '破境丹', type: 'breakthrough_boost', desc: '下一次突破成功率提升。', effect: { successChanceBonus: 0.15 } },
  { id: 'pill_liao_shang', name: '疗伤丹', type: 'heal', desc: '立即回复全部气血。', effect: { healPercent: 1.0 } },
];

// 功法：被动加成，所有已修习的功法同时生效（叠加），修习需要消耗灵石
CULT.TECHNIQUES = [
  { id: 'tech_basic_qi', name: '基础吐纳诀', desc: '修炼速度 +10%。', cost: 0, bonuses: { cultivationSpeedMult: 0.10 } },
  { id: 'tech_iron_body', name: '玄铁炼体诀', desc: '气血 +20%，防御 +10%。', cost: 300, bonuses: { hpMult: 0.20, defMult: 0.10 } },
  { id: 'tech_sword_heart', name: '一念剑心诀', desc: '攻击 +20%。', cost: 600, bonuses: { atkMult: 0.20 } },
];

CULT.Data = {
  getRealm(realmId) {
    return CULT.REALMS[realmId];
  },

  getMaxSubLevel(realmId) {
    return CULT.Data.getRealm(realmId).subLevels;
  },

  isMaxRealm(realmId) {
    return realmId >= CULT.REALMS.length - 1;
  },

  // 修为达到这个大境界某一小层所需的阈值
  getExpThreshold(realmId, subLevel) {
    const realm = CULT.Data.getRealm(realmId);
    return Math.floor(realm.baseExpToNext * Math.pow(realm.growth, subLevel - 1));
  },

  // 全局层数索引（跨境界累计），用于属性成长曲线
  getGlobalLevelIndex(realmId, subLevel) {
    let index = 0;
    for (let i = 0; i < realmId; i++) {
      index += CULT.REALMS[i].subLevels;
    }
    return index + (subLevel - 1);
  },

  getBaseStats(realmId, subLevel) {
    const idx = CULT.Data.getGlobalLevelIndex(realmId, subLevel);
    const growth = Math.pow(CULT.TUNING.statGrowthPerLevel, idx);
    const base = CULT.TUNING.baseStats;
    return {
      hp: Math.floor(base.hp * growth),
      atk: Math.floor(base.atk * growth),
      def: Math.floor(base.def * growth),
      spd: Math.floor(base.spd * growth),
    };
  },

  getEquipment(id) {
    return CULT.EQUIPMENT.find((e) => e.id === id);
  },

  getConsumable(id) {
    return CULT.CONSUMABLES.find((c) => c.id === id);
  },

  getTechnique(id) {
    return CULT.TECHNIQUES.find((t) => t.id === id);
  },

  getEligibleMonsters(realmId) {
    const window = CULT.TUNING.monsterRealmWindowBehind;
    return CULT.MONSTERS.filter(
      (m) => m.minRealm <= realmId && m.minRealm >= realmId - window
    );
  },
};
