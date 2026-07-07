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

// 地图类型：每个境界都会解锁这两种地图，怪物强度不变，只是掉落侧重不同
CULT.MAP_TYPES = [
  { id: 'gear', name: '矿脉秘境', desc: '装备、材料掉落几率提升，法宝、宠物掉落几率降低。', equipMult: 1.6, materialMult: 1.4, fabaoMult: 0.5, petMult: 0.5 },
  { id: 'mystic', name: '灵兽秘境', desc: '法宝、宠物掉落几率提升，装备、材料掉落几率降低。', equipMult: 0.5, materialMult: 0.6, fabaoMult: 1.8, petMult: 1.8 },
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

  petExpBaseThreshold: 20, // 宠物升级所需经验曲线，与境界阈值同款公式
  petExpGrowth: 1.15,
  petExpPerVictory: 5, // 出战宠物每次战斗胜利获得的经验
  petBonusPerLevel: 0.003, // 宠物在当前阶段内，每级额外叠加的加成
  petAtkFractionOfPlayerBase: 0.15, // 单只出战宠物每回合伤害 = 玩家基础攻击的这个比例（再按阶段/品质/等级放大）
  petFusionConversionRate: 0.8, // 融合时，被献祭宠物的已投入经验按此比例转给目标宠物

  // 宠物按类型把加成投入到不同的地方：陆地宠物拆成2个属性(而不是3个)所以单项权重更高，
  // 飞行宠物把加成整个投入修炼速度，海洋宠物则整个投入自身出手伤害；三者的"总加成"力度大致相当
  petLandStatWeight: 1.5, // 陆地宠物：气血/防御 各按 petBonus * 此权重 计算
  petFlyingCultivationWeight: 3, // 飞行宠物：修炼速度按 petBonus * 此权重 计算
  petSeaDamageMult: 1.8, // 海洋宠物：每回合伤害额外乘这个倍率
  petNonSeaDamageMult: 0.6, // 陆地/飞行宠物：伤害力度已经投入到别处，每回合伤害打个折扣

  monsterTierLevelOffset: { weak: -5, normal: 0, elite: 8, boss: 20 }, // 纯展示用，不影响实际战斗数值

  eliteChallengeBaseCost: 50,
  eliteChallengeCostGrowth: 1.4, // 每跨一个大境界，挑战花费按此倍率增长
  eliteChallengeExtraMult: 1.5, // 精英关卡怪物在原有难度系数基础上再乘的强化倍率
  demonLordCostMult: 2.5, // 魔王秘境花费 = 精英秘境花费 * 此倍率
  demonLordExtraMult: 2.2, // 魔王秘境怪物强化倍率，比精英秘境更狠

  shopRefreshBaseCost: 2,
  shopStockSize: 6,
  shopSellRateOfBuyPrice: 0.35,
  rarityBasePrice: { common: 20, uncommon: 60, rare: 220, epic: 900 },
};

