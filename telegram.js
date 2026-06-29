const tg = window.Telegram.WebApp;

window.addEventListener('DOMContentLoaded', () => {
  if (!tg) return;

  tg.expand();
  tg.MainButton.setText('Начать игру');
  tg.MainButton.show();

  tg.MainButton.onClick(() => {
    tg.MainButton.hide();
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
    }
    window.dispatchEvent(new Event('telegramStart'));
  });
});
