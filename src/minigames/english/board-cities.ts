/**
 * Word Board prizes by library — each city's board adds its own flavor to the ladder step (`boardStep()` in board.ts):
 *   specialty:   one extra rare prize (Revives, Rare Candy, vitamins…) so every library feels a bit different
 *   rarePokemon: the rare Pokémon this board gives on the steps that offer one (ids from BOARD_POKEMON, or 'all')
 *   masterBall:  the Master Ball is an epic prize on the top step only here
 * Keyed by the city folder of the library's map id ('percentile/library' → 'percentile').
 */

import { item, prize, vitaminPrize } from '../define.js';
import type { MiniGamePrizeDef } from '../types.js';

export interface BoardCity {
  specialty: MiniGamePrizeDef;
  rarePokemon: readonly number[] | 'all';
  masterBall?: boolean;
}

// National dex ids — the board Pokémon in the game data (first stages after Gold/Silver, see BOARD_POKEMON)
const TRAPINCH = 328;
const FEEBAS = 349;
const ABSOL = 359;
const BAGON = 371;
const BELDUM = 374;
const SPIRITOMB = 442;
const GIBLE = 443;
const RIOLU = 447;
const AXEW = 610;
const DEINO = 633;

export const BOARD_CITIES: Readonly<Record<string, BoardCity>> = {
  sumville: { specialty: prize('rare', item('revive', 2)), rarePokemon: [RIOLU, AXEW] },
  minusburg: { specialty: prize('rare', item('rare-candy', 2)), rarePokemon: [TRAPINCH, SPIRITOMB] },
  multiplia: { specialty: vitaminPrize('rare', 2), rarePokemon: [BELDUM, ABSOL] },
  // The sea city
  dividia: { specialty: prize('rare', item('max-revive')), rarePokemon: [FEEBAS, TRAPINCH] },
  fractalis: { specialty: vitaminPrize('rare', 3), rarePokemon: [RIOLU, GIBLE] },
  symmetrika: { specialty: prize('rare', item('rare-candy', 3)), rarePokemon: [ABSOL, BELDUM, SPIRITOMB] },
  // Dragons
  zeroville: { specialty: prize('rare', item('max-revive', 2)), rarePokemon: [BAGON, GIBLE, DEINO] },
  percentile: { specialty: prize('rare', item('rare-candy', 3)), rarePokemon: 'all', masterBall: true },
  algebria: { specialty: vitaminPrize('rare', 3), rarePokemon: 'all', masterBall: true },
};

/** The board flavor of the library on this map (undefined outside a known city). */
export function boardCityOf(mapId: string | null | undefined): string | undefined {
  const city = mapId?.split('/')[0];
  return city && city in BOARD_CITIES ? city : undefined;
}