// 怪物：数值以"相对玩家当前基础属性的倍率"表示，自动随玩家境界缩放
CULT.MONSTERS = [
  { id: 'slime', name: '灵雾史莱姆', minRealm: 0, tier: 'weak', emoji: '\u{1F4A7}',
    mult: { hp: 0.5, atk: 0.4, def: 0.3 },
    loot: { expRange: [4, 8], stonesRange: [2, 5], materials: [{ id: 'mat_slime_core', chance: 0.25 }], equipment: [],
      pets: [{ id: 'pet_slime', chance: 0.006 }] } },
  { id: 'wolf', name: '妖狼', minRealm: 0, tier: 'normal', emoji: '\u{1F43A}',
    mult: { hp: 0.8, atk: 0.7, def: 0.55 },
    loot: { expRange: [8, 16], stonesRange: [5, 12], materials: [{ id: 'mat_wolf_fang', chance: 0.3 }], equipment: [{ id: 'eq_sword_qingfeng', chance: 0.015 }],
      fabao: [{ id: 'fabao_atk_leihuo', chance: 0.004 }], pets: [{ id: 'pet_wolf', chance: 0.005 }] } },
  { id: 'boar', name: '铁鬃野猪', minRealm: 0, tier: 'normal', emoji: '\u{1F417}',
    mult: { hp: 1.0, atk: 0.6, def: 0.8 },
    loot: { expRange: [10, 18], stonesRange: [6, 14], materials: [{ id: 'mat_boar_hide', chance: 0.3 }], equipment: [{ id: 'eq_armor_xuantie', chance: 0.012 }, { id: 'eq_gloves_longzhua', chance: 0.012 }],
      fabao: [{ id: 'fabao_def_xuangui', chance: 0.004 }], pets: [{ id: 'pet_boar', chance: 0.005 }] } },
  { id: 'elite_fox', name: '九尾妖狐', minRealm: 1, tier: 'elite', emoji: '\u{1F98A}',
    mult: { hp: 1.4, atk: 1.2, def: 0.9 },
    loot: { expRange: [30, 55], stonesRange: [20, 40], materials: [{ id: 'mat_fox_bead', chance: 0.2 }], equipment: [{ id: 'eq_ring_lingxi', chance: 0.02 }],
      fabao: [{ id: 'fabao_atk_poyun', chance: 0.006 }, { id: 'fabao_boost_hunyuan', chance: 0.003 }], pets: [{ id: 'pet_fox', chance: 0.007 }] } },
  { id: 'boss_jindan', name: '金丹魔君', minRealm: 2, tier: 'boss', emoji: '\u{1F479}',
    mult: { hp: 2.2, atk: 1.6, def: 1.2 },
    loot: { expRange: [200, 350], stonesRange: [150, 260], materials: [{ id: 'mat_demon_core', chance: 0.5 }], equipment: [{ id: 'eq_sword_moyin', chance: 0.05 }],
      fabao: [{ id: 'fabao_def_wushuang', chance: 0.015 }, { id: 'fabao_boost_hunyuan', chance: 0.01 }] } },
  { id: 'crane', name: '玄羽仙鹤', minRealm: 3, tier: 'normal', emoji: '\u{1F54A}️',
    mult: { hp: 0.9, atk: 0.9, def: 0.7 },
    loot: { expRange: [80, 140], stonesRange: [60, 110], materials: [{ id: 'mat_crane_feather', chance: 0.25 }], equipment: [{ id: 'eq_boots_yunxing', chance: 0.015 }],
      pets: [{ id: 'pet_crane', chance: 0.007 }] } },
  { id: 'elite_python', name: '玄冥蛟蟒', minRealm: 3, tier: 'elite', emoji: '\u{1F40D}',
    mult: { hp: 1.5, atk: 1.3, def: 1.0 },
    loot: { expRange: [180, 300], stonesRange: [120, 220], materials: [{ id: 'mat_python_scale', chance: 0.2 }], equipment: [{ id: 'eq_armor_xuanming', chance: 0.02 }, { id: 'eq_boots_pojun', chance: 0.015 }],
      fabao: [{ id: 'fabao_def_wushuang', chance: 0.006 }], pets: [{ id: 'pet_python', chance: 0.007 }] } },
  { id: 'boss_yuanying', name: '元婴期魔尊', minRealm: 3, tier: 'boss', emoji: '\u{1F47A}',
    mult: { hp: 2.5, atk: 1.8, def: 1.3 },
    loot: { expRange: [900, 1500], stonesRange: [700, 1200], materials: [{ id: 'mat_demon_core', chance: 0.6 }], equipment: [{ id: 'eq_ring_ziyan', chance: 0.05 }, { id: 'eq_gloves_jinlin', chance: 0.03 }],
      fabao: [{ id: 'fabao_atk_taiyi', chance: 0.015 }, { id: 'fabao_boost_taiji', chance: 0.008 }] } },
  { id: 'phantom', name: '化神虚影', minRealm: 4, tier: 'normal', emoji: '\u{1F47B}',
    mult: { hp: 1.0, atk: 1.0, def: 0.8 },
    loot: { expRange: [500, 900], stonesRange: [400, 700], materials: [{ id: 'mat_phantom_dust', chance: 0.25 }], equipment: [],
      pets: [{ id: 'pet_phantom', chance: 0.007 }] } },
  { id: 'boss_huashen', name: '化神大能', minRealm: 4, tier: 'boss', emoji: '\u{1F47F}',
    mult: { hp: 2.8, atk: 2.0, def: 1.4 },
    loot: { expRange: [6000, 10000], stonesRange: [5000, 8000], materials: [{ id: 'mat_demon_core', chance: 0.7 }], equipment: [{ id: 'eq_sword_moyin', chance: 0.08 }],
      fabao: [{ id: 'fabao_def_pantian', chance: 0.02 }, { id: 'fabao_boost_taiji', chance: 0.015 }] } },
];

