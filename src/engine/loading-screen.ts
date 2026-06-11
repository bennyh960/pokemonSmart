let screenEl: HTMLElement | null = null;
let barFillEl: HTMLElement | null = null;
let labelEl: HTMLElement | null = null;
let _progress = 0;

export function initLoadingScreen(): void {
  screenEl = document.getElementById('loading-screen');
  barFillEl = document.getElementById('loading-bar-fill');
  labelEl = document.getElementById('loading-label');
  _progress = 0;
  // לא צריך פה כלום בשביל ה-Hint, הכל כבר קרה ב-HTML!
}

/** Monotonically advances the progress bar. fraction is 0–1. */
export function setLoadingProgress(fraction: number, label?: string): void {
  _progress = Math.max(_progress, Math.min(1, fraction));
  if (barFillEl) barFillEl.style.width = `${Math.round(_progress * 100)}%`;
  if (labelEl && label) labelEl.textContent = label;
}

export function hideLoadingScreen(): Promise<void> {
  return new Promise((resolve) => {
    setLoadingProgress(1);
    if (!screenEl) {
      resolve();
      return;
    }
    screenEl.style.transition = 'opacity 0.35s ease-out';
    screenEl.style.opacity = '0';
    setTimeout(() => {
      if (screenEl) screenEl.style.display = 'none';
      resolve();
    }, 350);
  });
}
