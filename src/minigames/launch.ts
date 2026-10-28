/**
 * Entry API — the only way into a mini-game. Triggers (NPC, cutscene, interact tile, start menu)
 * call startMiniGame() / openMiniGamePicker(); both push the MINI_GAME scene.
 */

import type { StateMachine } from '../engine/state-machine.js';
import type { Bilingual, MiniGameId, Stars } from './types.js';

/** What the caller's onFinish receives: the last finished round, or null if the player left without finishing. */
export interface MiniGameOutcome {
  gameId: MiniGameId;
  level: number;
  stars: Stars;
  score: number;
  cleared: boolean;
}

export interface StartMiniGameOptions {
  /** Pre-select this level on the intro card (falls back to the highest unlocked one if locked). */
  level?: number;
  /** Called when the MINI_GAME scene closes. */
  onFinish?: (outcome: MiniGameOutcome | null) => void;
  /** Care round for this party Pokémon (uuid): fixed level, no level picker, clearing it heals the Pokémon. */
  carePokemonUuid?: string;
  /**
   * Building gate round (library / lab): plays `level` even if locked, no level picker, normal prizes.
   * `intro` replaces the level picker on the intro card; once cleared there is no "Play again".
   */
  gate?: { intro: Bilingual };
}

export interface MiniGameLaunch extends StartMiniGameOptions {
  /** null = open the game picker. */
  gameId: MiniGameId | null;
  /** Picker only: offer just these games (default: all). */
  pickerIds?: MiniGameId[];
}

let stateMachine: StateMachine | null = null;
let pending: MiniGameLaunch | null = null;

/** Called once by the MINI_GAME scene factory. */
export function bindMiniGameStateMachine(sm: StateMachine): void {
  stateMachine = sm;
}

export function startMiniGame(gameId: MiniGameId, options: StartMiniGameOptions = {}): void {
  launch({ gameId, ...options });
}

/** Opens the "Mini Games" picker — all games (admin start menu) or just `gameIds` (e.g. a librarian). */
export function openMiniGamePicker(
  options: Pick<StartMiniGameOptions, 'onFinish'> & { gameIds?: MiniGameId[] } = {},
): void {
  const { gameIds, ...rest } = options;
  launch({ gameId: null, pickerIds: gameIds, ...rest });
}

/** The scene reads (and clears) the launch request on enter. */
export function takeMiniGameLaunch(): MiniGameLaunch {
  const req = pending ?? { gameId: null };
  pending = null;
  return req;
}

function launch(req: MiniGameLaunch): void {
  if (!stateMachine) throw new Error('MINI_GAME scene is not registered yet');
  pending = req;
  stateMachine.push('MINI_GAME');
}