// 法宝：分攻击/防御/增幅三类，加成为百分比（xxxMult），后期数值达到万/亿级别时依然有意义
CULT.FABAO = [
  { id: 'fabao_atk_leihuo', name: '雷火令', category: 'attack', rarity: 'common', bonuses: { atkMult: 0.12 } },
  { id: 'fabao_atk_poyun', name: '破云印', category: 'attack', rarity: 'rare', bonuses: { atkMult: 0.25, spdMult: 0.05 } },
  { id: 'fabao_atk_taiyi', name: '太乙神雷', category: 'attack', rarity: 'epic', bonuses: { atkMult: 0.45 } },
  { id: 'fabao_def_xuangui', name: '玄龟盾', category: 'defense', rarity: 'common', bonuses: { defMult: 0.12, hpMult: 0.08 } },
  { id: 'fabao_def_wushuang', name: '无双铠', category: 'defense', rarity: 'rare', bonuses: { defMult: 0.25, hpMult: 0.15 } },
  { id: 'fabao_def_pantian', name: '盘天镜', category: 'defense', rarity: 'epic', bonuses: { defMult: 0.4, hpMult: 0.3 } },
  { id: 'fabao_boost_hunyuan', name: '混元珠', category: 'boost', rarity: 'rare', bonuses: { atkMult: 0.1, defMult: 0.1, hpMult: 0.1, spdMult: 0.1 } },
  { id: 'fabao_boost_taiji', name: '太极葫芦', category: 'boost', rarity: 'epic', bonuses: { atkMult: 0.18, defMult: 0.18, hpMult: 0.18, spdMult: 0.18 } },
];

// 宠物阶段：所有宠物共用的通用段位，随等级自动跨阶段
CULT.PET_STAGES = [
  { id: 0, name: '妖兽', minLevel: 1, bonusMult: 0.02 },
  { id: 1, name: '魔兽', minLevel: 10, bonusMult: 0.05 },
  { id: 2, name: '邪兽', minLevel: 20, bonusMult: 0.10 },
  { id: 3, name: '圣兽', minLevel: 35, bonusMult: 0.18 },
  { id: 4, name: '神兽', minLevel: 50, bonusMult: 0.30 },
];

// 宠物类型：决定加成落在哪个属性上（陆地宠物加生存，飞行宠物加修炼速度，海洋宠物加宠物自身伤害）
CULT.PET_TYPES = [
  { id: 'land', name: '陆地', emoji: '\u{1F43E}' },
  { id: 'flying', name: '飞行', emoji: '\u{1F985}' },
  { id: 'sea', name: '海洋', emoji: '\u{1F30A}' },
];

