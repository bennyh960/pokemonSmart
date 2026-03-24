/**
 * PartyScene - Pokemon party management screen.
 *
 * Shows up to 6 Pokemon in a vertical list with sprites, names, levels, HP bars, and type badges.
 * Enter opens detail view with STATS and MOVES sub-screens.
 * Moves sub-screen has a proper table with columns, move swap, and delete.
 * Swap mode lets reorder party. P key from overworld pushes this scene; Escape pops back.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPokemonDisplayName, getMoveDisplayName, getMove, getPokemonHeight, getPokemonWeight } from '../services/pokemon-data.js';
import { getTypeName, getDamageClassLabel } from '../data/type-constants.js';
import { getPlayerData } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';

const MAX_PARTY = 6;
const SLOT_HEIGHT = 22;
const SLOT_START_Y = 16;
const SLOT_X = 4;
const SLOT_W = SCREEN_W - 8;

/** Type badge color palette. */
const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  glitch: '#ff00ff',
};


type ViewMode = 'list' | 'detail' | 'swap';
type DetailTab = 'stats' | 'moves';
type MoveAction = 'swap' | 'delete' | 'cancel';
type PartyMode = 'overworld' | 'battle' | 'select-target';

const MOVE_ACTIONS: MoveAction[] = ['swap', 'delete', 'cancel'];

let partyMode: PartyMode = 'overworld';
let onSelectCallback: ((index: number) => void) | null = null;

/** Index of the Pokemon selected in battle/select-target mode (-1 = none). */
export let selectedPartyIndex: number = -1;

export function setPartyMode(mode: PartyMode, callback?: (index: number) => void): void {
  partyMode = mode;
  onSelectCallback = callback ?? null;
  selectedPartyIndex = -1;
}

export function clearSelectedPartyIndex(): void {
  selectedPartyIndex = -1;
}

