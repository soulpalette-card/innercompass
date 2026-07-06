CULT.UI = {
  currentScreen: 'main-screen',
  lootQueue: [],
  lootModalOpen: false,

  el(id) {
    return document.getElementById(id);
  },

  init() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => CULT.UI.showScreen(btn.dataset.screen));
    });
    CULT.UI.showScreen('main-screen');

    CULT.UI.el('header-taiji').innerHTML = CULT.Icons.taiji();
    CULT.UI.el('realm-icon').innerHTML = CULT.Icons.taiji();
    CULT.UI.el('breakthrough-front-icon').innerHTML = CULT.Icons.taiji();

    CULT.UI.el('breakthrough-btn').addEventListener('click', CULT.UI.openBreakthroughModal);
    CULT.UI.el('breakthrough-confirm-btn').addEventListener('click', CULT.UI.confirmBreakthrough);
    CULT.UI.el('breakthrough-close-btn').addEventListener('click', CULT.UI.closeBreakthroughModal);
    CULT.UI.el('loot-close-btn').addEventListener('click', CULT.UI.closeLootModal);
    CULT.UI.el('offline-close-btn').addEventListener('click', CULT.UI.closeOfflineModal);

    CULT.UI.el('auto-breakthrough-toggle').addEventListener('change', (e) => {
      CULT.Game.setAutoBreakthrough(e.target.checked);
    });
    CULT.UI.el('export-save-btn').addEventListener('click', CULT.UI.handleExport);
    CULT.UI.el('import-save-btn').addEventListener('click', CULT.UI.handleImport);
    CULT.UI.el('reset-save-btn').addEventListener('click', CULT.UI.handleReset);

    CULT.UI.el('shop-refresh-btn').addEventListener('click', CULT.Game.refreshShop);
    CULT.UI.el('elite-challenge-btn').addEventListener('click', () => {
      if (CULT.Game.startEliteChallenge()) CULT.UI.showScreen('main-screen');
    });

    CULT.UI.el('fusion-confirm-btn').addEventListener('click', () => {
      const sel = CULT.UI.fusionSelection;
      if (!confirm(`确定要献祭 ${sel.sacrificeIds.length} 只宠物进行融合吗？此操作不可撤销。`)) return;
      const result = CULT.Game.fusePets(sel.sacrificeIds, sel.targetId);
      if (result) {
        sel.sacrificeIds = [];
        sel.targetId = null;
      }
    });
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((s) => {
      s.style.display = 'none';
    });
    const target = CULT.UI.el(screenId);
    if (target) target.style.display = 'block';
    CULT.UI.currentScreen = screenId;

    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.screen === screenId);
    });
  },

  refresh(state) {
    CULT.UI.el('header-spirit-stones').textContent = CULT.utils.formatNumber(state.character.spiritStones);
    CULT.UI.renderMain(state);
    CULT.UI.renderCharacter(state);
    CULT.UI.renderInventory(state);
    CULT.UI.renderTechniques(state);
    CULT.UI.renderFabao(state);
    CULT.UI.renderPets(state);
    CULT.UI.renderShop(state);
    CULT.UI.renderAlchemy(state);
    CULT.UI.renderElite(state);
    CULT.UI.el('auto-breakthrough-toggle').checked = !!state.settings.autoBreakthrough;
  },

  renderMain(state) {
    const realm = CULT.Data.getRealm(state.character.realmId);
    CULT.UI.el('realm-name').textContent = realm.name;
    CULT.UI.el('sub-level').textContent = `第${state.character.subLevel}层`;

    const info = CULT.Combat.getBreakthroughInfo(state);
    const cultivation = state.character.cultivation;
    if (info.isMaxRealm) {
      CULT.UI.el('cultivation-bar').style.width = '100%';
      CULT.UI.el('cultivation-text').textContent = `${CULT.utils.formatNumber(cultivation)} (已达巅峰)`;
    } else {
      const pct = CULT.utils.clamp((cultivation / info.threshold) * 100, 0, 100);
      CULT.UI.el('cultivation-bar').style.width = `${pct}%`;
      CULT.UI.el('cultivation-text').textContent =
        `${CULT.utils.formatNumber(cultivation)} / ${CULT.utils.formatNumber(info.threshold)}`;
    }

    const stats = CULT.Combat.computeStats(state);
    const rate = CULT.Combat.getCultivationPerSecond(state, stats);
    CULT.UI.el('cultivation-rate').textContent = `+${CULT.utils.formatNumber(rate)}/秒`;

    const btn = CULT.UI.el('breakthrough-btn');
    if (info.isMaxRealm) {
      btn.disabled = true;
      btn.textContent = '已达巅峰境界';
    } else if (info.eligible) {
      btn.disabled = false;
      btn.textContent = `突破 (成功率 ${Math.round(info.chance * 100)}%)`;
    } else {
      btn.disabled = true;
      btn.textContent = '突破 (修为不足)';
    }

    CULT.UI.el('hp-text').textContent =
      `${Math.max(0, Math.floor(state.character.hp))} / ${state.character.hpMax}`;
    const hpPct = state.character.hpMax
      ? CULT.utils.clamp((state.character.hp / state.character.hpMax) * 100, 0, 100)
      : 100;
    CULT.UI.el('hp-bar').style.width = `${hpPct}%`;

    const resting = state.character.restTicksRemaining > 0;
    CULT.UI.el('rest-banner').classList.toggle('hidden', !resting);
    if (resting) CULT.UI.el('rest-ticks').textContent = `${state.character.restTicksRemaining}秒`;

    const hasMonster = !!state.combat.currentMonsterId && !resting;
    CULT.UI.el('monster-idle').classList.toggle('hidden', hasMonster || resting);
    CULT.UI.el('monster-panel').classList.toggle('hidden', !hasMonster);
    if (hasMonster) {
      CULT.UI.el('monster-name').textContent = state.combat.currentMonsterName;
      CULT.UI.el('monster-level').textContent = `Lv.${CULT.Data.getMonsterLevel(state, state.combat.currentMonsterTier)}`;
      const badge = CULT.UI.el('monster-tier-badge');
      badge.textContent = { weak: '弱', normal: '普通', elite: '精英', boss: '首领' }[state.combat.currentMonsterTier] || '';
      badge.className = `tier-badge ${state.combat.currentMonsterTier}`;
      CULT.UI.el('monster-hp-text').textContent =
        `${Math.max(0, state.combat.currentMonsterHp)} / ${state.combat.currentMonsterHpMax}`;
      const monsterPct = CULT.utils.clamp(
        (state.combat.currentMonsterHp / state.combat.currentMonsterHpMax) * 100, 0, 100
      );
      CULT.UI.el('monster-hp-bar').style.width = `${monsterPct}%`;

      if (CULT.UI.renderedMonsterId !== state.combat.currentMonsterId) {
        const monsterDef = CULT.MONSTERS.find((m) => m.id === state.combat.currentMonsterId);
        CULT.UI.el('monster-aura-slot').innerHTML = CULT.Icons.monsterAura(
          state.combat.currentMonsterTier,
          monsterDef ? monsterDef.emoji : '?'
        );
        CULT.UI.renderedMonsterId = state.combat.currentMonsterId;
      }
    } else {
      CULT.UI.renderedMonsterId = null;
    }

    const logEl = CULT.UI.el('combat-log');
    logEl.innerHTML = state.combat.log
      .slice(-12)
      .map((entry) => `<div class="${entry.cls || ''}">${entry.text}</div>`)
      .join('');
    logEl.scrollTop = logEl.scrollHeight;
  },

  renderCharacter(state) {
    const stats = CULT.Combat.computeStats(state);
    CULT.UI.el('stat-hp').textContent = CULT.utils.formatNumber(stats.hp);
    CULT.UI.el('stat-atk').textContent = CULT.utils.formatNumber(stats.atk);
    CULT.UI.el('stat-def').textContent = CULT.utils.formatNumber(stats.def);
    CULT.UI.el('stat-spd').textContent = CULT.utils.formatNumber(stats.spd);

    const slotNames = { weapon: '武器', armor: '护甲', accessory: '饰品', boots: '鞋子', gloves: '护手' };
    const container = CULT.UI.el('equipped-slots');
    container.innerHTML = Object.entries(slotNames)
      .map(([slot, label]) => {
        const itemId = state.equipped[slot];
        const item = itemId ? CULT.Data.getEquipment(itemId) : null;
        if (!item) {
          return `<div class="flex items-center gap-3 text-sm">
            <div class="item-icon">${CULT.Icons.slot(slot)}</div>
            <span class="flex-1">${label}</span>
            <span class="text-slate-600">未装备</span>
          </div>`;
        }
        return `<div class="flex items-center gap-3 text-sm">
          <div class="item-icon rarity-${item.rarity}">${CULT.Icons.slot(slot)}</div>
          <div class="flex-1">
            <div>${label}：${item.name}</div>
            <div class="text-xs text-slate-400">${CULT.UI.equipmentBonusText(item)}</div>
          </div>
          <button class="btn-secondary text-xs px-2 py-1" data-unequip-slot="${slot}">卸下</button>
        </div>`;
      })
      .join('');
    container.querySelectorAll('[data-unequip-slot]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.unequipItem(btn.dataset.unequipSlot));
    });

    CULT.UI.el('stat-battles-won').textContent = state.stats.totalBattlesWon;
    CULT.UI.el('stat-breakthroughs').textContent = state.stats.totalBreakthroughs;
    CULT.UI.el('stat-breakthrough-fails').textContent = state.stats.totalBreakthroughFails;
  },

  renderInventory(state) {
    const equipmentEntries = [];
    const consumableEntries = [];
    const materialEntries = [];

    for (const [id, count] of Object.entries(state.inventory)) {
      if (count <= 0) continue;
      if (id.startsWith('eq_')) equipmentEntries.push([id, count]);
      else if (id.startsWith('pill_')) consumableEntries.push([id, count]);
      else if (id.startsWith('fabao_')) continue; // 法宝在专属的"法宝"页面里展示
      else materialEntries.push([id, count]);
    }

    const eqContainer = CULT.UI.el('inventory-equipment');
    CULT.UI.el('inventory-equipment-empty').classList.toggle('hidden', equipmentEntries.length > 0);
    eqContainer.innerHTML = equipmentEntries
      .map(([id, count]) => {
        const item = CULT.Data.getEquipment(id);
        const bonusText = CULT.UI.equipmentBonusText(item);
        const deltaText = CULT.UI.formatDelta(CULT.Combat.getEquipmentDelta(state, id), CULT.UI.STAT_LABELS, false);
        return `<div class="panel rarity-${item.rarity} border flex gap-3 items-center">
          <div class="item-icon rarity-${item.rarity}">${CULT.Icons.slot(item.slot)}</div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-medium">${item.name} ${count > 1 ? `x${count}` : ''}</span>
              <button class="btn-secondary text-xs px-2 py-1" data-equip="${id}">装备</button>
            </div>
            <div class="text-xs text-slate-400 mt-1">${bonusText}</div>
            <div class="text-xs mt-0.5">${deltaText}</div>
          </div>
        </div>`;
      })
      .join('');
    eqContainer.querySelectorAll('[data-equip]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.equipItem(btn.dataset.equip));
    });

    const consContainer = CULT.UI.el('inventory-consumables');
    CULT.UI.el('inventory-consumables-empty').classList.toggle('hidden', consumableEntries.length > 0);
    consContainer.innerHTML = consumableEntries
      .map(([id, count]) => {
        const item = CULT.Data.getConsumable(id);
        return `<div class="flex items-center gap-3 panel">
          <div class="item-icon">${CULT.Icons.pill(item.type)}</div>
          <div class="flex-1">
            <div class="font-medium">${item.name} x${count}</div>
            <div class="text-xs text-slate-400">${item.desc}</div>
          </div>
          <button class="btn-secondary text-xs px-2 py-1" data-use="${id}">使用</button>
        </div>`;
      })
      .join('');
    consContainer.querySelectorAll('[data-use]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.useConsumable(btn.dataset.use));
    });

    const matContainer = CULT.UI.el('inventory-materials');
    CULT.UI.el('inventory-materials-empty').classList.toggle('hidden', materialEntries.length > 0);
    matContainer.innerHTML = materialEntries
      .map(([id, count]) => `<div class="stat-row"><span>${CULT.UI.materialLabel(id)}</span><span>x${count}</span></div>`)
      .join('');
  },

  materialLabel(id) {
    const material = CULT.Data.getMaterial(id);
    return material ? material.name : id;
  },

  STAT_LABELS: { hp: '气血', atk: '攻击', def: '防御', spd: '速度' },
  MULT_STAT_LABELS: { hpMult: '气血', atkMult: '攻击', defMult: '防御', spdMult: '速度' },

  equipmentBonusText(item) {
    return Object.entries(item.bonuses)
      .map(([k, v]) => `${CULT.UI.STAT_LABELS[k] || k}+${v}`)
      .join(' ');
  },

  fabaoBonusText(fabao) {
    return Object.entries(fabao.bonuses)
      .map(([k, v]) => `${CULT.UI.MULT_STAT_LABELS[k] || k}+${Math.round(v * 100)}%`)
      .join(' ');
  },

  // 把属性差值渲染成带颜色的 +/- 片段，isPercent 为 true 时按百分比格式化
  formatDelta(delta, labels, isPercent) {
    return Object.entries(delta)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => {
        const cls = v > 0 ? 'text-emerald-400' : 'text-rose-400';
        const sign = v > 0 ? '+' : '';
        const value = isPercent ? `${sign}${Math.round(v * 100)}%` : `${sign}${v}`;
        return `<span class="${cls}">${labels[k] || k}${value}</span>`;
      })
      .join(' ');
  },

  renderTechniques(state) {
    const container = CULT.UI.el('techniques-list');
    container.innerHTML = CULT.TECHNIQUES.map((tech) => {
      const learned = state.techniques.learned.includes(tech.id);
      const canAfford = state.character.spiritStones >= tech.cost;
      const actionHtml = learned
        ? `<span class="text-xs text-emerald-400">已修习</span>`
        : `<button class="btn-secondary text-xs px-2 py-1" data-learn="${tech.id}" ${canAfford ? '' : 'disabled'}>修习 (${tech.cost}灵石)</button>`;
      return `<div class="flex items-center justify-between panel">
        <div>
          <div class="font-medium">${tech.name}</div>
          <div class="text-xs text-slate-400">${tech.desc}</div>
        </div>
        ${actionHtml}
      </div>`;
    }).join('');
    container.querySelectorAll('[data-learn]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.learnTechnique(btn.dataset.learn));
    });
  },

  renderFabao(state) {
    const categoryLabels = { attack: '攻击', defense: '防御', boost: '增幅' };

    const slotsContainer = CULT.UI.el('fabao-slots');
    slotsContainer.innerHTML = Object.entries(categoryLabels)
      .map(([cat, label]) => {
        const fabaoId = state.equippedFabao[cat];
        const fabao = fabaoId ? CULT.Data.getFabao(fabaoId) : null;
        if (!fabao) {
          return `<div class="flex items-center gap-3 text-sm">
            <div class="item-icon">${CULT.Icons.category(cat)}</div>
            <span class="flex-1">${label}类</span>
            <span class="text-slate-600">未装备</span>
          </div>`;
        }
        return `<div class="flex items-center gap-3 text-sm">
          <div class="item-icon rarity-${fabao.rarity}">${CULT.Icons.category(cat)}</div>
          <div class="flex-1">
            <div>${label}类：${fabao.name}</div>
            <div class="text-xs text-slate-400">${CULT.UI.fabaoBonusText(fabao)}</div>
          </div>
          <button class="btn-secondary text-xs px-2 py-1" data-unequip-fabao="${cat}">卸下</button>
        </div>`;
      })
      .join('');
    slotsContainer.querySelectorAll('[data-unequip-fabao]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.unequipFabao(btn.dataset.unequipFabao));
    });

    const owned = Object.entries(state.inventory).filter(([id, count]) => count > 0 && id.startsWith('fabao_'));
    const invContainer = CULT.UI.el('fabao-inventory');
    CULT.UI.el('fabao-inventory-empty').classList.toggle('hidden', owned.length > 0);
    invContainer.innerHTML = owned
      .map(([id, count]) => {
        const fabao = CULT.Data.getFabao(id);
        const bonusText = CULT.UI.fabaoBonusText(fabao);
        const deltaText = CULT.UI.formatDelta(CULT.Combat.getFabaoDelta(state, id), CULT.UI.MULT_STAT_LABELS, true);
        return `<div class="panel rarity-${fabao.rarity} border flex gap-3 items-center">
          <div class="item-icon rarity-${fabao.rarity}">${CULT.Icons.category(fabao.category)}</div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-medium">${fabao.name} ${count > 1 ? `x${count}` : ''}</span>
              <button class="btn-secondary text-xs px-2 py-1" data-equip-fabao="${id}">装备</button>
            </div>
            <div class="text-xs text-slate-400 mt-1">${bonusText}</div>
            <div class="text-xs mt-0.5">${deltaText}</div>
          </div>
        </div>`;
      })
      .join('');
    invContainer.querySelectorAll('[data-equip-fabao]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.equipFabao(btn.dataset.equipFabao));
    });
  },

  fusionSelection: { sacrificeIds: [], targetId: null }, // UI 本地状态，不写入存档

  renderPetCard(pet) {
    const species = CULT.Data.getPetSpecies(pet.speciesId);
    const stage = CULT.Data.getPetStage(pet.level);
    const quality = CULT.Data.getPetQuality(pet.quality);
    const threshold = CULT.Data.getPetExpThreshold(pet.level);
    const pct = CULT.utils.clamp((pet.exp / threshold) * 100, 0, 100);
    return { species, stage, quality, threshold, pct };
  },

  renderPets(state) {
    // 出战槽位：最多3个，空位显示占位卡
    const slotsContainer = CULT.UI.el('pet-active-slots');
    const activeIds = state.pets.activeIds || [];
    slotsContainer.innerHTML = [0, 1, 2]
      .map((i) => {
        const pet = activeIds[i] ? state.pets.owned.find((p) => p.instanceId === activeIds[i]) : null;
        if (!pet) {
          return `<div class="flex items-center gap-3 text-sm text-slate-600 panel">
            <div class="item-icon">?</div>
            <span class="flex-1">空位</span>
          </div>`;
        }
        const { species, stage, quality, threshold, pct } = CULT.UI.renderPetCard(pet);
        return `<div class="flex gap-3 items-center panel">
          <div class="shrink-0">${CULT.Icons.petAura(stage.id, species ? species.emoji : '?')}</div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-medium">${species ? species.name : pet.speciesId}</span>
              <span class="flex gap-1">
                <span class="tier-badge">${stage.name}</span>
                <span class="tier-badge ${quality.id}">${quality.name}</span>
              </span>
            </div>
            <div class="text-xs text-slate-400 mt-1">Lv.${pet.level}</div>
            <div class="progress-track mt-1">
              <div class="progress-fill bg-gradient-to-r from-purple-500 to-purple-300" style="width:${pct}%"></div>
            </div>
            <div class="text-xs text-slate-500 mt-0.5">${Math.floor(pet.exp)} / ${threshold}</div>
          </div>
          <button class="btn-secondary text-xs px-2 py-1" data-deactivate-pet="${pet.instanceId}">下场</button>
        </div>`;
      })
      .join('');
    slotsContainer.querySelectorAll('[data-deactivate-pet]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.deactivatePet(btn.dataset.deactivatePet));
    });

    // 图鉴列表：出战/下场按钮 + 融合用的勾选/目标选择
    const sel = CULT.UI.fusionSelection;
    // 存档变化后（比如融合执行完）清掉已经不存在的选择，避免残留幽灵 id
    sel.sacrificeIds = sel.sacrificeIds.filter((id) => state.pets.owned.some((p) => p.instanceId === id));
    if (sel.targetId && !state.pets.owned.some((p) => p.instanceId === sel.targetId)) sel.targetId = null;

    const rosterContainer = CULT.UI.el('pets-roster');
    CULT.UI.el('pets-roster-empty').classList.toggle('hidden', state.pets.owned.length > 0);
    rosterContainer.innerHTML = state.pets.owned
      .map((pet) => {
        const { species, stage, quality } = CULT.UI.renderPetCard(pet);
        const isActive = activeIds.includes(pet.instanceId);
        const actionHtml = isActive
          ? `<button class="btn-secondary text-xs px-2 py-1" data-deactivate-pet="${pet.instanceId}">下场</button>`
          : `<button class="btn-secondary text-xs px-2 py-1" data-activate-pet="${pet.instanceId}" ${activeIds.length >= 3 ? 'disabled' : ''}>出战</button>`;
        const isSacrifice = sel.sacrificeIds.includes(pet.instanceId);
        const isTarget = sel.targetId === pet.instanceId;
        return `<div class="panel space-y-1.5">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium">${species ? species.name : pet.speciesId}</span>
              <span class="tier-badge">${stage.name}</span>
              <span class="tier-badge ${quality.id}">${quality.name}</span>
              <span class="text-xs text-slate-400">Lv.${pet.level}</span>
            </div>
            ${actionHtml}
          </div>
          <div class="flex items-center gap-4 text-xs text-slate-400">
            <label class="flex items-center gap-1.5">
              <input type="checkbox" data-fusion-sacrifice="${pet.instanceId}" ${isSacrifice ? 'checked' : ''} ${isActive || isTarget ? 'disabled' : ''} />
              选为材料
            </label>
            <label class="flex items-center gap-1.5">
              <input type="radio" name="fusion-target" data-fusion-target="${pet.instanceId}" ${isTarget ? 'checked' : ''} ${isSacrifice ? 'disabled' : ''} />
              设为目标
            </label>
          </div>
        </div>`;
      })
      .join('');
    rosterContainer.querySelectorAll('[data-activate-pet]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.activatePet(btn.dataset.activatePet));
    });
    rosterContainer.querySelectorAll('[data-deactivate-pet]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.deactivatePet(btn.dataset.deactivatePet));
    });
    rosterContainer.querySelectorAll('[data-fusion-sacrifice]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const id = cb.dataset.fusionSacrifice;
        if (e.target.checked) sel.sacrificeIds.push(id);
        else sel.sacrificeIds = sel.sacrificeIds.filter((x) => x !== id);
        CULT.UI.renderPets(state);
      });
    });
    rosterContainer.querySelectorAll('[data-fusion-target]').forEach((radio) => {
      radio.addEventListener('change', () => {
        sel.targetId = radio.dataset.fusionTarget;
        CULT.UI.renderPets(state);
      });
    });

    // 融合预览与确认按钮
    const sacrificePets = sel.sacrificeIds
      .map((id) => state.pets.owned.find((p) => p.instanceId === id))
      .filter(Boolean);
    const previewExp = sacrificePets.reduce((sum, p) => sum + CULT.Combat.getFusionExpValue(p), 0);
    const canFuse = sacrificePets.length > 0 && !!sel.targetId;
    CULT.UI.el('fusion-preview').textContent = canFuse ? `预计获得经验：${previewExp}` : '';
    const fuseBtn = CULT.UI.el('fusion-confirm-btn');
    fuseBtn.disabled = !canFuse;
  },

  // 根据 id 前缀猜一个展示图标，商店/背包共用
  shopItemIcon(itemId) {
    if (itemId.startsWith('eq_')) return CULT.Icons.slot(CULT.Data.getEquipment(itemId).slot);
    if (itemId.startsWith('fabao_')) return CULT.Icons.category(CULT.Data.getFabao(itemId).category);
    if (itemId.startsWith('pill_')) return CULT.Icons.pill(CULT.Data.getConsumable(itemId).type);
    return CULT.Icons.coin();
  },

  shopItemName(itemId) {
    if (itemId.startsWith('eq_')) return CULT.Data.getEquipment(itemId).name;
    if (itemId.startsWith('fabao_')) return CULT.Data.getFabao(itemId).name;
    if (itemId.startsWith('pill_')) return CULT.Data.getConsumable(itemId).name;
    return CULT.UI.materialLabel(itemId);
  },

  renderShop(state) {
    CULT.UI.el('shop-refresh-btn').textContent = `刷新商店 (${state.shop.refreshCost} 灵石)`;

    const stockContainer = CULT.UI.el('shop-stock');
    stockContainer.innerHTML = state.shop.stock
      .map((entry) => {
        const price = CULT.Data.getShopBuyPrice(entry.itemId);
        const canAfford = state.character.spiritStones >= price && entry.qty > 0;
        return `<div class="panel flex gap-3 items-center">
          <div class="item-icon">${CULT.UI.shopItemIcon(entry.itemId)}</div>
          <div class="flex-1">
            <div class="font-medium">${CULT.UI.shopItemName(entry.itemId)}</div>
            <div class="text-xs text-slate-400">剩余 ${entry.qty} · ${price} 灵石</div>
          </div>
          <button class="btn-secondary text-xs px-2 py-1" data-buy="${entry.itemId}" ${canAfford ? '' : 'disabled'}>购买</button>
        </div>`;
      })
      .join('');
    stockContainer.querySelectorAll('[data-buy]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.buyShopItem(btn.dataset.buy));
    });

    const sellable = Object.entries(state.inventory).filter(
      ([id, count]) => count > 0 && (id.startsWith('eq_') || id.startsWith('fabao_') || id.startsWith('pill_') || id.startsWith('mat_'))
    );
    const sellContainer = CULT.UI.el('shop-sell-list');
    CULT.UI.el('shop-sell-empty').classList.toggle('hidden', sellable.length > 0);
    sellContainer.innerHTML = sellable
      .map(([id, count]) => {
        const price = CULT.Data.getShopSellPrice(id);
        return `<div class="flex items-center justify-between panel">
          <div>
            <div class="font-medium">${CULT.UI.shopItemName(id)} x${count}</div>
            <div class="text-xs text-slate-400">出售单价 ${price} 灵石</div>
          </div>
          <button class="btn-secondary text-xs px-2 py-1" data-sell="${id}">出售</button>
        </div>`;
      })
      .join('');
    sellContainer.querySelectorAll('[data-sell]').forEach((btn) => {
      btn.addEventListener('click', () => CULT.Game.sellItem(btn.dataset.sell, 1));
    });
  },

  renderAlchemy(state) {
    const container = CULT.UI.el('alchemy-recipes');
    container.innerHTML = CULT.RECIPES.map((recipe) => {
      const result = CULT.Data.getConsumable(recipe.resultId);
      const canCraft = Object.entries(recipe.materials).every(([matId, needed]) => (state.inventory[matId] || 0) >= needed);
      const materialsText = Object.entries(recipe.materials)
        .map(([matId, needed]) => {
          const have = state.inventory[matId] || 0;
          const cls = have >= needed ? 'text-slate-400' : 'text-rose-400';
          return `<span class="${cls}">${CULT.UI.materialLabel(matId)} ${have}/${needed}</span>`;
        })
        .join('，');
      return `<div class="panel flex gap-3 items-center">
        <div class="item-icon">${CULT.Icons.pill(result.type)}</div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="font-medium">${recipe.name} → ${result.name}</span>
            <button class="btn-secondary text-xs px-2 py-1" data-craft="${recipe.id}" ${canCraft ? '' : 'disabled'}>炼制</button>
          </div>
          <div class="text-xs mt-1">${materialsText}</div>
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('[data-craft]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const recipe = CULT.Data.getRecipe(btn.dataset.craft);
        if (CULT.Game.craftPotion(recipe.id)) {
          const result = CULT.Data.getConsumable(recipe.resultId);
          CULT.UI.lootQueue.push({ name: result.name, iconHtml: CULT.Icons.pill(result.type), label: '炼丹成功' });
          CULT.UI.maybeShowNextLoot();
        }
      });
    });
  },

  renderElite(state) {
    const cost = CULT.Data.getEliteChallengeCost(state.character.realmId);
    CULT.UI.el('elite-cost-text').textContent = `挑战花费：${cost} 灵石`;
    const busy = !!state.combat.currentMonsterId || state.character.restTicksRemaining > 0;
    const btn = CULT.UI.el('elite-challenge-btn');
    btn.disabled = busy || state.character.spiritStones < cost;
    btn.textContent = busy ? '当前有战斗进行中' : `挑战 (${cost} 灵石)`;
  },

  appendLog(state, text, cls) {
    state.combat.log.push({ text, cls: cls || '' });
    if (state.combat.log.length > 30) state.combat.log.shift();
  },

  onCombatEvent(event) {
    const state = CULT.Game.state;
    if (!event) return;

    if (event.type === 'monster_spawned') {
      CULT.UI.appendLog(state, `你遇到了 ${event.monster.name}！`);
    } else if (event.type === 'round') {
      const petPart = event.petDamage > 0 ? `，出战宠物造成 ${event.petDamage} 点伤害` : '';
      CULT.UI.appendLog(
        state,
        `你对${event.monsterName}造成 ${event.playerDamage} 点伤害${petPart}，${event.monsterName}对你造成 ${event.monsterDamage} 点伤害。`
      );
    } else if (event.type === 'victory') {
      const parts = [`获得 ${Math.floor(event.loot.exp)} 修为`, `${event.loot.stones} 灵石`];
      CULT.UI.appendLog(state, `你击败了${event.monsterName}！${parts.join('，')}。`, 'log-victory');
      for (const eqId of event.loot.equipment) {
        const item = CULT.Data.getEquipment(eqId);
        CULT.UI.appendLog(state, `获得珍稀掉落：${item.name}！`, 'log-victory');
        CULT.UI.lootQueue.push({ name: item.name, iconHtml: CULT.Icons.slot(item.slot), label: '获得珍稀装备' });
      }
      for (const fbId of event.loot.fabao) {
        const fabao = CULT.Data.getFabao(fbId);
        CULT.UI.appendLog(state, `获得法宝：${fabao.name}！`, 'log-victory');
        CULT.UI.lootQueue.push({ name: fabao.name, iconHtml: CULT.Icons.category(fabao.category), label: '获得法宝' });
      }
      for (const pet of event.capturedPets) {
        const species = CULT.Data.getPetSpecies(pet.speciesId);
        CULT.UI.appendLog(state, `捕获了新宠物：${species.name}！`, 'log-victory');
        CULT.UI.lootQueue.push({ name: species.name, iconHtml: `<span style="font-size:2rem">${species.emoji}</span>`, label: '捕获宠物' });
      }
      CULT.UI.maybeShowNextLoot();
    } else if (event.type === 'defeat') {
      CULT.UI.appendLog(state, `你被${event.monsterName}击败，需要闭关疗养。`, 'log-defeat');
    } else if (event.type === 'rest_complete') {
      CULT.UI.appendLog(state, '你恢复了元气，重新踏上历练之路。');
    }
  },

  onBreakthroughResult(result) {
    if (!result || !result.attempted) return;
    const state = CULT.Game.state;
    if (result.success) {
      CULT.UI.appendLog(state, '自动突破成功！', 'log-victory');
    } else {
      CULT.UI.appendLog(state, '自动突破失败，损失了部分修为。', 'log-defeat');
    }
  },

  openBreakthroughModal() {
    const state = CULT.Game.state;
    const info = CULT.Combat.getBreakthroughInfo(state);
    if (!info.eligible) return;

    CULT.UI.el('breakthrough-chance-text').textContent = `成功率：${Math.round(info.chance * 100)}%`;
    CULT.UI.el('breakthrough-card').classList.remove('flipped');
    CULT.UI.el('breakthrough-confirm-btn').classList.remove('hidden');
    CULT.UI.el('breakthrough-close-btn').classList.add('hidden');
    CULT.UI.el('breakthrough-modal').classList.remove('hidden');
  },

  confirmBreakthrough() {
    const result = CULT.Game.attemptBreakthrough();
    if (!result.attempted) return;

    const face = CULT.UI.el('breakthrough-result-face');
    const text = CULT.UI.el('breakthrough-result-text');
    face.className = `card-back flex items-center justify-center relative overflow-hidden ${result.success ? 'success' : 'fail'}`;
    text.textContent = result.success ? '突破成功！' : '突破失败';

    CULT.UI.el('breakthrough-card').classList.add('flipped');
    CULT.UI.el('breakthrough-confirm-btn').classList.add('hidden');
    CULT.UI.el('breakthrough-close-btn').classList.remove('hidden');

    if (result.success) {
      setTimeout(() => CULT.UI.spawnParticles('breakthrough-particles'), 600);
    }
  },

  spawnParticles(containerId) {
    const container = CULT.UI.el(containerId);
    if (!container) return;
    container.innerHTML = '';
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 40 + Math.random() * 30;
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.style.setProperty('--px', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--py', `${Math.sin(angle) * distance}px`);
      particle.style.animationDelay = `${Math.random() * 0.15}s`;
      container.appendChild(particle);
    }
  },

  closeBreakthroughModal() {
    CULT.UI.el('breakthrough-modal').classList.add('hidden');
  },

  maybeShowNextLoot() {
    if (CULT.UI.lootModalOpen || CULT.UI.lootQueue.length === 0) return;
    const entry = CULT.UI.lootQueue.shift();
    CULT.UI.el('loot-modal-title').textContent = entry.label || '珍稀掉落';
    CULT.UI.el('loot-item-name').textContent = entry.name;
    CULT.UI.el('loot-item-icon').innerHTML = entry.iconHtml;
    CULT.UI.el('loot-modal').classList.remove('hidden');
    CULT.UI.lootModalOpen = true;
  },

  closeLootModal() {
    CULT.UI.el('loot-modal').classList.add('hidden');
    CULT.UI.lootModalOpen = false;
    CULT.UI.maybeShowNextLoot();
  },

  showOfflineSummary(progress) {
    CULT.UI.el('offline-duration').textContent = CULT.utils.formatDuration(progress.elapsedMs);
    CULT.UI.el('offline-cultivation').textContent = CULT.utils.formatNumber(progress.cultivationGained);
    CULT.UI.el('offline-stones').textContent = CULT.utils.formatNumber(progress.stonesGained);
    CULT.UI.el('offline-kills').textContent = progress.estimatedKills;
    CULT.UI.el('offline-fabao').textContent = progress.fabaoCount || 0;
    CULT.UI.el('offline-pets').textContent = progress.petsCaptured || 0;
    CULT.UI.el('offline-breakthroughs').textContent = progress.breakthroughsDuringOffline || 0;
    CULT.UI.el('offline-modal').classList.remove('hidden');
  },

  closeOfflineModal() {
    CULT.UI.el('offline-modal').classList.add('hidden');
  },

  handleExport() {
    const json = CULT.Game.exportSave();
    const box = CULT.UI.el('export-save-box');
    box.value = json;
    box.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).catch(() => {});
    } else {
      try { document.execCommand('copy'); } catch (e) { /* 静默失败，文本已在文本框中可手动复制 */ }
    }
  },

  handleImport() {
    const text = CULT.UI.el('import-save-box').value.trim();
    if (!text) return;
    if (!confirm('导入存档将覆盖当前进度，确定继续吗？')) return;
    try {
      CULT.Game.importSave(text);
      alert('导入成功！');
    } catch (e) {
      alert('导入失败：存档内容不是有效的 JSON。');
    }
  },

  handleReset() {
    if (!confirm('确定要重置存档吗？此操作不可恢复。')) return;
    CULT.Game.resetSave();
  },
};