// 可捕获的宠物种类，来源于对应的怪物（复用其 emoji）
CULT.PET_SPECIES = [
  { id: 'pet_slime', name: '灵雾史莱姆宝宝', sourceMonsterId: 'slime', emoji: '\u{1F4A7}', type: 'land' },
  { id: 'pet_wolf', name: '妖狼幼崽', sourceMonsterId: 'wolf', emoji: '\u{1F43A}', type: 'land' },
  { id: 'pet_boar', name: '铁鬃小猪', sourceMonsterId: 'boar', emoji: '\u{1F417}', type: 'land' },
  { id: 'pet_fox', name: '九尾狐仔', sourceMonsterId: 'elite_fox', emoji: '\u{1F98A}', type: 'flying' },
  { id: 'pet_crane', name: '玄羽雏鹤', sourceMonsterId: 'crane', emoji: '\u{1F54A}️', type: 'flying' },
  { id: 'pet_python', name: '玄冥小蟒', sourceMonsterId: 'elite_python', emoji: '\u{1F40D}', type: 'sea' },
  { id: 'pet_phantom', name: '化神小灵', sourceMonsterId: 'phantom', emoji: '\u{1F47B}', type: 'sea' },
];

// 装备：flat 加成
CULT.EQUIPMENT = [
  { id: 'eq_sword_qingfeng', name: '青锋剑', slot: 'weapon', rarity: 'common', bonuses: { atk: 15 } },
  { id: 'eq_sword_moyin', name: '墨隐剑', slot: 'weapon', rarity: 'epic', bonuses: { atk: 220, spd: 10 } },
  { id: 'eq_armor_xuantie', name: '玄铁甲', slot: 'armor', rarity: 'uncommon', bonuses: { def: 20, hp: 120 } },
  { id: 'eq_armor_xuanming', name: '玄冥战袍', slot: 'armor', rarity: 'rare', bonuses: { def: 60, hp: 400 } },
  { id: 'eq_ring_lingxi', name: '灵犀指环', slot: 'accessory', rarity: 'uncommon', bonuses: { spd: 12, hp: 60 } },
  { id: 'eq_ring_ziyan', name: '紫炎戒', slot: 'accessory', rarity: 'epic', bonuses: { atk: 90, def: 30 } },
  { id: 'eq_boots_yunxing', name: '云行靴', slot: 'boots', rarity: 'uncommon', bonuses: { spd: 15 } },
  { id: 'eq_boots_pojun', name: '破军战靴', slot: 'boots', rarity: 'rare', bonuses: { spd: 30, hp: 150 } },
  { id: 'eq_gloves_longzhua', name: '龙爪手套', slot: 'gloves', rarity: 'uncommon', bonuses: { atk: 25 } },
  { id: 'eq_gloves_jinlin', name: '金鳞护手', slot: 'gloves', rarity: 'rare', bonuses: { atk: 45, def: 20 } },
];

// 消耗品
CULT.CONSUMABLES = [
  { id: 'pill_ju_qi', name: '聚气丹', type: 'exp_boost', desc: '立即获得一定修为。', effect: { flatExp: 500 }, price: 80 },
  { id: 'pill_ning_qi', name: '凝气丹', type: 'exp_boost', desc: '立即获得一定修为，由3颗聚气丹融合而成。', effect: { flatExp: 1275 }, price: 200 },
  { id: 'pill_yuan_qi', name: '元气丹', type: 'exp_boost', desc: '立即获得大量修为，由3颗凝气丹融合而成。', effect: { flatExp: 3250 }, price: 500 },
  { id: 'pill_po_jing', name: '破境丹', type: 'breakthrough_boost', desc: '下一次突破成功率提升。', effect: { successChanceBonus: 0.15 }, price: 150 },
  { id: 'pill_liao_shang', name: '疗伤丹', type: 'heal', desc: '立即回复全部气血。', effect: { healPercent: 1.0 }, price: 50 },
  { id: 'pill_atk_boost', name: '锐金丹', type: 'stat_boost', desc: '永久提升攻击。', effect: { stat: 'atk', amount: 25 }, price: 200 },
  { id: 'pill_def_boost', name: '玄甲丹', type: 'stat_boost', desc: '永久提升防御。', effect: { stat: 'def', amount: 15 }, price: 180 },
  { id: 'pill_spd_boost', name: '疾风丹', type: 'stat_boost', desc: '永久提升速度。', effect: { stat: 'spd', amount: 10 }, price: 150 },
  { id: 'pill_hp_boost', name: '培元丹', type: 'stat_boost', desc: '永久提升气血上限。', effect: { stat: 'hp', amount: 100 }, price: 150 },
];

