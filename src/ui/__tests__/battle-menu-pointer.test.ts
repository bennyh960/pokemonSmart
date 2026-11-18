import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleMenu, renderBattleMenu, updateBattleMenu, showMainMenu, showMoveMenu } from '../battle-menu';
import { uiRegistry } from '../../engine/input/uiRegistry';
import { BTL } from '../../data/battle-constants';
import type { InputManager } from '../../engine/input';
import type { Move } from '../../types/index.js';

// Canvas stub: every method is a no-op, measureText reports zero width
const ctx = new Proxy({} as Record<string | symbol, unknown>, {
  get: (target, key) => (key in target ? target[key] : key === 'measureText' ? () => ({ width: 0 }) : () => {}),
  set: (target, key, value) => ((target[key] = value), true),
}) as unknown as CanvasRenderingContext2D;

const noKeys = { isKeyPressed: () => false } as unknown as InputManager;

// The canvas maps 1:1 onto logical coords, so client x/y = game x/y
const canvas = {
  style: {} as CSSStyleDeclaration,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 240, height: 160 }),
} as unknown as HTMLCanvasElement;

function moves(n: number): Move[] {
  return Array.from(
    { length: n },
    (_, i) => ({ id: 33 + i, type: 'normal', power: 40, pp: 35, currentPp: 35 }) as Move,
  );
}

function draw(menu: ReturnType<typeof createBattleMenu>) {
  uiRegistry.clear();
  renderBattleMenu(ctx, menu);
}

function click(x: number, y: number) {
  const hit = uiRegistry.processCanvasClick(canvas, x, y);
  hit?.region.onSelect?.({ ...hit.region, gamePos: hit.gamePos });
}

const centre = (c: { x: number; y: number }, w: number, h: number) => [c.x + w / 2, c.y + h / 2] as const;

describe('battle menu mouse', () => {
  let menu: ReturnType<typeof createBattleMenu>;
  beforeEach(() => {
    menu = createBattleMenu(moves(4));
  });

  it('clicking a move uses it', () => {
    showMoveMenu(menu);
    draw(menu);
    click(...centre(BTL.MOVE.cells[2], BTL.MOVE.W, BTL.MOVE.H));
    expect(updateBattleMenu(menu, noKeys)).toEqual({ type: 'move', index: 2 });
  });

  it('hovering a move selects it', () => {
    showMoveMenu(menu);
    draw(menu);
    uiRegistry.processCanvasHover(canvas, ...centre(BTL.MOVE.cells[3], BTL.MOVE.W, BTL.MOVE.H));
    expect(menu.cursorIndex).toBe(3);
    expect(canvas.style.cursor).toBe('pointer');
  });

  it('each tab picks its action, like keys 1-4', () => {
    const expected = ['FIGHT', 'POKEMON', 'BAG', 'POKEDEX'];
    BTL.TABS.forEach((tab, i) => {
      showMainMenu(menu);
      draw(menu);
      click(tab.x + tab.w / 2, BTL.TABS_BG.y + 3);
      expect(updateBattleMenu(menu, noKeys)).toEqual({ type: 'main', choice: expected[i] });
    });
  });

  it('clicking a move from the tabs opens the move list on it', () => {
    showMainMenu(menu);
    draw(menu);
    click(...centre(BTL.MOVE.cells[1], BTL.MOVE.W, BTL.MOVE.H));
    expect(updateBattleMenu(menu, noKeys)).toEqual({ type: 'main', choice: 'FIGHT' });
    expect(menu.cursorIndex).toBe(1);
  });

  it('ESC pill runs from the tabs and goes back from the moves', () => {
    showMainMenu(menu);
    draw(menu);
    click(10, BTL.PROMPT_BG.y + 3);
    expect(updateBattleMenu(menu, noKeys)).toEqual({ type: 'main', choice: 'RUN' });
    showMoveMenu(menu);
    menu.mode = 'moves';
    draw(menu);
    click(10, BTL.PROMPT_BG.y + 3);
    expect(updateBattleMenu(menu, noKeys)).toEqual({ type: 'move', index: -1 });
  });

  it('wheel over the grid flips the 8-move page', () => {
    menu = createBattleMenu(moves(8));
    showMoveMenu(menu);
    draw(menu);
    uiRegistry.processCanvasScroll(canvas, ...centre(BTL.MOVE.cells[0], BTL.MOVE.W, BTL.MOVE.H), 100);
    expect(menu.movePage).toBe(1);
    draw(menu);
    click(...centre(BTL.MOVE.cells[0], BTL.MOVE.W, BTL.MOVE.H));
    expect(updateBattleMenu(menu, noKeys)).toEqual({ type: 'move', index: 4 });
  });

  it('empty move slots are not clickable', () => {
    menu = createBattleMenu(moves(2));
    showMoveMenu(menu);
    draw(menu);
    click(...centre(BTL.MOVE.cells[3], BTL.MOVE.W, BTL.MOVE.H));
    expect(updateBattleMenu(menu, noKeys)).toBeNull();
  });
});
