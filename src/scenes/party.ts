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
import { getDamageClassLabel, getTypeName } from '../data/type-constants.js';
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
  // LAYOUT CONSTANTS — tweak these to pixel-perfect the detail views
  // Screen is 240×160. Tab bar = 14px top, hint bar = 14px bottom.
  // Content area: y=14..146 (132px tall)
  // ═══════════════════════════════════════════════════════════════════
  const L = {
    // Shared
    pad: 8,                    // left/right padding from screen edge
    tabBarH: 14,               // tab bar height
    hintBarH: 14,              // bottom hint bar height
    contentY: 14,              // first usable Y after tab bar

    // Colors
    bg: '#0d1a14',
    cardBg: '#0f2a1a',
    cardBgSel: '#1a3a2a',
    border: '#1a4a30',
    borderSel: '#f8c030',
    accent: '#1a5a35',
    sep: '#1a3a2a',
    textPrimary: '#ffffff',
    textSecondary: '#aaccaa',
    textMuted: '#667766',
    textDim: '#445544',
    hpColor: '#20d860',
    xpColor: '#5080ff',
    ppColor: '#20a0d8',

    // Stats tab
    spriteSize: 40,            // sprite width/height
    spriteMargin: 2,           // glow border around sprite
    nameY: 18,                 // name text Y (from contentY)
    nameFontSize: 10,
    levelYOff: 12,             // level offset below name
    levelFontSize: 7,
    badgesYOff: 26,            // type badges offset below contentY
    badgeH: 10,
    badgePadX: 5,
    badgeCharW: 5,             // approx width per character
    badgeGap: 4,
    hwYOff: 40,                // height/weight Y offset below contentY
    hwFontSize: 6,
    sepYOff: 50,               // first separator Y offset below contentY
    hpYOff: 54,                // HP label Y offset below contentY
    hpFontSize: 7,
    hpValueFontSize: 10,
    hpBarH: 3,
    hpBarYOff: 65,             // HP bar Y offset below contentY
    xpYOff: 71,                // XP row Y offset below contentY
    xpFontSize: 6,
    sep2YOff: 79,              // second separator Y offset below contentY
    statsHeaderYOff: 83,       // "base stats" header Y offset below contentY
    statsStartYOff: 93,        // first stat row Y offset below contentY
    statRowH: 10,              // height per stat row
    statBarW: 70,              // stat bar max width
    statBarH: 3,
    statMax: 150,              // max stat value for scaling bars
    statValueXOff: 78,         // value X offset from left pad (after bar)

    // Moves tab
    movesSubHeaderYOff: 2,     // sub-header Y offset below contentY
    movesStartYOff: 12,        // first card Y offset below contentY
    cardH: 16,                 // move card height
    cardGap: 2,                // gap between cards
    ppBarW: 30,                // PP bar width
    ppBarH: 2,
    dcIconR: 3,                // damage class circle radius

    // Tab bar
    tabTotalW: 150,
    tabPillH: 10,
    tabFontSize: 7,

    // Hint bar
    hintKeyW: 20,
    hintKeyH: 9,
    hintFontSize: 6,
  };

  function renderDetailStatsTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    const P = L.pad;
    const R = SCREEN_W - P;
    const W = SCREEN_W - P * 2;
    let y = L.contentY;

    // ── Pokemon name + Sprite ──
    const name = getPokemonDisplayName(pokemon.id);
    const spriteX = R - L.spriteSize;
    const nameAreaCX = spriteX / 2; // center X for name/level/badges (left of sprite)

    // Sprite with glow border
    const sm = L.spriteMargin;
    fillRect(ctx, spriteX - sm, y + L.nameY - sm - 4, L.spriteSize + sm * 2, L.spriteSize + sm * 2, '#0a2a1a');
    drawRect(ctx, spriteX - sm, y + L.nameY - sm - 4, L.spriteSize + sm * 2, L.spriteSize + sm * 2, L.border);
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, spriteX, y + L.nameY - 4, L.spriteSize, L.spriteSize);
    }

    // Name — large, centered in left area
    drawText(ctx, name, nameAreaCX, y + L.nameY, { size: L.nameFontSize, color: L.textPrimary, font: 'monospace', align: 'center' });

    // Level
    drawText(ctx, `${t('party.stats.level')} ${pokemon.level}`, nameAreaCX, y + L.nameY + L.levelYOff, { size: L.levelFontSize, color: L.textMuted, font: 'monospace', align: 'center' });

    // ── Type badges (centered in left area) ──
    const badgesY = y + L.badgesYOff;
    const typeLabels = pokemon.types.map(pt => ({ type: pt, label: getTypeName(pt) }));
    let totalBadgeW = 0;
    for (const tl of typeLabels) totalBadgeW += tl.label.length * L.badgeCharW + L.badgePadX * 2;
    totalBadgeW += (typeLabels.length - 1) * L.badgeGap;
    let bx = Math.floor(nameAreaCX - totalBadgeW / 2);
    for (const tl of typeLabels) {
      const color = TYPE_COLORS[tl.type] || '#888888';
      const bw = tl.label.length * L.badgeCharW + L.badgePadX * 2;
      fillRect(ctx, bx, badgesY, bw, L.badgeH, color);
      drawRect(ctx, bx, badgesY, bw, L.badgeH, '#00000033');
      drawText(ctx, tl.label, bx + L.badgePadX, badgesY + 1, { size: L.levelFontSize, color: L.textPrimary, font: 'monospace' });
      bx += bw + L.badgeGap;
    }

    // ── Height / Weight ──
    const hwY = y + L.hwYOff;
    const hVal = getPokemonHeight(pokemon.id);
    const wVal = getPokemonWeight(pokemon.id);
    const hStr = hVal !== '?' ? t('party.height', { value: hVal, unit: t('party.unit.meter') }) : '';
    const wStr = wVal !== '?' ? t('party.weight', { value: wVal, unit: t('party.unit.kg') }) : '';
    const hwLine = [hStr, wStr].filter(Boolean).join('    ');
    if (hwLine) {
      drawText(ctx, hwLine, SCREEN_W / 2, hwY, { size: L.hwFontSize, color: L.textMuted, font: 'monospace', align: 'center' });
    }

    // ── Separator ──
    fillRect(ctx, P, y + L.sepYOff, W, 1, L.sep);

    // ── HP section ──
    const hpLabelY = y + L.hpYOff;
    drawText(ctx, 'HP', P, hpLabelY, { size: L.hpFontSize, color: L.textSecondary, font: 'monospace' });
    drawText(ctx, `${pokemon.hp}`, R - 24, hpLabelY - 2, { size: L.hpValueFontSize, color: L.textPrimary, font: 'monospace', align: 'right' });
    drawText(ctx, `/ ${pokemon.maxHp}`, R, hpLabelY + 1, { size: L.hpFontSize, color: L.textMuted, font: 'monospace', align: 'right' });
    const hpBarY = y + L.hpBarYOff;
    fillRect(ctx, P, hpBarY, W, L.hpBarH, L.sep);
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.floor(W * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) fillRect(ctx, P, hpBarY, hpFillW, L.hpBarH, L.hpColor);

    // ── XP row ──
    const xpY = y + L.xpYOff;
    drawText(ctx, t('party.xpLabel'), P, xpY, { size: L.xpFontSize, color: L.textDim, font: 'monospace' });
    drawText(ctx, `${pokemon.xp} / ${pokemon.xpToNext}`, R, xpY, { size: L.xpFontSize, color: L.textDim, font: 'monospace', align: 'right' });

    // ── Separator ──
    fillRect(ctx, P, y + L.sep2YOff, W, 1, L.sep);

    // ── Base Stats section ──
    drawText(ctx, t('party.baseStats'), R, y + L.statsHeaderYOff, { size: L.levelFontSize, color: L.textMuted, font: 'monospace', align: 'right' });

    const statEntries: [string, number, string][] = [
      [t('party.stats.hp'), pokemon.maxHp, '#20d860'],
      [t('party.stats.attack'), pokemon.attack, '#f08030'],
      [t('party.stats.defense'), pokemon.defense, '#6890f0'],
      [t('party.stats.spAtk'), pokemon.specialAttack, '#a040a0'],
      [t('party.stats.spDef'), pokemon.specialDefense, '#f8d030'],
      [t('party.stats.speed'), pokemon.speed, '#f85888'],
    ];

    let sy = y + L.statsStartYOff;
    for (const [label, value, color] of statEntries) {
      fillRect(ctx, P, sy + 2, L.statBarW, L.statBarH, L.sep);
      const fill = Math.max(2, Math.floor((value / L.statMax) * L.statBarW));
      fillRect(ctx, P, sy + 2, fill, L.statBarH, color);
      drawText(ctx, String(value), P + L.statValueXOff, sy, { size: L.levelFontSize, color: L.textPrimary, font: 'monospace' });
      drawText(ctx, label, R, sy, { size: L.levelFontSize, color: L.textSecondary, font: 'monospace', align: 'right' });
      sy += L.statRowH;
    }
  }

  function renderDetailMovesTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    const P = L.pad;
    const R = SCREEN_W - P;
    const W = SCREEN_W - P * 2;

    // ── Sub-header ──
    const subY = L.contentY + L.movesSubHeaderYOff;
    drawText(ctx, t('party.moves.battleMoves'), R, subY, { size: L.levelFontSize, color: L.textMuted, font: 'monospace', align: 'right' });
    drawText(ctx, `${pokemon.moves.length} ${t('party.moves.title')}`, P, subY, { size: L.hwFontSize, color: L.textDim, font: 'monospace' });

    // ── Move cards ──
    const startY = L.contentY + L.movesStartYOff;
    const maxVisible = Math.min(pokemon.moves.length, 8);

    for (let i = 0; i < maxVisible; i++) {
      const move = pokemon.moves[i];
      const cy = startY + i * (L.cardH + L.cardGap);
      const isSelected = i === moveCursor;
      const isSwapSource = i === moveSwapFrom;

      // Card background
      fillRect(ctx, P, cy, W, L.cardH, isSelected ? L.cardBgSel : L.cardBg);
      drawRect(ctx, P, cy, W, L.cardH, isSwapSource ? L.borderSel : L.border);

      // ── Right side: move number ──
      drawText(ctx, `${i + 1}`, R - 4, cy + 2, { size: 7, color: '#445544', font: 'monospace', align: 'right' });

      // ── Damage class icon (colored circle) ──
      const moveData = getMove(move.id);
      const dc = moveData?.damageClass || (move.power > 0 ? 'physical' : 'status');
      const dcInfo = getDamageClassLabel(dc);
      const dcColors: Record<string, string> = { physical: '#f08030', special: '#6890f0', status: '#a040a0' };
      const iconX = R - 16;
      // Small circle
      ctx.beginPath();
      ctx.arc(iconX, cy + 5, 3, 0, Math.PI * 2);
      ctx.fillStyle = dcColors[dc] || '#888888';
      ctx.fill();
      drawText(ctx, dcInfo.symbol, iconX - 1, cy + 2, { size: 5, color: '#ffffff', font: 'monospace' });

      // ── Move name (bold, right of center) ──
      const moveName = getMoveDisplayName(move.id);
      drawText(ctx, moveName, R - 24, cy + 1, { size: 7, color: '#ffffff', font: 'monospace', align: 'right' });

      // ── Type badge (small, next to name) ──
      const typeLabel = getTypeName(move.type as PokemonType);
      const typeColor = TYPE_COLORS[move.type] || '#888888';
      const tbW = typeLabel.length * 4 + 6;
      const tbX = R - 26 - moveName.length * 5 - tbW;
      fillRect(ctx, Math.max(P + 50, tbX), cy + 1, tbW, 8, typeColor);
      drawText(ctx, typeLabel, Math.max(P + 53, tbX + 3), cy + 2, { size: 5, color: '#ffffff', font: 'monospace' });

      // ── Second line: accuracy + power (below name, right-aligned) ──
      const accStr = move.accuracy > 0 ? `${move.accuracy}` : '\u2014';
      const powStr = move.power > 0 ? `${move.power}` : '\u2014';
      drawText(ctx, `${t('party.moves.header.acc')}: ${accStr}   ${t('party.moves.header.pow')}: ${powStr}`, R - 24, cy + 9, { size: 5, color: '#556655', font: 'monospace', align: 'right' });

      // ── Left side: PP fraction + PP bar ──
      drawText(ctx, `${move.currentPp}/${move.pp}`, P + 2, cy + 2, { size: 7, color: '#aaccaa', font: 'monospace' });
      // PP bar
      const ppBarX = P + 2;
      const ppBarY = cy + 11;
      const ppBarW = 30;
      fillRect(ctx, ppBarX, ppBarY, ppBarW, 2, '#1a3a2a');
      const ppRatio = move.pp > 0 ? move.currentPp / move.pp : 0;
      const ppFillW = Math.floor(ppBarW * Math.max(0, Math.min(1, ppRatio)));
      if (ppFillW > 0) {
        fillRect(ctx, ppBarX, ppBarY, ppFillW, 2, '#20a0d8');
      }
    }

    // ── Action menu overlay ──
    if (moveActionMenuOpen) {
      const menuW = 70;
      const menuH = MOVE_ACTIONS.length * 12 + 6;
      const menuX = SCREEN_W / 2 - menuW / 2;
      const menuY = SCREEN_H / 2 - menuH / 2;

      fillRect(ctx, menuX - 1, menuY - 1, menuW + 2, menuH + 2, '#000000aa');
      fillRect(ctx, menuX, menuY, menuW, menuH, '#0d1a14');
      drawRect(ctx, menuX, menuY, menuW, menuH, '#2a6a40');

      for (let i = 0; i < MOVE_ACTIONS.length; i++) {
        const action = MOVE_ACTIONS[i];
        const isSel = i === moveActionCursor;
        const ay = menuY + 4 + i * 12;

        if (isSel) {
          fillRect(ctx, menuX + 2, ay - 1, menuW - 4, 11, '#1a4a30');
        }

        let label: string;
        if (action === 'swap') label = t('party.moves.swap');
        else if (action === 'delete') label = t('party.moves.delete');
        else label = t('party.moves.cancel');

        drawText(ctx, label, menuX + menuW / 2, ay + 1, { size: 7, color: isSel ? '#ffffff' : '#667766', align: 'center' });
      }
    }

    // ── Temporary message ──
    if (moveMessage && moveMessageTimer > 0) {
      fillRect(ctx, P, SCREEN_H - 24, W, 10, '#3a1a1a');
      drawText(ctx, moveMessage, SCREEN_W / 2, SCREEN_H - 23, { size: 7, color: '#ff6666', align: 'center' });
    }
  }

  function renderDetailView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    // Tab bar at top — centered pill-style matching Figma
    // Order: סטטיסטיקות (stats) RIGHT, מהלכים (moves) LEFT (RTL visual order)
    const tabs: { key: DetailTab; label: string }[] = [
      { key: 'stats', label: t('party.baseStats') },
      { key: 'moves', label: t('party.moves.title') },
    ];
    fillRect(ctx, 0, 0, SCREEN_W, 14, '#0d1a14');
    const tabTotalW = 150;
    const tabStartX = (SCREEN_W - tabTotalW) / 2;
    // Draw rounded pill background
    fillRect(ctx, tabStartX, 2, tabTotalW, 10, '#0a2a1a');
    drawRect(ctx, tabStartX, 2, tabTotalW, 10, '#1a4a30');
    const singleTabW = tabTotalW / tabs.length;
    for (let i = 0; i < tabs.length; i++) {
      const tx = tabStartX + i * singleTabW;
      const isActive = tabs[i].key === detailTab;
      if (isActive) {
        fillRect(ctx, tx + 1, 3, singleTabW - 2, 8, '#1a5a35');
      }
      drawText(ctx, tabs[i].label, tx + singleTabW / 2, 3, {
        size: 7,
        color: isActive ? '#ffffff' : '#445544',
        align: 'center',
        font: 'monospace',
      });
    }

    // Tab content
    if (detailTab === 'stats') {
      renderDetailStatsTab(ctx, pokemon);
    } else {
      renderDetailMovesTab(ctx, pokemon);
    }

    // Bottom hint bar matching Figma — key pills + labels
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#0d1a14');
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 1, '#1a3a2a');
    let hx = 6;
    // ESC pill
    fillRect(ctx, hx, SCREEN_H - 12, 20, 9, '#1a3a2a');
    drawRect(ctx, hx, SCREEN_H - 12, 20, 9, '#2a5a3a');
    drawText(ctx, 'ESC', hx + 2, SCREEN_H - 11, { size: 6, color: '#88aa88', font: 'monospace' });
    hx += 22;
    drawText(ctx, t('party.hint.back'), hx, SCREEN_H - 11, { size: 6, color: '#556655', font: 'monospace' });
    hx += 30;
    // Tab pill
    fillRect(ctx, hx, SCREEN_H - 12, 20, 9, '#1a3a2a');
    drawRect(ctx, hx, SCREEN_H - 12, 20, 9, '#2a5a3a');
    drawText(ctx, 'Tab', hx + 2, SCREEN_H - 11, { size: 6, color: '#88aa88', font: 'monospace' });
    hx += 22;
    drawText(ctx, t('party.hint.switchTab'), hx, SCREEN_H - 11, { size: 6, color: '#556655', font: 'monospace' });
    // Enter pill (only on moves tab)
    if (detailTab === 'moves') {
      hx += 30;
      fillRect(ctx, hx, SCREEN_H - 12, 28, 9, '#1a3a2a');
      drawRect(ctx, hx, SCREEN_H - 12, 28, 9, '#2a5a3a');
      drawText(ctx, 'Enter', hx + 2, SCREEN_H - 11, { size: 6, color: '#88aa88', font: 'monospace' });
      hx += 30;
      drawText(ctx, t('party.hint.action') || 'Action', hx, SCREEN_H - 11, { size: 6, color: '#556655', font: 'monospace' });
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

    // Tab switching with left/right or Tab key
    if (input.isKeyPressed('Tab')) {
      detailTab = detailTab === 'stats' ? 'moves' : 'stats';
      moveCursor = 0;
      moveSwapFrom = -1;
      return;
    }
    if (input.isKeyPressed('ArrowLeft')) {
      if (detailTab === 'moves') {
        detailTab = 'stats';
        moveCursor = 0;
        moveSwapFrom = -1;
      }
      return;
    }
    if (input.isKeyPressed('ArrowRight')) {
      if (detailTab === 'stats') {
        detailTab = 'moves';
        moveCursor = 0;
      }
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
