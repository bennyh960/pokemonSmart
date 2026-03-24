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
import { clearScreen, fillRect, drawRect, drawText } from '../engine/renderer.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame } from '../systems/game-state.js';
import {
  getPokemon, getPokemonDisplayName, getMove, getMoveDisplayName,
  getLearnset, getTypeEffectiveness, getAllTypes,
} from '../services/pokemon-data.js';
import type { PokemonType } from '../types/index.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';

const BG_COLOR = '#301818';
const ENTRY_HEIGHT = 26;
const VISIBLE_ENTRIES = 5;
const TOTAL_POKEMON = 251;

const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a878', fire: '#f08030', water: '#6890f0', grass: '#78c850',
  electric: '#f8d030', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0',
  ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
  rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848',
  steel: '#b8b8d0', glitch: '#00ff88',
};

/** 3-letter English abbreviations for types */
const TYPE_ABBREV: Record<string, string> = {
  normal: 'NRM', fire: 'FIR', water: 'WTR', grass: 'GRS',
  electric: 'ELC', ice: 'ICE', fighting: 'FGT', poison: 'PSN',
  ground: 'GND', flying: 'FLY', psychic: 'PSY', bug: 'BUG',
  rock: 'RCK', ghost: 'GHO', dragon: 'DRG', dark: 'DRK',
  steel: 'STL', glitch: 'GLT',
};

type PokedexView = 'list' | 'detail';
type DetailTab = 'info' | 'type' | 'moves';
type MovesSubTab = 'byLevel' | 'canLearn';

const DETAIL_TABS: DetailTab[] = ['info', 'type', 'moves'];

