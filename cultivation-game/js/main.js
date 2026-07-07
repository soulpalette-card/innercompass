document.addEventListener('DOMContentLoaded', () => {
  CULT.UI.init();

  const { state, corrupted } = CULT.State.load();
  CULT.Game.init(state);

  const progress = CULT.Offline.computeProgress(state, CULT.utils.now());
  CULT.Offline.applyProgress(state, progress);
  CULT.State.save(state);

  CULT.UI.refresh(state);

  if (corrupted) {
    alert('检测到旧存档已损坏，已为你重新开始。原存档已备份在浏览器本地存储中。');
  } else if (progress.shouldShow) {
    CULT.UI.showOfflineSummary(progress);
  }

  CULT.Game.start();
});
