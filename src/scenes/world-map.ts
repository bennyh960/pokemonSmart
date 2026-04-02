/**
 * WorldMapScene - Overworld world map with fly destination selection.
 *
 * Shows visited cities/towns. If a fly callback is set (player has a Pokemon
 * that can use Fly), the player can navigate the list and press Enter to fly
 * to a destination. Otherwise it is read-only.
 */

import type { InputManager } from '../engine/input.js';
import { drawText, fillRect } from '../engine/renderer.js';
import type { StateMachine } from '../engine/state-machine.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame } from '../systems/game-state.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import type { Scene } from '../types/index.js';

// ─── City registry ───────────────────────────────────────────────

/** Info per city: bilingual name + fly spawn point. */
export interface CityInfo {
  en: string;
  he: string;
  spawnX: number;
  spawnY: number;
}

/**
 * All city/town map IDs that the player can visit.
 * Only maps registered in map-manager and that are proper cities/towns are listed.
 * Interior maps (houses, pokecenter interiors) are intentionally excluded.
 */
export const CITY_INFO: Record<string, CityInfo> = {
  zeroville:        { en: 'Zeroville',     he: 'זרוביל',      spawnX: 5,  spawnY: 7  },
  sumville:         { en: 'Sumville',      he: 'סאמביל',      spawnX: 2,  spawnY: 30 },
  minusburg:        { en: 'Minusburg',     he: 'מינוסבורג',   spawnX: 2,  spawnY: 25 },
};

// ─── Fly callback ────────────────────────────────────────────────

/** Set by overworld.ts before pushing WORLD_MAP scene. Null = cannot fly. */
let pendingFlyCallback: ((destinationMapId: string) => void) | null = null;

export function setFlyCallback(cb: ((destinationMapId: string) => void) | null): void {
  pendingFlyCallback = cb;
}

// ─── Scene factory ───────────────────────────────────────────────

export function createWorldMapScene(
  input: InputManager,
  stateMachine: StateMachine,
): Scene {
  let selectedIndex = 0;
  let visitedCities: string[] = [];

  return {
    enter(): void {
      selectedIndex = 0;

      // Build list of visited city IDs
      if (hasActiveGame()) {
        const pd = getPlayerData();
        visitedCities = Object.keys(CITY_INFO).filter(id => pd.flags[`visited-${id}`]);
      } else {
        visitedCities = [];
      }

      // Default selection to current map if it's a city
      if (hasActiveGame()) {
        const pd = getPlayerData();
        const currentIdx = visitedCities.indexOf(pd.position.mapId);
        if (currentIdx >= 0) selectedIndex = currentIdx;
      }
    },

    exit(): void {
      pendingFlyCallback = null;
    },

    update(dt: number): void {
      void dt;

      const canFly = pendingFlyCallback !== null;

      if (input.isKeyPressed('Escape') || input.isKeyPressed('w') || input.isKeyPressed('W') ||
          input.isKeyPressed('m') || input.isKeyPressed('M')) {
        stateMachine.pop();
        return;
      }

      if (canFly && visitedCities.length > 0) {
        if (input.isKeyPressed('ArrowUp')) {
          selectedIndex = (selectedIndex - 1 + visitedCities.length) % visitedCities.length;
        } else if (input.isKeyPressed('ArrowDown')) {
          selectedIndex = (selectedIndex + 1) % visitedCities.length;
        } else if (input.isKeyPressed('Enter')) {
          const destId = visitedCities[selectedIndex];
          if (destId && pendingFlyCallback) {
            const cb = pendingFlyCallback;
            pendingFlyCallback = null;
            stateMachine.pop();
            cb(destId);
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      const rtl = isRTL();

      // Dark background
      fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#0a0a1a');

      // Subtle grid pattern
      ctx.save();
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < SCREEN_W; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SCREEN_H); ctx.stroke();
      }
      for (let y = 0; y < SCREEN_H; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SCREEN_W, y); ctx.stroke();
      }
      ctx.restore();

      // Title bar
      fillRect(ctx, 0, 0, SCREEN_W, 16, '#1a1a3a');
      drawText(ctx, t('worldMap.title'), SCREEN_W / 2, 4, {
        size: 8, color: '#88aaff', align: 'center', font: 'monospace', direction: rtl ? 'rtl' : 'ltr',
      });

      const canFly = pendingFlyCallback !== null;
      const currentMapId = hasActiveGame() ? getPlayerData().position.mapId : '';

      if (visitedCities.length === 0) {
        // No visited cities yet
        drawText(ctx, rtl ? 'לא ביקרת בשום עיר עדיין' : 'No cities visited yet', SCREEN_W / 2, SCREEN_H / 2, {
          size: 7, color: '#556688', align: 'center', font: 'monospace',
        });
      } else {
        // City list
        const listStartY = 24;
        const rowH = 16;

        for (let i = 0; i < visitedCities.length; i++) {
          const id = visitedCities[i];
          const info = CITY_INFO[id];
          if (!info) continue;

          const rowY = listStartY + i * rowH;
          const isSelected = canFly && i === selectedIndex;
          const isCurrent = id === currentMapId;

          // Row background
          if (isSelected) {
            fillRect(ctx, 8, rowY - 1, SCREEN_W - 16, rowH - 2, '#2a3060');
          } else if (isCurrent) {
            fillRect(ctx, 8, rowY - 1, SCREEN_W - 16, rowH - 2, '#1a2a1a');
          }

          // Marker dot
          const dotColor = isCurrent ? '#88ff88' : (isSelected ? '#aabbff' : '#445577');
          fillRect(ctx, 14, rowY + 4, 4, 4, dotColor);

          // City name
          const cityName = rtl ? info.he : info.en;
          const nameColor = isSelected ? '#ffffff' : (isCurrent ? '#88ff88' : '#9999bb');
          drawText(ctx, cityName, 24, rowY + 3, {
            size: 7, color: nameColor, font: 'monospace', direction: rtl ? 'rtl' : 'ltr',
          });

          // Current location label
          if (isCurrent) {
            const locLabel = t('worldMap.currentLocation');
            drawText(ctx, locLabel, SCREEN_W - 12, rowY + 3, {
              size: 6, color: '#88ff88', font: 'monospace', align: 'right',
            });
          }

          // Arrow indicator for selected when can fly
          if (isSelected && canFly) {
            drawText(ctx, '>', 8, rowY + 3, { size: 7, color: '#aabbff', font: 'monospace' });
          }
        }
      }

      // Bottom hint bar
      const barY = SCREEN_H - 12;
      fillRect(ctx, 0, barY, SCREEN_W, 12, '#0a0a1a');

      let hints: string;
      if (canFly && visitedCities.length > 0) {
        hints = `${t('worldMap.flyHint')}  ${t('worldMap.hint')}`;
      } else if (!canFly) {
        hints = `${t('worldMap.noFly')}  ${t('worldMap.hint')}`;
      } else {
        hints = t('worldMap.hint');
      }

      drawText(ctx, hints, SCREEN_W / 2, barY + 2, {
        size: 6, color: '#555577', align: 'center', font: 'monospace',
      });
    },
  };
}
