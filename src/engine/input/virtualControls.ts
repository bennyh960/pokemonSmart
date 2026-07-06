/**
 * VirtualControls - scene-driven touch button overlay.
 *
 * Declaration model - a CONFIG OBJECT, not an array. Each group has a default;
 * a scene only mentions the groups it wants to CHANGE:
 *
 *   dpad?:    boolean | VirtualButtonSpec[]   (default: ON, the 4 arrows)
 *   utility?: boolean | VirtualButtonSpec[]   (default: ON, esc/enter/space)
 *   numbers?: boolean | VirtualButtonSpec[]   (default: OFF)
 *   custom?:  VirtualButtonSpec[]             (always ADDITIVE, never replaces)
 *
 * Per group, omitted (undefined)          -> its default (on for dpad/utility, off for numbers)
 *            explicit array               -> REPLACES that group's contents entirely
 *            true  (numbers/dpad/utility) -> that group's full built-in preset
 *            false (numbers/dpad/utility) -> that group renders nothing
 *
 * This means a scene that just wants one extra number key writes
 * `{ numbers: [{ id: 'v-num1', label: '1', key: 'Digit1' }] }` and gets
 * dpad + utility for free - no need to repeat them every time.
 *
 * Buttons use the STICKY virtual-key path (pressVirtualKey / releaseVirtualKey),
 * so holding a d-pad button produces continuous input until the finger lifts.
 */

import type { InputManager } from '.';
import styles from './mobileControls.module.css';

export interface VirtualButtonSpec {
  id: string;
  label: string;
  key: string;
  className?: string;
}

/** true/false toggles a preset group on/off; an array replaces its contents. */
export type PresetOverride = boolean | VirtualButtonSpec[];

export interface VirtualControlsConfig {
  dpad?: PresetOverride;
  utility?: PresetOverride;
  numbers?: PresetOverride;
  /** Scene-labeled action buttons (e.g. "Bag" / "Quit"). Always additive. */
  custom?: VirtualButtonSpec[];
}

const cssKey = (k: string): string => (styles as Record<string, string>)[k] ?? '';

const DEFAULT_DPAD: VirtualButtonSpec[] = [
  { id: 'v-up', label: '▲', key: 'ArrowUp', className: 'vUp' },
  { id: 'v-left', label: '◀', key: 'ArrowLeft', className: 'vLeft' },
  { id: 'v-right', label: '▶', key: 'ArrowRight', className: 'vRight' },
  { id: 'v-down', label: '▼', key: 'ArrowDown', className: 'vDown' },
];

const DEFAULT_UTILITY: VirtualButtonSpec[] = [
  { id: 'v-esc', label: 'ESC', key: 'Escape', className: 'vEsc' },
  { id: 'v-enter', label: '⏎ ENTER', key: 'Enter', className: 'vEnter' },
  { id: 'v-space', label: 'SPACE', key: 'Space', className: 'vSpace' },
];

const DEFAULT_NUMBERS: VirtualButtonSpec[] = [
  { id: 'v-num1', label: '1', key: 'Digit1' },
  { id: 'v-num2', label: '2', key: 'Digit2' },
  { id: 'v-num3', label: '3', key: 'Digit3' },
  { id: 'v-num4', label: '4', key: 'Digit4' },
];

/**
 * Resolve one group's override against its default and default-on/off rule.
 *   undefined -> onByDefault ? defaults : []
 *   false     -> []
 *   true      -> defaults
 *   array     -> that array, verbatim (a full replace)
 */
function resolveGroup(
  override: PresetOverride | undefined,
  defaults: VirtualButtonSpec[],
  onByDefault: boolean,
): VirtualButtonSpec[] {
  if (override === undefined) return onByDefault ? defaults : [];
  if (override === false) return [];
  if (override === true) return defaults;
  return override;
}