export function createPartyScene(input: InputManager, stateMachine: StateMachine): Scene {
  let cursor = 0;
  let viewMode: ViewMode = 'list';
  let swapFrom = -1;

  // Detail sub-screen state
  let detailTab: DetailTab = 'stats';
  let moveCursor = 0;
  let moveActionMenuOpen = false;
  let moveActionCursor = 0;
  let moveSwapFrom = -1;
  let moveMessage = '';
  let moveMessageTimer = 0;

  function getParty(): Pokemon[] {
    return getPlayerData().party;
  }

  function loadPartySprites(): void {
    const party = getParty();
    for (const pokemon of party) {
      const frontUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
      const iconUrl = `/sprites/pokemon/icons/${pokemon.id}.png`;
      if (!getCachedImage(frontUrl)) loadImage(frontUrl).catch(() => {});
      if (!getCachedImage(iconUrl)) loadImage(iconUrl).catch(() => {});
    }
  }

  function getHpColor(ratio: number): string {
    if (ratio > 0.5) return '#20d860';
    if (ratio > 0.2) return '#f8c030';
    return '#f84038';
  }

  function renderSlot(ctx: CanvasRenderingContext2D, pokemon: Pokemon | null, index: number, isSelected: boolean, isSwapSource: boolean): void {
    const y = SLOT_START_Y + index * SLOT_HEIGHT;
    const bgColor = isSelected ? '#303060' : '#202040';

    fillRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, bgColor);

    if (isSwapSource) {
      drawRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, '#f8c030', 1);
    }

    if (!pokemon) {
      drawText(ctx, t('party.empty'), SLOT_X + 28, y + 7, { size: 8, color: '#666688' });
      return;
    }

    // Sprite (front sprite scaled for party list)
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprite, SLOT_X - 8, y - 10, 40, 40);
      ctx.imageSmoothingEnabled = false;
    } else {
      fillRect(ctx, SLOT_X + 2, y + 1, 18, 18, '#445566');
    }

    // Name + Level
    const nameText = `${getPokemonDisplayName(pokemon.id)} Lv.${pokemon.level}`;
    drawText(ctx, nameText, SLOT_X + 24, y + 1, { size: 8, color: '#ffffff' });

    // HP bar
    const hpBarX = SLOT_X + 24;
    const hpBarY = y + 11;
    const hpBarW = 60;
    const hpBarH = 3;
    fillRect(ctx, hpBarX, hpBarY, hpBarW, hpBarH, '#303030');
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.floor(hpBarW * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) {
      fillRect(ctx, hpBarX, hpBarY, hpFillW, hpBarH, getHpColor(hpRatio));
    }

    // HP numbers
    drawText(ctx, `${pokemon.hp}/${pokemon.maxHp}`, hpBarX + hpBarW + 2, hpBarY - 2, { size: 7, color: '#aaaacc' });

    // Type badges
    let typeX = SLOT_X + 160;
    for (const pType of pokemon.types) {
      const color = TYPE_COLORS[pType] || '#888888';
      const badgeW = 30;
      fillRect(ctx, typeX, y + 2, badgeW, 8, color);
      drawText(ctx, pType.toUpperCase().slice(0, 4), typeX + 1, y + 2, { size: 7, color: '#ffffff' });
      typeX += badgeW + 2;
    }
  }

  function renderListView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();

    // Title
    const title = viewMode === 'swap' ? t('party.swap') : t('party.title');
    drawText(ctx, title, SCREEN_W / 2, 3, { size: 8, color: '#ffffff', align: 'center' });

    // Slots
    for (let i = 0; i < MAX_PARTY; i++) {
      const pokemon = i < party.length ? party[i] : null;
      renderSlot(ctx, pokemon, i, i === cursor, viewMode === 'swap' && i === swapFrom);
    }

    // Controls hint
    drawText(ctx, 'ESC:Back  ENTER:Detail/Swap', SLOT_X, SCREEN_H - 10, { size: 7, color: '#666688' });
  }

  // ═══════════════════════════════════════════════════════════════════
  // COLORS — from canvas_coordinates.md
  // ═══════════════════════════════════════════════════════════════════
  const C = {
    BG: '#0d1a14', CARD_BG: '#0f2a1a', CARD_SEL: '#1a3a2a',
    BORDER: '#1a4a30', SEP: '#1a3a2a', TEXT_PRI: '#ffffff',
    TEXT_SEC: '#aaccaa', TEXT_MUT: '#667766', TEXT_DIM: '#445544',
    BAR_HP: '#20d860', BAR_TRACK: '#1a3a2a', BAR_XP: '#5080ff',
    BAR_PP: '#20a0d8', TAB_BG: '#0a2a1a', TAB_ACT: '#1a5a35',
    BTM_BG: '#0a1a10', KEY_BG: '#1a3a2a', KEY_BRD: '#2a5a3a',
    BORDER_SEL: '#f8c030',
  };

  // Damage class colors/symbols come from getDamageClassLabel() in type-constants.ts

  function renderDetailStatsTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    // ── Sprite container (right side) ──
    fillRect(ctx, 184, 18, 44, 44, '#0a2a1a');
    drawRect(ctx, 184, 18, 44, 44, C.BORDER);
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, 186, 20, 40, 40);
    }

    // ── Name (centered in left 168px area) ──
    drawText(ctx, getPokemonDisplayName(pokemon.id), 96, 22, { size: 10, color: C.TEXT_PRI, font: 'monospace', align: 'center' });

    // ── Level ──
    drawText(ctx, `${t('party.stats.level')} ${pokemon.level}`, 96, 34, { size: 7, color: C.TEXT_MUT, font: 'monospace', align: 'center' });

    // ── Type badges (centered, y=44) ──
    const typeLabels = pokemon.types.map(pt => ({ type: pt, label: getTypeName(pt) }));
    // Each badge is 28px wide, 4px gap between them
    const badgeW = 28;
    const badgeGap = 4;
    const totalW = typeLabels.length * badgeW + (typeLabels.length - 1) * badgeGap;
    let bx = Math.floor(96 - totalW / 2);
    for (const tl of typeLabels) {
      const color = TYPE_COLORS[tl.type] || '#888888';
      fillRect(ctx, bx, 44, badgeW, 9, color);
      drawText(ctx, tl.label, bx + badgeW / 2, 45, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
      bx += badgeW + badgeGap;
    }

    // ── Height / Weight (centered, y=56) ──
    const hVal = getPokemonHeight(pokemon.id);
    const wVal = getPokemonWeight(pokemon.id);
    const hStr = hVal !== '?' ? t('party.height', { value: hVal, unit: t('party.unit.meter') }) : '';
    const wStr = wVal !== '?' ? t('party.weight', { value: wVal, unit: t('party.unit.kg') }) : '';
    const hwLine = [hStr, wStr].filter(Boolean).join('  ·  ');
    if (hwLine) {
      drawText(ctx, hwLine, 96, 56, { size: 6, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    }

    // ── Separator 1 ──
    fillRect(ctx, 8, 64, 224, 1, C.SEP);

    // ── HP section ──
    drawText(ctx, 'HP', 228, 68, { size: 7, color: C.TEXT_SEC, font: 'monospace', align: 'right' });
    drawText(ctx, `${pokemon.hp}`, 12, 67, { size: 10, color: C.TEXT_PRI, font: 'monospace' });
    drawText(ctx, `/ ${pokemon.maxHp}`, 30, 69, { size: 7, color: C.TEXT_MUT, font: 'monospace' });
    // HP bar
    fillRect(ctx, 12, 78, 216, 3, C.BAR_TRACK);
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.round(216 * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) fillRect(ctx, 12, 78, hpFillW, 3, C.BAR_HP);

    // ── XP row ──
    drawText(ctx, t('party.xpLabel'), 228, 84, { size: 6, color: C.TEXT_DIM, font: 'monospace', align: 'right' });
    drawText(ctx, `${pokemon.xp} / ${pokemon.xpToNext}`, 12, 84, { size: 6, color: C.TEXT_DIM, font: 'monospace' });

    // ── Separator 2 ──
    fillRect(ctx, 8, 91, 224, 1, C.SEP);

    // ── Base Stats header ──
    drawText(ctx, t('party.baseStats'), 228, 94, { size: 7, color: C.TEXT_MUT, font: 'monospace', align: 'right' });

    // ── Stat rows ──
    const statRows: [string, number, string, number][] = [
      [t('party.stats.hp'),      pokemon.maxHp,           '#20d860', 103],
      [t('party.stats.attack'),  pokemon.attack,          '#f08030', 111],
      [t('party.stats.defense'), pokemon.defense,         '#6890f0', 119],
      [t('party.stats.spAtk'),   pokemon.specialAttack,   '#a040a0', 127],
      [t('party.stats.spDef'),   pokemon.specialDefense,  '#f8d030', 135],
      [t('party.stats.speed'),   pokemon.speed,           '#f85888', 143],
    ];

    for (const [label, value, color, rowY] of statRows) {
      // Bar track + fill
      fillRect(ctx, 12, rowY + 2, 124, 3, C.BAR_TRACK);
      const fill = Math.max(1, Math.round((value / 150) * 124));
      fillRect(ctx, 12, rowY + 2, fill, 3, color);
      // Value (centered at x=154)
      drawText(ctx, String(value), 154, rowY, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
      // Label (right-aligned at x=228)
      drawText(ctx, label, 228, rowY, { size: 7, color: C.TEXT_SEC, font: 'monospace', align: 'right' });
    }
  }

  function renderDetailMovesTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    // ── Sub-header ──
    drawText(ctx, t('party.moves.battleMoves'), 228, 16, { size: 7, color: C.TEXT_MUT, font: 'monospace', align: 'right' });
    drawText(ctx, `${pokemon.moves.length} ${t('party.moves.title')}`, 12, 16, { size: 6, color: C.TEXT_DIM, font: 'monospace' });

    // ── Move cards: each 14px tall, 1px gap, starting at y=26 ──
    const maxVisible = Math.min(pokemon.moves.length, 8);

    for (let i = 0; i < maxVisible; i++) {
      const move = pokemon.moves[i];
      const cy = 26 + i * 15; // cardY = 26 + i*15 (14px card + 1px gap)
      const isSelected = i === moveCursor;
      const isSwapSource = i === moveSwapFrom;

      // Card background (x=4, w=232, h=14)
      fillRect(ctx, 4, cy, 232, 14, isSelected ? C.CARD_SEL : C.CARD_BG);
      drawRect(ctx, 4, cy, 232, 14, isSwapSource ? C.BORDER_SEL : C.BORDER);

      // ── Damage class dot (moved 15px right from original, now at relX=232) ──
      const moveData = getMove(move.id);
      const dc = moveData?.damageClass || (move.power > 0 ? 'physical' : 'status');
      const dcInfo = getDamageClassLabel(dc);
      ctx.beginPath();
      ctx.arc(230, cy + 4 + 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = dcInfo.color;
      ctx.fill();

      // ── Move name (relX=120, relY=+1, w=83, align=right — narrower to avoid dot overlap) ──
      const moveName = getMoveDisplayName(move.id);
      drawText(ctx, moveName, 225, cy + 1, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'right' });

      // ── Type badge (relX=93, relY=+2, w=22, h=7) ──
      const typeLabel = getTypeName(move.type as PokemonType);
      const typeColor = TYPE_COLORS[move.type] || '#888888';
      fillRect(ctx, 4 + 93, cy + 2, 22, 7, typeColor);
      drawText(ctx, typeLabel, 4 + 93 + 11, cy + 4, { size: 5, color: C.TEXT_PRI, font: 'monospace', align: 'center' });

      // ── Sub-stats: fixed-width columns for acc% and pow (relY=+9, align=right) ──
      const accVal = move.accuracy > 0 ? move.accuracy : 100;
      const powVal = move.power > 0 ? move.power : 0;
      const accStr = `${accVal}%`;
      const powStr = `${powVal}%`;
      // Render as two fixed-width fields with labels, right-aligned
      drawText(ctx, `${t('party.moves.header.acc')}: ${accStr}`, 185, cy + 9, { size: 5, color: C.TEXT_DIM, font: 'monospace', align: 'right' });
      drawText(ctx, `${t('party.moves.header.pow')}: ${powStr}`, 225, cy + 9, { size: 5, color: C.TEXT_DIM, font: 'monospace', align: 'right' });

      // ── PP text (relX=8, relY=+2) ──
      drawText(ctx, `${move.currentPp}/${move.pp}`, 4 + 8, cy + 2, { size: 6, color: C.TEXT_SEC, font: 'monospace' });

      // ── PP bar (relX=8, relY=+10, w=30, h=2) ──
      fillRect(ctx, 4 + 8, cy + 10, 30, 2, C.BAR_TRACK);
      const ppRatio = move.pp > 0 ? move.currentPp / move.pp : 0;
      const ppFillW = Math.round(30 * Math.max(0, Math.min(1, ppRatio)));
      if (ppFillW > 0) fillRect(ctx, 4 + 8, cy + 10, ppFillW, 2, C.BAR_PP);
    }

    // ── Action menu overlay ──
    if (moveActionMenuOpen) {
      const menuW = 70;
      const menuH = MOVE_ACTIONS.length * 12 + 6;
      const menuX = SCREEN_W / 2 - menuW / 2;
      const menuY = SCREEN_H / 2 - menuH / 2;

      fillRect(ctx, menuX - 1, menuY - 1, menuW + 2, menuH + 2, '#000000aa');
      fillRect(ctx, menuX, menuY, menuW, menuH, C.BG);
      drawRect(ctx, menuX, menuY, menuW, menuH, '#2a6a40');

      for (let i = 0; i < MOVE_ACTIONS.length; i++) {
        const action = MOVE_ACTIONS[i];
        const isSel = i === moveActionCursor;
        const ay = menuY + 4 + i * 12;
        if (isSel) fillRect(ctx, menuX + 2, ay - 1, menuW - 4, 11, C.CARD_SEL);
        let label: string;
        if (action === 'swap') label = t('party.moves.swap');
        else if (action === 'delete') label = t('party.moves.delete');
        else label = t('party.moves.cancel');
        drawText(ctx, label, menuX + menuW / 2, ay + 1, { size: 7, color: isSel ? C.TEXT_PRI : C.TEXT_MUT, align: 'center' });
      }
    }

    // ── Temporary message ──
    if (moveMessage && moveMessageTimer > 0) {
      fillRect(ctx, 8, 136, 224, 10, '#3a1a1a');
      drawText(ctx, moveMessage, 120, 137, { size: 7, color: '#ff6666', align: 'center' });
    }
  }

  function renderDetailView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    // Tab bar — exact from canvas_coordinates.md
    fillRect(ctx, 0, 0, 240, 14, C.BG);
    fillRect(ctx, 44, 2, 152, 10, C.TAB_BG);
    drawRect(ctx, 44, 2, 152, 10, C.BORDER);
    if (detailTab === 'stats') {
      fillRect(ctx, 118, 2, 76, 10, C.TAB_ACT);
      drawText(ctx, t('party.baseStats'), 156, 3, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
      drawText(ctx, t('party.moves.title'), 81, 3, { size: 7, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    } else {
      fillRect(ctx, 46, 2, 70, 10, C.TAB_ACT);
      drawText(ctx, t('party.moves.title'), 81, 3, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
      drawText(ctx, t('party.baseStats'), 156, 3, { size: 7, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    }

    // Tab content
    if (detailTab === 'stats') {
      renderDetailStatsTab(ctx, pokemon);
    } else {
      renderDetailMovesTab(ctx, pokemon);
    }

    // Bottom hint bar — exact from canvas_coordinates.md
    fillRect(ctx, 0, 150, 240, 10, C.BTM_BG);
    // ESC pill
    fillRect(ctx, 8, 151, 20, 8, C.KEY_BG);
    drawRect(ctx, 8, 151, 20, 8, C.KEY_BRD);
    drawText(ctx, 'ESC', 18, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.hint.back'), 30, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Arrows pill
    fillRect(ctx, 62, 151, 18, 8, C.KEY_BG);
    drawRect(ctx, 62, 151, 18, 8, C.KEY_BRD);
    drawText(ctx, '\u25c0\u25b6', 71, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.hint.switchTab'), 82, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Enter pill (only on moves tab)
    if (detailTab === 'moves') {
      fillRect(ctx, 114, 151, 26, 8, C.KEY_BG);
      drawRect(ctx, 114, 151, 26, 8, C.KEY_BRD);
      drawText(ctx, 'Enter', 127, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
      drawText(ctx, t('party.hint.action'), 142, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    }
  }

  function updateDetailView(dt: number): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    // Decrement message timer
    if (moveMessageTimer > 0) {
      moveMessageTimer -= dt;
      if (moveMessageTimer <= 0) {
        moveMessage = '';
        moveMessageTimer = 0;
      }
    }

    // Handle action menu if open
    if (moveActionMenuOpen) {
      if (input.isKeyPressed('Escape')) {
        moveActionMenuOpen = false;
        return;
      }
      if (input.isKeyPressed('ArrowUp')) {
        moveActionCursor = moveActionCursor > 0 ? moveActionCursor - 1 : MOVE_ACTIONS.length - 1;
        return;
      }
      if (input.isKeyPressed('ArrowDown')) {
        moveActionCursor = moveActionCursor < MOVE_ACTIONS.length - 1 ? moveActionCursor + 1 : 0;
        return;
      }
      if (input.isKeyPressed('Enter')) {
        const action = MOVE_ACTIONS[moveActionCursor];
        if (action === 'swap') {
          moveSwapFrom = moveCursor;
          moveActionMenuOpen = false;
        } else if (action === 'delete') {
          if (pokemon.moves.length <= 1) {
            moveMessage = t('party.moves.cantDeleteLast');
            moveMessageTimer = 2;
            moveActionMenuOpen = false;
          } else {
            pokemon.moves.splice(moveCursor, 1);
            if (moveCursor >= pokemon.moves.length) {
              moveCursor = pokemon.moves.length - 1;
            }
            moveActionMenuOpen = false;
          }
        } else {
          // cancel
          moveActionMenuOpen = false;
        }
        return;
      }
      return;
    }

    // Escape: back to list (or cancel move swap)
    if (input.isKeyPressed('Escape')) {
      if (moveSwapFrom >= 0) {
        moveSwapFrom = -1;
      } else {
        viewMode = 'list';
        detailTab = 'stats';
        moveCursor = 0;
      }
      return;
    }

    // Tab switching with Left/Right arrows (not affected by RTL — always physical direction)
    if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('ArrowRight')) {
      // Toggle between stats and moves regardless of direction
      detailTab = detailTab === 'stats' ? 'moves' : 'stats';
      moveCursor = 0;
      moveSwapFrom = -1;
      return;
    }

    // Moves tab navigation
    if (detailTab === 'moves') {
      const moveCount = pokemon.moves.length;

      if (input.isKeyPressed('ArrowUp')) {
        moveCursor = moveCursor > 0 ? moveCursor - 1 : moveCount - 1;
      }
      if (input.isKeyPressed('ArrowDown')) {
        moveCursor = moveCursor < moveCount - 1 ? moveCursor + 1 : 0;
      }

      // Enter: open action menu or complete swap
      if (input.isKeyPressed('Enter')) {
        if (moveSwapFrom >= 0) {
          // Complete move swap
          if (moveSwapFrom !== moveCursor && moveSwapFrom < moveCount) {
            const temp = pokemon.moves[moveSwapFrom];
            pokemon.moves[moveSwapFrom] = pokemon.moves[moveCursor];
            pokemon.moves[moveCursor] = temp;
          }
          moveSwapFrom = -1;
        } else {
          // Open action menu
          moveActionMenuOpen = true;
          moveActionCursor = 0;
        }
      }

      // D key shortcut for delete
      if (input.isKeyPressed('d') || input.isKeyPressed('D')) {
        if (pokemon.moves.length <= 1) {
          moveMessage = t('party.moves.cantDeleteLast');
          moveMessageTimer = 2;
        } else {
          pokemon.moves.splice(moveCursor, 1);
          if (moveCursor >= pokemon.moves.length) {
            moveCursor = pokemon.moves.length - 1;
          }
        }
      }
    }
  }

  return {
    enter(): void {
      cursor = 0;
      viewMode = 'list';
      swapFrom = -1;
      detailTab = 'stats';
      moveCursor = 0;
      moveActionMenuOpen = false;
      moveSwapFrom = -1;
      moveMessage = '';
      moveMessageTimer = 0;
      selectedPartyIndex = -1;
      loadPartySprites();
    },

    exit(): void {},

    update(dt: number): void {
      const party = getParty();
      const partyLen = party.length;

      if (viewMode === 'detail') {
        updateDetailView(dt);
        return;
      }

      // List or swap mode
      if (input.isKeyPressed('Escape')) {
        if (viewMode === 'swap') {
          viewMode = 'list';
          swapFrom = -1;
        } else {
          stateMachine.pop();
        }
        return;
      }

      if (input.isKeyPressed('ArrowUp')) {
        cursor = cursor > 0 ? cursor - 1 : Math.max(0, partyLen - 1);
      }
      if (input.isKeyPressed('ArrowDown')) {
        cursor = cursor < partyLen - 1 ? cursor + 1 : 0;
      }

      if (input.isKeyPressed('Enter')) {
        if (partyLen === 0) return;
        if (cursor >= partyLen) return;

        if (viewMode === 'swap') {
          // Complete the swap
          if (swapFrom !== cursor && swapFrom >= 0 && swapFrom < partyLen) {
            const temp = party[swapFrom];
            party[swapFrom] = party[cursor];
            party[cursor] = temp;
          }
          viewMode = 'list';
          swapFrom = -1;
        } else if (partyMode === 'battle') {
          selectedPartyIndex = cursor;
          stateMachine.pop();
        } else if (partyMode === 'select-target') {
          if (onSelectCallback) onSelectCallback(cursor);
          stateMachine.pop();
        } else {
          // Overworld: open detail
          viewMode = 'detail';
          detailTab = 'stats';
          moveCursor = 0;
          moveSwapFrom = -1;
          moveActionMenuOpen = false;
        }
      }

      // S key to start swap mode
      if (input.isKeyPressed('s') || input.isKeyPressed('S')) {
        if (partyLen > 1 && cursor < partyLen) {
          if (viewMode === 'list') {
            viewMode = 'swap';
            swapFrom = cursor;
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, viewMode === 'detail' ? '#0d1a14' : '#181830');

      if (viewMode === 'detail') {
        renderDetailView(ctx);
      } else {
        renderListView(ctx);
      }
    },
  };
}
