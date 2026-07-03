/**
 * VirtualControls - scene-driven touch button overlay.
 *
 * Replaces the old static createVirtualUI() + setupMobileControls(). Instead of
 * building one fixed overlay at game start, each scene DECLARES which controls
 * it wants (see Scene.virtualControls). On every scene transition the game calls
 * applyLayout() with the active scene's declaration, and the overlay is rebuilt
 * to match. The overlay is therefore a pure function of "what's on top of the
 * scene stack" — it can't drift out of sync.
 *
 * Declaration model — REPLACE + PRESETS:
 *   - A scene declares the full set it wants; the overlay renders exactly that.
 *   - Declaring nothing (undefined) => the full default overlay.
 *   - Omitting a preset IS how you remove it (no explicit "remove").
 *   - Adding an extra is just listing a custom button (no explicit "add").
 *
 * Buttons use the STICKY virtual-key path (pressVirtualKey / releaseVirtualKey),
 * so holding a d-pad button produces continuous input until the finger lifts.
 *
 * The overlay lives in the DOM (not the canvas / uiRegistry) on purpose: the DOM
 * is the lowest layer both the canvas game and a future React UI can share, so
 * the same control system can serve both.
 */

import type { InputManager } from '.';
import styles from './mobileControls.module.css';

/** Named bundles of standard buttons. */
export type VirtualPreset = 'dpad' | 'ab' | 'utility' | 'numbers';

/** A one-off button a scene can add on top of (or instead of) presets. */
export interface VirtualButtonSpec {
  /** Unique DOM id. */
  id: string;
  /** Visible label. */
  label: string;
  /** Key name passed to pressVirtualKey, e.g. 'ArrowUp', 'KeyZ', 'Digit1'. */
  key: string;
  /** Optional extra class key from mobileControls.module.css. */
  className?: string;
}

/** A scene declares an array of these. A string picks a preset; an object adds a custom button. */
export type VirtualControlSpec = VirtualPreset | VirtualButtonSpec;

const cssKey = (k: string): string => (styles as Record<string, string>)[k] ?? '';

const PRESET_BUTTONS: Record<VirtualPreset, VirtualButtonSpec[]> = {
  dpad: [
    { id: 'v-up', label: '▲', key: 'ArrowUp', className: 'vUp' },
    { id: 'v-left', label: '◀', key: 'ArrowLeft', className: 'vLeft' },
    { id: 'v-right', label: '▶', key: 'ArrowRight', className: 'vRight' },
    { id: 'v-down', label: '▼', key: 'ArrowDown', className: 'vDown' },
  ],
  ab: [
    { id: 'v-b', label: 'B', key: 'KeyX' },
    { id: 'v-a', label: 'A', key: 'KeyZ' },
  ],
  utility: [
    { id: 'v-esc', label: 'ESC', key: 'Escape' },
    { id: 'v-space', label: 'SPACE', key: 'Space' },
    { id: 'v-enter', label: 'ENTER', key: 'Enter' },
  ],
  numbers: [
    { id: 'v-num1', label: '1', key: 'Digit1' },
    { id: 'v-num2', label: '2', key: 'Digit2' },
    { id: 'v-num3', label: '3', key: 'Digit3' },
    { id: 'v-num4', label: '4', key: 'Digit4' },
    { id: 'v-num5', label: '5', key: 'Digit5' },
  ],
};

const ALL_PRESETS: VirtualPreset[] = ['dpad', 'ab', 'utility', 'numbers'];

export function createVirtualControls(input: InputManager, container: HTMLElement) {
  const overlay = document.createElement('div');
  overlay.className = cssKey('gameTouchOverlay');
  container.appendChild(overlay);

  /** Attach press(hold)/release listeners for one button. */
  function wire(el: HTMLElement, key: string): void {
    const press = (e: Event) => {
      e.preventDefault();
      input.pressVirtualKey(key); // STICKY: stays down until release
      if (key.startsWith('Digit')) {
        // Keep the numeric hotkey buffer in sync, as the old code did.
        input.injectNumberBuffer?.(key.replace('Digit', ''));
      }
    };
    const release = (e: Event) => {
      e.preventDefault();
      input.releaseVirtualKey(key);
    };

    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release); // release if pointer slides off while held
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release);
  }

  function button(spec: VirtualButtonSpec, classKeys: string[]): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = spec.id;
    btn.textContent = spec.label;
    btn.className = classKeys.map(cssKey).filter(Boolean).join(' ');
    wire(btn, spec.key);
    return btn;
  }

  /**
   * Rebuild the overlay to match the given declaration.
   * Pass undefined for the full default overlay.
   *
   * Rebuilding drops the previous button nodes (and their listeners) wholesale,
   * so there's nothing to manually tear down between layouts.
   */
  function applyLayout(specs?: VirtualControlSpec[]): void {
    overlay.replaceChildren();

    const presets = new Set<VirtualPreset>();
    const custom: VirtualButtonSpec[] = [];

    if (specs === undefined) {
      ALL_PRESETS.forEach((p) => presets.add(p));
    } else {
      for (const s of specs) {
        if (typeof s === 'string') presets.add(s);
        else custom.push(s);
      }
    }

    // D-pad group
    if (presets.has('dpad')) {
      const dpad = document.createElement('div');
      dpad.className = cssKey('virtualDpad');
      dpad.setAttribute('dir', 'ltr');
      for (const b of PRESET_BUTTONS.dpad) {
        dpad.appendChild(button(b, ['ctrlBtn', b.className!]));
      }
      overlay.appendChild(dpad);
    }

    // Actions group: utility buttons + custom extras + A/B group
    if (presets.has('utility') || presets.has('ab') || custom.length > 0) {
      const actions = document.createElement('div');
      actions.className = cssKey('virtualActions');
      actions.setAttribute('dir', 'ltr');

      if (presets.has('utility')) {
        for (const b of PRESET_BUTTONS.utility) {
          actions.appendChild(button(b, ['ctrlBtn', 'utilityBtn']));
        }
      }

      for (const b of custom) {
        actions.appendChild(button(b, b.className ? ['ctrlBtn', b.className] : ['ctrlBtn']));
      }

      if (presets.has('ab')) {
        const group = document.createElement('div');
        group.className = cssKey('gbaActionGroup');
        for (const b of PRESET_BUTTONS.ab) {
          group.appendChild(button(b, ['ctrlBtn']));
        }
        actions.appendChild(group);
      }

      overlay.appendChild(actions);
    }

    // Number hotkeys
    if (presets.has('numbers')) {
      const nums = document.createElement('div');
      nums.className = cssKey('virtualMenuHotkeys');
      for (const b of PRESET_BUTTONS.numbers) {
        nums.appendChild(button(b, ['numBtn']));
      }
      overlay.appendChild(nums);
    }
  }

  // Start with the full default overlay until the first scene transition applies its own.
  applyLayout();

  return {
    applyLayout,
    destroy(): void {
      overlay.remove();
    },
  };
}

export type VirtualControls = ReturnType<typeof createVirtualControls>;

// Full default overlay — declare nothing:
// (no virtualControls field on the scene)

// Overworld: movement + confirm, no number row:
// virtualControls: ['dpad', 'ab'],

// Battle: numbers + confirm + a custom "Run" button:
// virtualControls: ['numbers', 'ab', { id: 'v-run', label: 'RUN', key: 'KeyR' }],