// 炼制材料（怪物掉落），供炼丹配方和商店定价引用
CULT.MATERIALS = [
  { id: 'mat_slime_core', name: '史莱姆核心', rarity: 'common' },
  { id: 'mat_wolf_fang', name: '妖狼獠牙', rarity: 'common' },
  { id: 'mat_boar_hide', name: '野猪硬皮', rarity: 'common' },
  { id: 'mat_fox_bead', name: '妖狐内丹', rarity: 'uncommon' },
  { id: 'mat_demon_core', name: '魔君精魄', rarity: 'rare' },
  { id: 'mat_crane_feather', name: '仙鹤羽毛', rarity: 'uncommon' },
  { id: 'mat_python_scale', name: '蛟蟒鳞片', rarity: 'rare' },
  { id: 'mat_phantom_dust', name: '虚影灵尘', rarity: 'rare' },
];

// 炼丹固定配方：材料组合 -> 丹药
CULT.RECIPES = [
  { id: 'recipe_qi_pill', name: '聚气丹方', resultId: 'pill_ju_qi', resultCount: 1, materials: { mat_slime_core: 3, mat_wolf_fang: 2 } },
  { id: 'recipe_breakthrough_pill', name: '破境丹方', resultId: 'pill_po_jing', resultCount: 1, materials: { mat_boar_hide: 2, mat_fox_bead: 1 } },
  { id: 'recipe_heal_pill', name: '疗伤丹方', resultId: 'pill_liao_shang', resultCount: 1, materials: { mat_wolf_fang: 2, mat_boar_hide: 2 } },
  { id: 'recipe_atk_pill', name: '锐金丹方', resultId: 'pill_atk_boost', resultCount: 1, materials: { mat_demon_core: 1, mat_python_scale: 2 } },
  { id: 'recipe_def_pill', name: '玄甲丹方', resultId: 'pill_def_boost', resultCount: 1, materials: { mat_boar_hide: 3, mat_fox_bead: 1 } },
  { id: 'recipe_spd_pill', name: '疾风丹方', resultId: 'pill_spd_boost', resultCount: 1, materials: { mat_crane_feather: 3 } },
  { id: 'recipe_hp_pill', name: '培元丹方', resultId: 'pill_hp_boost', resultCount: 1, materials: { mat_wolf_fang: 2, mat_phantom_dust: 1 } },
  // 丹药融合：3颗低阶丹药融合成1颗更进阶的，"材料"就是丹药本身
  { id: 'recipe_qi_pill_fuse_mid', name: '凝气丹方（融合）', resultId: 'pill_ning_qi', resultCount: 1, materials: { pill_ju_qi: 3 } },
  { id: 'recipe_qi_pill_fuse_high', name: '元气丹方（融合）', resultId: 'pill_yuan_qi', resultCount: 1, materials: { pill_ning_qi: 3 } },
];

// 宠物品质：复用现有的稀有度体系（common/uncommon/rare/epic），捕获时随机抽取
CULT.PET_QUALITIES = [
  { id: 'common', name: '普通', weight: 60, statMult: 1.0 },
  { id: 'uncommon', name: '优良', weight: 25, statMult: 1.15 },
  { id: 'rare', name: '精良', weight: 12, statMult: 1.35 },
  { id: 'epic', name: '极品', weight: 3, statMult: 1.6 },
];

