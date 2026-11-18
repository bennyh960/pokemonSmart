import { describe, it, expect, beforeEach } from 'vitest';
import { createBagScene, setBagMode, pendingItem, clearPendingItem } from '../bag';
import { uiRegistry } from '../../engine/input/uiRegistry';
import { createNewPlayerData, startSandboxGame } from '../../systems/game-state';
import type { InputManager } from '../../engine/input';
import type { StateMachine } from '../../engine/state-machine.js';

// Canvas stub: every method is a no-op, measureText reports zero width
const ctx = new Proxy({} as Record<string | symbol, unknown>, {
  get: (target, key) => (key in target ? target[key] : key === 'measureText' ? () => ({ width: 0 }) : () => {}),
  set: (target, key, value) => ((target[key] = value), true),
}) as unknown as CanvasRenderingContext2D;

// Canvas maps 1:1 onto logical coords, so client x/y = game x/y
const canvas = {
  style: {} as CSSStyleDeclaration,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 240, height: 160 }),
} as unknown as HTMLCanvasElement;

// Keys tapped by the mouse are "pressed" for the next update only
let tapped = new Set<string>();
const input = {
  isKeyPressed: (k: string) => tapped.has(k),
  tapVirtualKey: (k: string) => tapped.add(k),
} as unknown as InputManager;
const stateMachine = { pop: () => {} } as unknown as StateMachine;

const MEDICINE = ['potion', 'super-potion', 'hyper-potion', 'max-potion', 'full-restore', 'antidote', 'full-heal'];
const rowY = (visibleRow: number) => 28 + visibleRow * 17 + 8;
const TAB_BALLS = { x: 155 + 15, y: 19 };
const USE_BTN = { x: 20, y: 128 };

let bag: ReturnType<typeof createBagScene>;

function frame() {
  bag.update(0.016);
  tapped = new Set();
  uiRegistry.clear();
  bag.render(ctx);
}

function click(x: number, y: number) {
  const hit = uiRegistry.processCanvasClick(canvas, x, y);
  hit?.region.onSelect?.({ ...hit.region, gamePos: hit.gamePos, isDoubleClick: hit.isDoubleClick });
}

/** In battle mode, Enter picks the selected item into pendingItem — that tells us what was selected. */
function useSelected(): string | undefined {
  click(USE_BTN.x, USE_BTN.y);
  frame();
  return pendingItem?.itemId;
}

describe('bag mouse', () => {
  beforeEach(() => {
    const pd = createNewPlayerData();
    pd.items = Object.fromEntries([...MEDICINE, 'poke-ball'].map((id) => [id, 1]));
    startSandboxGame(pd);
    setBagMode('battle');
    clearPendingItem();
    bag = createBagScene(input, stateMachine);
    bag.enter();
    frame();
  });

  it('a tab click switches category', () => {
    click(TAB_BALLS.x, TAB_BALLS.y);
    frame();
    expect(useSelected()).toBe('poke-ball');
  });

  it('a row click selects without using; the Use button uses it', () => {
    click(120, rowY(2));
    frame();
    expect(pendingItem).toBeNull();
    expect(useSelected()).toBe('hyper-potion');
  });

  it('a double-click uses the row', () => {
    click(120, rowY(1));
    click(120, rowY(1));
    frame();
    expect(pendingItem?.itemId).toBe('super-potion');
  });

  it('the wheel moves one item per notch and stops at the ends', () => {
    for (let i = 0; i < 10; i++) {
      uiRegistry.processCanvasScroll(canvas, 120, rowY(0), 100);
      frame();
    }
    expect(useSelected()).toBe(MEDICINE[MEDICINE.length - 1]);
  });

  it('clicking a row of a scrolled list keeps it under the mouse', () => {
    for (let i = 0; i < 6; i++) {
      uiRegistry.processCanvasScroll(canvas, 120, rowY(0), 100);
      frame();
    }
    // Last item selected → window shows items 2..6; the top row is item 2 and must stay there
    click(120, rowY(0));
    frame();
    click(120, rowY(0));
    click(120, rowY(0));
    frame();
    expect(pendingItem?.itemId).toBe(MEDICINE[2]);
  });
});
