/**
 * VirtualControls - scene-driven touch button overlay.
 *
 * Declaration model - REPLACE + PRESETS, with a new DEFAULT:
 *   - Declaring nothing (undefined) => DEFAULT_PRESETS only: dpad + utility.
 *     (NOT numbers, NOT custom buttons - those must be requested explicitly.)
 *   - A scene declares the full set it wants beyond default; the overlay
 *     renders exactly that (still replace, not additive-by-default).
 *   - 'numbers'  -> all five number buttons.
 *   - 'v-num1'   -> just that one button (any preset button's id works this
 *                   way, e.g. 'v-up' alone for a partial d-pad).
 *   - { id, label, key } -> a custom button (e.g. scene-labeled "Bag"/"A"/"B").
 *     Custom buttons always render in the bottom-right actions column.
 *
 * Buttons use the STICKY virtual-key path (pressVirtualKey / releaseVirtualKey),
 * so holding a d-pad button produces continuous input until the finger lifts.
 */

import type { InputManager } from '.';
import styles from './mobileControls.module.css';

/** Named bundles of standard buttons. 'ab' is gone - action buttons are always custom now. */
export type VirtualPreset = 'dpad' | 'utility' | 'numbers';

/** A one-off button a scene declares (e.g. "Bag", "A", "B") - own label + key. */
export interface VirtualButtonSpec {
  id: string;
  label: string;
  key: string;
  className?: string;
}

/**
 * A scene declares an array of these:
 *   - a VirtualPreset string   -> the whole named group
 *   - any other string         -> one specific button id from a preset group
 *   - a VirtualButtonSpec obj  -> a custom action button
 */
export type VirtualControlSpec = VirtualPreset | string | VirtualButtonSpec;

const cssKey = (k: string): string => (styles as Record<string, string>)[k] ?? '';

const PRESET_BUTTONS: Record<VirtualPreset, VirtualButtonSpec[]> = {
  dpad: [
    { id: 'v-up', label: '▲', key: 'ArrowUp', className: 'vUp' },
    { id: 'v-left', label: '◀', key: 'ArrowLeft', className: 'vLeft' },
    { id: 'v-right', label: '▶', key: 'ArrowRight', className: 'vRight' },
    { id: 'v-down', label: '▼', key: 'ArrowDown', className: 'vDown' },
  ],
  utility: [
    { id: 'v-esc', label: 'ESC', key: 'Escape', className: 'vEsc' },
    { id: 'v-enter', label: '⏎ ENTER', key: 'Enter', className: 'vEnter' },
    { id: 'v-space', label: 'SPACE', key: 'Space', className: 'vSpace' },
  ],
  numbers: [
    { id: 'v-num1', label: '1', key: 'Digit1' },
    { id: 'v-num2', label: '2', key: 'Digit2' },
    { id: 'v-num3', label: '3', key: 'Digit3' },
    { id: 'v-num4', label: '4', key: 'Digit4' },
    { id: 'v-num5', label: '5', key: 'Digit5' },
  ],
};

const PRESET_NAMES: readonly VirtualPreset[] = ['dpad', 'utility', 'numbers'];
const DEFAULT_PRESETS: VirtualPreset[] = ['dpad', 'utility'];

// Flat id -> {preset, spec} lookup, built once, so any button can also be
// picked individually by id (e.g. 'v-num1') without naming its whole preset.
const BY_ID: Record<string, { preset: VirtualPreset; spec: VirtualButtonSpec }> = {};
for (const preset of PRESET_NAMES) {
  for (const spec of PRESET_BUTTONS[preset]) {
    BY_ID[spec.id] = { preset, spec };
  }
}

function isPresetName(s: string): s is VirtualPreset {
  return (PRESET_NAMES as readonly string[]).includes(s);
}

interface ResolvedSpecs {
  activePresets: Set<VirtualPreset>;
  activeIds: Set<string>;
  custom: VirtualButtonSpec[];
}

function resolveSpecs(specs?: VirtualControlSpec[]): ResolvedSpecs {
  const list: VirtualControlSpec[] = specs === undefined ? DEFAULT_PRESETS : specs;
  const activePresets = new Set<VirtualPreset>();
  const activeIds = new Set<string>();
  const custom: VirtualButtonSpec[] = [];

  for (const item of list) {
    if (typeof item === 'string') {
      if (isPresetName(item)) {
        activePresets.add(item);
      } else if (BY_ID[item]) {
        activeIds.add(item);
      } else {
        console.warn(`virtual_controls: unknown control id "${item}" - ignored.`);
      }
    } else {
      custom.push(item);
    }
  }
  return { activePresets, activeIds, custom };
}