// 功法：被动加成，所有已修习的功法同时生效（叠加），修习需要消耗灵石
CULT.TECHNIQUES = [
  { id: 'tech_basic_qi', name: '基础吐纳诀', desc: '修炼速度 +10%。', cost: 0, minRealm: 0, bonuses: { cultivationSpeedMult: 0.10 } },
  { id: 'tech_iron_body', name: '玄铁炼体诀', desc: '气血 +20%，防御 +10%。', cost: 300, minRealm: 0, bonuses: { hpMult: 0.20, defMult: 0.10 } },
  { id: 'tech_sword_heart', name: '一念剑心诀', desc: '攻击 +20%。', cost: 600, minRealm: 1, bonuses: { atkMult: 0.20 } },
];

// 属性说明文字，供悬浮提示使用
CULT.STAT_DESCRIPTIONS = {
  hp: '气血上限：降到0会被打败，需要闭关疗养才能恢复。',
  atk: '攻击：每回合对怪物造成的伤害，越高越快击杀怪物。',
  def: '防御：抵消怪物对你的伤害，越高受到的伤害越低。',
  spd: '速度：影响装备加成，目前主要作为综合战力参考。',
  cultivationSpeedMult: '修炼速度：影响每秒获得修为的数量，越高突破越快。',
};

