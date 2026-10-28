/**
 * Mini-game registry. Each game's def lives in its folder (`games/<id>/index.ts`, default export);
 * one folder may hold a family of games sharing an engine (`games/snack-attack/`, named exports).
 */

import unownWords from './games/unown-words/index.js';
import pokemonSays from './games/pokemon-says/index.js';
import findPokemon from './games/find-pokemon/index.js';
import unownBattle from './games/unown-battle/index.js';
import memoryMatch from './games/memory-match/index.js';
import wordCatcher from './games/word-catcher/index.js';
import pokeDoku from './games/poke-doku/index.js';
import {
  bulbasaurSun,
  charmanderFlame,
  pikachuCharge,
  snorlaxSnack,
  squirtleSwim,
} from './games/snack-attack/index.js';
import { MINI_GAME_IDS, type AnyMiniGameDef, type MiniGameChoice, type MiniGameId } from './types.js';

const MINI_GAMES: Record<MiniGameId, AnyMiniGameDef> = {
  'unown-words': unownWords,
  'pokemon-says': pokemonSays,
  'find-pokemon': findPokemon,
  'unown-battle': unownBattle,
  'memory-match': memoryMatch,
  'word-catcher': wordCatcher,
  'poke-doku': pokeDoku,
  'snorlax-snack': snorlaxSnack,
  'bulbasaur-sun': bulbasaurSun,
  'charmander-flame': charmanderFlame,
  'squirtle-swim': squirtleSwim,
  'pikachu-charge': pikachuCharge,
};

/** All games in picker order. */
export const MINI_GAME_LIST: readonly AnyMiniGameDef[] = MINI_GAME_IDS.map((id) => MINI_GAMES[id]);

export function getMiniGame(id: MiniGameId): AnyMiniGameDef {
  return MINI_GAMES[id];
}

export function isMiniGameId(id: string): id is MiniGameId {
  return (MINI_GAME_IDS as readonly string[]).includes(id);
}

/** The games of a choice, in picker order: the listed ids plus every game of the category. */
export function resolveMiniGames(choice: MiniGameChoice): MiniGameId[] {
  return MINI_GAME_LIST.filter((g) => choice.gameIds?.includes(g.id) || g.category === choice.category).map(
    (g) => g.id,
  );
}
