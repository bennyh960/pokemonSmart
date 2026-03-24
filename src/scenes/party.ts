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
// Screen is 240×160 — coordinates hardcoded from party_coordinated.md

const MAX_PARTY = 6;

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

  // Slot Y positions from party_coordinated.md
  // Filled slots: 24px tall. Empty slots: 18px tall.
  // Positions depend on how many Pokemon are in party.
  function getSlotY(index: number, partyLen: number): number {
    // All filled slots stack from y=14, each 24px + 2px gap
    if (index < partyLen) return 14 + index * 26;
    // Empty slots start after last filled
    const afterFilled = 14 + partyLen * 26;
    return afterFilled + (index - partyLen) * 20;
  }
  function getHpColor(ratio: number): string {
    if (ratio >= 0.5) return '#20d860';
    if (ratio >= 0.25) return '#d8a020';
    return '#d84040';
  }

  function renderFilledSlot(ctx: CanvasRenderingContext2D, pokemon: Pokemon, slotNum: number, sy: number, isSel: boolean, isSwap: boolean): void {
    // Card bg
    fillRect(ctx, 4, sy, 232, 24, isSel ? C.CARD_SEL : C.CARD_BG);
    drawRect(ctx, 4, sy, 232, 24, isSwap ? C.BORDER_SEL : (isSel ? '#2a6a40' : C.BORDER));
    // Selection indicator
    if (isSel) fillRect(ctx, 4, sy, 2, 24, '#20d860');

    // Slot number box
    fillRect(ctx, 222, sy + 1, 10, 10, isSel ? 'rgba(32,216,96,0.15)' : 'rgba(255,255,255,0.03)');
    drawText(ctx, `${slotNum}`, 227, sy + 2, { size: 6, color: isSel ? '#20d860' : '#2a3a2a', font: 'monospace', align: 'center' });

    // Sprite box
    fillRect(ctx, 194, sy + 1, 22, 22, C.CARD_BG);
    drawRect(ctx, 194, sy + 1, 22, 22, C.BORDER);
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprite, 196, sy + 3, 18, 18);
      ctx.imageSmoothingEnabled = false;
    }

    // Name (right-aligned)
    drawText(ctx, getPokemonDisplayName(pokemon.id), 190, sy + 2, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'right' });
    // Level
    drawText(ctx, `Lv.${pokemon.level}`, 78, sy + 2, { size: 6, color: C.TEXT_MUT, font: 'monospace', align: 'center' });

    // Type badges (row 2, dy=12)
    const types = pokemon.types;
    if (types.length >= 1) {
      const color1 = TYPE_COLORS[types[0]] || '#888888';
      fillRect(ctx, 162, sy + 12, 18, 7, color1);
      drawText(ctx, getTypeName(types[0]), 171, sy + 12, { size: 5, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
    }
    if (types.length >= 2) {
      const color2 = TYPE_COLORS[types[1]] || '#888888';
      fillRect(ctx, 142, sy + 12, 18, 7, color2);
      drawText(ctx, getTypeName(types[1]), 151, sy + 12, { size: 5, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
    }

    // HP label
    drawText(ctx, 'HP', 86, sy + 12, { size: 5, color: C.TEXT_MUT, font: 'monospace' });
    // HP bar
    fillRect(ctx, 26, sy + 14, 56, 3, C.SEP);
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpW = Math.round(56 * Math.max(0, Math.min(1, hpRatio)));
    if (hpW > 0) fillRect(ctx, 26, sy + 14, hpW, 3, getHpColor(hpRatio));
    // HP value
    drawText(ctx, `${pokemon.hp}/${pokemon.maxHp}`, 8, sy + 12, { size: 5, color: C.TEXT_SEC, font: 'monospace' });
  }

  function renderEmptySlot(ctx: CanvasRenderingContext2D, slotNum: number, sy: number, isSel: boolean): void {
    fillRect(ctx, 4, sy, 232, 18, isSel ? C.CARD_SEL : C.CARD_BG);
    drawRect(ctx, 4, sy, 232, 18, isSel ? '#2a6a40' : C.BORDER);
    if (isSel) fillRect(ctx, 4, sy, 2, 18, '#20d860');
    // Slot number
    fillRect(ctx, 222, sy + 2, 10, 10, isSel ? 'rgba(32,216,96,0.15)' : 'rgba(255,255,255,0.03)');
    drawText(ctx, `${slotNum}`, 227, sy + 3, { size: 6, color: isSel ? '#20d860' : '#2a3a2a', font: 'monospace', align: 'center' });
    // Empty label
    drawText(ctx, '\u2014 \u2014 \u2014', 112, sy + 6, { size: 7, color: '#2a3a2a', font: 'monospace', align: 'center' });
  }

  function renderListView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();

    // ── Title bar (y=0, h=12) ──
    fillRect(ctx, 0, 0, 240, 12, '#0a1a10');
    const title = viewMode === 'swap' ? t('party.swap') : t('party.title');
    drawText(ctx, title, 112, 2, { size: 10, color: C.TEXT_PRI, font: 'monospace', align: 'right' });
    drawText(ctx, `${party.length} / ${MAX_PARTY}`, 200, 4, { size: 6, color: C.TEXT_DIM, font: 'monospace' });

    // ── Slots ──
    for (let i = 0; i < MAX_PARTY; i++) {
      const sy = getSlotY(i, party.length);
      const isSel = i === cursor;
      const isSwap = viewMode === 'swap' && i === swapFrom;

      if (i < party.length) {
        renderFilledSlot(ctx, party[i], i + 1, sy, isSel, isSwap);
      } else {
        renderEmptySlot(ctx, i + 1, sy, isSel);
      }
    }

    // ── Bottom bar ──
    fillRect(ctx, 0, 150, 240, 10, '#0a1a10');
    // ESC
    fillRect(ctx, 8, 151, 20, 8, C.KEY_BG);
    drawRect(ctx, 8, 151, 20, 8, C.KEY_BRD);
    drawText(ctx, 'ESC', 18, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.hint.back'), 30, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Enter
    fillRect(ctx, 62, 151, 26, 8, C.KEY_BG);
    drawRect(ctx, 62, 151, 26, 8, C.KEY_BRD);
    drawText(ctx, 'Enter', 75, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.hint.details') || 'Details', 90, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Arrows
    fillRect(ctx, 126, 151, 18, 8, C.KEY_BG);
    drawRect(ctx, 126, 151, 18, 8, C.KEY_BRD);
    drawText(ctx, '\u25b2\u25bc', 135, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('bag.hint.navigate') || 'Nav', 146, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
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

    // ── Action menu overlay with move info ──
    if (moveActionMenuOpen) {
      const move = pokemon.moves[moveCursor];
      const moveData = move ? getMove(move.id) : undefined;
      const dc = moveData?.damageClass || (move?.power > 0 ? 'physical' : 'status');
      const dcInfo = getDamageClassLabel(dc);

      // Full-width modal covering content area
      const mx = 8, my = 20, mw = 224, mh = 126;
      // Dark overlay behind
      fillRect(ctx, 0, 14, 240, 136, '#000000aa');
      // Modal background
      fillRect(ctx, mx, my, mw, mh, C.BG);
      drawRect(ctx, mx, my, mw, mh, '#2a6a40');

      if (move) {
        // ── Move name (large) + damage class dot ──
        const moveName = getMoveDisplayName(move.id);
        drawText(ctx, moveName, mx + mw - 6, my + 4, { size: 8, color: C.TEXT_PRI, font: 'monospace', align: 'right' });
        // Class dot next to name
        ctx.beginPath();
        ctx.arc(mx + mw - 8 - moveName.length * 5, my + 8, 3, 0, Math.PI * 2);
        ctx.fillStyle = dcInfo.color;
        ctx.fill();

        // ── Type badge ──
        const typeLabel = getTypeName(move.type as PokemonType);
        const typeColor = TYPE_COLORS[move.type] || '#888888';
        fillRect(ctx, mx + 6, my + 4, 26, 9, typeColor);
        drawText(ctx, typeLabel, mx + 6 + 13, my + 5, { size: 6, color: C.TEXT_PRI, font: 'monospace', align: 'center' });

        // ── Stats row: Class | Power | Accuracy | PP ──
        const statsY = my + 18;
        fillRect(ctx, mx + 4, statsY, mw - 8, 1, C.SEP);
        const ry = statsY + 3;
        // Class label
        drawText(ctx, dcInfo.label, mx + mw - 6, ry, { size: 6, color: dcInfo.color, font: 'monospace', align: 'right' });
        // Power
        const powVal = move.power > 0 ? `${move.power}` : '0';
        drawText(ctx, `${t('party.moves.header.pow')}: ${powVal}`, mx + mw - 60, ry, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'right' });
        // Accuracy
        const accVal = move.accuracy > 0 ? move.accuracy : 100;
        drawText(ctx, `${t('party.moves.header.acc')}: ${accVal}%`, mx + mw - 110, ry, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'right' });
        // PP
        drawText(ctx, `PP: ${move.currentPp}/${move.pp}`, mx + 6, ry, { size: 6, color: C.TEXT_SEC, font: 'monospace' });

        // ── Description (word-wrapped, English from API) ──
        const descY = statsY + 14;
        fillRect(ctx, mx + 4, descY - 2, mw - 8, 1, C.SEP);
        const desc = moveData?.description || '';
        if (desc) {
          const maxChars = 38;
          const words = desc.split(' ');
          let line = '';
          let dy = descY + 2;
          for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (test.length > maxChars && line) {
              drawText(ctx, line, mx + 6, dy, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
              dy += 8;
              line = word;
            } else {
              line = test;
            }
          }
          if (line) {
            drawText(ctx, line, mx + 6, dy, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
          }
        }
      }

      // ── Action buttons at bottom of modal ──
      const btnY = my + mh - 16;
      fillRect(ctx, mx + 4, btnY - 2, mw - 8, 1, C.SEP);
      const btnW = Math.floor((mw - 16) / MOVE_ACTIONS.length);
      for (let i = 0; i < MOVE_ACTIONS.length; i++) {
        const action = MOVE_ACTIONS[i];
        const isSel = i === moveActionCursor;
        const bx = mx + 6 + i * btnW;

        if (isSel) {
          fillRect(ctx, bx, btnY, btnW - 4, 12, C.CARD_SEL);
          drawRect(ctx, bx, btnY, btnW - 4, 12, '#2a6a40');
        }

        let label: string;
        if (action === 'swap') label = t('party.moves.swap');
        else if (action === 'delete') label = t('party.moves.delete');
        else label = t('party.moves.cancel');

        drawText(ctx, label, bx + (btnW - 4) / 2, btnY + 2, {
          size: 7, color: isSel ? C.TEXT_PRI : C.TEXT_MUT, font: 'monospace', align: 'center',
        });
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
      clearScreen(ctx, '#0d1a14');

      if (viewMode === 'detail') {
        renderDetailView(ctx);
      } else {
        renderListView(ctx);
      }
    },
  };
}
