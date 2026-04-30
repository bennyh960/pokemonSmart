/**
 * PokedexScene - Scrollable list of all 251 Pokemon with detail view.
 * D key in overworld opens this. Shows seen/unseen status from PlayerData.pokedex.
 *
 * Detail view has three tabs: INFO, TYPE, MOVES
 * MOVES tab has two sub-tabs: BY LEVEL, CAN LEARN (TM)
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawRect, drawText, fillRoundRect, strokeRoundRect } from '../engine/renderer.js';
import { t, isRTL, getLocale } from '../i18n/i18n.js';
import { drawTypeBadge } from '../ui/type-badge.js';
import { TYPE_BADGE } from '../data/type-constants.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import {
  getPokemon,
  getPokemonDisplayName,
  getMove,
  getMoveDisplayName,
  getLearnset,
  getTmLearnset,
  getTypeEffectiveness,
  getAllTypes,
  getEvolutionChain,
  getPokemonAbilityDetails,
  getLocalizedName,
} from '../services/pokemon-data.js';
import type { PokemonType } from '../types/index.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { BADGES, hasBadge, countBadges } from '../data/badges.js';
import { getTypeColor } from '../data/type-constants.js';
import { getTMLabelForMoveId } from '../data/item-defs.js';

const BG_COLOR = '#301818';
const ENTRY_HEIGHT = 26;
const VISIBLE_ENTRIES = 5;
const TOTAL_POKEMON = 251;

type PokedexView = 'list' | 'detail' | 'badges';
export type DetailTab = 'info' | 'evolution' | 'type' | 'moves';
type MovesSubTab = 'byLevel' | 'canLearn';
type PokedexContext = 'overworld' | 'battle';

const DETAIL_TABS: DetailTab[] = ['info', 'evolution', 'type', 'moves'];

let pendingPokedexFocus: { id: number; openDetail: boolean; tab?: DetailTab; context?: PokedexContext } | null = null;

export function setPokedexFocus(id: number, openDetail = true, tab?: DetailTab, context?: PokedexContext): void {
  pendingPokedexFocus = { id, openDetail, tab, context };
}

export function createPokedexScene(input: InputManager, stateMachine: StateMachine): Scene {
  let cursor = 0;
  let scrollOffset = 0;
  let view: PokedexView = 'list';
  let detailTab: DetailTab = 'info';
  let movesSubTab: MovesSubTab = 'byLevel';
  let movesScrollOffset = 0;
  let movesCursor = 0;
  let movesDetailOpen = false;
  let openContext: PokedexContext = 'overworld';
  let searchQuery = '';

  function getPokedex(): Record<number, boolean> {
    if (hasActiveGame()) return getPlayerData().pokedex;
    return {};
  }

  function getSeenCount(): number {
    const pdex = getPokedex();
    let count = 0;
    for (let i = 1; i <= TOTAL_POKEMON; i++) {
      if (pdex[i]) count++;
    }
    return count;
  }

  function isSeen(id: number): boolean {
    return getPokedex()[id] === true;
  }

  function getFilteredIds(): number[] {
    if (!searchQuery) {
      return Array.from({ length: TOTAL_POKEMON }, (_, i) => i + 1);
    }
    const q = searchQuery.toLowerCase();
    const results: number[] = [];
    for (let id = 1; id <= TOTAL_POKEMON; id++) {
      if (String(id).startsWith(q)) { results.push(id); continue; }
      const name = getPokemonDisplayName(id).toLowerCase();
      if (name.includes(q)) results.push(id);
    }
    return results;
  }

  function preloadVisibleSprites(): void {
    const filtered = getFilteredIds();
    const pdex = getPokedex();
    for (let i = scrollOffset; i < Math.min(scrollOffset + VISIBLE_ENTRIES + 2, filtered.length); i++) {
      const id = filtered[i];
      if (id && pdex[id]) {
        loadImage(`/sprites/pokemon/front/${id}.png`).catch(() => {});
        loadImage(`/sprites/pokemon/icons/${id}.png`).catch(() => {});
      }
    }
  }

  function formatNumber(id: number): string {
    return '#' + String(id).padStart(3, '0');
  }

  return {
    enter(): void {
      cursor = pendingPokedexFocus ? Math.max(0, Math.min(TOTAL_POKEMON - 1, pendingPokedexFocus.id - 1)) : 0;
      scrollOffset = Math.max(0, Math.min(cursor, TOTAL_POKEMON - VISIBLE_ENTRIES));
      view = pendingPokedexFocus?.openDetail ? 'detail' : 'list';
      detailTab = pendingPokedexFocus?.tab ?? 'info';
      openContext = pendingPokedexFocus?.context ?? 'overworld';
      movesSubTab = 'byLevel';
      movesScrollOffset = 0;
      movesCursor = 0;
      movesDetailOpen = false;
      searchQuery = '';
      preloadVisibleSprites();
      if (pendingPokedexFocus?.openDetail) {
        const id = cursor + 1;
        loadImage(`/sprites/pokemon/front/${id}.png`).catch(() => {});
        const chain = getEvolutionChain(id);
        if (chain) {
          for (const stage of chain.stages) {
            loadImage(`/sprites/pokemon/front/${stage.id}.png`).catch(() => {});
          }
        }
      }
      pendingPokedexFocus = null;
    },

    exit(): void {},

    update(_dt: number): void {
      // H/B hotkeys only when not searching
      if (!searchQuery) {
        if (input.isKeyPressed('KeyH') && hasActiveGame()) {
          input.clearTextInput();
          const pd = getPlayerData();
          if (pd.battleHelperBattles > 0 || pd.battleHelperEnabled) {
            pd.battleHelperEnabled = !pd.battleHelperEnabled;
            autoSave();
          }
          return;
        }

        if (input.isKeyPressed('KeyB')) {
          input.clearTextInput();
          view = view === 'badges' ? 'list' : 'badges';
          return;
        }
      }

      // Badges view: only Escape to close
      if (view === 'badges') {
        input.clearTextInput();
        if (input.isKeyPressed('Escape')) {
          view = 'list';
        }
        return;
      }

      if (view === 'detail') {
        input.clearTextInput();
        // Move detail popup: Escape closes it before any other navigation
        if (detailTab === 'moves' && movesDetailOpen) {
          if (input.isKeyPressed('Escape')) {
            movesDetailOpen = false;
          }
          return;
        }

        if (input.isKeyPressed('Escape')) {
          if (openContext === 'battle') {
            stateMachine.pop();
          } else {
            view = 'list';
          }
          return;
        }

        // Left/Right switches main tabs
        if (input.isKeyPressed('ArrowLeft')) {
          const idx = DETAIL_TABS.indexOf(detailTab);
          if (idx > 0) {
            detailTab = DETAIL_TABS[idx - 1];
            movesScrollOffset = 0;
            movesCursor = 0;
          }
        }
        if (input.isKeyPressed('ArrowRight')) {
          const idx = DETAIL_TABS.indexOf(detailTab);
          if (idx < DETAIL_TABS.length - 1) {
            detailTab = DETAIL_TABS[idx + 1];
            movesScrollOffset = 0;
            movesCursor = 0;
          }
        }

        if (detailTab === 'moves') {
          if (input.isKeyPressed('1')) {
            movesSubTab = 'byLevel';
            movesScrollOffset = 0;
            movesCursor = 0;
          } else if (input.isKeyPressed('2')) {
            movesSubTab = 'canLearn';
            movesScrollOffset = 0;
            movesCursor = 0;
          }
        }

        if (detailTab === 'moves') {
          const pokemonId = getFilteredIds()[cursor] ?? cursor + 1;
          const sorted =
            movesSubTab === 'byLevel'
              ? [...getLearnset(pokemonId)].sort((a, b) => a.levelLearned - b.levelLearned)
              : [...getTmLearnset(pokemonId)].sort((a, b) =>
                  getMoveDisplayName(a.moveId).localeCompare(getMoveDisplayName(b.moveId)),
                );
          const MAX_ROWS = 9;

          if (input.isKeyPressed('ArrowUp') && movesCursor > 0) {
            movesCursor--;
            if (movesCursor < movesScrollOffset) movesScrollOffset = movesCursor;
          }
          if (input.isKeyPressed('ArrowDown') && movesCursor < sorted.length - 1) {
            movesCursor++;
            if (movesCursor >= movesScrollOffset + MAX_ROWS) movesScrollOffset = movesCursor - MAX_ROWS + 1;
          }
          if (input.isKeyPressed('Enter') && sorted.length > 0) {
            movesDetailOpen = true;
          }
        }

        return;
      }

      // List view — handle search input
      const typed = input.getTextInput();
      input.clearTextInput();
      if (typed) {
        searchQuery += typed;
        cursor = 0;
        scrollOffset = 0;
        preloadVisibleSprites();
      }

      if (input.isKeyPressed('Backspace') && searchQuery.length > 0) {
        searchQuery = searchQuery.slice(0, -1);
        cursor = 0;
        scrollOffset = 0;
      }

      // Escape: clear search first, then exit
      if (input.isKeyPressed('Escape')) {
        if (searchQuery) {
          searchQuery = '';
          cursor = 0;
          scrollOffset = 0;
        } else {
          stateMachine.pop();
        }
        return;
      }

      const filtered = getFilteredIds();

      if (input.isKeyPressed('ArrowUp')) {
        if (cursor > 0) {
          cursor--;
          if (cursor < scrollOffset) {
            scrollOffset = cursor;
            preloadVisibleSprites();
          }
        }
      }

      if (input.isKeyPressed('ArrowDown')) {
        if (cursor < filtered.length - 1) {
          cursor++;
          if (cursor >= scrollOffset + VISIBLE_ENTRIES) {
            scrollOffset = cursor - VISIBLE_ENTRIES + 1;
            preloadVisibleSprites();
          }
        }
      }

      if (input.isKeyPressed('Enter')) {
        const id = filtered[cursor];
        if (id && isSeen(id)) {
          view = 'detail';
          detailTab = 'info';
          movesSubTab = 'byLevel';
          movesScrollOffset = 0;
          movesCursor = 0;
          movesDetailOpen = false;
          loadImage(`/sprites/pokemon/front/${id}.png`).catch(() => {});
          const chain = getEvolutionChain(id);
          if (chain) {
            for (const stage of chain.stages) {
              loadImage(`/sprites/pokemon/front/${stage.id}.png`).catch(() => {});
            }
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, BG_COLOR);

      if (view === 'detail') {
        renderDetailView(ctx, cursor + 1);
        return;
      }

      if (view === 'badges') {
        renderBadgesView(ctx);
        return;
      }

      renderListView(ctx);
    },
  };

  function renderListView(ctx: CanvasRenderingContext2D): void {
    const rtl = isRTL();
    // Title bar (22px — fits title + battery/helper widgets)
    fillRect(ctx, 0, 0, SCREEN_W, 22, '#481818');

    if (rtl) {
      // RTL: title on right, widgets on left
      drawText(ctx, t('pokedex.title'), SCREEN_W - 4, 3, {
        size: 8,
        color: '#ffffff',
        font: 'monospace',
        align: 'right',
      });
      const seenSubText = '(' + t('pokedex.seen', { count: getSeenCount() }) + ')';
      drawText(ctx, seenSubText, SCREEN_W - 4, 14, { size: 5, color: '#aaaaaa', font: 'monospace', align: 'right' });
    } else {
      drawText(ctx, t('pokedex.title'), 4, 3, { size: 8, color: '#ffffff', font: 'monospace' });
      const seenSubText = '(viewed: ' + getSeenCount() + ')';
      drawText(ctx, seenSubText, 4, 14, { size: 5, color: '#aaaaaa', font: 'monospace' });
    }

    if (hasActiveGame()) {
      const pd = getPlayerData();
      const battColor =
        pd.pokedexBatteryCharges > 20 ? '#20d860' : pd.pokedexBatteryCharges > 5 ? '#f8d030' : '#d84040';
      const helperOn = pd.battleHelperEnabled && pd.battleHelperBattles > 0;
      const helperColor = helperOn ? '#20d860' : '#444444';

      if (rtl) {
        // RTL: battery at left edge, toggle pill to its right
        const BATT_X = 6,
          BATT_Y = 3,
          BATT_W = 14,
          BATT_H = 6;
        fillRect(ctx, BATT_X, BATT_Y, BATT_W, BATT_H, '#222222');
        drawRect(ctx, BATT_X, BATT_Y, BATT_W, BATT_H, '#555555');
        const bFill = Math.max(1, Math.round((pd.pokedexBatteryCharges / 50) * (BATT_W - 2)));
        fillRect(ctx, BATT_X + 1, BATT_Y + 1, bFill, BATT_H - 2, battColor);
        drawText(ctx, pd.pokedexBatteryCharges + '/50', BATT_X + BATT_W / 2, 12, {
          size: 4,
          color: battColor,
          align: 'center',
        });

        const PILL_X = 26,
          PILL_Y = 2,
          PILL_W = 18,
          PILL_H = 8;
        ctx.fillStyle = helperOn ? '#1a4a1a' : '#1a1a1a';
        fillRoundRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, 3);
        ctx.strokeStyle = helperColor;
        ctx.lineWidth = 1;
        strokeRoundRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, 3);
        drawText(ctx, helperOn ? 'ON' : 'OFF', PILL_X + PILL_W / 2, PILL_Y + 1, {
          size: 5,
          color: helperColor,
          align: 'center',
        });
        const helperCountStr = pd.battleHelperBattles > 0 ? String(pd.battleHelperBattles) : '—';
        drawText(ctx, helperCountStr, PILL_X + PILL_W / 2, 13, { size: 4, color: helperColor, align: 'center' });
      } else {
        // LTR: battery on right edge, toggle pill to its left
        const BATT_X = SCREEN_W - 20,
          BATT_Y = 3,
          BATT_W = 14,
          BATT_H = 6;
        fillRect(ctx, BATT_X, BATT_Y, BATT_W, BATT_H, '#222222');
        drawRect(ctx, BATT_X, BATT_Y, BATT_W, BATT_H, '#555555');
        const bFill = Math.max(1, Math.round((pd.pokedexBatteryCharges / 50) * (BATT_W - 2)));
        fillRect(ctx, BATT_X + 1, BATT_Y + 1, bFill, BATT_H - 2, battColor);
        drawText(ctx, pd.pokedexBatteryCharges + '/50', BATT_X + BATT_W / 2, 12, {
          size: 4,
          color: battColor,
          align: 'center',
        });

        const PILL_X = SCREEN_W - 44,
          PILL_Y = 2,
          PILL_W = 18,
          PILL_H = 8;
        ctx.fillStyle = helperOn ? '#1a4a1a' : '#1a1a1a';
        fillRoundRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, 3);
        ctx.strokeStyle = helperColor;
        ctx.lineWidth = 1;
        strokeRoundRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, 3);
        drawText(ctx, helperOn ? 'ON' : 'OFF', PILL_X + PILL_W / 2, PILL_Y + 1, {
          size: 5,
          color: helperColor,
          align: 'center',
        });
        const helperCountStr = pd.battleHelperBattles > 0 ? String(pd.battleHelperBattles) : '—';
        drawText(ctx, helperCountStr, PILL_X + PILL_W / 2, 13, { size: 4, color: helperColor, align: 'center' });
      }
    }

    // List area (starts just below title bar)
    const filtered = getFilteredIds();
    const listY = 23;
    for (let i = 0; i < VISIBLE_ENTRIES; i++) {
      const index = scrollOffset + i;
      if (index >= filtered.length) break;

      const id = filtered[index];
      const y = listY + i * ENTRY_HEIGHT;
      const seen = isSeen(id);
      const isSelected = index === cursor;

      // Highlight bar
      if (isSelected) {
        fillRect(ctx, 2, y, SCREEN_W - 4, ENTRY_HEIGHT - 2, '#582828');
        drawRect(ctx, 2, y, SCREEN_W - 4, ENTRY_HEIGHT - 2, '#f8a878');
      }

      // Number
      const numStr = formatNumber(id);
      drawText(ctx, numStr, 6, y + 3, { size: 8, color: '#f8a878', font: 'monospace' });

      if (seen) {
        // Small sprite
        const sprite = getCachedImage(`/sprites/pokemon/front/${id}.png`);
        if (sprite) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(sprite, 24, y - 8, 40, 40);
          ctx.imageSmoothingEnabled = false;
        } else {
          fillRect(ctx, 34, y + 1, 16, 16, '#584040');
        }

        // Name
        const data = getPokemon(id);
        const name = data ? getPokemonDisplayName(id) : `Pokemon ${id}`;
        drawText(ctx, name, 54, y + 3, { size: 8, color: '#ffffff', font: 'monospace' });

        // Type dots
        if (data?.types) {
          let tx = 54 + ctx.measureText(name).width + 4;
          // measureText won't work without setting font, so use fixed offset
          tx = Math.max(tx, 140);
          for (const type of data.types) {
            const color = TYPE_BADGE[type as PokemonType]?.color || '#a8a878';
            fillRect(ctx, tx, y + 5, 6, 6, color);
            drawRect(ctx, tx, y + 5, 6, 6, '#00000044');
            tx += 9;
          }
        }
      } else {
        // Unknown sprite placeholder
        fillRect(ctx, 34, y + 1, 16, 16, '#201010');
        drawText(ctx, '?', 40, y + 4, { size: 8, color: '#403030', font: 'monospace' });

        // Unknown name
        drawText(ctx, t('pokedex.unknown'), 54, y + 3, { size: 8, color: '#807070', font: 'monospace' });
      }
    }

    // Scroll indicators
    if (scrollOffset > 0) {
      drawText(ctx, '\u25b2', SCREEN_W - 10, listY - 1, { size: 8, color: '#f8a878', font: 'monospace' });
    }
    if (scrollOffset + VISIBLE_ENTRIES < filtered.length) {
      drawText(ctx, '\u25bc', SCREEN_W - 10, listY + VISIBLE_ENTRIES * ENTRY_HEIGHT - 2, {
        size: 8,
        color: '#f8a878',
        font: 'monospace',
      });
    }

    // Bottom bar \u2014 search bar when active, hints otherwise
    fillRect(ctx, 0, SCREEN_H - 20, SCREEN_W, 20, '#481818');
    if (searchQuery) {
      // Search bar
      fillRect(ctx, 0, SCREEN_H - 20, SCREEN_W, 20, '#1a1a3a');
      const countStr = `(${filtered.length})`;
      const cursor_char = '\u2588'; // block cursor
      if (rtl) {
        drawText(ctx, countStr, 4, SCREEN_H - 17, { size: 6, color: '#a0a0ff', font: 'monospace' });
        drawText(ctx, searchQuery + cursor_char, SCREEN_W - 4, SCREEN_H - 17, {
          size: 6, color: '#ffffff', font: 'monospace', align: 'right',
        });
        const escHint = rtl ? 'ESC \u05e0\u05e7\u05d4' : 'ESC: clear';
        drawText(ctx, escHint, SCREEN_W - 4, SCREEN_H - 9, { size: 5, color: '#6666aa', font: 'monospace', align: 'right' });
      } else {
        drawText(ctx, searchQuery + cursor_char, 4, SCREEN_H - 17, {
          size: 6, color: '#ffffff', font: 'monospace',
        });
        drawText(ctx, countStr, SCREEN_W - 4, SCREEN_H - 17, { size: 6, color: '#a0a0ff', font: 'monospace', align: 'right' });
        drawText(ctx, 'ESC: clear', 4, SCREEN_H - 9, { size: 5, color: '#6666aa', font: 'monospace' });
      }
    } else if (rtl) {
      drawText(
        ctx,
        'ESC \u2190 \u2190\u2192 \u05e0\u05d9\u05d5\u05d5\u05d8 / ENTER \u05e4\u05e8\u05d8\u05d9\u05dd',
        4,
        SCREEN_H - 17,
        { size: 6, color: '#cccccc', font: 'monospace' },
      );
      drawText(
        ctx,
        '[H] \u05e2\u05d5\u05d6\u05e8 \u05e7\u05e8\u05d1    [B] \u05ea\u05d2\u05d9\u05dd',
        4,
        SCREEN_H - 9,
        { size: 5, color: '#888888', font: 'monospace' },
      );
    } else {
      drawText(ctx, 'Up/Down: Navigate  Enter: Details  Esc: Back', 4, SCREEN_H - 17, {
        size: 6,
        color: '#cccccc',
        font: 'monospace',
      });
      drawText(ctx, '[H] Battle Helper    [B] Badge Case', 4, SCREEN_H - 9, {
        size: 5,
        color: '#888888',
        font: 'monospace',
      });
    }
  }

  function drawBadgeStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    fillColor: string,
    borderColor: string,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function renderBadgesView(ctx: CanvasRenderingContext2D): void {
    const rtl = isRTL();
    const locale = getLocale();
    clearScreen(ctx, '#0d1a0d');

    // Title bar
    fillRect(ctx, 0, 0, SCREEN_W, 16, '#1a3a1a');
    const title = rtl ? '\u05ea\u05d9\u05e7 \u05d4\u05ea\u05d2\u05d9\u05dd' : 'BADGE CASE'; // תיק התגים / BADGE CASE
    drawText(ctx, title, SCREEN_W / 2, 3, { size: 8, color: '#f8d880', font: 'monospace', align: 'center' });

    // Money display in title bar
    if (hasActiveGame()) {
      const pd = getPlayerData();
      const moneyStr = `$${pd.money.toLocaleString()}`;
      if (rtl) {
        drawText(ctx, moneyStr, 4, 4, { size: 7, color: '#f8d030', font: 'monospace' });
      } else {
        drawText(ctx, moneyStr, SCREEN_W - 4, 4, { size: 7, color: '#f8d030', font: 'monospace', align: 'right' });
      }

      // Badge count
      const earned = countBadges(pd.badges);
      const countStr = rtl ? `${earned}/8 \u05ea\u05d2\u05d9\u05dd` : `${earned}/8 badges`;
      drawText(ctx, countStr, SCREEN_W / 2, 12, { size: 5, color: '#aaaaaa', font: 'monospace', align: 'center' });
    }

    // Badge case background
    fillRect(ctx, 10, 20, SCREEN_W - 20, 116, '#0a0f0a');
    drawRect(ctx, 10, 20, SCREEN_W - 20, 116, '#2a4a2a');

    // Badge grid: 4 columns × 2 rows
    const COLS = 4;
    const ROWS = 2;
    const SLOT_W = (SCREEN_W - 20) / COLS; // 55px
    const SLOT_H = 116 / ROWS; // 58px
    const STAR_OUTER = 14;
    const STAR_INNER = 6;
    const GRID_X = 10;
    const GRID_Y = 20;

    const pd = hasActiveGame() ? getPlayerData() : null;

    for (let i = 0; i < 8; i++) {
      const badge = BADGES[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = GRID_X + col * SLOT_W + SLOT_W / 2;
      const cy = GRID_Y + row * SLOT_H + SLOT_H / 2 - 6;

      const owned = pd ? hasBadge(pd.badges, badge.id) : false;
      const typeColor = getTypeColor(badge.type as any);

      if (owned) {
        // Glow effect: outer soft ring
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = typeColor;
        ctx.beginPath();
        ctx.arc(cx, cy, STAR_OUTER + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw star badge: filled
        drawBadgeStar(ctx, cx, cy, STAR_OUTER, STAR_INNER, typeColor, '#ffffff88');

        // Badge name (small, below star)
        const name = badge.name[locale] ?? badge.name.en;
        drawText(ctx, name, cx, cy + STAR_OUTER + 3, { size: 4, color: '#ffffff', align: 'center', font: 'monospace' });

        // Math topic (tiny, below name)
        const topic = badge.mathTopic[locale] ?? badge.mathTopic.en;
        drawText(ctx, topic, cx, cy + STAR_OUTER + 9, {
          size: 4,
          color: typeColor,
          align: 'center',
          font: 'monospace',
        });
      } else {
        // Unearned: dark star outline only
        drawBadgeStar(ctx, cx, cy, STAR_OUTER, STAR_INNER, '#1a1a1a', '#333333');
        drawText(ctx, '?', cx, cy - 4, { size: 8, color: '#2a2a2a', align: 'center', font: 'monospace' });
      }

      // Slot divider lines
      if (col < COLS - 1) {
        fillRect(ctx, GRID_X + (col + 1) * SLOT_W, GRID_Y + 4, 1, SLOT_H - 8, '#1a2a1a');
      }
    }
    // Row divider
    fillRect(ctx, GRID_X + 4, GRID_Y + SLOT_H, SCREEN_W - 28, 1, '#1a2a1a');

    // Bottom bar
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#1a3a1a');
    const hint = rtl ? 'ESC / [B] \u05d7\u05d6\u05e8\u05d4' : 'ESC / [B] Back';
    drawText(ctx, hint, 4, SCREEN_H - 11, { size: 6, color: '#aaaaaa', font: 'monospace' });
  }

  function renderDetailView(ctx: CanvasRenderingContext2D, id: number): void {
    const seen = isSeen(id);
    const data = getPokemon(id);

    // Title bar
    fillRect(ctx, 0, 0, SCREEN_W, 16, '#481818');
    const numStr = formatNumber(id);
    drawText(ctx, numStr, 4, 3, { size: 8, color: '#f8a878', font: 'monospace' });

    if (!seen || !data) {
      drawText(ctx, t('pokedex.unknown'), 40, 3, { size: 8, color: '#ffffff', font: 'monospace' });
      drawText(ctx, t('pokedex.noData'), SCREEN_W / 2, SCREEN_H / 2 - 4, {
        size: 8,
        color: '#807070',
        font: 'monospace',
        align: 'center',
      });
      fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
      drawText(ctx, 'Esc: Back', 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
      return;
    }

    // Name in title bar
    drawText(ctx, getPokemonDisplayName(id), 40, 3, { size: 8, color: '#ffffff', font: 'monospace' });

    // Battery display in title bar (right side)
    if (hasActiveGame()) {
      const pd = getPlayerData();
      const battColor =
        pd.pokedexBatteryCharges > 20 ? '#20d860' : pd.pokedexBatteryCharges > 5 ? '#f8d030' : '#d84040';
      drawText(ctx, `${pd.pokedexBatteryCharges}/50`, SCREEN_W - 4, 3, { size: 6, color: battColor, align: 'right' });
    }

    // Tab bar
    const tabY = 16;
    const tabH = 12;
    fillRect(ctx, 0, tabY, SCREEN_W, tabH, '#402020');
    const tabLabels: [DetailTab, string][] = [
      ['info', t('pokedex.tab.info')],
      ['evolution', t('pokedex.tab.evolution')],
      ['type', t('pokedex.tab.type')],
      ['moves', t('pokedex.tab.moves')],
    ];
    const tabW = Math.floor(SCREEN_W / tabLabels.length);
    for (let i = 0; i < tabLabels.length; i++) {
      const [tab, label] = tabLabels[i];
      const tx = i * tabW;
      if (tab === detailTab) {
        fillRect(ctx, tx, tabY, tabW, tabH, '#582828');
        drawRect(ctx, tx, tabY, tabW, tabH, '#f8a878');
      }
      drawText(ctx, label, tx + tabW / 2, tabY + 2, {
        size: 7,
        color: tab === detailTab ? '#f8a878' : '#999999',
        font: 'monospace',
        align: 'center',
      });
    }

    // Content area
    const contentY = tabY + tabH + 2;
    const contentH = SCREEN_H - contentY - 14;

    if (detailTab === 'info') {
      renderInfoTab(ctx, id, data, contentY);
    } else if (detailTab === 'evolution') {
      renderEvolutionTab(ctx, id, contentY);
    } else if (detailTab === 'type') {
      renderTypeTab(ctx, data, contentY, contentH);
    } else if (detailTab === 'moves') {
      renderMovesTab(ctx, id, contentY, contentH);
    }

    // Bottom bar
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
    const rtl = isRTL();
    let helpText: string;
    if (detailTab === 'moves' && movesDetailOpen) {
      helpText = rtl ? 'ESC \u05e1\u05d2\u05d9\u05e8\u05d4' : 'Esc: Close';
    } else if (detailTab === 'moves') {
      helpText = rtl
        ? 'ESC \u05d7\u05d6\u05e8\u05d4 / \u2190\u2192 \u05d8\u05d0\u05d1 / 1-2 \u05ea\u05ea-\u05d8\u05d0\u05d1 / \u2191\u2193 \u05e9\u05d5\u05e8\u05d4 / Enter \u05e4\u05e8\u05d8\u05d9\u05dd'
        : 'Esc:Back  L/R:Tab  1/2:Sub  \u2191\u2193:Row  Enter:Info';
    } else {
      helpText = rtl
        ? 'ESC \u05d7\u05d6\u05e8\u05d4 / \u2190\u2192 \u05d8\u05d0\u05d1'
        : 'Esc: Back  Left/Right: Switch Tab';
    }
    drawText(ctx, helpText, 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
  }

  function renderInfoTab(
    ctx: CanvasRenderingContext2D,
    id: number,
    data: NonNullable<ReturnType<typeof getPokemon>>,
    contentY: number,
  ): void {
    // Large sprite
    const sprite = getCachedImage(`/sprites/pokemon/front/${id}.png`);
    const spriteX = 0;
    const spriteY = contentY;
    const spriteSize = 64;
    fillRect(ctx, spriteX - 1, spriteY - 1, spriteSize + 2, spriteSize + 2, '#402020');
    if (sprite) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, spriteX, spriteY, spriteSize, spriteSize);
    } else {
      fillRect(ctx, spriteX, spriteY, spriteSize, spriteSize, '#584040');
    }

    // Type badges below sprite
    let badgeX = spriteX;
    const badgeY = spriteY + spriteSize + 4;
    for (const type of data.types) {
      const color = TYPE_BADGE[type as PokemonType]?.color || '#a8a878';

      const label = TYPE_BADGE[type as PokemonType]?.[getLocale()] || type.toUpperCase();
      const badgeW = label.length * 5 + 6;
      fillRect(ctx, badgeX, badgeY, badgeW, 10, color);
      drawRect(ctx, badgeX, badgeY, badgeW, 10, '#00000044');
      drawText(ctx, label, badgeX + 3, badgeY + 1, { size: 7, color: '#ffffff', font: 'monospace' });
      badgeX += badgeW + 3;
    }

    // Stats panel — starts at contentY + 8 (just below name), 13px row spacing
    const statsX = 66;
    const statsY = contentY + 8;
    const statNames = ['HP', 'ATK', 'DEF', 'SP.A', 'SP.D', 'SPD'];
    const statValues = [
      data.stats.hp,
      data.stats.attack,
      data.stats.defense,
      data.stats.specialAttack,
      data.stats.specialDefense,
      data.stats.speed,
    ];
    const statColors = ['#f85888', '#f08030', '#f8d030', '#6890f0', '#78c850', '#f85888'];
    const maxStat = 255;
    const barMaxW = 80;
    const statRowH = 13;

    for (let i = 0; i < statNames.length; i++) {
      const sy = statsY + i * statRowH;
      drawText(ctx, statNames[i], statsX, sy, { size: 7, color: '#cccccc', font: 'monospace' });
      drawText(ctx, String(statValues[i]), statsX + 32, sy, { size: 7, color: '#ffffff', font: 'monospace' });

      // Stat bar
      const barX = statsX + 50;
      fillRect(ctx, barX, sy + 2, barMaxW, 5, '#402020');
      const barW = Math.floor((statValues[i] / maxStat) * barMaxW);
      fillRect(ctx, barX, sy + 2, barW, 5, statColors[i]);
    }

    // Height/Weight right after last stat row
    const totalStat = statValues.reduce((a, b) => a + b, 0);
    const afterStatsY = statsY + statNames.length * statRowH + 2;
    drawText(ctx, `BST: ${totalStat}`, statsX, afterStatsY, { size: 6, color: '#aaaaaa', font: 'monospace' });

    renderAbilityPanel(ctx, id, contentY + 82);
  }

  function renderAbilityPanel(ctx: CanvasRenderingContext2D, id: number, panelY: number): void {
    const abilityDetails = getPokemonAbilityDetails(id);
    const panelX = 4;
    const panelW = SCREEN_W - 8;

    fillRect(ctx, panelX, panelY, panelW, 30, '#241010');
    drawRect(ctx, panelX, panelY, panelW, 30, '#5a3030');

    drawText(ctx, t('pokedex.info.abilities'), panelX + 4, panelY + 2, {
      size: 6,
      color: '#f8a878',
      font: 'monospace',
    });

    if (abilityDetails.length === 0) {
      drawText(ctx, t('pokedex.info.noAbilities'), panelX + 4, panelY + 12, {
        size: 6,
        color: '#999999',
        font: 'monospace',
      });
      return;
    }

    const nameColumnX = panelX + 6;
    const nameColumnW = 70;
    const descColumnX = panelX + 80;
    const descColumnW = panelW - 88;

    for (let i = 0; i < Math.min(abilityDetails.length, 3); i++) {
      const ability = abilityDetails[i];
      const rowY = panelY + 10 + i * 7;
      const abilityName = getLocalizedName(ability.name);
      const abilityLabel = ability.isHidden ? `${abilityName} (${t('pokedex.info.hiddenAbility')})` : abilityName;

      drawText(ctx, truncateText(ctx, abilityLabel, nameColumnW, 5), nameColumnX, rowY, {
        size: 5,
        color: ability.isHidden ? '#f0c860' : '#ffffff',
        font: 'monospace',
      });
      drawText(ctx, truncateText(ctx, getLocalizedName(ability.description), descColumnW, 5), descColumnX, rowY, {
        size: 5,
        color: '#cccccc',
        font: 'monospace',
      });
    }
  }

  function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string {
    ctx.save();
    ctx.font = `${fontSize}px monospace`;
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.restore();
      return text;
    }

    let end = text.length;
    while (end > 0) {
      const candidate = `${text.slice(0, end).trimEnd()}...`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        ctx.restore();
        return candidate;
      }
      end--;
    }

    ctx.restore();
    return '...';
  }

  function renderEvolutionTab(ctx: CanvasRenderingContext2D, id: number, contentY: number): void {
    const chain = getEvolutionChain(id);

    if (!chain || chain.stages.length <= 1) {
      drawText(ctx, t('pokedex.evo.none'), SCREEN_W / 2, contentY + 40, {
        size: 8,
        color: '#807070',
        font: 'monospace',
        align: 'center',
      });
      return;
    }

    const stages = chain.stages;
    const spriteSize = 32;
    const arrowSpace = 30;
    const stageWidth = spriteSize + arrowSpace;
    const totalWidth = stages.length * spriteSize + (stages.length - 1) * arrowSpace;
    const startX = Math.max(4, Math.floor((SCREEN_W - totalWidth) / 2));
    const centerY = contentY + 20;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const x = startX + i * stageWidth;
      const isCurrent = stage.id === id;

      // Background highlight for current stage
      if (isCurrent) {
        fillRect(ctx, x - 2, centerY - 2, spriteSize + 4, spriteSize + 4, '#582828');
        drawRect(ctx, x - 2, centerY - 2, spriteSize + 4, spriteSize + 4, '#f8a878');
      } else {
        fillRect(ctx, x - 1, centerY - 1, spriteSize + 2, spriteSize + 2, '#402020');
      }

      // Sprite
      const sprite = getCachedImage(`/sprites/pokemon/front/${stage.id}.png`);
      if (sprite) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sprite, x, centerY, spriteSize, spriteSize);
        ctx.imageSmoothingEnabled = false;
      } else {
        fillRect(ctx, x, centerY, spriteSize, spriteSize, '#584040');
        loadImage(`/sprites/pokemon/front/${stage.id}.png`).catch(() => {});
      }

      // Name below sprite
      const name = getPokemonDisplayName(stage.id);
      const nameColor = isCurrent ? '#f8a878' : '#cccccc';
      drawText(ctx, name, x + spriteSize / 2, centerY + spriteSize + 4, {
        size: 6,
        color: nameColor,
        font: 'monospace',
        align: 'center',
      });

      // Arrow and evolution info between stages
      if (i < stages.length - 1) {
        const nextStage = stages[i + 1];
        const arrowX = x + spriteSize + 2;
        const arrowY = centerY + spriteSize / 2 - 4;

        drawText(ctx, '\u2192', arrowX + 4, arrowY, { size: 8, color: '#f8a878', font: 'monospace' });

        let evoText = '';
        if (nextStage.minLevel) {
          evoText = `Lv.${nextStage.minLevel}`;
        } else if (nextStage.item) {
          evoText = nextStage.item;
        } else if (nextStage.trigger) {
          evoText = nextStage.trigger;
        }
        if (evoText) {
          drawText(ctx, evoText, arrowX + 4, arrowY + 10, {
            size: 5,
            color: '#a08080',
            font: 'monospace',
          });
        }
      }
    }
  }

  function renderTypeTab(
    ctx: CanvasRenderingContext2D,
    data: NonNullable<ReturnType<typeof getPokemon>>,
    contentY: number,
    _contentH: number,
  ): void {
    const pokemonTypes = data.types as PokemonType[];
    const allTypes = getAllTypes() as PokemonType[];

    // Calculate type matchups
    const weakTo: string[] = [];
    const resists: string[] = [];
    const immune: string[] = [];
    const strongVs: string[] = [];

    for (const atkType of allTypes) {
      let mult = 1;
      for (const defType of pokemonTypes) {
        mult *= getTypeEffectiveness(atkType, defType);
      }
      if (mult >= 2) weakTo.push(atkType);
      else if (mult > 0 && mult < 1) resists.push(atkType);
      else if (mult === 0) immune.push(atkType);
    }

    // Strong vs: types this Pokemon's types are super effective against
    for (const myType of pokemonTypes) {
      for (const defType of allTypes) {
        const eff = getTypeEffectiveness(myType, defType);
        if (eff >= 2 && !strongVs.includes(defType)) {
          strongVs.push(defType);
        }
      }
    }

    let y = contentY;

    function drawTypeMatchupSection(label: string, types: string[]): void {
      if (types.length === 0) return;
      drawText(ctx, label, 4, y, { size: 7, color: '#f8a878', font: 'monospace' });
      y += 11;

      let x = 4;
      for (const type of types) {
        const typeData = TYPE_BADGE[type as PokemonType];
        const color = typeData?.color || '#a8a878';
        const localLang = getLocale();
        const badgeLabel = typeData ? typeData[localLang] : type.toUpperCase();
        const badgeW = badgeLabel.length * (localLang === 'en' ? 5 : 4) + 6;

        // Wrap to next line if needed
        if (x + badgeW > SCREEN_W - 4) {
          x = 4;
          y += 12;
        }

        fillRect(ctx, x, y, badgeW, 9, color);
        drawRect(ctx, x, y, badgeW, 9, '#00000044');
        drawText(ctx, badgeLabel, x + (localLang === 'en' ? 3 : 5), y + (localLang === 'en' ? 1 : 2), {
          size: 6,
          color: '#ffffff',
          font: 'monospace',
        });
        x += badgeW + 3;
      }
      y += 14;
    }

    drawTypeMatchupSection(t('pokedex.type.weakTo'), weakTo);
    drawTypeMatchupSection(t('pokedex.type.resists'), resists);
    drawTypeMatchupSection(t('pokedex.type.immune'), immune);
    drawTypeMatchupSection(t('pokedex.type.strongVs'), strongVs);
  }

  function renderMovesTab(ctx: CanvasRenderingContext2D, pokemonId: number, contentY: number, contentH: number): void {
    // Sub-tab labels
    const subTabY = contentY;
    const subTabW = 80;
    const subTabs: [MovesSubTab, string][] = [
      ['byLevel', `1: ${t('pokedex.moves.byLevel')}`],
      ['canLearn', `2: ${t('pokedex.moves.canLearn')}`],
    ];

    for (let i = 0; i < subTabs.length; i++) {
      const [tab, label] = subTabs[i];
      const sx = 4 + i * (subTabW + 4);
      const active = tab === movesSubTab;
      if (active) {
        fillRect(ctx, sx, subTabY, subTabW, 10, '#582828');
        drawRect(ctx, sx, subTabY, subTabW, 10, '#f8a878');
      } else {
        fillRect(ctx, sx, subTabY, subTabW, 10, '#402020');
      }
      drawText(ctx, label, sx + subTabW / 2, subTabY + 1, {
        size: 6,
        color: active ? '#f8a878' : '#777777',
        font: 'monospace',
        align: 'center',
      });
    }

    const tableY = subTabY + 14;
    const rowH = 10;
    const maxVisibleRows = Math.floor((contentH - 14 - rowH) / rowH);

    // Column positions
    const colLv = 4;
    const colName = 28;
    const colClass = 118;
    const colType = 138;
    const colAcc = 168;
    const colPow = 196;

    // Header row
    const headerColor = '#f8a878';
    const isLevelTab = movesSubTab === 'byLevel';
    drawText(ctx, isLevelTab ? t('pokedex.moves.header.lv') : t('pokedex.moves.header.tm'), colLv, tableY, {
      size: 6,
      color: headerColor,
      font: 'monospace',
    });
    drawText(ctx, t('pokedex.moves.header.move'), colName, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.class'), colClass, tableY, {
      size: 6,
      color: headerColor,
      font: 'monospace',
    });
    drawText(ctx, t('pokedex.moves.header.type'), colType, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.acc'), colAcc, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.pow'), colPow, tableY, { size: 6, color: headerColor, font: 'monospace' });

    // Divider line
    fillRect(ctx, 4, tableY + 8, SCREEN_W - 8, 1, '#584040');

    const dataY = tableY + rowH + 2;

    // Build sorted list for current sub-tab
    type MoveEntry = { moveId: number; levelLearned?: number };
    const sorted: MoveEntry[] =
      movesSubTab === 'byLevel'
        ? [...getLearnset(pokemonId)].sort((a, b) => a.levelLearned - b.levelLearned)
        : [...getTmLearnset(pokemonId)].sort((a, b) =>
            getMoveDisplayName(a.moveId).localeCompare(getMoveDisplayName(b.moveId)),
          );

    if (sorted.length === 0) {
      drawText(ctx, t('pokedex.moves.noData'), SCREEN_W / 2, dataY + 10, {
        size: 7,
        color: '#807070',
        font: 'monospace',
        align: 'center',
      });
      return;
    }

    // Clamp scroll and cursor
    const maxScroll = Math.max(0, sorted.length - maxVisibleRows);
    if (movesScrollOffset > maxScroll) movesScrollOffset = maxScroll;
    if (movesCursor >= sorted.length) movesCursor = sorted.length - 1;

    for (let i = 0; i < maxVisibleRows; i++) {
      const idx = movesScrollOffset + i;
      if (idx >= sorted.length) break;

      const entry = sorted[idx];
      const move = getMove(entry.moveId);
      const ry = dataY + i * rowH;

      // Row background — cursor row highlighted, alternating otherwise
      if (idx === movesCursor) {
        fillRect(ctx, 2, ry - 1, SCREEN_W - 4, rowH, '#583838');
        drawRect(ctx, 2, ry - 1, SCREEN_W - 4, rowH, '#f8a878');
      } else if (i % 2 === 0) {
        fillRect(ctx, 2, ry - 1, SCREEN_W - 4, rowH, '#381818');
      }

      // Level or TM label
      if (isLevelTab) {
        drawText(ctx, String(entry.levelLearned), colLv, ry, { size: 6, color: '#ffffff', font: 'monospace' });
      } else {
        const tmLabel = getTMLabelForMoveId(entry.moveId)?.slice(0, 4) ?? 'TM';
        drawText(ctx, tmLabel, colLv, ry, { size: 6, color: '#a0c0ff', font: 'monospace' });
      }

      // Move name (localized)
      const moveName = getMoveDisplayName(entry.moveId);
      drawText(ctx, moveName, colName, ry, { size: 6, color: '#ffffff', font: 'monospace' });

      if (move) {
        const classSymbol = getDamageClassSymbol(move.power, move.type);
        drawText(ctx, classSymbol, colClass, ry, { size: 6, color: '#cccccc', font: 'monospace' });
        drawTypeBadge(ctx, move.type as PokemonType, colType, ry, 'short');
        drawText(ctx, move.accuracy !== null ? String(move.accuracy) : '\u2014', colAcc, ry, {
          size: 6,
          color: '#ffffff',
          font: 'monospace',
        });
        drawText(ctx, move.power !== null && move.power > 0 ? String(move.power) : '\u2014', colPow, ry, {
          size: 6,
          color: '#ffffff',
          font: 'monospace',
        });
      }
    }

    // Scroll indicators
    if (movesScrollOffset > 0) {
      drawText(ctx, '\u25b2', SCREEN_W - 10, dataY - 2, { size: 6, color: '#f8a878', font: 'monospace' });
    }
    if (movesScrollOffset + maxVisibleRows < sorted.length) {
      drawText(ctx, '\u25bc', SCREEN_W - 10, dataY + maxVisibleRows * rowH, {
        size: 6,
        color: '#f8a878',
        font: 'monospace',
      });
    }

    // Move detail popup
    if (movesDetailOpen && movesCursor < sorted.length) {
      const entry = sorted[movesCursor];
      const moveData = getMove(entry.moveId);
      if (moveData) {
        const mx = 8,
          my = 18,
          mw = 224,
          mh = 114;
        fillRect(ctx, 0, 14, SCREEN_W, SCREEN_H - 14, '#000000cc');
        fillRect(ctx, mx, my, mw, mh, '#301818');
        drawRect(ctx, mx, my, mw, mh, '#f8a878');

        // Move name (right side) + type badge (left side)
        const moveName = getMoveDisplayName(entry.moveId);
        drawText(ctx, moveName, mx + mw - 6, my + 4, { size: 8, color: '#ffffff', font: 'monospace', align: 'right' });
        drawTypeBadge(ctx, moveData.type as PokemonType, mx + 6, my + 4, 'short');

        // Separator
        fillRect(ctx, mx + 4, my + 17, mw - 8, 1, '#584040');

        // Stats row: class symbol + POW / ACC / PP
        const statsY = my + 21;
        const classSymbol = getDamageClassSymbol(moveData.power, moveData.type);
        const pow = moveData.power !== null && moveData.power > 0 ? String(moveData.power) : '\u2014';
        const acc = moveData.accuracy !== null ? moveData.accuracy + '%' : '\u2014';
        drawText(ctx, classSymbol, mx + 6, statsY, { size: 7, color: '#cccccc', font: 'monospace' });
        drawText(ctx, `POW: ${pow}`, mx + 20, statsY, { size: 6, color: '#aaddaa', font: 'monospace' });
        drawText(ctx, `ACC: ${acc}`, mx + 76, statsY, { size: 6, color: '#aaddaa', font: 'monospace' });
        drawText(ctx, `PP: ${moveData.pp}`, mx + 136, statsY, { size: 6, color: '#aaddaa', font: 'monospace' });

        // Separator
        fillRect(ctx, mx + 4, statsY + 12, mw - 8, 1, '#584040');

        // Description (word-wrapped, aligned to locale direction)
        const desc = getLocalizedName(moveData.description);
        const popupRtl = isRTL();
        const maxChars = 36;
        const descX = popupRtl ? mx + mw - 6 : mx + 6;
        const descAlign = popupRtl ? 'right' : 'left';
        let dy = statsY + 16;
        if (desc) {
          const words = desc.split(' ');
          let line = '';
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (test.length > maxChars && line) {
              drawText(ctx, line, descX, dy, { size: 6, color: '#c0b0a0', font: 'monospace', align: descAlign });
              dy += 8;
              line = word;
            } else {
              line = test;
            }
            if (dy > my + mh - 14) break;
          }
          if (line && dy <= my + mh - 14) {
            drawText(ctx, line, descX, dy, { size: 6, color: '#c0b0a0', font: 'monospace', align: descAlign });
          }
        }

        // ESC hint
        fillRect(ctx, mx + 4, my + mh - 11, mw - 8, 1, '#584040');
        drawText(ctx, popupRtl ? 'ESC: \u05e1\u05d2\u05d5\u05e8' : 'ESC: Close', mx + mw - 6, my + mh - 8, {
          size: 6,
          color: '#888888',
          font: 'monospace',
          align: 'right',
        });
      }
    }
  }
}

/**
 * Infer damage class from move power and type.
 * Pre-Gen 4 split: physical types vs special types.
 * Returns symbol: ⚔ PHY / ◆ SPC / ☆ STA
 */
const PHYSICAL_TYPES = new Set(['normal', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'steel']);

function getDamageClassSymbol(power: number | null, type: string): string {
  if (power === null || power === 0) return '\u2606'; // ☆ Status
  if (PHYSICAL_TYPES.has(type)) return '\u2694'; // ⚔ Physical
  return '\u25c6'; // ◆ Special
}