/** Is this specific preset-group button active, either via its group or its own id? */
function isActive(spec: VirtualButtonSpec, preset: VirtualPreset, r: ResolvedSpecs): boolean {
  return r.activePresets.has(preset) || r.activeIds.has(spec.id);
}

export function createVirtualControls(input: InputManager, container: HTMLElement) {
  const overlay = document.createElement('div');
  overlay.className = cssKey('gameTouchOverlay');
  container.appendChild(overlay);

  function wire(el: HTMLElement, key: string): void {
    const press = (e: Event) => {
      e.preventDefault();
      input.pressVirtualKey(key); // STICKY: stays down until release
      if (key.startsWith('Digit')) {
        input.injectNumberBuffer?.(key.replace('Digit', ''));
      }
    };
    const release = (e: Event) => {
      e.preventDefault();
      input.releaseVirtualKey(key);
    };

    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
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

  function applyLayout(specs?: VirtualControlSpec[]): void {
    overlay.replaceChildren();
    const resolved = resolveSpecs(specs);

    // D-pad: bottom-left grid, same as before, but only render buttons that
    // are actually active (supports a partial d-pad via individual ids).
    const dpadButtons = PRESET_BUTTONS.dpad.filter((b) => isActive(b, 'dpad', resolved));
    if (dpadButtons.length > 0) {
      const dpad = document.createElement('div');
      dpad.className = cssKey('virtualDpad');
      dpad.setAttribute('dir', 'ltr');
      for (const b of dpadButtons) {
        dpad.appendChild(button(b, ['ctrlBtn', b.className!]));
      }
      overlay.appendChild(dpad);
    }

    // Utility: esc / enter / space each have their own bespoke position and
    // shape now (not a stacked column), so handle them individually.
    for (const b of PRESET_BUTTONS.utility) {
      if (isActive(b, 'utility', resolved)) {
        overlay.appendChild(button(b, ['ctrlBtn', b.className!]));
      }
    }

    // Numbers: top-center row, unchanged position, optionally a subset.
    const numberButtons = PRESET_BUTTONS.numbers.filter((b) => isActive(b, 'numbers', resolved));
    if (numberButtons.length > 0) {
      const nums = document.createElement('div');
      nums.className = cssKey('virtualMenuHotkeys');
      for (const b of numberButtons) {
        nums.appendChild(button(b, ['numBtn']));
      }
      overlay.appendChild(nums);
    }

    // Custom action buttons (scene-labeled, e.g. "Bag" / "Party" / "A" / "B"):
    // always grouped in the bottom-right actions column.
    if (resolved.custom.length > 0) {
      const actions = document.createElement('div');
      actions.className = cssKey('virtualActions');
      actions.setAttribute('dir', 'ltr');
      for (const b of resolved.custom) {
        actions.appendChild(button(b, b.className ? ['ctrlBtn', 'customBtn', b.className] : ['ctrlBtn', 'customBtn']));
      }
      overlay.appendChild(actions);
    }
  }

  // Start with the default overlay (dpad + utility) until the first scene applies its own.
  applyLayout();

  return {
    applyLayout,
    destroy(): void {
      overlay.remove();
    },
  };
}

export type VirtualControls = ReturnType<typeof createVirtualControls>;

// Usage examples:
//
// Title screen - arrows + utility only, so declare NOTHING (this is now the default):
//   // no virtualControls field
//
// A scene that wants numbers on top of the default dpad+utility:
//   virtualControls: ['dpad', 'utility', 'numbers'],
//
// A scene that wants ONLY numbers (no dpad/utility at all):
//   virtualControls: ['numbers'],
//
// A scene that wants just two specific number keys:
//   virtualControls: ['dpad', 'utility', 'v-num1', 'v-num2'],
//
// Battle scene with labeled action buttons instead of raw A/B:
//   virtualControls: [
//     'dpad',
//     'utility',
//     { id: 'v-bag', label: 'Bag', key: 'KeyB' },
//     { id: 'v-party', label: 'Party', key: 'KeyP' },
//   ],
