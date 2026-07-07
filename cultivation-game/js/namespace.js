window.CULT = window.CULT || {};

CULT.utils = {
  now() {
    return Date.now();
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  randRange(min, max) {
    return min + Math.random() * (max - min);
  },

  randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  },

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  weightedPick(items, weightFn) {
    const weights = items.map(weightFn);
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  },

  formatNumber(n) {
    if (!isFinite(n)) return '0';
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n < 10000) return sign + Math.floor(n).toLocaleString('zh-CN');
    const units = ['万', '亿', '兆'];
    let value = n;
    let unitIndex = -1;
    while (value >= 10000 && unitIndex < units.length - 1) {
      value /= 10000;
      unitIndex++;
    }
    const decimals = value < 10 ? 2 : value < 100 ? 1 : 0;
    return sign + value.toFixed(decimals) + units[unitIndex];
  },

  // 本地日历日期字符串（不用 toISOString，因为那是 UTC，跟玩家本地的"今天"对不上）
  todayDateString(d) {
    const dt = d || new Date();
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}小时${m}分钟`;
    if (m > 0) return `${m}分钟${s}秒`;
    return `${s}秒`;
  },

  deepMerge(defaults, override) {
    if (Array.isArray(defaults)) {
      return override !== undefined ? override : defaults;
    }
    if (typeof defaults !== 'object' || defaults === null) {
      return override !== undefined ? override : defaults;
    }
    const result = {};
    for (const key of Object.keys(defaults)) {
      if (override && Object.prototype.hasOwnProperty.call(override, key)) {
        result[key] = CULT.utils.deepMerge(defaults[key], override[key]);
      } else {
        result[key] = defaults[key];
      }
    }
    if (override && typeof override === 'object') {
      for (const key of Object.keys(override)) {
        if (!Object.prototype.hasOwnProperty.call(result, key)) {
          result[key] = override[key];
        }
      }
    }
    return result;
  },
};
