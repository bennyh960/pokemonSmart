/**
 * PartyScene - Pokemon party management screen.
 *
 * Shows up to 6 Pokemon in a vertical list with sprites, names, levels, HP bars, and type badges.
 * Enter opens detail view with STATS and MOVES sub-screens.
 * Moves sub-screen has a proper table with columns, move swap, and delete.
 * Swap mode lets reorder party. P key from overworld pushes this scene; Escape pops back.
 */

import type { Scene, Pokemon, PokemonType, StolenEntry } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { getLocale, isRTL, t } from '../i18n/i18n.js';
import {
  getPokemonDisplayName,
  getMoveDisplayName,
  getMove,
  computePokemonSize,
  getAbilityDisplayName,
  getNatureDisplayName,
  getNature,
} from '../services/pokemon-data.js';
import { drawPokeballIcon } from '../ui/item-icons.js';
import { TYPE_BADGE, getTypeName, getDamageClassLabel } from '../data/type-constants.js';
import { STATUS_PILL_COLORS } from '../data/battle-constants.js';
import { autoSave, getPlayerData } from '../systems/game-state.js';
import { getCharacterFrame } from '../engine/character-sprites.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { canUseItemOnPokemon } from '../systems/item-effects.js';
import { createMoveFromId, getMoveLearningSession, resolveMoveLearningSession } from '../systems/move-learning.js';
import { getTMEffect } from '../data/item-defs.js';
import { calcHappiness, getHappinessLabel } from '../systems/happiness.js';
import { getItem, type ItemDef } from '../data/items.js';
// Screen is 240×160 — coordinates hardcoded from party_coordinated.md

const MAX_PARTY = 6;

type ViewMode = 'list' | 'detail' | 'swap' | 'diary';
type DetailTab = 'stats' | 'moves' | 'item';
type MoveAction = 'swap' | 'delete' | 'cancel';
type PartyMode = 'overworld' | 'battle' | 'select-target' | 'move-learning';
type MoveLearningConfirmAction = 'replace' | 'skip' | null;
type DisplayMoveEntry = { move: Pokemon['moves'][number]; pending: boolean };

const MOVE_ACTIONS: MoveAction[] = ['swap', 'delete', 'cancel'];

let partyMode: PartyMode = 'overworld';
let onSelectCallback: ((index: number) => void) | null = null;

/** Index of the Pokemon selected in battle/select-target mode (-1 = none). */
export let selectedPartyIndex: number = -1;

/** Context info shown when party is in select-target mode (item use). */
let selectTargetContext: {
  itemId: string;
  itemName: string;
  description: string;
  isEligible?: (pokemon: Pokemon) => boolean;
} | null = null;

/** Battle roster context: tracks which party slots are committed and the max allowed. */
let battleRosterCtx: { roster: Set<number>; maxSize: number } | null = null;

