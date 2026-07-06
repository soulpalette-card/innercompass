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

  monsterAura(tier, emoji) {
    const ringColors = {
      weak: '#94a3b8',
      normal: '#60a5fa',
      elite: '#c084fc',
      boss: '#f87171',
    };
    const color = ringColors[tier] || '#94a3b8';
    return `
      <div class="monster-aura tier-aura-${tier}" style="--aura-color:${color}">
        <svg viewBox="0 0 100 100" class="aura-ring">
          <circle cx="50" cy="50" r="44" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>
          <circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="1" opacity="0.3" stroke-dasharray="4 5"/>
        </svg>
        <span class="monster-emoji">${emoji}</span>
      </div>
    `;
  },
};
