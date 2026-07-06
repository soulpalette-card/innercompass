// 纯 SVG/CSS 图标集，不依赖任何位图素材。所有函数返回可直接插入 DOM 的 SVG 字符串。
CULT.Icons = {
  slot(slotName, extraClass) {
    const paths = {
      weapon: `
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8.5 15h7l1 2.2-1 1.3h-7l-1-1.3z" fill="currentColor"/>
        <rect x="10.7" y="17" width="2.6" height="4" rx="0.6" fill="currentColor"/>
        <path d="M12 3l-2 2.5M12 3l2 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      `,
      armor: `
        <path d="M12 2.5l7 2.6v5.6c0 5-3 8.4-7 10.3-4-1.9-7-5.3-7-10.3V5.1z"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M12 6.5v11.6M8.7 9h6.6" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>
      `,
      accessory: `
        <circle cx="12" cy="14" r="5.2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M9.3 9.5L12 3.5l2.7 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M12 3.5l-1.6 3.4h3.2z" fill="currentColor"/>
      `,
      boots: `
        <path d="M9 3v8.5l-4.3 3.6c-.6.5-.2 1.4.5 1.4H19c.6 0 1-.4 1-1v-2.8c0-.5-.3-.9-.8-1L14 10.5V3z"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M9 3h5" stroke="currentColor" stroke-width="1.5"/>
      `,
      gloves: `
        <path d="M7 11V6a1.4 1.4 0 0 1 2.8 0v3.5M9.8 9.2V5a1.4 1.4 0 0 1 2.8 0v4M12.6 9V5.6a1.4 1.4 0 0 1 2.8 0V10M15.4 10.3V7.6a1.3 1.3 0 0 1 2.6 0v6.4c0 3-2 5.5-5 5.5h-1c-2.6 0-4.7-1.6-5.6-4L6 12.5"
          fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      `,
    };
    return `<svg viewBox="0 0 24 24" class="icon-svg ${extraClass || ''}" fill="none">${paths[slotName] || ''}</svg>`;
  },

  pill(type) {
    const colors = {
      exp_boost: '#f59e0b',
      breakthrough_boost: '#a855f7',
      heal: '#f43f5e',
    };
    const color = colors[type] || '#94a3b8';
    return `
      <svg viewBox="0 0 24 24" class="icon-svg">
        <g transform="rotate(-40 12 12)">
          <path d="M7 9a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0z" fill="none" stroke="${color}" stroke-width="1.8"/>
          <path d="M7.3 12h9.4" stroke="${color}" stroke-width="1.8"/>
          <path d="M7 9a5 5 0 0 1 10 0v3H7z" fill="${color}" opacity="0.55"/>
        </g>
      </svg>
    `;
  },

  taiji(extraClass) {
    return `
      <svg viewBox="0 0 24 24" class="icon-svg ${extraClass || ''}">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1"/>
        <path d="M12 2a10 10 0 0 1 0 20 5 5 0 0 1 0-10 5 5 0 0 0 0-10z" fill="currentColor"/>
        <circle cx="12" cy="7" r="1.4" fill="#0b1020"/>
        <circle cx="12" cy="17" r="1.4" fill="currentColor"/>
      </svg>
    `;
  },

  sparkle() {
    return `
      <svg viewBox="0 0 24 24" class="icon-svg">
        <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="currentColor"/>
      </svg>
    `;
  },

  // 内部共用：画一圈发光旋转的光环，中间放一个 emoji
  _auraRing(color, emoji, wrapperClass) {
    return `
      <div class="monster-aura ${wrapperClass || ''}" style="--aura-color:${color}">
        <svg viewBox="0 0 100 100" class="aura-ring">
          <circle cx="50" cy="50" r="44" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>
          <circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="1" opacity="0.3" stroke-dasharray="4 5"/>
        </svg>
        <span class="monster-emoji">${emoji}</span>
      </div>
    `;
  },

  monsterAura(tier, emoji) {
    const ringColors = {
      weak: '#94a3b8',
      normal: '#60a5fa',
      elite: '#c084fc',
      boss: '#f87171',
    };
    const color = ringColors[tier] || '#94a3b8';
    return CULT.Icons._auraRing(color, emoji, `tier-aura-${tier}`);
  },

  petAura(stageId, emoji) {
    const ringColors = {
      0: '#94a3b8', // 妖兽
      1: '#60a5fa', // 魔兽
      2: '#c084fc', // 邪兽
      3: '#fbbf24', // 圣兽
      4: '#f87171', // 神兽
    };
    const color = ringColors[stageId] != null ? ringColors[stageId] : '#94a3b8';
    return CULT.Icons._auraRing(color, emoji, `stage-aura-${stageId}`);
  },

  coin(extraClass) {
    return `
      <svg viewBox="0 0 24 24" class="icon-svg ${extraClass || ''}">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M12 7v10M9.5 9.5c0-1.4 1.1-2 2.5-2s2.5.7 2.5 1.8c0 2.4-5 1.7-5 4.1 0 1.1 1.1 1.8 2.5 1.8s2.5-.6 2.5-2"
          fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
    `;
  },

  cauldron(extraClass) {
    return `
      <svg viewBox="0 0 24 24" class="icon-svg ${extraClass || ''}">
        <path d="M4 10h16l-1.5 7a3 3 0 0 1-3 2.5H8.5a3 3 0 0 1-3-2.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M2 8.5c1.5-1.5 3-2 4-.5M9 8c1-2 1.5-3.5 3-4M15 8c1-1.8 2.5-2 4-.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        <ellipse cx="12" cy="10" rx="8" ry="1.4" fill="currentColor" opacity="0.5"/>
      </svg>
    `;
  },

  swords(extraClass) {
    return `
      <svg viewBox="0 0 24 24" class="icon-svg ${extraClass || ''}">
        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 4l3 .5.5 3M20 4l-3 .5-.5 3M4 20l3-.5.5-3M20 20l-3-.5-.5-3" fill="none" stroke="currentColor" stroke-width="1.3"/>
      </svg>
    `;
  },

  category(cat, extraClass) {
    const paths = {
      attack: `
        <path d="M13 2L7 13h4l-1 9 7-12h-4z" fill="currentColor"/>
      `,
      defense: `
        <path d="M12 2.5l7 2.6v5.6c0 5-3 8.4-7 10.3-4-1.9-7-5.3-7-10.3V5.1z"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M12 8v7M8.7 11.5h6.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      `,
      boost: `
        <path d="M12 3l3 4h-2v6h-2V7H9z" fill="currentColor"/>
        <path d="M6 15l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      `,
    };
    return `<svg viewBox="0 0 24 24" class="icon-svg ${extraClass || ''}" fill="none">${paths[cat] || ''}</svg>`;
  },
};
