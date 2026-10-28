/**
 * Entry API — the only way into a mini-game. Triggers (NPC, cutscene, interact tile, start menu)
 * call startMiniGame() / openMiniGamePicker(); both push the MINI_GAME scene.
 */

import type { StateMachine } from '../engine/state-machine.js';
import type { MiniGameId, Stars } from './types.js';

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
}

export interface MiniGameLaunch extends StartMiniGameOptions {
  /** null = open the game picker. */
  gameId: MiniGameId | null;
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

/** Opens the "Mini Games" picker (dev access from the start menu). */
export function openMiniGamePicker(options: Pick<StartMiniGameOptions, 'onFinish'> = {}): void {
  launch({ gameId: null, ...options });
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