export function createPokedexScene(input: InputManager, stateMachine: StateMachine): Scene {
  let cursor = 0;
  let scrollOffset = 0;
  let view: PokedexView = 'list';
  let detailTab: DetailTab = 'info';
  let movesSubTab: MovesSubTab = 'byLevel';
  let movesScrollOffset = 0;

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

  function preloadVisibleSprites(): void {
    const pdex = getPokedex();
    for (let i = scrollOffset; i < Math.min(scrollOffset + VISIBLE_ENTRIES + 2, TOTAL_POKEMON); i++) {
      const id = i + 1;
      if (pdex[id]) {
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
      cursor = 0;
      scrollOffset = 0;
      view = 'list';
      detailTab = 'info';
      movesSubTab = 'byLevel';
      movesScrollOffset = 0;
      preloadVisibleSprites();
    },

    exit(): void {},

    update(_dt: number): void {
      if (view === 'detail') {
        if (input.isKeyPressed('Escape')) {
          view = 'list';
          return;
        }

        // Left/Right switches main tabs (unless on moves sub-tab switching)
        if (input.isKeyPressed('ArrowLeft')) {
          const idx = DETAIL_TABS.indexOf(detailTab);
          if (idx > 0) {
            detailTab = DETAIL_TABS[idx - 1];
            movesScrollOffset = 0;
          }
        }
        if (input.isKeyPressed('ArrowRight')) {
          const idx = DETAIL_TABS.indexOf(detailTab);
          if (idx < DETAIL_TABS.length - 1) {
            detailTab = DETAIL_TABS[idx + 1];
            movesScrollOffset = 0;
          }
        }

        // Tab key switches moves sub-tabs when on MOVES tab
        if (detailTab === 'moves' && input.isKeyPressed('Tab')) {
          movesSubTab = movesSubTab === 'byLevel' ? 'canLearn' : 'byLevel';
          movesScrollOffset = 0;
        }

        // Up/Down scrolls moves list when on MOVES tab
        if (detailTab === 'moves') {
          if (input.isKeyPressed('ArrowUp') && movesScrollOffset > 0) {
            movesScrollOffset--;
          }
          if (input.isKeyPressed('ArrowDown')) {
            movesScrollOffset++;
          }
        }

        return;
      }

      // List view controls
      if (input.isKeyPressed('Escape')) {
        stateMachine.pop();
        return;
      }

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
        if (cursor < TOTAL_POKEMON - 1) {
          cursor++;
          if (cursor >= scrollOffset + VISIBLE_ENTRIES) {
            scrollOffset = cursor - VISIBLE_ENTRIES + 1;
            preloadVisibleSprites();
          }
        }
      }

      if (input.isKeyPressed('Enter')) {
        const id = cursor + 1;
        if (isSeen(id)) {
          view = 'detail';
          detailTab = 'info';
          movesSubTab = 'byLevel';
          movesScrollOffset = 0;
          loadImage(`/sprites/pokemon/front/${id}.png`).catch(() => {});
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, BG_COLOR);

      if (view === 'detail') {
        renderDetailView(ctx, cursor + 1);
        return;
      }

      renderListView(ctx);
    },
  };

  function renderListView(ctx: CanvasRenderingContext2D): void {
    // Title bar
    fillRect(ctx, 0, 0, SCREEN_W, 16, '#481818');
    drawText(ctx, t('pokedex.title'), 4, 3, { size: 8, color: '#ffffff', font: 'monospace' });
    const seenText = t('pokedex.seen', { count: getSeenCount() });
    drawText(ctx, seenText, SCREEN_W - 4, 3, { size: 8, color: '#cccccc', font: 'monospace', align: 'right' });

    // List area
    const listY = 18;
    for (let i = 0; i < VISIBLE_ENTRIES; i++) {
      const index = scrollOffset + i;
      if (index >= TOTAL_POKEMON) break;

      const id = index + 1;
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
            const color = TYPE_COLORS[type] || '#a8a878';
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
    if (scrollOffset + VISIBLE_ENTRIES < TOTAL_POKEMON) {
      drawText(ctx, '\u25bc', SCREEN_W - 10, listY + VISIBLE_ENTRIES * ENTRY_HEIGHT - 2, { size: 8, color: '#f8a878', font: 'monospace' });
    }

    // Bottom bar
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
    const rtl = isRTL();
    const helpText = rtl ? 'ESC \u2190 \u2190\u2192 \u05e0\u05d9\u05d5\u05d5\u05d8 / ENTER \u05e4\u05e8\u05d8\u05d9\u05dd' : 'Up/Down: Navigate  Enter: Details  Esc: Back';
    drawText(ctx, helpText, 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
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
      drawText(ctx, t('pokedex.noData'), SCREEN_W / 2, SCREEN_H / 2 - 4, { size: 8, color: '#807070', font: 'monospace', align: 'center' });
      fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
      drawText(ctx, 'Esc: Back', 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
      return;
    }

    // Name in title bar
    drawText(ctx, getPokemonDisplayName(id), 40, 3, { size: 8, color: '#ffffff', font: 'monospace' });

    // Tab bar
    const tabY = 16;
    const tabH = 12;
    fillRect(ctx, 0, tabY, SCREEN_W, tabH, '#402020');
    const tabLabels: [DetailTab, string][] = [
      ['info', t('pokedex.tab.info')],
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
        size: 7, color: tab === detailTab ? '#f8a878' : '#999999', font: 'monospace', align: 'center',
      });
    }

    // Content area
    const contentY = tabY + tabH + 2;
    const contentH = SCREEN_H - contentY - 14;

    if (detailTab === 'info') {
      renderInfoTab(ctx, id, data, contentY);
    } else if (detailTab === 'type') {
      renderTypeTab(ctx, data, contentY, contentH);
    } else if (detailTab === 'moves') {
      renderMovesTab(ctx, id, contentY, contentH);
    }

    // Bottom bar
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
    const rtl = isRTL();
    let helpText: string;
    if (detailTab === 'moves') {
      helpText = rtl ? 'ESC \u05d7\u05d6\u05e8\u05d4 / \u2190\u2192 \u05d8\u05d0\u05d1 / Tab \u05ea\u05ea-\u05d8\u05d0\u05d1 / \u2191\u2193 \u05d2\u05dc\u05d9\u05dc\u05d4' : 'Esc:Back  L/R:Tab  Tab:Sub  Up/Dn:Scroll';
    } else {
      helpText = rtl ? 'ESC \u05d7\u05d6\u05e8\u05d4 / \u2190\u2192 \u05d8\u05d0\u05d1' : 'Esc: Back  Left/Right: Switch Tab';
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
      const color = TYPE_COLORS[type] || '#a8a878';
      const label = type.toUpperCase();
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
      data.stats.hp, data.stats.attack, data.stats.defense,
      data.stats.specialAttack, data.stats.specialDefense, data.stats.speed,
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
        const color = TYPE_COLORS[type] || '#a8a878';
        const badgeLabel = type.toUpperCase();
        const badgeW = badgeLabel.length * 5 + 6;

        // Wrap to next line if needed
        if (x + badgeW > SCREEN_W - 4) {
          x = 4;
          y += 12;
        }

        fillRect(ctx, x, y, badgeW, 9, color);
        drawRect(ctx, x, y, badgeW, 9, '#00000044');
        drawText(ctx, badgeLabel, x + 3, y + 1, { size: 6, color: '#ffffff', font: 'monospace' });
        x += badgeW + 3;
      }
      y += 14;
    }

    drawTypeMatchupSection(t('pokedex.type.weakTo'), weakTo);
    drawTypeMatchupSection(t('pokedex.type.resists'), resists);
    drawTypeMatchupSection(t('pokedex.type.immune'), immune);
    drawTypeMatchupSection(t('pokedex.type.strongVs'), strongVs);
  }

  function renderMovesTab(
    ctx: CanvasRenderingContext2D,
    pokemonId: number,
    contentY: number,
    contentH: number,
  ): void {
    // Sub-tab labels
    const subTabY = contentY;
    const subTabW = 80;
    const subTabs: [MovesSubTab, string][] = [
      ['byLevel', t('pokedex.moves.byLevel')],
      ['canLearn', t('pokedex.moves.canLearn')],
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
        size: 6, color: active ? '#f8a878' : '#777777', font: 'monospace', align: 'center',
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
    drawText(ctx, isLevelTab ? t('pokedex.moves.header.lv') : t('pokedex.moves.header.tm'), colLv, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.move'), colName, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.class'), colClass, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.type'), colType, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.acc'), colAcc, tableY, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('pokedex.moves.header.pow'), colPow, tableY, { size: 6, color: headerColor, font: 'monospace' });

    // Divider line
    fillRect(ctx, 4, tableY + 8, SCREEN_W - 8, 1, '#584040');

    const dataY = tableY + rowH + 2;

    if (movesSubTab === 'byLevel') {
      const learnset = getLearnset(pokemonId);

      if (learnset.length === 0) {
        drawText(ctx, t('pokedex.moves.noData'), SCREEN_W / 2, dataY + 10, {
          size: 7, color: '#807070', font: 'monospace', align: 'center',
        });
        return;
      }

      // Sort by level
      const sorted = [...learnset].sort((a, b) => a.levelLearned - b.levelLearned);

      // Clamp scroll offset
      const maxScroll = Math.max(0, sorted.length - maxVisibleRows);
      if (movesScrollOffset > maxScroll) movesScrollOffset = maxScroll;

      for (let i = 0; i < maxVisibleRows; i++) {
        const idx = movesScrollOffset + i;
        if (idx >= sorted.length) break;

        const entry = sorted[idx];
        const move = getMove(entry.moveId);
        const ry = dataY + i * rowH;

        // Alternating row background
        if (i % 2 === 0) {
          fillRect(ctx, 2, ry - 1, SCREEN_W - 4, rowH, '#381818');
        }

        // Level
        drawText(ctx, String(entry.levelLearned), colLv, ry, { size: 6, color: '#ffffff', font: 'monospace' });

        // Move name (localized)
        const moveName = getMoveDisplayName(entry.moveId);
        drawText(ctx, moveName, colName, ry, { size: 6, color: '#ffffff', font: 'monospace' });

        if (move) {
          // Damage class symbol (infer from power: null/0 = status, else physical/special based on type pre-gen4)
          const classSymbol = getDamageClassSymbol(move.power, move.type);
          drawText(ctx, classSymbol, colClass, ry, { size: 6, color: '#cccccc', font: 'monospace' });

          // Type (3-letter English abbreviation, always English)
          const typeAbbr = TYPE_ABBREV[move.type] || move.type.substring(0, 3).toUpperCase();
          const typeColor = TYPE_COLORS[move.type] || '#a8a878';
          drawText(ctx, typeAbbr, colType, ry, { size: 6, color: typeColor, font: 'monospace' });

          // Accuracy
          drawText(ctx, move.accuracy !== null ? String(move.accuracy) : '\u2014', colAcc, ry, { size: 6, color: '#ffffff', font: 'monospace' });

          // Power
          drawText(ctx, move.power !== null && move.power > 0 ? String(move.power) : '\u2014', colPow, ry, { size: 6, color: '#ffffff', font: 'monospace' });
        }
      }

      // Scroll indicators
      if (movesScrollOffset > 0) {
        drawText(ctx, '\u25b2', SCREEN_W - 10, dataY - 2, { size: 6, color: '#f8a878', font: 'monospace' });
      }
      if (movesScrollOffset + maxVisibleRows < sorted.length) {
        drawText(ctx, '\u25bc', SCREEN_W - 10, dataY + maxVisibleRows * rowH, { size: 6, color: '#f8a878', font: 'monospace' });
      }
    } else {
      // TODO: Fetch TM/HM compatibility from PokeAPI
      drawText(ctx, t('pokedex.moves.noData'), SCREEN_W / 2, dataY + 10, {
        size: 7, color: '#807070', font: 'monospace', align: 'center',
      });
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