CULT.Data = {
  getRealm(realmId) {
    return CULT.REALMS[realmId];
  },

  getMaxSubLevel(realmId) {
    return CULT.Data.getRealm(realmId).subLevels;
  },

  // 某个境界解锁的2张地图，按 境界+类型 组合生成，不需要逐个手写
  getMapsForRealm(realmId) {
    const realm = CULT.Data.getRealm(realmId);
    return CULT.MAP_TYPES.map((t) => ({
      id: `map_${realmId}_${t.id}`,
      realmId,
      typeId: t.id,
      name: `${realm.name}·${t.name}`,
      desc: t.desc,
    }));
  },

  // 玩家当前已解锁的所有地图（当前境界 + 之前所有境界，可以回头刷低境界地图）
  getAllUnlockedMaps(state) {
    const maps = [];
    for (let realmId = 0; realmId <= state.character.realmId; realmId++) {
      maps.push(...CULT.Data.getMapsForRealm(realmId));
    }
    return maps;
  },

  getMap(mapId) {
    if (!mapId) return null;
    const match = /^map_(\d+)_(\w+)$/.exec(mapId);
    if (!match) return null;
    const realmId = Number(match[1]);
    const typeId = match[2];
    const type = CULT.MAP_TYPES.find((t) => t.id === typeId);
    if (!type) return null;
    const realm = CULT.Data.getRealm(realmId);
    if (!realm) return null;
    return { id: mapId, realmId, typeId, name: `${realm.name}·${type.name}`, desc: type.desc };
  },

  // category: 'equipment' | 'material' | 'fabao' | 'pet'；mapId 为空（尚未选择地图）时按 1 倍不做任何调整
  getMapLootMultiplier(mapId, category) {
    const match = /^map_\d+_(\w+)$/.exec(mapId || '');
    if (!match) return 1;
    const type = CULT.MAP_TYPES.find((t) => t.id === match[1]);
    if (!type) return 1;
    const key = { equipment: 'equipMult', material: 'materialMult', fabao: 'fabaoMult', pet: 'petMult' }[category];
    return type[key] || 1;
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

  getFabao(id) {
    return CULT.FABAO.find((f) => f.id === id);
  },

  getPetSpecies(id) {
    return CULT.PET_SPECIES.find((p) => p.id === id);
  },

  // 宠物实例 -> 类型定义；旧存档/未知种类兜底为陆地
  getPetType(pet) {
    const species = CULT.Data.getPetSpecies(pet.speciesId);
    const typeId = species ? species.type : 'land';
    return CULT.PET_TYPES.find((t) => t.id === typeId) || CULT.PET_TYPES[0];
  },

  // 按等级从高到低找到第一个满足 minLevel 的阶段（数组本身按等级升序排列）
  getPetStage(level) {
    let stage = CULT.PET_STAGES[0];
    for (const s of CULT.PET_STAGES) {
      if (level >= s.minLevel) stage = s;
    }
    return stage;
  },

  getPetExpThreshold(level) {
    return Math.floor(CULT.TUNING.petExpBaseThreshold * Math.pow(CULT.TUNING.petExpGrowth, level - 1));
  },

  getMaterial(id) {
    return CULT.MATERIALS.find((m) => m.id === id);
  },

  getRecipe(id) {
    return CULT.RECIPES.find((r) => r.id === id);
  },

  // 纯展示用的怪物等级：不影响 instantiateMonster 里的实际战斗数值
  getMonsterLevel(state, tier) {
    const idx = CULT.Data.getGlobalLevelIndex(state.character.realmId, state.character.subLevel);
    const offset = CULT.TUNING.monsterTierLevelOffset[tier] || 0;
    return Math.max(1, idx + 1 + offset);
  },

  rollPetQuality() {
    return CULT.utils.weightedPick(CULT.PET_QUALITIES, (q) => q.weight);
  },

  getPetQuality(id) {
    return CULT.PET_QUALITIES.find((q) => q.id === id) || CULT.PET_QUALITIES[0];
  },

  getEliteChallengeCost(realmId) {
    return Math.floor(CULT.TUNING.eliteChallengeBaseCost * Math.pow(CULT.TUNING.eliteChallengeCostGrowth, realmId));
  },

  // tier: 'elite' | 'demonlord'，魔王秘境在精英秘境花费基础上再乘一个倍率
  getSanctumCost(realmId, tier) {
    const base = CULT.Data.getEliteChallengeCost(realmId);
    return tier === 'demonlord' ? Math.floor(base * CULT.TUNING.demonLordCostMult) : base;
  },

  getSanctumExtraMult(tier) {
    return tier === 'demonlord' ? CULT.TUNING.demonLordExtraMult : CULT.TUNING.eliteChallengeExtraMult;
  },

  rollWeightedFabao(biasRare) {
    const weights = biasRare ? { common: 15, uncommon: 30, rare: 35, epic: 20 } : { common: 50, uncommon: 25, rare: 15, epic: 4 };
    return CULT.utils.weightedPick(CULT.FABAO, (f) => weights[f.rarity] || 1);
  },

  // 商店买入价：装备/法宝/材料按稀有度定价，丹药用固定 price 字段
  getShopBuyPrice(itemId) {
    if (itemId.startsWith('eq_')) {
      return CULT.TUNING.rarityBasePrice[CULT.Data.getEquipment(itemId).rarity] * 3;
    }
    if (itemId.startsWith('fabao_')) {
      return CULT.TUNING.rarityBasePrice[CULT.Data.getFabao(itemId).rarity] * 5;
    }
    if (itemId.startsWith('pill_')) {
      return CULT.Data.getConsumable(itemId).price;
    }
    const material = CULT.Data.getMaterial(itemId);
    return CULT.TUNING.rarityBasePrice[material ? material.rarity : 'common'];
  },

  getShopSellPrice(itemId) {
    return Math.max(1, Math.floor(CULT.Data.getShopBuyPrice(itemId) * CULT.TUNING.shopSellRateOfBuyPrice));
  },

  // 随机生成一批商店商品：装备/法宝/丹药/材料混合池
  generateShopStock(state) {
    const pool = [
      ...CULT.EQUIPMENT.map((e) => ({ itemId: e.id, qty: 1 })),
      ...CULT.FABAO.map((f) => ({ itemId: f.id, qty: 1 })),
      ...CULT.CONSUMABLES.map((c) => ({ itemId: c.id, qty: CULT.utils.randInt(3, 5) })),
      ...CULT.MATERIALS.map((m) => ({ itemId: m.id, qty: CULT.utils.randInt(3, 6) })),
    ];
    const stock = [];
    const usedIndexes = new Set();
    const stockSize = Math.min(CULT.TUNING.shopStockSize, pool.length);
    while (stock.length < stockSize) {
      const idx = Math.floor(Math.random() * pool.length);
      if (usedIndexes.has(idx)) continue;
      usedIndexes.add(idx);
      stock.push(pool[idx]);
    }
    return stock;
  },
};