function resolveConfig(config?: VirtualControlsConfig) {
  return {
    dpad: resolveGroup(config?.dpad, DEFAULT_DPAD, true),
    utility: resolveGroup(config?.utility, DEFAULT_UTILITY, true),
    numbers: resolveGroup(config?.numbers, DEFAULT_NUMBERS, false),
    custom: config?.custom ?? [],
  };
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

  function applyLayout(config?: VirtualControlsConfig): void {
    overlay.replaceChildren();
    const resolved = resolveConfig(config);

    // D-pad: bottom-left grid.
    if (resolved.dpad.length > 0) {
      const dpad = document.createElement('div');
      dpad.className = cssKey('virtualDpad');
      dpad.setAttribute('dir', 'ltr');
      for (const b of resolved.dpad) {
        dpad.appendChild(button(b, ['ctrlBtn', b.className ?? '']));
      }
      overlay.appendChild(dpad);
    }

    // Utility: esc / enter / space each have their own bespoke position/shape
    // (see CSS), so each is appended straight to the overlay, not a shared column.
    for (const b of resolved.utility) {
      overlay.appendChild(button(b, ['ctrlBtn', b.className ?? '']));
    }

    // Numbers: top-center row.
    if (resolved.numbers.length > 0) {
      const nums = document.createElement('div');
      nums.className = cssKey('virtualMenuHotkeys');
      for (const b of resolved.numbers) {
        nums.appendChild(button(b, ['numBtn']));
      }
      overlay.appendChild(nums);
    }

    // Custom action buttons (scene-labeled, e.g. "Bag" / "Quit"): always
    // grouped in the bottom-right actions column, always additive.
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

  // function createRotateWarning(container: HTMLElement): void {
  //   if (!container) return;

  //   // this card actualy need portait screen
  //   if (document.querySelector('.login-card') || document.querySelector('#ui-overlay')?.children.length) {
  //     return;
  //   }

  //   // יצירת האלמנטים
  //   const warningDiv = document.createElement('div');
  //   const contentDiv = document.createElement('div');
  //   const iconDiv = document.createElement('div');
  //   const textParagraph = document.createElement('p');

  //   // הגדרת קלאסים של Tailwind
  //   // הסבר על הקלאסים:
  //   // hidden = display: none (ברירת מחדל למסכים גדולים)
  //   // portrait:max-md:flex = במצב אנכי ורק עד מסכי md (768px) הוא יהפוך ל-flex
  //   warningDiv.className =
  //     'hidden portrait:max-md:flex fixed inset-0 w-screen h-screen bg-[#111111] text-white z-[9999] justify-center items-center text-center p-5 border-4 border-white box-border';

  //   contentDiv.className = 'animate-pulse';
  //   iconDiv.className = 'text-5xl mb-4';
  //   textParagraph.className = 'text-lg font-sans';

  //   // הוספת התוכן
  //   iconDiv.innerText = '🔄';
  //   textParagraph.innerText = 'אנא סובב את המכשיר למצב אופקי לצפייה מיטבית';

  //   // חיבור האלמנטים יחד והזרקה לקונטיינר
  //   contentDiv.appendChild(iconDiv);
  //   contentDiv.appendChild(textParagraph);
  //   warningDiv.appendChild(contentDiv);
  //   container.appendChild(warningDiv);
  // }

  // TODO: handle future - let kids decide thier screen
  // createRotateWarning(container);

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

// Usage examples (matches the design table above):
//
// Title screen - default dpad + utility, nothing else:
//   // no virtualControls field
//
// Only the ENTER button changes within utility (dpad stays default):
//   virtualControls: { utility: [{ id: 'v-enter', label: '⏎ ENTER', key: 'Enter', className: 'vEnter' }] },
//
// Default dpad + utility, plus the full number row:
//   virtualControls: { numbers: true },
//
// Default dpad + utility, plus just digit 1:
//   virtualControls: { numbers: [{ id: 'v-num1', label: '1', key: 'Digit1' }] },
//
// Default dpad + utility, plus scene-labeled action buttons:
//   virtualControls: {
//     custom: [
//       { id: 'v-a', label: 'Quit', key: 'KeyQ' },
//       { id: 'v-b', label: 'Language', key: 'KeyL' },
//     ],
//   },
