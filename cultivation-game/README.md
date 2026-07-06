# 灵墟问道 — 修仙挂机游戏

一个纯前端、无需构建工具的放置类修仙游戏。直接用浏览器打开 `index.html` 即可游玩，也可以用任意静态文件服务器托管（如 `python3 -m http.server`）。

## 文件结构

```
index.html          入口页面：Tailwind CDN、字体、各屏幕的 HTML 结构
css/style.css        进度条、翻牌弹窗、滚动条等自定义样式
js/namespace.js       全局命名空间 CULT 与通用工具函数
js/data.js            所有数值表：境界、怪物、装备、丹药、功法、可调参数 CULT.TUNING
js/state.js           存档结构、读写、版本迁移、导出/导入
js/combat.js          属性计算、怪物生成、战斗结算、突破逻辑
js/offline.js         离线收益的估算与结算（用均值近似，避免逐秒模拟）
js/game.js            每秒一次的挂机主循环，以及装备/使用道具/突破等操作入口
js/ui.js              所有屏幕渲染、弹窗交互
js/main.js            启动流程：读档 -> 离线结算 -> 渲染 -> 开始主循环
```

## 调数值

所有可调数值都集中在 `js/data.js`：

- `CULT.REALMS`：境界名称、小层数、修为阈值曲线（`baseExpToNext` / `growth`）
- `CULT.TUNING`：修炼速度、突破成功率、失败惩罚、怪物难度系数、离线收益上限与效率等
- `CULT.MONSTERS` / `CULT.EQUIPMENT` / `CULT.CONSUMABLES` / `CULT.TECHNIQUES`：怪物、装备、丹药、功法的具体数值

调整这些数字不需要碰任何逻辑文件。

## 存档

- 自动存档：每 10 秒一次，以及每次手动操作（装备、使用道具、突破）后立即存档
- 存档位置：`localStorage['cultivation_game_save_v1']`
- 设置页支持手动导出/导入 JSON 存档（复制/粘贴），以及重置存档

## v1 范围之外（未来可做）

- 多角色 / 多存档槽位
- 完整的经济系统模拟、转生/渡劫重开机制
- PvP 或排行榜（目前没有后端，纯本地单机）
