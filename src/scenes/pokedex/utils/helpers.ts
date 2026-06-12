import { TYPE_BADGE } from '../../../data/type-constants';
import { drawRect, drawText, fillRect } from '../../../engine/renderer';
import { getLocale } from '../../../i18n/i18n';
import { getPlayerData, hasActiveGame } from '../../../systems/game-state';
import type { PokemonType } from '../../../types';

/**
 * Draw type badge(s) for a pokemon in the list row.
 * Renders colored pill with localized label.
 */
export function drawListTypeBadges(ctx: CanvasRenderingContext2D, types: string[], x: number, y: number): void {
  const BADGE_W = 28;
  const BADGE_H = 9;
  const BADGE_GAP = 3;
  let bx = x;
  for (const type of types) {
    const typeData = TYPE_BADGE[type as PokemonType];
    const color = typeData?.color || '#888888';
    const label = typeData?.[getLocale()] || type.toUpperCase();
    fillRect(ctx, bx, y, BADGE_W, BADGE_H, color);
    drawRect(ctx, bx, y, BADGE_W, BADGE_H, '#00000044');
    drawText(ctx, label, bx + BADGE_W / 2, y + 1, {
      size: 6,
      color: '#ffffff',
      font: 'monospace',
      align: 'center',
    });
    bx += BADGE_W + BADGE_GAP;
  }
}

/**
 * Returns true if the pokemon (by id) is currently in the player's
 * party or any box. Returns false if released (hard-deleted).
 */
export function isPokemonStillWithPlayer(id: number): boolean {
  if (!hasActiveGame()) return false;
  const pd = getPlayerData();
  if (pd.party?.some((p) => p?.id === id)) return true;
  if (pd.boxes) {
    for (const box of pd.boxes) {
      if (box.pokemon.some((p) => p?.id === id)) return true;
    }
  }
  return false;
}
