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
      const badge = CULT.UI.el('monster-tier-badge');
      badge.textContent = { weak: '弱', normal: '普通', elite: '精英', boss: '首领' }[state.combat.currentMonsterTier] || '';
      badge.className = `tier-badge ${state.combat.currentMonsterTier}`;
      CULT.UI.el('monster-hp-text').textContent =
        `${Math.max(0, state.combat.currentMonsterHp)} / ${state.combat.currentMonsterHpMax}`;
      const monsterPct = CULT.utils.clamp(
        (state.combat.currentMonsterHp / state.combat.currentMonsterHpMax) * 100, 0, 100
      );
      CULT.UI.el('monster-hp-bar').style.width = `${monsterPct}%`;
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

    const slotNames = { weapon: '武器', armor: '护甲', accessory: '饰品' };
    const container = CULT.UI.el('equipped-slots');
    container.innerHTML = Object.entries(slotNames)
      .map(([slot, label]) => {
        const itemId = state.equipped[slot];
        const item = itemId ? CULT.Data.getEquipment(itemId) : null;
        if (!item) {
          return `<div class="stat-row"><span>${label}</span><span class="text-slate-600">未装备</span></div>`;
        }
        return `<div class="flex items-center justify-between text-sm">
          <span>${label}：${item.name}</span>
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
      else materialEntries.push([id, count]);
    }

    const eqContainer = CULT.UI.el('inventory-equipment');
    CULT.UI.el('inventory-equipment-empty').classList.toggle('hidden', equipmentEntries.length > 0);
    eqContainer.innerHTML = equipmentEntries
      .map(([id, count]) => {
        const item = CULT.Data.getEquipment(id);
        const bonusText = Object.entries(item.bonuses)
          .map(([k, v]) => `${{ hp: '气血', atk: '攻击', def: '防御', spd: '速度' }[k]}+${v}`)
          .join(' ');
        return `<div class="panel rarity-${item.rarity} border">
          <div class="flex items-center justify-between">
            <span class="font-medium">${item.name} ${count > 1 ? `x${count}` : ''}</span>
            <button class="btn-secondary text-xs px-2 py-1" data-equip="${id}">装备</button>
          </div>
          <div class="text-xs text-slate-400 mt-1">${bonusText}</div>
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
        return `<div class="flex items-center justify-between panel">
          <div>
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
    const labels = {
      mat_slime_core: '史莱姆核心',
      mat_wolf_fang: '妖狼獠牙',
      mat_boar_hide: '野猪硬皮',
      mat_fox_bead: '妖狐内丹',
      mat_demon_core: '魔君精魄',
      mat_crane_feather: '仙鹤羽毛',
      mat_python_scale: '蛟蟒鳞片',
      mat_phantom_dust: '虚影灵尘',
    };
    return labels[id] || id;
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
      CULT.UI.appendLog(
        state,
        `你对${event.monsterName}造成 ${event.playerDamage} 点伤害，${event.monsterName}对你造成 ${event.monsterDamage} 点伤害。`
      );
    } else if (event.type === 'victory') {
      const parts = [`获得 ${Math.floor(event.loot.exp)} 修为`, `${event.loot.stones} 灵石`];
      CULT.UI.appendLog(state, `你击败了${event.monsterName}！${parts.join('，')}。`, 'log-victory');
      for (const eqId of event.loot.equipment) {
        const item = CULT.Data.getEquipment(eqId);
        CULT.UI.appendLog(state, `获得珍稀掉落：${item.name}！`, 'log-victory');
        CULT.UI.lootQueue.push(item.name);
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
    face.className = `card-back flex items-center justify-center ${result.success ? 'success' : 'fail'}`;
    text.textContent = result.success ? '突破成功！' : '突破失败';

    CULT.UI.el('breakthrough-card').classList.add('flipped');
    CULT.UI.el('breakthrough-confirm-btn').classList.add('hidden');
    CULT.UI.el('breakthrough-close-btn').classList.remove('hidden');
  },

  closeBreakthroughModal() {
    CULT.UI.el('breakthrough-modal').classList.add('hidden');
  },

  maybeShowNextLoot() {
    if (CULT.UI.lootModalOpen || CULT.UI.lootQueue.length === 0) return;
    const name = CULT.UI.lootQueue.shift();
    CULT.UI.el('loot-item-name').textContent = name;
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
