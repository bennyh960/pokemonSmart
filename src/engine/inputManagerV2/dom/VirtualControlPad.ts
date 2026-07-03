import { attachVirtualButton } from '../adapters/virtualButtonAdapter';
import './virtualControlPad.css';

export interface ExtraKeyConfig {
  code: string;
  label: string;
}

export interface VirtualControlPad {
  /** Show only these core button codes; pass null to show all of them. */
  setVisible(codes: string[] | null): void;
  /** Reconfigure the scene-specific action slots (bindings AND labels). */
  setExtraKeys(keys: ExtraKeyConfig[]): void;
  destroy(): void;
}

const CORE_BUTTONS: readonly { code: string; label: string }[] = [
  { code: 'ArrowUp', label: '▲' },
  { code: 'ArrowDown', label: '▼' },
  { code: 'ArrowLeft', label: '◀' },
  { code: 'ArrowRight', label: '▶' },
  { code: 'Enter', label: 'ENTER' },
  { code: 'Space', label: 'SPACE' },
];

const EXTRA_SLOT_COUNT = 5;

/**
 * A control pad rendered as plain DOM, created ONCE at game bootstrap and
 * living alongside the canvas for the app's entire lifetime.
 *
 * WHY PLAIN DOM, NOT REACT
 * Your React overlay is mounted/unmounted per scene via
 * mountReactScene/unmountReactScene — it does not persist across scene
 * transitions. This pad needs to survive every scene change (a canvas
 * scene, then a React scene, then back), so it can't live inside
 * something that gets torn down on every transition. It's a sibling of
 * both the canvas and the React root, not a child of either.
 *
 * Each Scene's enter()/exit() calls setVisible()/setExtraKeys() to
 * reconfigure which buttons are shown and what the 5 extra slots do —
 * the pad itself never remounts, only its configuration changes.
 */
export function createVirtualControlPad(container: HTMLElement): VirtualControlPad {
  const root = document.createElement('div');
  root.className = 'virtual-control-pad';
  container.appendChild(root);

  const detachers: (() => void)[] = [];
  const coreElements = new Map<string, HTMLButtonElement>();

  for (const { code, label } of CORE_BUTTONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.code = code;
    root.appendChild(btn);
    detachers.push(attachVirtualButton(btn, code));
    coreElements.set(code, btn);
  }

  // Fixed number of slots, created once. Reconfiguring them re-labels and
  // re-binds in place rather than adding/removing DOM nodes per scene.
  const extraElements: HTMLButtonElement[] = [];
  let extraDetachers: (() => void)[] = [];

  for (let i = 0; i < EXTRA_SLOT_COUNT; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'virtual-extra-slot';
    btn.style.visibility = 'hidden'; // empty until a scene configures it
    root.appendChild(btn);
    extraElements.push(btn);
  }

  function setVisible(codes: string[] | null): void {
    coreElements.forEach((btn, code) => {
      btn.style.display = codes === null || codes.includes(code) ? '' : 'none';
    });
  }

  function setExtraKeys(keys: ExtraKeyConfig[]): void {
    // Always tear down the previous scene's bindings first — leaving a
    // stale binding active is how a slot ends up firing the last scene's
    // action after the scene that defined it has already exited.
    extraDetachers.forEach((detach) => detach());
    extraDetachers = [];

    extraElements.forEach((btn, i) => {
      const config = keys[i];
      if (!config) {
        btn.style.visibility = 'hidden';
        return;
      }
      btn.style.visibility = 'visible';
      btn.textContent = config.label;
      extraDetachers.push(attachVirtualButton(btn, config.code));
    });
  }

  function destroy(): void {
    detachers.forEach((detach) => detach());
    extraDetachers.forEach((detach) => detach());
    root.remove();
  }

  return { setVisible, setExtraKeys, destroy };
}
