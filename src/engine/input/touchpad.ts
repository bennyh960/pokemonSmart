import type { InputManager } from '.';
import styles from './mobileControls.module.css';

export function setupMobileControls(input: InputManager) {
  const mapping = [
    { id: 'v-up', key: 'ArrowUp' },
    { id: 'v-down', key: 'ArrowDown' },
    { id: 'v-left', key: 'ArrowLeft' },
    { id: 'v-right', key: 'ArrowRight' },
    { id: 'v-a', key: 'KeyZ' }, // Maps directly back to your KEY_TO_CODE mappings
    { id: 'v-b', key: 'KeyX' },
    { id: 'v-space', key: 'Space' },
    { id: 'v-enter', key: 'Enter' },
    { id: 'v-esc', key: 'Escape' },

    // Battle / Menu Hotkey selections (1 to 5 mappings)
    { id: 'v-num1', key: 'Digit1' },
    { id: 'v-num2', key: 'Digit2' },
    { id: 'v-num3', key: 'Digit3' },
    { id: 'v-num4', key: 'Digit4' },
    { id: 'v-num5', key: 'Digit5' },
  ];

  mapping.forEach(({ id, key }) => {
    const element = document.getElementById(id);
    if (!element) return;

    const handlePress = (e: Event) => {
      e.preventDefault();
      input.pressVirtualKey(key);

      // CRITICAL FIX: If it's a number key, also append it to the InputManager's internal number buffer!
      if (key.startsWith('Digit')) {
        const digitChar = key.replace('Digit', '');
        // We use an internal access trick or add a public method to the manager
        // to directly push characters to your existing manager's text/number buffers
        input.injectNumberBuffer?.(digitChar);
      }
    };

    const handleRelease = (e: Event) => {
      e.preventDefault();
      input.releaseVirtualKey(key);
    };

    element.addEventListener('mousedown', handlePress);
    element.addEventListener('mouseup', handleRelease);
    element.addEventListener('mouseleave', handleRelease);
    element.addEventListener('touchstart', handlePress, { passive: false });
    element.addEventListener('touchend', handleRelease);
  });
}

export function createVirtualUI() {
  // 2. Inject Virtual UI Container directly into DOM
  const uiOverlay = document.createElement('div');
  uiOverlay.className = styles.gameTouchOverlay;
  uiOverlay.innerHTML = `
    <div class="${styles.virtualDpad}" dir="ltr">
      <button id="v-up" class="${styles.ctrlBtn} ${styles.vUp}">▲</button>
      <button id="v-left" class="${styles.ctrlBtn} ${styles.vLeft}">◀</button>
      <button id="v-right" class="${styles.ctrlBtn} ${styles.vRight}">▶</button>
      <button id="v-down" class="${styles.ctrlBtn} ${styles.vDown}">▼</button>
    </div>

    <div class="${styles.virtualActions}" dir="ltr">
      <button id="v-esc" class="${styles.ctrlBtn} ${styles.utilityBtn}">ESC</button>
      <button id="v-space" class="${styles.ctrlBtn} ${styles.utilityBtn}">SPACE</button>
      <button id="v-enter" class="${styles.ctrlBtn} ${styles.utilityBtn}">ENTER</button>
      <div class="${styles.gbaActionGroup}">
        <button id="v-b" class="${styles.ctrlBtn}">B</button>
        <button id="v-a" class="${styles.ctrlBtn}">A</button>
      </div>
    </div>

    <div class="${styles.virtualMenuHotkeys}">
      <button id="v-num1" class="${styles.numBtn}">1</button>
      <button id="v-num2" class="${styles.numBtn}">2</button>
      <button id="v-num3" class="${styles.numBtn}">3</button>
      <button id="v-num4" class="${styles.numBtn}">4</button>
      <button id="v-num5" class="${styles.numBtn}">5</button>
    </div>
  `;
  return uiOverlay;
}

//