export function setPartyMode(
  mode: PartyMode,
  callback?: (index: number) => void,
  context?: { itemId: string; itemName: string; description: string; isEligible?: (pokemon: Pokemon) => boolean },
  rosterCtx?: { roster: Set<number>; maxSize: number },
): void {
  partyMode = mode;
  onSelectCallback = callback ?? null;
  selectedPartyIndex = -1;
  selectTargetContext = context ?? null;
  battleRosterCtx = rosterCtx ?? null;
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
  let actionMessage = '';
  let actionMessageTimer = 0;
  let moveDeleteConfirm = false;
  let moveDeleteConfirmCursor = 1; // 0 = yes, 1 = no (default to no)
  let moveLearningActionCursor = 0;
  let moveLearningReplaceMode = false;
  let moveLearningConfirmAction: MoveLearningConfirmAction = null;
  let moveLearningConfirmCursor = 1;

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
    // All filled slots stack from y=12, each 22px + 1px gap
    if (index < partyLen) return 12 + index * 23;
    // Empty slots start after last filled
    const afterFilled = 12 + partyLen * 23;
    return afterFilled + (index - partyLen) * 17;
  }
  function getHpColor(ratio: number): string {
    if (ratio >= 0.5) return '#20d860';
    if (ratio >= 0.25) return '#d8a020';
    return '#d84040';
  }

  /** Check if a Pokemon is eligible for selection in the current mode. */
  function isPokemonEligible(pokemon: Pokemon, partyIndex?: number): boolean {
    if (partyMode === 'battle') {
      if (pokemon.hp === 0) return false;
      if (battleRosterCtx && partyIndex !== undefined) {
        const { roster, maxSize } = battleRosterCtx;
        if (!roster.has(partyIndex) && roster.size >= maxSize) return false;
      }
      return true;
    }
    if (partyMode === 'select-target') {
      if (!selectTargetContext) return true;
      if (selectTargetContext.isEligible?.(pokemon)) return true;
      return canUseItemOnPokemon(selectTargetContext.itemId, pokemon);
    }
    return true;
  }

  /** Returns true if this party slot is committed to the current battle. */
  function isBattleCommitted(partyIndex: number): boolean {
    return partyMode === 'battle' && battleRosterCtx !== null && battleRosterCtx.roster.has(partyIndex);
  }

  /** For TM select-target: returns only eligible Pokemon with their real party indices.
   *  Returns null for non-TM items (use normal full-list rendering). */
  function getSelectTargetFiltered(): { pokemon: Pokemon; realIndex: number }[] | null {
    if (partyMode !== 'select-target' || !selectTargetContext) return null;
    if (!getTMEffect(selectTargetContext.itemId)) return null;
    const party = getParty();
    const result: { pokemon: Pokemon; realIndex: number }[] = [];
    for (let i = 0; i < party.length; i++) {
      if (isPokemonEligible(party[i])) result.push({ pokemon: party[i], realIndex: i });
    }
    return result;
  }

  function isMoveLearningMode(): boolean {
    return partyMode === 'move-learning' && getMoveLearningSession() !== null;
  }

  function getDisplayedMoves(pokemon: Pokemon): DisplayMoveEntry[] {
    const entries = pokemon.moves.map((move) => ({ move, pending: false }));
    const session = getMoveLearningSession();
    if (partyMode !== 'move-learning' || !session || session.learned) {
      return entries;
    }

    const pendingMove = createMoveFromId(session.moveId);
    if (pendingMove) {
      entries.push({ move: pendingMove, pending: true });
    }
    return entries;
  }

  function getMoveLearningActionLabels(): string[] {
    const session = getMoveLearningSession();
    if (!session) return [t('party.moves.cancel')];
    if (session.learned) return [t('party.moveLearning.done')];
    if (moveLearningReplaceMode) return [t('party.moveLearning.teachHere'), t('party.moves.cancel')];
    return [t('party.moveLearning.replace'), t('party.moveLearning.skip')];
  }

  function completeMoveLearning(resolution: {
    outcome: 'learned' | 'replaced' | 'skipped';
    moveId: number;
    replacedMoveId?: number;
  }): void {
    resolveMoveLearningSession(resolution);
    stateMachine.pop();
  }

  function renderFilledSlot(
    ctx: CanvasRenderingContext2D,
    pokemon: Pokemon,
    _slotNum: number,
    sy: number,
    isSel: boolean,
    isSwap: boolean,
    disabled: boolean,
    committed = false,
  ): void {
    // Card bg
    fillRect(ctx, 4, sy, 232, 22, isSel ? C.CARD_SEL : C.CARD_BG);
    drawRect(ctx, 4, sy, 232, 22, isSwap ? C.BORDER_SEL : isSel ? '#2a6a40' : C.BORDER);
    // Selection indicator
    if (isSel && !disabled) fillRect(ctx, 4, sy, 2, 22, '#20d860');
    // Battle-committed indicator: amber strip on right edge
    if (committed) fillRect(ctx, 234, sy, 2, 22, '#f0a020');

    // Pokeball icon — centered in 9×9 area
    drawPokeballIcon(ctx, pokemon.caughtBall, 222, sy + 6, 9);

    // Sprite box (20×20)
    fillRect(ctx, 194, sy + 1, 20, 20, C.CARD_BG);
    drawRect(ctx, 194, sy + 1, 20, 20, C.BORDER);
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprite, 193, sy - 1, 23, 23);
      ctx.imageSmoothingEnabled = false;
    }

    // draw held item
    if (pokemon.heldItemId) {
      drawHeldItem(ctx, pokemon.heldItemId, { x: 194, y: sy + 1 + 14, w: 6, h: 6 });
    }

    // Name (right-aligned)
    drawText(ctx, getPokemonDisplayName(pokemon.id), 190, sy + 2, {
      size: 7,
      color: C.TEXT_PRI,
      font: 'monospace',
      align: 'right',
    });
    // Level
    drawText(ctx, `Lv.${pokemon.level}`, 16, sy + 2, {
      size: 6,
      color: C.TEXT_MUT,
      font: 'monospace',
      align: 'center',
    });
    // Status tag (PSN / BRN / PAR / SLP / FRZ) — aligned to HP bar start x=30
    if (pokemon.status) {
      const pill = STATUS_PILL_COLORS[pokemon.status];
      if (pill) {
        drawText(ctx, pill.shortLabel, 30, sy + 2, { size: 5, color: pill.textColor, font: 'monospace' });
      }
    }

    // Type badges (row 2, dy=11)
    const types = pokemon.types;
    if (types.length >= 1) {
      const color1 = TYPE_BADGE[types[0]]?.color || '#888888';
      fillRect(ctx, 172, sy + 11, 18, 6, color1);
      drawText(ctx, getTypeName(types[0]), 181, sy + 12, {
        size: 5,
        color: C.TEXT_PRI,
        font: 'monospace',
        align: 'center',
      });
    }
    if (types.length >= 2) {
      const color2 = TYPE_BADGE[types[1]]?.color || '#888888';
      fillRect(ctx, 152, sy + 11, 18, 6, color2);
      drawText(ctx, getTypeName(types[1]), 161, sy + 12, {
        size: 5,
        color: C.TEXT_PRI,
        font: 'monospace',
        align: 'center',
      });
    }

    // HP label
    drawText(ctx, 'HP', 88, sy + 11, { size: 5, color: C.TEXT_MUT, font: 'monospace' });
    // HP bar
    fillRect(ctx, 30, sy + 13, 56, 3, C.SEP);
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpW = Math.round(56 * Math.max(0, Math.min(1, hpRatio)));
    if (hpW > 0) fillRect(ctx, 30, sy + 11, hpW, 3, getHpColor(hpRatio));
    // HP value
    drawText(ctx, `${pokemon.hp}/${pokemon.maxHp}`, 8, sy + 9, { size: 5, color: C.TEXT_SEC, font: 'monospace' });

    // Disabled overlay (semi-transparent dark green)
    if (disabled) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      fillRect(ctx, 4, sy, 232, 22, '#0d1a14');
      ctx.restore();
    }
  }

  function renderEmptySlot(ctx: CanvasRenderingContext2D, slotNum: number, sy: number, isSel: boolean): void {
    fillRect(ctx, 4, sy, 232, 16, isSel ? C.CARD_SEL : C.CARD_BG);
    drawRect(ctx, 4, sy, 232, 16, isSel ? '#2a6a40' : C.BORDER);
    if (isSel) fillRect(ctx, 4, sy, 2, 16, '#20d860');
    // Slot number
    fillRect(ctx, 222, sy + 2, 9, 8, isSel ? 'rgba(32,216,96,0.15)' : 'rgba(255,255,255,0.03)');
    drawText(ctx, `${slotNum}`, 227, sy + 3, {
      size: 6,
      color: isSel ? '#20d860' : '#2a3a2a',
      font: 'monospace',
      align: 'center',
    });
    // Empty label
    drawText(ctx, '\u2014 \u2014 \u2014', 112, sy + 5, {
      size: 7,
      color: '#2a3a2a',
      font: 'monospace',
      align: 'center',
    });
  }

  function renderDiaryView(ctx: CanvasRenderingContext2D): void {
    const pd = getPlayerData();
    const entries = Object.entries(pd.awayPokemon);

    // Title bar
    fillRect(ctx, 0, 0, 240, 12, '#0a1a10');
    drawText(ctx, t('party.diary.title'), 112, 2, { size: 10, color: C.TEXT_PRI, font: 'monospace', align: 'right' });
    drawText(ctx, `${entries.length}`, 200, 4, { size: 6, color: C.TEXT_DIM, font: 'monospace' });

    if (entries.length === 0) {
      drawText(ctx, t('party.diary.empty'), 120, 80, {
        size: 8,
        color: C.TEXT_MUT,
        font: 'monospace',
        align: 'center',
      });
    } else {
      let ey = 14;
      for (const [, entry] of entries) {
        const pokemon =
          entry.kind === 'stolen'
            ? (entry as StolenEntry).pokemon
            : (entry as import('../types/index.js').DayCareEntry).pokemon;
        if (!pokemon) continue;

        const entryH = 34;
        const bg = '#0f2018';
        fillRect(ctx, 4, ey, 232, entryH, bg);
        drawRect(ctx, 4, ey, 232, entryH, '#1a4030');

        // Pokemon icon (left)
        const iconUrl = `/sprites/pokemon/icons/${pokemon.id}.png`;
        const icon = getCachedImage(iconUrl);
        if (icon && icon.complete && icon.naturalWidth > 0) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(icon, 6, ey + 2, 28, 28);
          ctx.restore();
        }

        // Pokemon name + level
        drawText(ctx, getPokemonDisplayName(pokemon.id), 38, ey + 4, { size: 8, color: C.TEXT_PRI, font: 'monospace' });
        drawText(ctx, `Lv.${pokemon.level}`, 228, ey + 4, {
          size: 7,
          color: C.TEXT_MUT,
          font: 'monospace',
          align: 'right',
        });

        if (entry.kind === 'stolen') {
          const stolen = entry as StolenEntry;
          // Lock icon + "Stolen by" label
          drawText(ctx, t('party.diary.stolen'), 38, ey + 16, { size: 6, color: '#e06030', font: 'monospace' });

          // Thief mini-sprite (16×16)
          const frame = getCharacterFrame(stolen.thiefSpriteType, 'down', 'stand');
          if (frame) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const scale = 16 / frame.w;
            ctx.drawImage(
              frame.image,
              frame.sx,
              frame.sy,
              frame.w,
              frame.h,
              152,
              ey + 12,
              frame.w * scale,
              frame.h * scale,
            );
            ctx.restore();
          }

          // Thief name
          const locale = getLocale();
          const thiefDisplayName = locale === 'he' ? stolen.thiefName.he : stolen.thiefName.en;
          drawText(ctx, thiefDisplayName, 172, ey + 16, { size: 6, color: '#bb8844', font: 'monospace' });
        } else {
          const dc = entry as import('../types/index.js').DayCareEntry;
          const locale = getLocale();
          const routeName = locale === 'he' ? dc.route.he : dc.route.en;
          drawText(ctx, t('party.diary.daycare', { route: routeName }), 38, ey + 16, {
            size: 6,
            color: '#8888ff',
            font: 'monospace',
          });
        }

        ey += entryH + 2;
        if (ey > 148) break; // stop before bottom bar
      }
    }

    // Bottom bar
    fillRect(ctx, 0, 150, 240, 10, '#0a1a10');
    fillRect(ctx, 8, 151, 20, 8, C.KEY_BG);
    drawRect(ctx, 8, 151, 20, 8, C.KEY_BRD);
    drawText(ctx, 'ESC', 18, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.hint.back'), 30, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    fillRect(ctx, 100, 151, 40, 8, C.KEY_BG);
    drawRect(ctx, 100, 151, 40, 8, C.KEY_BRD);
    drawText(ctx, '◄ ►', 120, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.title'), 143, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
  }

  function renderListView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();
    const tmFiltered = getSelectTargetFiltered();

    // ── Title bar (y=0, h=12) ──
    fillRect(ctx, 0, 0, 240, 12, '#0a1a10');
    if (tmFiltered && selectTargetContext) {
      const tmEffect = getTMEffect(selectTargetContext.itemId);
      const moveName = tmEffect ? getMoveDisplayName(tmEffect.moveId) : selectTargetContext.itemName;
      const title = t('party.selectTarget.tmTitle', { move: moveName });
      drawText(ctx, title, 112, 2, { size: 7, color: '#20d860', font: 'monospace', align: 'right' });
      drawText(ctx, `${tmFiltered.length}`, 200, 4, { size: 6, color: C.TEXT_DIM, font: 'monospace' });
    } else {
      const title = viewMode === 'swap' ? t('party.swap') : t('party.title');
      drawText(ctx, title, 112, 2, { size: 10, color: C.TEXT_PRI, font: 'monospace', align: 'right' });
      if (partyMode === 'battle' && battleRosterCtx) {
        // Battle team slots: tiny Pokemon sprites for committed, dim placeholder for open slots
        const { roster, maxSize } = battleRosterCtx;
        const rosterIndices = [...roster]; // insertion-ordered party indices
        const slotSize = 10;
        const slotGap = 1;
        const totalW = maxSize * (slotSize + slotGap) - slotGap;
        const startX = 236 - totalW;
        for (let s = 0; s < maxSize; s++) {
          const dx = startX + s * (slotSize + slotGap);
          const dy = 1;
          if (s < rosterIndices.length) {
            const poke = party[rosterIndices[s]];
            if (poke) {
              const iconUrl = `/sprites/pokemon/icons/${poke.id}.png`;
              const icon = getCachedImage(iconUrl);
              if (icon && icon.complete && icon.naturalWidth > 0) {
                ctx.save();
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(icon, dx, dy, slotSize, slotSize);
                ctx.restore();
              } else {
                fillRect(ctx, dx, dy, slotSize, slotSize, '#f0a020');
              }
            }
          } else {
            fillRect(ctx, dx, dy, slotSize, slotSize, '#1a3a2a');
            drawRect(ctx, dx, dy, slotSize, slotSize, '#2a5a40');
          }
        }
      } else {
        drawText(ctx, `${party.length} / ${MAX_PARTY}`, 200, 4, { size: 6, color: C.TEXT_DIM, font: 'monospace' });
      }
    }

    // ── Slots ──
    if (tmFiltered) {
      // TM select-target: show only eligible Pokemon, no disabled slots
      for (let i = 0; i < tmFiltered.length; i++) {
        const sy = getSlotY(i, tmFiltered.length);
        renderFilledSlot(ctx, tmFiltered[i].pokemon, i + 1, sy, i === cursor, false, false);
      }
    } else {
      for (let i = 0; i < MAX_PARTY; i++) {
        const sy = getSlotY(i, party.length);
        const isSel = i === cursor;
        const isSwap = viewMode === 'swap' && i === swapFrom;

        if (i < party.length) {
          const disabled = (partyMode === 'select-target' || partyMode === 'battle') && !isPokemonEligible(party[i], i);
          const committed = isBattleCommitted(i);
          renderFilledSlot(ctx, party[i], i + 1, sy, isSel, isSwap, disabled, committed);
        } else {
          renderEmptySlot(ctx, i + 1, sy, isSel);
        }
      }
    }

    // ── Item context line (above bottom bar, when in select-target mode for non-TM items) ──
    if (partyMode === 'select-target' && selectTargetContext && !tmFiltered) {
      fillRect(ctx, 4, 140, 232, 9, C.CARD_BG);
      drawRect(ctx, 4, 140, 232, 9, C.BORDER);
      drawText(ctx, `💊 ${selectTargetContext.itemName}: ${selectTargetContext.description}`, 120, 141, {
        size: 5,
        color: '#20d860',
        font: 'monospace',
        align: 'center',
      });
    }

    // ── Bottom bar ──
    fillRect(ctx, 0, 150, 240, 10, '#0a1a10');
    // ESC
    fillRect(ctx, 8, 151, 20, 8, C.KEY_BG);
    drawRect(ctx, 8, 151, 20, 8, C.KEY_BRD);
    drawText(ctx, 'ESC', 18, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.hint.back'), 30, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Enter — context-aware label
    fillRect(ctx, 62, 151, 26, 8, C.KEY_BG);
    drawRect(ctx, 62, 151, 26, 8, C.KEY_BRD);
    drawText(ctx, 'Enter', 75, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    const enterHint =
      partyMode === 'select-target'
        ? t('bag.hint.use') || 'Use'
        : partyMode === 'battle'
          ? t('party.hint.switchIn') || 'Switch'
          : t('party.hint.details') || 'Details';
    drawText(ctx, enterHint, 90, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Arrows
    fillRect(ctx, 126, 151, 18, 8, C.KEY_BG);
    drawRect(ctx, 126, 151, 18, 8, C.KEY_BRD);
    drawText(ctx, '\u25b2\u25bc', 135, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('bag.hint.navigate') || 'Nav', 146, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Space (reorder) — only if party > 1 and no diary entries (diary hint takes that slot)
    const hasDiaryEntries = partyMode === 'overworld' && Object.keys(getPlayerData().awayPokemon).length > 0;
    if (hasDiaryEntries) {
      fillRect(ctx, 178, 151, 14, 8, C.KEY_BG);
      drawRect(ctx, 178, 151, 14, 8, C.KEY_BRD);
      drawText(ctx, '◄►', 185, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
      drawText(ctx, t('party.hint.diary'), 195, 153, { size: 6, color: '#8888ff', font: 'monospace' });
    } else if (party.length > 1) {
      fillRect(ctx, 178, 151, 28, 8, C.KEY_BG);
      drawRect(ctx, 178, 151, 28, 8, C.KEY_BRD);
      drawText(ctx, 'Space', 192, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
      drawText(ctx, t('party.hint.reorder') || 'Swap', 208, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // COLORS — from canvas_coordinates.md
  // ═══════════════════════════════════════════════════════════════════
  const C = {
    BG: '#0d1a14',
    CARD_BG: '#0f2a1a',
    CARD_SEL: '#1a3a2a',
    BORDER: '#1a4a30',
    SEP: '#1a3a2a',
    TEXT_PRI: '#ffffff',
    TEXT_SEC: '#aaccaa',
    TEXT_MUT: '#667766',
    TEXT_DIM: '#445544',
    BAR_HP: '#20d860',
    BAR_TRACK: '#1a3a2a',
    BAR_XP: '#5080ff',
    BAR_PP: '#20a0d8',
    TAB_BG: '#0a2a1a',
    TAB_ACT: '#1a5a35',
    BTM_BG: '#0a1a10',
    KEY_BG: '#1a3a2a',
    KEY_BRD: '#2a5a3a',
    BORDER_SEL: '#f8c030',
  };

  // Damage class colors/symbols come from getDamageClassLabel() in type-constants.ts

  function renderDetailStatsTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    // ── Sprite container (right side) ──
    fillRect(ctx, 184, 16, 44, 44, '#0a2a1a');
    drawRect(ctx, 184, 16, 44, 44, C.BORDER);
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, 186, 16, 40, 40);
    }

    if (pokemon.heldItemId) {
      drawHeldItem(ctx, pokemon.heldItemId, { x: 185, y: 50, w: 9, h: 9 });
    }

    // ── Name (centered in left 168px area) ──
    drawText(ctx, getPokemonDisplayName(pokemon.id), 96, 22, {
      size: 10,
      color: C.TEXT_PRI,
      font: 'monospace',
      align: 'center',
    });

    // ── Type badges (centered, y=34) ──
    const typeLabels = pokemon.types.map((pt) => ({ type: pt, label: getTypeName(pt) }));
    // Each badge is 28px wide, 4px gap between them
    const badgeW = 28;
    const badgeGap = 4;
    const totalW = typeLabels.length * badgeW + (typeLabels.length - 1) * badgeGap;
    let bx = Math.floor(96 - totalW / 2);
    for (const tl of typeLabels) {
      const color = TYPE_BADGE[tl.type]?.color || '#888888';
      fillRect(ctx, bx, 34, badgeW, 9, color);
      drawText(ctx, tl.label, bx + badgeW / 2, 35, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
      bx += badgeW + badgeGap;
    }

    // ── Level / Height / Weight (centered, y=46) ──
    const size = computePokemonSize(pokemon);
    const hVal = size.heightM > 0 ? size.heightM.toFixed(1) : '?';
    const wVal = size.weightKg > 0 ? size.weightKg.toFixed(1) : '?';
    const lvStr = `${t('party.stats.level')} ${pokemon.level}`;
    const hStr = hVal !== '?' ? t('party.height', { value: hVal, unit: t('party.unit.meter') }) : '';
    const wStr = wVal !== '?' ? t('party.weight', { value: wVal, unit: t('party.unit.kg') }) : '';
    const hwLine = [lvStr, hStr, wStr].filter(Boolean).join('  ·  ');
    if (hwLine) {
      drawText(ctx, hwLine, 96, 46, { size: 6, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    }

    // ── Ability & Nature (y=54, same style as level/height/weight) ──
    const abilityStr = pokemon.abilityId ? getAbilityDisplayName(pokemon.abilityId) : '';
    let natureStr = '';
    if (pokemon.natureId) {
      const natureName = getNatureDisplayName(pokemon.natureId);
      const natureDef = getNature(pokemon.natureId);
      let natureHint = '';
      if (natureDef?.increasedStat && natureDef?.decreasedStat) {
        const statShort: Record<string, string> = {
          attack: 'Atk',
          defense: 'Def',
          specialAttack: 'SpA',
          specialDefense: 'SpD',
          speed: 'Spe',
        };
        natureHint = ` (+${statShort[natureDef.increasedStat] ?? '?'} -${statShort[natureDef.decreasedStat] ?? '?'})`;
      }
      natureStr = `${natureName}${natureHint}`;
    }
    const anLine = [abilityStr, natureStr].filter(Boolean).join('  ·  ');
    if (anLine) {
      drawText(ctx, anLine, 96, 54, { size: 6, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    }

    // ── Separator 1 ──
    fillRect(ctx, 8, 60, 224, 1, C.SEP);

    // ── HP section ──
    drawText(ctx, 'HP', 228, 64, { size: 7, color: C.TEXT_SEC, font: 'monospace', align: 'right' });
    drawText(ctx, `${pokemon.hp}`, 12, 63, { size: 10, color: C.TEXT_PRI, font: 'monospace' });
    drawText(ctx, `/ ${pokemon.maxHp}`, 30, 65, { size: 7, color: C.TEXT_MUT, font: 'monospace' });
    // HP bar
    fillRect(ctx, 12, 74, 216, 3, C.BAR_TRACK);
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.round(216 * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) fillRect(ctx, 12, 74, hpFillW, 3, C.BAR_HP);

    // ── XP row ──
    drawText(ctx, t('party.xpLabel'), 228, 80, { size: 6, color: C.TEXT_DIM, font: 'monospace', align: 'right' });
    drawText(ctx, `${pokemon.xp} / ${pokemon.xpToNext}`, 12, 80, { size: 6, color: C.TEXT_DIM, font: 'monospace' });
    // XP bar
    fillRect(ctx, 12, 87, 216, 2, C.BAR_TRACK);
    const xpRatio = pokemon.xpToNext > 0 ? pokemon.xp / pokemon.xpToNext : 0;
    const xpFillW = Math.round(216 * Math.max(0, Math.min(1, xpRatio)));
    if (xpFillW > 0) fillRect(ctx, 12, 87, xpFillW, 2, C.BAR_XP);

    // ── Separator 2 ──
    // fillRect(ctx, 8, 87, 224, 1, C.SEP);

    // ── Base Stats header ──
    drawText(ctx, t('party.baseStats'), 228, 90, { size: 7, color: C.TEXT_MUT, font: 'monospace', align: 'right' });

    // ── Stat rows (HP row removed — shown above) ──
    const STAT_MAX = 255; // true Pokémon stat cap
    const BAR_W = 124;

    const statRows: [string, number, string, number][] = [
      [t('party.stats.attack'), pokemon.attack, '#f08030', 99],
      [t('party.stats.defense'), pokemon.defense, '#6890f0', 107],
      [t('party.stats.spAtk'), pokemon.specialAttack, '#a040a0', 115],
      [t('party.stats.spDef'), pokemon.specialDefense, '#f8d030', 123],
      [t('party.stats.speed'), pokemon.speed, '#f85888', 131],
    ];

    for (const [label, value, color, rowY] of statRows) {
      // Bar track + fill
      fillRect(ctx, 12, rowY + 2, 124, 3, C.BAR_TRACK);
      const fill = Math.max(1, Math.round((value / STAT_MAX) * BAR_W));
      fillRect(ctx, 12, rowY + 2, fill, 3, color);
      // Value (centered at x=154)
      drawText(ctx, String(value), 154, rowY, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
      // Label (right-aligned at x=228)
      drawText(ctx, label, 228, rowY, { size: 7, color: C.TEXT_SEC, font: 'monospace', align: 'right' });
    }

    // ── Happiness bar ──
    const party = getPlayerData().party;
    const happiness = calcHappiness(pokemon, party);
    const happinessLabel = getHappinessLabel(happiness);
    const happinessRowY = 139;
    fillRect(ctx, 12, happinessRowY + 2, 124, 3, C.BAR_TRACK);
    const happinessFill = Math.max(1, Math.round((happiness / 255) * 124));
    fillRect(ctx, 12, happinessRowY + 2, happinessFill, 3, happinessLabel.color);
    drawText(ctx, String(happiness), 154, happinessRowY, {
      size: 7,
      color: C.TEXT_PRI,
      font: 'monospace',
      align: 'center',
    });
    drawText(ctx, t('party.stats.happiness', { label: happinessLabel[getLocale()] }), 228, happinessRowY, {
      size: 7,
      color: C.TEXT_SEC,
      font: 'monospace',
      align: 'right',
    });
  }

  function renderDetailMovesTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    const displayedMoves = getDisplayedMoves(pokemon);
    const maxVisible = Math.min(displayedMoves.length, 8);
    const scrollOffset = Math.max(
      0,
      Math.min(moveCursor - maxVisible + 1, Math.max(0, displayedMoves.length - maxVisible)),
    );

    drawText(ctx, t('party.moves.battleMoves'), 228, 16, {
      size: 7,
      color: C.TEXT_MUT,
      font: 'monospace',
      align: 'right',
    });
    drawText(ctx, `${displayedMoves.length} ${t('party.moves.title')}`, 12, 16, {
      size: 6,
      color: C.TEXT_DIM,
      font: 'monospace',
    });

    for (let visibleIndex = 0; visibleIndex < maxVisible; visibleIndex++) {
      const moveIndex = scrollOffset + visibleIndex;
      const entry = displayedMoves[moveIndex];
      if (!entry) continue;

      const move = entry.move;
      const cy = 26 + visibleIndex * 15;
      const isSelected = moveIndex === moveCursor;
      const isSwapSource = moveIndex === moveSwapFrom;
      const borderColor = entry.pending ? '#f8c030' : isSwapSource ? C.BORDER_SEL : C.BORDER;

      fillRect(ctx, 4, cy, 232, 14, isSelected ? C.CARD_SEL : C.CARD_BG);
      drawRect(ctx, 4, cy, 232, 14, borderColor);

      const moveData = getMove(move.id);
      const dc = moveData?.damageClass || (move.power > 0 ? 'physical' : 'status');
      const dcInfo = getDamageClassLabel(dc);
      ctx.beginPath();
      ctx.arc(230, cy + 6, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = dcInfo.color;
      ctx.fill();

      const moveName = getMoveDisplayName(move.id);
      drawText(ctx, moveName, 225, cy + 1, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'right' });

      const typeLabel = getTypeName(move.type as PokemonType);
      const typeColor = TYPE_BADGE[move.type as PokemonType]?.color || '#888888';
      fillRect(ctx, 97, cy + 2, 22, 7, typeColor);
      drawText(ctx, typeLabel, 108, cy + 4, { size: 5, color: C.TEXT_PRI, font: 'monospace', align: 'center' });

      const accVal = move.accuracy > 0 ? move.accuracy : 0;
      const powVal = move.power > 0 ? move.power : 0;
      drawText(ctx, `${t('party.moves.header.acc')}: ${accVal}%`, 185, cy + 9, {
        size: 5,
        color: C.TEXT_DIM,
        font: 'monospace',
        align: 'right',
      });
      drawText(ctx, `${t('party.moves.header.pow')}: ${powVal}%`, 225, cy + 9, {
        size: 5,
        color: C.TEXT_DIM,
        font: 'monospace',
        align: 'right',
      });

      drawText(ctx, `${move.currentPp}/${move.pp}`, 12, cy + 2, { size: 6, color: C.TEXT_SEC, font: 'monospace' });
      fillRect(ctx, 12, cy + 10, 30, 2, C.BAR_TRACK);
      const ppRatio = move.pp > 0 ? move.currentPp / move.pp : 0;
      const ppFillW = Math.round(30 * Math.max(0, Math.min(1, ppRatio)));
      if (ppFillW > 0) fillRect(ctx, 12, cy + 10, ppFillW, 2, C.BAR_PP);

      if (entry.pending) {
        drawText(ctx, t('party.moveLearning.newTag'), 52, cy + 2, { size: 5, color: '#f8c030', font: 'monospace' });
      }
    }

    const selectedEntry = displayedMoves[moveCursor];

    if (isMoveLearningMode() && selectedEntry) {
      const session = getMoveLearningSession()!;
      const move = selectedEntry.move;
      const moveData = getMove(move.id);
      const dc = moveData?.damageClass || (move.power > 0 ? 'physical' : 'status');
      const dcInfo = getDamageClassLabel(dc);
      const pendingMove = createMoveFromId(session.moveId);
      const pendingMoveName = pendingMove ? getMoveDisplayName(pendingMove.id) : '???';

      const mx = 8,
        my = 20,
        mw = 224,
        mh = 126;
      fillRect(ctx, 0, 14, 240, 136, '#000000aa');
      fillRect(ctx, mx, my, mw, mh, C.BG);
      drawRect(ctx, mx, my, mw, mh, '#2a6a40');

      const moveName = getMoveDisplayName(move.id);
      drawText(ctx, moveName, mx + mw - 6, my + 4, { size: 8, color: C.TEXT_PRI, font: 'monospace', align: 'right' });
      ctx.beginPath();
      ctx.arc(mx + mw - 8 - moveName.length * 5, my + 8, 3, 0, Math.PI * 2);
      ctx.fillStyle = dcInfo.color;
      ctx.fill();

      const typeLabel = getTypeName(move.type as PokemonType);
      const typeColor = TYPE_BADGE[move.type as PokemonType]?.color || '#888888';
      fillRect(ctx, mx + 6, my + 4, 26, 9, typeColor);
      drawText(ctx, typeLabel, mx + 19, my + 5, { size: 6, color: C.TEXT_PRI, font: 'monospace', align: 'center' });

      const extraHeader =
        !session.learned && pendingMove
          ? t(moveLearningReplaceMode ? 'party.moveLearning.replacePrompt' : 'party.moveLearning.newMoveLine', {
              move: pendingMoveName,
            })
          : '';
      if (extraHeader) {
        drawText(ctx, extraHeader, mx + mw / 2, my + 16, {
          size: 6,
          color: '#f8c030',
          font: 'monospace',
          align: 'center',
        });
      }

      const statsY = my + (extraHeader ? 28 : 18);
      fillRect(ctx, mx + 4, statsY, mw - 8, 1, C.SEP);
      const ry = statsY + 3;
      drawText(ctx, dcInfo.label, mx + mw - 6, ry, { size: 6, color: dcInfo.color, font: 'monospace', align: 'right' });
      drawText(ctx, `${t('party.moves.header.pow')}: ${move.power > 0 ? move.power : 0}`, mx + mw - 60, ry, {
        size: 6,
        color: C.TEXT_SEC,
        font: 'monospace',
        align: 'right',
      });
      drawText(ctx, `${t('party.moves.header.acc')}: ${move.accuracy > 0 ? move.accuracy : '-'}%`, mx + mw - 110, ry, {
        size: 6,
        color: C.TEXT_SEC,
        font: 'monospace',
        align: 'right',
      });
      drawText(ctx, `PP: ${move.currentPp}/${move.pp}`, mx + 6, ry, { size: 6, color: C.TEXT_SEC, font: 'monospace' });

      const descY = statsY + 14;
      fillRect(ctx, mx + 4, descY - 2, mw - 8, 1, C.SEP);
      const desc = moveData?.description?.[getLocale()] || '';
      if (desc) {
        const maxChars = 38;
        const words = desc.split(' ');
        let line = '';
        let dy = descY + 2;
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (test.length > maxChars && line) {
            drawText(ctx, line, mx + 6, dy, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
            dy += 8;
            line = word;
          } else {
            line = test;
          }
        }
        if (line) drawText(ctx, line, mx + 6, dy, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
      }

      const btnY = my + mh - 16;
      fillRect(ctx, mx + 4, btnY - 2, mw - 8, 1, C.SEP);
      const actionLabels = getMoveLearningActionLabels();
      const btnW = Math.floor((mw - 16) / actionLabels.length);
      for (let i = 0; i < actionLabels.length; i++) {
        const isSel = i === moveLearningActionCursor;
        const bx = mx + 6 + i * btnW;
        if (isSel) {
          fillRect(ctx, bx, btnY, btnW - 4, 12, C.CARD_SEL);
          drawRect(ctx, bx, btnY, btnW - 4, 12, '#2a6a40');
        }
        drawText(ctx, actionLabels[i], bx + (btnW - 4) / 2, btnY + 2, {
          size: 7,
          color: isSel ? C.TEXT_PRI : C.TEXT_MUT,
          font: 'monospace',
          align: 'center',
        });
      }

      if (moveLearningConfirmAction) {
        const oldMove = pokemon.moves[Math.min(moveCursor, pokemon.moves.length - 1)];
        const oldMoveName = oldMove ? getMoveDisplayName(oldMove.id) : '???';
        const confirmKey =
          moveLearningConfirmAction === 'replace'
            ? 'party.moveLearning.replaceConfirm'
            : 'party.moveLearning.skipConfirm';
        const warningKey =
          moveLearningConfirmAction === 'replace'
            ? 'party.moveLearning.replaceWarning'
            : 'party.moveLearning.skipWarning';

        fillRect(ctx, 0, 0, 240, 160, '#000000aa');
        const dx = 28,
          dy = 50,
          dw = 184,
          dh = 52;
        fillRect(ctx, dx, dy, dw, dh, C.BG);
        drawRect(ctx, dx, dy, dw, dh, moveLearningConfirmAction === 'replace' ? '#f8c030' : '#cc4444');
        drawText(ctx, t(confirmKey, { move: pendingMoveName, oldMove: oldMoveName }), dx + dw / 2, dy + 8, {
          size: 7,
          color: C.TEXT_PRI,
          font: 'monospace',
          align: 'center',
        });
        drawText(ctx, t(warningKey), dx + dw / 2, dy + 20, {
          size: 6,
          color: moveLearningConfirmAction === 'replace' ? '#f8c030' : '#ff8888',
          font: 'monospace',
          align: 'center',
        });
        const confirmBtnW = 60,
          confirmBtnH = 12,
          btnGap = 20;
        const yesX = dx + dw / 2 - confirmBtnW - btnGap / 2;
        const noX = dx + dw / 2 + btnGap / 2;
        const confirmBtnY = dy + 34;
        const yesSelected = moveLearningConfirmCursor === 0;
        fillRect(ctx, yesX, confirmBtnY, confirmBtnW, confirmBtnH, yesSelected ? '#2a6a40' : '#333333');
        drawRect(ctx, yesX, confirmBtnY, confirmBtnW, confirmBtnH, '#2a6a40');
        drawText(ctx, t('party.moves.forgetYes'), yesX + confirmBtnW / 2, confirmBtnY + 2, {
          size: 7,
          color: yesSelected ? '#ffffff' : '#888888',
          font: 'monospace',
          align: 'center',
        });
        fillRect(ctx, noX, confirmBtnY, confirmBtnW, confirmBtnH, !yesSelected ? '#cc4444' : '#333333');
        drawRect(ctx, noX, confirmBtnY, confirmBtnW, confirmBtnH, '#cc4444');
        drawText(ctx, t('party.moves.forgetNo'), noX + confirmBtnW / 2, confirmBtnY + 2, {
          size: 7,
          color: !yesSelected ? '#ffffff' : '#888888',
          font: 'monospace',
          align: 'center',
        });
      }
    } else if (moveActionMenuOpen) {
      const move = pokemon.moves[moveCursor];
      const moveData = move ? getMove(move.id) : undefined;
      const dc = moveData?.damageClass || (move?.power > 0 ? 'physical' : 'status');
      const dcInfo = getDamageClassLabel(dc);

      const mx = 8,
        my = 20,
        mw = 224,
        mh = 126;
      fillRect(ctx, 0, 14, 240, 136, '#000000aa');
      fillRect(ctx, mx, my, mw, mh, C.BG);
      drawRect(ctx, mx, my, mw, mh, '#2a6a40');

      if (move) {
        const moveName = getMoveDisplayName(move.id);
        drawText(ctx, moveName, mx + mw - 6, my + 4, { size: 8, color: C.TEXT_PRI, font: 'monospace', align: 'right' });
        ctx.beginPath();
        ctx.arc(mx + mw - 8 - moveName.length * 5, my + 8, 3, 0, Math.PI * 2);
        ctx.fillStyle = dcInfo.color;
        ctx.fill();

        const typeLabel = getTypeName(move.type as PokemonType);
        const typeColor = TYPE_BADGE[move.type as PokemonType]?.color || '#888888';
        fillRect(ctx, mx + 6, my + 4, 26, 9, typeColor);
        drawText(ctx, typeLabel, mx + 19, my + 5, { size: 6, color: C.TEXT_PRI, font: 'monospace', align: 'center' });

        const statsY = my + 18;
        fillRect(ctx, mx + 4, statsY, mw - 8, 1, C.SEP);
        const ry = statsY + 3;
        drawText(ctx, dcInfo.label, mx + mw - 6, ry, {
          size: 6,
          color: dcInfo.color,
          font: 'monospace',
          align: 'right',
        });
        drawText(ctx, `${t('party.moves.header.pow')}: ${move.power > 0 ? move.power : 0}`, mx + mw - 60, ry, {
          size: 6,
          color: C.TEXT_SEC,
          font: 'monospace',
          align: 'right',
        });
        drawText(
          ctx,
          `${t('party.moves.header.acc')}: ${move.accuracy > 0 ? move.accuracy : '-'}%`,
          mx + mw - 110,
          ry,
          {
            size: 6,
            color: C.TEXT_SEC,
            font: 'monospace',
            align: 'right',
          },
        );
        drawText(ctx, `PP: ${move.currentPp}/${move.pp}`, mx + 6, ry, {
          size: 6,
          color: C.TEXT_SEC,
          font: 'monospace',
        });

        const descY = statsY + 14;
        fillRect(ctx, mx + 4, descY - 2, mw - 8, 1, C.SEP);
        const desc = moveData?.description?.[getLocale()] || '';
        if (desc) {
          const maxChars = 38;
          const words = desc.split(' ');
          let line = '';
          let dy = descY + 2;
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (test.length > maxChars && line) {
              drawText(ctx, line, mx + 6, dy, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
              dy += 8;
              line = word;
            } else {
              line = test;
            }
          }
          if (line) drawText(ctx, line, mx + 6, dy, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
        }
      }

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
        const label =
          action === 'swap'
            ? t('party.moves.swap')
            : action === 'delete'
              ? t('party.moves.delete')
              : t('party.moves.cancel');
        drawText(ctx, label, bx + (btnW - 4) / 2, btnY + 2, {
          size: 7,
          color: isSel ? C.TEXT_PRI : C.TEXT_MUT,
          font: 'monospace',
          align: 'center',
        });
      }
    }

    if (moveDeleteConfirm) {
      const move = pokemon.moves[moveCursor];
      const moveName = move ? getMoveDisplayName(move.id) : '???';
      fillRect(ctx, 0, 0, 240, 160, '#000000aa');
      const dx = 30,
        dy = 50,
        dw = 180,
        dh = 50;
      fillRect(ctx, dx, dy, dw, dh, C.BG);
      drawRect(ctx, dx, dy, dw, dh, '#cc4444');
      drawText(ctx, t('party.moves.forgetConfirm', { move: moveName }), dx + dw / 2, dy + 8, {
        size: 7,
        color: C.TEXT_PRI,
        font: 'monospace',
        align: 'center',
      });
      drawText(ctx, t('party.moves.forgetWarning'), dx + dw / 2, dy + 20, {
        size: 6,
        color: '#ff8888',
        font: 'monospace',
        align: 'center',
      });
      const btnW = 60,
        btnH = 12,
        btnGap = 20;
      const yesX = dx + dw / 2 - btnW - btnGap / 2;
      const noX = dx + dw / 2 + btnGap / 2;
      const btnY = dy + 33;
      const yesSelected = moveDeleteConfirmCursor === 0;
      fillRect(ctx, yesX, btnY, btnW, btnH, yesSelected ? '#cc4444' : '#333333');
      drawRect(ctx, yesX, btnY, btnW, btnH, '#cc4444');
      drawText(ctx, t('party.moves.forgetYes'), yesX + btnW / 2, btnY + 2, {
        size: 7,
        color: yesSelected ? '#ffffff' : '#888888',
        font: 'monospace',
        align: 'center',
      });
      fillRect(ctx, noX, btnY, btnW, btnH, !yesSelected ? '#2a6a40' : '#333333');
      drawRect(ctx, noX, btnY, btnW, btnH, '#2a6a40');
      drawText(ctx, t('party.moves.forgetNo'), noX + btnW / 2, btnY + 2, {
        size: 7,
        color: !yesSelected ? '#ffffff' : '#888888',
        font: 'monospace',
        align: 'center',
      });
    }

    if (moveMessage && moveMessageTimer > 0) {
      fillRect(ctx, 8, 136, 224, 10, '#3a1a1a');
      drawText(ctx, moveMessage, 120, 137, { size: 7, color: '#ff6666', align: 'center' });
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
    if (actionMessageTimer > 0) {
      actionMessageTimer -= dt;
      if (actionMessageTimer <= 0) {
        actionMessage = '';
        actionMessageTimer = 0;
      }
    }

    if (isMoveLearningMode()) {
      const session = getMoveLearningSession();
      const pendingMove = session ? createMoveFromId(session.moveId) : null;
      if (!session || !pendingMove) {
        completeMoveLearning({ outcome: 'skipped', moveId: session?.moveId ?? -1 });
        return;
      }

      const displayedMoves = getDisplayedMoves(pokemon);
      const learnedMoveIndex = session.learned
        ? Math.max(
            0,
            pokemon.moves.findIndex((move) => move.id === session.moveId),
          )
        : pokemon.moves.length;
      const maxCursor = moveLearningReplaceMode
        ? Math.max(0, pokemon.moves.length - 1)
        : Math.max(0, displayedMoves.length - 1);
      moveCursor = Math.max(0, Math.min(moveCursor, maxCursor));

      if (moveLearningConfirmAction) {
        if (input.isKeyPressed('Escape')) {
          moveLearningConfirmAction = null;
          return;
        }
        if (input.isKeyPressed('ArrowLeft')) {
          moveLearningConfirmCursor = 0;
          return;
        }
        if (input.isKeyPressed('ArrowRight')) {
          moveLearningConfirmCursor = 1;
          return;
        }
        if (input.isKeyPressed('Enter')) {
          if (moveLearningConfirmCursor === 0) {
            if (moveLearningConfirmAction === 'replace') {
              const replacedMoveId = pokemon.moves[moveCursor]?.id;
              pokemon.moves[moveCursor] = pendingMove;
              completeMoveLearning({ outcome: 'replaced', moveId: session.moveId, replacedMoveId });
              return;
            }
            completeMoveLearning({ outcome: 'skipped', moveId: session.moveId });
            return;
          }
          moveLearningConfirmAction = null;
        }
        return;
      }

      if (moveLearningReplaceMode) {
        const moveCount = Math.max(1, pokemon.moves.length);
        if (input.isKeyPressed('Escape')) {
          moveLearningReplaceMode = false;
          moveLearningActionCursor = 0;
          moveCursor = learnedMoveIndex;
          return;
        }
        if (input.isKeyPressed('ArrowUp')) {
          moveCursor = moveCursor > 0 ? moveCursor - 1 : moveCount - 1;
          return;
        }
        if (input.isKeyPressed('ArrowDown')) {
          moveCursor = moveCursor < moveCount - 1 ? moveCursor + 1 : 0;
          return;
        }
        if (input.isKeyPressed('ArrowLeft')) {
          moveLearningActionCursor = 0;
          return;
        }
        if (input.isKeyPressed('ArrowRight')) {
          moveLearningActionCursor = 1;
          return;
        }
        if (input.isKeyPressed('Enter')) {
          if (moveLearningActionCursor === 0) {
            moveLearningConfirmAction = 'replace';
            moveLearningConfirmCursor = 1;
          } else {
            moveLearningReplaceMode = false;
            moveLearningActionCursor = 0;
            moveCursor = learnedMoveIndex;
          }
          return;
        }
        return;
      }

      const moveCount = Math.max(1, displayedMoves.length);
      if (input.isKeyPressed('ArrowUp')) {
        moveCursor = moveCursor > 0 ? moveCursor - 1 : moveCount - 1;
        return;
      }
      if (input.isKeyPressed('ArrowDown')) {
        moveCursor = moveCursor < moveCount - 1 ? moveCursor + 1 : 0;
        return;
      }
      if (input.isKeyPressed('ArrowLeft')) {
        const totalActions = getMoveLearningActionLabels().length;
        moveLearningActionCursor = moveLearningActionCursor > 0 ? moveLearningActionCursor - 1 : totalActions - 1;
        return;
      }
      if (input.isKeyPressed('ArrowRight')) {
        const totalActions = getMoveLearningActionLabels().length;
        moveLearningActionCursor = moveLearningActionCursor < totalActions - 1 ? moveLearningActionCursor + 1 : 0;
        return;
      }
      if (input.isKeyPressed('Escape')) {
        if (session.learned) {
          completeMoveLearning({ outcome: 'learned', moveId: session.moveId });
        } else {
          moveLearningConfirmAction = 'skip';
          moveLearningConfirmCursor = 1;
        }
        return;
      }
      if (input.isKeyPressed('Enter')) {
        if (session.learned) {
          completeMoveLearning({ outcome: 'learned', moveId: session.moveId });
        } else if (moveLearningActionCursor === 0) {
          moveLearningReplaceMode = true;
          moveLearningActionCursor = 0;
          moveCursor = 0;
        } else {
          moveLearningConfirmAction = 'skip';
          moveLearningConfirmCursor = 1;
        }
        return;
      }
      return;
    }

    // Handle delete confirmation dialog
    if (moveDeleteConfirm) {
      if (input.isKeyPressed('Escape')) {
        moveDeleteConfirm = false;
        return;
      }
      if (input.isKeyPressed('ArrowLeft')) {
        moveDeleteConfirmCursor = 0;
        return;
      }
      if (input.isKeyPressed('ArrowRight')) {
        moveDeleteConfirmCursor = 1;
        return;
      }
      if (input.isKeyPressed('Enter')) {
        if (moveDeleteConfirmCursor === 0) {
          // Yes — delete the move
          pokemon.moves.splice(moveCursor, 1);
          if (moveCursor >= pokemon.moves.length) {
            moveCursor = pokemon.moves.length - 1;
          }
        }
        moveDeleteConfirm = false;
      }
      return;
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
          if (pokemon.moves.length <= 4) {
            moveMessage = t('party.moves.cantDeleteLast');
            moveMessageTimer = 2;
            moveActionMenuOpen = false;
          } else {
            // Show confirmation dialog
            moveDeleteConfirm = true;
            moveDeleteConfirmCursor = 1; // default to "No"
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
      const tabs = ['moves', 'stats', 'item'] as const;
      const currentIndex = tabs.indexOf(detailTab);
      if (input.isKeyPressed('ArrowLeft')) {
        detailTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      } else {
        detailTab = tabs[(currentIndex + 1) % tabs.length];
      }
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
        if (pokemon.moves.length <= 4) {
          moveMessage = t('party.moves.cantDeleteLast');
          moveMessageTimer = 2;
        } else {
          // Show confirmation dialog
          moveDeleteConfirm = true;
          moveDeleteConfirmCursor = 1; // default to "No"
        }
      }
    } else if (detailTab === 'stats') {
      if (input.isKeyPressed('ArrowUp')) {
        cursor = cursor > 0 ? cursor - 1 : getParty().length - 1;
      }
      if (input.isKeyPressed('ArrowDown')) {
        cursor = cursor < getParty().length - 1 ? cursor + 1 : 0;
      }
    } else if (detailTab === 'item') {
      const MAX_VISIBLE = 3; // match the value in renderDetailHeldItemTab

      if (heldItems.length > 0 && input.isKeyPressed('ArrowUp')) {
        heldItemCursor = (heldItemCursor - 1 + Math.max(1, heldItems.length)) % Math.max(1, heldItems.length);
        if (heldItemCursor < heldItemScrollOffset) {
          heldItemScrollOffset = heldItemCursor;
        } else if (heldItemCursor === heldItems.length - 1) {
          // wrapped around to bottom
          heldItemScrollOffset = Math.max(0, heldItems.length - MAX_VISIBLE);
        }
      }

      if (heldItems.length > 0 && input.isKeyPressed('ArrowDown')) {
        heldItemCursor = (heldItemCursor + 1) % Math.max(1, heldItems.length);
        if (heldItemCursor === 0) {
          // wrapped around to top
          heldItemScrollOffset = 0;
        } else if (heldItemCursor >= heldItemScrollOffset + MAX_VISIBLE) {
          heldItemScrollOffset = heldItemCursor - MAX_VISIBLE + 1;
        }
      }

      if (heldItems.length > 0 && (input.isKeyPressed('Enter') || input.isKeyPressed(' '))) {
        const selected = heldItems[heldItemCursor];
        if (selected) {
          const pd = getPlayerData();

          pd.items[selected.id] = (pd.items[selected.id] || 0) - 1;
          if (pokemon.heldItemId) {
            pd.items[pokemon.heldItemId] = (pd.items[pokemon.heldItemId] || 0) + 1;
          }

          actionMessage = t('bag.heldItem.equipped', {
            item: getItem(selected.id)?.name.he || '???',
            name: getPokemonDisplayName(pokemon.id),
          });
          pokemon.heldItemId = selected.id;
          actionMessageTimer = 1.5;
        }
      }
    }

    // handle remove item from pokemon on stats tab with D key
    if (detailTab === 'item') {
      if (pokemon.heldItemId && (input.isKeyPressed('d') || input.isKeyPressed('D'))) {
        // Remove held item
        const item = getItem(pokemon.heldItemId);
        if (item) {
          pokemon.heldItemId = null;
          const pd = getPlayerData();
          pd.items[item.id] = (pd.items[item.id] || 0) + 1;
          actionMessage = t('bag.heldItem.unequipped', {
            item: item.name.he || '???',
            name: getPokemonDisplayName(pokemon.id),
          });
          actionMessageTimer = 1.5;

          autoSave();
          // !bug : actionMessage is not shoing
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHARED HEADER — extracted from renderDetailStatsTab so both Stats and
  // HeldItem tabs can reuse the top sprite/name/types/level block.
  // ─────────────────────────────────────────────────────────────────────────────
  function renderDetailPokemonHeader(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    // ── Sprite container (right side) ──
    fillRect(ctx, 184, 16, 44, 44, '#0a2a1a');
    drawRect(ctx, 184, 16, 44, 44, C.BORDER);
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, 186, 16, 40, 40);
    }

    if (pokemon.heldItemId) {
      drawHeldItem(ctx, pokemon.heldItemId, { x: 185, y: 50, w: 9, h: 9 });
    }

    // ── Name (centered in left 168px area) ──
    drawText(ctx, getPokemonDisplayName(pokemon.id), 96, 22, {
      size: 10,
      color: C.TEXT_PRI,
      font: 'monospace',
      align: 'center',
    });

    // ── Type badges (centered, y=34) ──
    const typeLabels = pokemon.types.map((pt) => ({ type: pt, label: getTypeName(pt) }));
    const badgeW = 28;
    const badgeGap = 4;
    const totalW = typeLabels.length * badgeW + (typeLabels.length - 1) * badgeGap;
    let bx = Math.floor(96 - totalW / 2);
    for (const tl of typeLabels) {
      const color = TYPE_BADGE[tl.type]?.color || '#888888';
      fillRect(ctx, bx, 34, badgeW, 9, color);
      drawText(ctx, tl.label, bx + badgeW / 2, 35, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
      bx += badgeW + badgeGap;
    }

    // ── Level / Height / Weight ──
    const size = computePokemonSize(pokemon);
    const hVal = size.heightM > 0 ? size.heightM.toFixed(1) : '?';
    const wVal = size.weightKg > 0 ? size.weightKg.toFixed(1) : '?';
    const lvStr = `${t('party.stats.level')} ${pokemon.level}`;
    const hStr = hVal !== '?' ? t('party.height', { value: hVal, unit: t('party.unit.meter') }) : '';
    const wStr = wVal !== '?' ? t('party.weight', { value: wVal, unit: t('party.unit.kg') }) : '';
    const hwLine = [lvStr, hStr, wStr].filter(Boolean).join('  ·  ');
    if (hwLine) {
      drawText(ctx, hwLine, 96, 46, { size: 6, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    }

    // ── Ability & Nature ──
    const abilityStr = pokemon.abilityId ? getAbilityDisplayName(pokemon.abilityId) : '';
    let natureStr = '';
    if (pokemon.natureId) {
      const natureName = getNatureDisplayName(pokemon.natureId);
      const natureDef = getNature(pokemon.natureId);
      let natureHint = '';
      if (natureDef?.increasedStat && natureDef?.decreasedStat) {
        const statShort: Record<string, string> = {
          attack: 'Atk',
          defense: 'Def',
          specialAttack: 'SpA',
          specialDefense: 'SpD',
          speed: 'Spe',
        };
        natureHint = ` (+${statShort[natureDef.increasedStat] ?? '?'} -${statShort[natureDef.decreasedStat] ?? '?'})`;
      }
      natureStr = `${natureName}${natureHint}`;
    }
    const anLine = [abilityStr, natureStr].filter(Boolean).join('  ·  ');
    if (anLine) {
      drawText(ctx, anLine, 96, 54, { size: 6, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELD ITEM TAB — state (add alongside your existing detailTab state)
  // ─────────────────────────────────────────────────────────────────────────────

  let heldItemCursor = 0; // index into the available-items list
  let heldItemScrollOffset = 0; // top visible row index
  let heldItems: Array<{ id: string; quantity: number; itemDef: ItemDef | undefined }> = [];
  //
  // Stub — replace with real bag item lookup
  function getEquippableItems(): Array<{ id: string; quantity: number; itemDef: ItemDef | undefined }> {
    // e.g. return getPlayerBag().filter(entry => isEquippable(entry.id));
    const pd = getPlayerData();
    const allItems = Object.entries(pd.items).map(([id, quantity]) => ({ id, quantity, itemDef: getItem(id) }));
    return allItems.filter((item) => item.itemDef?.category === 'held');
  }

  function renderDetailHeldItemTab(
    ctx: CanvasRenderingContext2D,
    pokemon: Pokemon,
    heldItemCursor: number,
    heldItemScrollOffset: number,
  ): void {
    const rtl = isRTL();
    // ── Shared top header (sprite, name, types, level, ability/nature) ──
    renderDetailPokemonHeader(ctx, pokemon);

    // ── Separator after header ──
    fillRect(ctx, 8, 60, 224, 1, C.SEP);

    // ── Currently held-item panel (y 62–84) ──
    const PANEL_Y = 62;
    const PANEL_H = 22;

    if (pokemon.heldItemId) {
      const itemDef = getItem(pokemon.heldItemId);
      const itemName = itemDef?.name?.[getLocale()] ?? pokemon.heldItemId;
      const itemDesc = itemDef?.description?.[getLocale()] ?? '';
      const pokemonName = getPokemonDisplayName(pokemon.id);

      fillRect(ctx, 8, PANEL_Y, 224, PANEL_H, '#0a2a1a');
      drawRect(ctx, 8, PANEL_Y, 224, PANEL_H, C.BORDER);

      // Item icon (16×16 box, left-aligned)
      const ICON_X = 12;
      const ICON_Y = PANEL_Y + 3;
      const ICON_SIZE = 16;
      fillRect(ctx, ICON_X, ICON_Y, ICON_SIZE, ICON_SIZE, '#152a1e');
      drawRect(ctx, ICON_X, ICON_Y, ICON_SIZE, ICON_SIZE, C.BORDER);
      if (itemDef?.sprite) {
        const itemSprite = getCachedImage(itemDef.sprite);
        if (itemSprite && itemSprite.complete && itemSprite.naturalWidth > 0) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(itemSprite, ICON_X + 1, ICON_Y + 1, ICON_SIZE - 2, ICON_SIZE - 2);
        }
      }

      // "Pokémon holds Item" line
      const textX = rtl ? 228 : 32;
      const textAlign = rtl ? 'right' : 'left';

      const holdsLine = t('party.heldItem.holds', { pokemon: pokemonName, item: itemName });
      drawText(ctx, holdsLine, textX, PANEL_Y + 4, { size: 6, color: C.TEXT_PRI, font: 'monospace', align: textAlign });

      // Description (clipped to ~30 chars on one line)
      const descClip = itemDesc.length > 300 ? itemDesc.slice(0, 28) + '…' : itemDesc;
      if (descClip) {
        drawText(ctx, descClip, textX, PANEL_Y + 13, {
          size: 5,
          color: C.TEXT_MUT,
          font: 'monospace',
          align: textAlign,
        });
      }
    } else {
      // No item held — placeholder row
      fillRect(ctx, 8, PANEL_Y, 224, PANEL_H, '#0a1a12');
      drawRect(ctx, 8, PANEL_Y, 224, PANEL_H, C.BORDER);
      drawText(ctx, t('party.heldItem.noneHeld'), 120, PANEL_Y + 7, {
        size: 6,
        color: C.TEXT_DIM,
        font: 'monospace',
        align: 'center',
      });
    }

    // ── Separator before list ──
    fillRect(ctx, 8, PANEL_Y + PANEL_H + 1, 224, 1, C.SEP);

    // ── Available-items list header ──
    const LIST_HEADER_Y = PANEL_Y + PANEL_H + 4;
    drawText(ctx, t('party.heldItem.bagItems'), 228, LIST_HEADER_Y, {
      size: 6,
      color: C.TEXT_MUT,
      font: 'monospace',
      align: 'right',
    });

    // ── Item rows ──
    // Each row is 13px tall; we have space from LIST_CONTENT_Y to y=148 (above hint bar)
    const LIST_CONTENT_Y = LIST_HEADER_Y + 8;
    const ROW_H = 13;
    const MAX_VISIBLE = Math.floor((148 - LIST_CONTENT_Y) / ROW_H); // ~5 rows typically

    const items = getEquippableItems();
    heldItems = items;

    if (items.length === 0) {
      drawText(ctx, t('party.heldItem.bagEmpty'), 120, LIST_CONTENT_Y + 6, {
        size: 6,
        color: C.TEXT_DIM,
        font: 'monospace',
        align: 'center',
      });
    } else {
      const ROW_H = 20;
      const visibleCount = Math.min(items.length, MAX_VISIBLE);

      // Icon is on the left for LTR, right for RTL
      const ICON_X = rtl ? 219 : 7;
      const ICON_SIZE = 10;

      // Text starts after icon (LTR) or before icon (RTL)
      const nameX = rtl ? 215 : 21;
      const nameAlign = rtl ? 'right' : 'left';

      // Quantity on the opposite side from icon
      const qtyX = rtl ? 21 : 228;
      const qtyAlign = rtl ? 'left' : 'right';

      for (let vi = 0; vi < visibleCount; vi++) {
        const itemIndex = heldItemScrollOffset + vi;
        const entry = items[itemIndex];
        if (!entry) continue;

        const itemDef = entry.itemDef;
        const itemName = itemDef?.name?.[getLocale()] ?? entry.id;
        const itemDesc = itemDef?.description?.[getLocale()] ?? '';

        const ry = LIST_CONTENT_Y + vi * ROW_H;
        const isSelected = itemIndex === heldItemCursor;

        // Row background
        fillRect(ctx, 4, ry, 232, ROW_H - 1, isSelected ? C.CARD_SEL : C.CARD_BG);
        drawRect(ctx, 4, ry, 232, ROW_H - 1, isSelected ? C.BORDER_SEL : C.BORDER);

        // Item icon
        fillRect(ctx, ICON_X, ry + 2, ICON_SIZE, ICON_SIZE, '#0a2a1a');
        if (itemDef?.sprite) {
          const itemSprite = getCachedImage(itemDef.sprite);
          if (itemSprite && itemSprite.complete && itemSprite.naturalWidth > 0) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(itemSprite, ICON_X, ry + 2, ICON_SIZE, ICON_SIZE);
          }
        }

        // Row 1 — name (size 6) + quantity on opposite side
        drawText(ctx, itemName, nameX, ry + 3, { size: 6, color: C.TEXT_PRI, font: 'monospace', align: nameAlign });
        drawText(ctx, `×${entry.quantity}`, qtyX, ry + 3, {
          size: 6,
          color: C.TEXT_DIM,
          font: 'monospace',
          align: qtyAlign,
        });

        // Row 2 — description always visible, size 5, muted
        if (itemDesc) {
          const maxChars = 360;
          const descClip = itemDesc.length > maxChars ? itemDesc.slice(0, maxChars - 2) + '…' : itemDesc;
          drawText(ctx, descClip, nameX, ry + 12, { size: 5, color: C.TEXT_MUT, font: 'monospace', align: nameAlign });
        }
      }

      // Scroll indicator dots (far right, vertically centered on the list area)
      if (items.length > MAX_VISIBLE) {
        const dotAreaY = LIST_CONTENT_Y;
        const dotAreaH = MAX_VISIBLE * ROW_H;
        const totalDots = Math.min(items.length, 8);
        const dotStep = Math.floor(dotAreaH / totalDots);
        // Dots hug the edge opposite to the icon
        const dotX = rtl ? 2 : 236;
        for (let d = 0; d < totalDots; d++) {
          const isActiveDot = Math.floor((heldItemCursor / items.length) * totalDots) === d;
          fillRect(ctx, dotX, dotAreaY + d * dotStep + dotStep / 2, 2, 2, isActiveDot ? C.TEXT_SEC : C.TEXT_DIM);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATED renderDetailView — adds third tab + ↑↓ party-switch hint on all tabs
  // ─────────────────────────────────────────────────────────────────────────────

  function renderDetailView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    // ── Tab bar ──
    fillRect(ctx, 0, 0, 240, 14, C.BG);

    // Three tabs: Moves | Stats | Item  (left → right)
    // Each tab is ~50px wide inside a 152px container starting at x=44
    // Layout: [44..94] Moves  [94..144] Stats  [144..196] Item
    const tabs: Array<{ key: typeof detailTab; labelKey: string; x: number; w: number; cx: number }> = [
      { key: 'moves', labelKey: 'party.moves.title', x: 46, w: 48, cx: 70 },
      { key: 'stats', labelKey: 'party.baseStats', x: 94, w: 48, cx: 118 },
      { key: 'item', labelKey: 'party.heldItemTab', x: 142, w: 52, cx: 168 },
    ];

    // Tab container
    fillRect(ctx, 44, 2, 152, 10, C.TAB_BG);
    drawRect(ctx, 44, 2, 152, 10, C.BORDER);

    for (const tab of tabs) {
      const isActive = detailTab === tab.key;
      if (isActive) fillRect(ctx, tab.x, 2, tab.w, 10, C.TAB_ACT);
      drawText(ctx, t(tab.labelKey), tab.cx, 3, {
        size: 7,
        color: isActive ? C.TEXT_PRI : C.TEXT_MUT,
        font: 'monospace',
        align: 'center',
      });
    }

    // ── Tab content ──
    if (detailTab === 'stats') {
      renderDetailStatsTab(ctx, pokemon);
    } else if (detailTab === 'moves') {
      renderDetailMovesTab(ctx, pokemon);
    } else {
      renderDetailHeldItemTab(ctx, pokemon, heldItemCursor, heldItemScrollOffset);
    }

    const learningMode = isMoveLearningMode();

    // ── Bottom hint bar ──
    fillRect(ctx, 0, 150, 240, 10, C.BTM_BG);

    // ESC — back
    fillRect(ctx, 2, 151, 20, 8, C.KEY_BG);
    drawRect(ctx, 2, 151, 20, 8, C.KEY_BRD);
    drawText(ctx, 'ESC', 12, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, learningMode ? t('party.moves.cancel') : t('party.hint.back'), 24, 153, {
      size: 6,
      color: C.TEXT_MUT,
      font: 'monospace',
    });

    // ◀▶ — switch tab
    fillRect(ctx, 54, 151, 16, 8, C.KEY_BG);
    drawRect(ctx, 54, 151, 16, 8, C.KEY_BRD);
    drawText(ctx, '\u25c0\u25b6', 62, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, learningMode ? t('bag.hint.navigate') : t('party.hint.switchTab'), 72, 153, {
      size: 6,
      color: C.TEXT_MUT,
      font: 'monospace',
    });

    // ▲▼ — switch party member (all tabs, but not during move-learning)
    if (detailTab !== 'moves') {
      fillRect(ctx, 100, 151, 16, 8, C.KEY_BG);
      drawRect(ctx, 100, 151, 16, 8, C.KEY_BRD);
      drawText(ctx, '\u25b2\u25bc', 108, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
      drawText(ctx, t('party.hint.switchMember'), 120, 153, {
        size: 6,
        color: C.TEXT_MUT,
        font: 'monospace',
      });
    }

    // D — remove item (stats tab with held item, OR item tab)
    const showRemoveHint = pokemon.heldItemId && detailTab === 'item' && !learningMode;

    if (showRemoveHint) {
      // Position D pill right of ▲▼, or right of tab-switch if in learning mode
      const dPillX = learningMode ? 122 : 176;
      fillRect(ctx, dPillX, 151, 10, 8, C.KEY_BG);
      drawRect(ctx, dPillX, 151, 10, 8, C.KEY_BRD);
      drawText(ctx, 'D', dPillX + 5, 152, { size: 6, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
      const removedItemName =
        getItem(pokemon.heldItemId!)?.name?.[getLocale()] ?? getItem(pokemon.heldItemId!)?.name.he ?? '???';
      drawText(ctx, t('party.hint.removeItem', { item: removedItemName }), dPillX + 12, 153, {
        size: 6,
        color: C.TEXT_MUT,
        font: 'monospace',
      });
    }

    // Enter — action (moves tab, or item tab when list has items)
    const showEnterHint = detailTab === 'moves' || (detailTab === 'item' && getEquippableItems().length > 0);

    if (showEnterHint) {
      // Only show if we have room — skip if D pill is already there and overlapping
      if (!showRemoveHint || detailTab === 'moves') {
        fillRect(ctx, 114, 151, 26, 8, C.KEY_BG);
        drawRect(ctx, 114, 151, 26, 8, C.KEY_BRD);
        drawText(ctx, 'Enter', 127, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
        drawText(
          ctx,
          detailTab === 'moves'
            ? learningMode
              ? t('party.moveLearning.actionHint')
              : t('party.hint.action')
            : t('party.heldItem.equipHint'),
          142,
          153,
          { size: 6, color: C.TEXT_MUT, font: 'monospace' },
        );
      }
    }

    if (actionMessage && actionMessageTimer > 0) {
      fillRect(ctx, 8, 136, 224, 10, '#2a6a40');
      drawText(ctx, actionMessage, 120, 137, { size: 7, color: '#20d860', align: 'center' });
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
      moveDeleteConfirm = false;
      moveDeleteConfirmCursor = 1;
      moveLearningActionCursor = 0;
      moveLearningReplaceMode = false;
      moveLearningConfirmAction = null;
      moveLearningConfirmCursor = 1;
      selectedPartyIndex = -1;
      loadPartySprites();
      if (partyMode === 'move-learning') {
        const session = getMoveLearningSession();
        const party = getParty();
        if (session && party[session.partyIndex]) {
          const pokemon = party[session.partyIndex];
          const pendingIndex = session.learned
            ? Math.max(
                0,
                pokemon.moves.findIndex((move) => move.id === session.moveId),
              )
            : pokemon.moves.length;
          cursor = session.partyIndex;
          viewMode = 'detail';
          detailTab = 'moves';
          moveCursor = pendingIndex >= 0 ? pendingIndex : 0;
        }
        return;
      }
      // In battle mode, ensure cursor starts on an eligible (non-fainted) Pokemon
      if (partyMode === 'battle') {
        const party = getParty();
        for (let i = 0; i < party.length; i++) {
          if (isPokemonEligible(party[i])) {
            cursor = i;
            break;
          }
        }
      }
    },

    exit(): void {},

    update(dt: number): void {
      const party = getParty();
      const partyLen = party.length;
      const tmFiltered = getSelectTargetFiltered();
      const listLen = tmFiltered ? tmFiltered.length : partyLen;

      if (viewMode === 'detail') {
        updateDetailView(dt);
        return;
      }

      // Diary view — view-only, ESC or Left/Right returns to list
      if (viewMode === 'diary') {
        if (input.isKeyPressed('Escape') || input.isKeyPressed('ArrowLeft') || input.isKeyPressed('ArrowRight')) {
          viewMode = 'list';
        }
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

      // Left/Right in list mode: open diary (overworld only, when entries exist)
      if (
        partyMode === 'overworld' &&
        !tmFiltered &&
        (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('ArrowRight'))
      ) {
        if (Object.keys(getPlayerData().awayPokemon).length > 0) {
          viewMode = 'diary';
          return;
        }
      }

      if (input.isKeyPressed('ArrowUp')) {
        if (tmFiltered) {
          cursor = cursor > 0 ? cursor - 1 : Math.max(0, listLen - 1);
        } else {
          let next = cursor > 0 ? cursor - 1 : Math.max(0, partyLen - 1);
          if (partyMode === 'battle') {
            for (let tries = 0; tries < partyLen; tries++) {
              if (next < partyLen && isPokemonEligible(party[next])) break;
              next = next > 0 ? next - 1 : partyLen - 1;
            }
          }
          cursor = next;
        }
      }
      if (input.isKeyPressed('ArrowDown')) {
        if (tmFiltered) {
          cursor = cursor < listLen - 1 ? cursor + 1 : 0;
        } else {
          let next = cursor < partyLen - 1 ? cursor + 1 : 0;
          if (partyMode === 'battle') {
            for (let tries = 0; tries < partyLen; tries++) {
              if (next < partyLen && isPokemonEligible(party[next])) break;
              next = next < partyLen - 1 ? next + 1 : 0;
            }
          }
          cursor = next;
        }
      }

      if (input.isKeyPressed('Enter')) {
        if (listLen === 0) return;
        if (cursor >= listLen) return;
        // Block Enter on non-eligible Pokemon (battle mode only — TM mode already filtered)
        if (partyMode === 'battle' && !isPokemonEligible(party[cursor])) return;

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
          // For TM filtered mode, resolve cursor to real party index
          selectedPartyIndex = tmFiltered ? tmFiltered[cursor].realIndex : cursor;
          if (onSelectCallback) onSelectCallback(selectedPartyIndex);
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
      if (input.isKeyPressed('s') || input.isKeyPressed('S') || input.isKeyPressed(' ')) {
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
      } else if (viewMode === 'diary') {
        renderDiaryView(ctx);
      } else {
        renderListView(ctx);
      }
    },
  };
}

// utility functions

const drawHeldItem = (
  ctx: CanvasRenderingContext2D,
  heldItemId: string,
  coords: { x: number; y: number; w: number; h: number },
) => {
  const itemData = getItem(heldItemId);
  const itemSpriteUrl = itemData?.sprite ?? `/sprites/items/${heldItemId}.png`;
  let itemSprite = getCachedImage(itemSpriteUrl);

  if (!itemSprite) {
    loadImage(itemSpriteUrl)
      .then((img) => {
        itemSprite = img;
      })
      .catch(() => {});
  }

  const { x, y, w, h } = coords;

  if (itemSprite && itemSprite.complete && itemSprite.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(itemSprite, x, y, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';
  }
};
