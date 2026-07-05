import type { Move, PokemonType } from '../types/index.js';
import { getMove, getMoveDisplayName, getPokemonDisplayName, type EvolutionStep } from '../services/pokemon-data.js';
import { t } from '../i18n/i18n.js';

export const MAX_POKEMON_MOVES = 8;

export interface LevelUpMoveResult {
  moveId: number;
  learned: boolean;
}

export interface MoveLearningResolution {
  outcome: 'learned' | 'replaced' | 'skipped';
  moveId: number;
  replacedMoveId?: number;
}

export interface MoveLearningSession {
  partyIndex: number;
  moveId: number;
  learned: boolean;
  onComplete?: (resolution: MoveLearningResolution) => void;
}

interface MoveLearningQueueState {
  partyIndex: number | null;
  pokemonId: number | null;
  queue: LevelUpMoveResult[];
  current: LevelUpMoveResult | null;
  evolution: EvolutionStep | null;
  resultMessage: string;
}

export type MoveLearningQueueStep =
  | { kind: 'idle' }
  | { kind: 'show-message'; message: string }
  | { kind: 'open-session'; session: MoveLearningSession }
  | { kind: 'finish'; evolution: EvolutionStep | null };

let activeMoveLearningSession: MoveLearningSession | null = null;

export function createMoveFromId(moveId: number): Move | null {
  const moveData = getMove(moveId);
  if (!moveData) return null;

  return {
    id: moveData.id,
    name: moveData.name.en,
    type: moveData.type as PokemonType,
    power: moveData.power ?? 0,
    accuracy: moveData.accuracy ?? 0,
    pp: moveData.pp,
    currentPp: moveData.pp,
  };
}

// export function setMoveLearningSession(session: MoveLearningSession): void {
//   activeMoveLearningSession = session;
// }

export function getMoveLearningSession(): MoveLearningSession | null {
  return activeMoveLearningSession;
}

export function clearMoveLearningSession(): void {
  activeMoveLearningSession = null;
}

export function resolveMoveLearningSession(resolution: MoveLearningResolution): void {
  const session = activeMoveLearningSession;
  activeMoveLearningSession = null;
  session?.onComplete?.(resolution);
}

export function createMoveLearningQueueState(): MoveLearningQueueState {
  return {
    partyIndex: null,
    pokemonId: null,
    queue: [],
    current: null,
    evolution: null,
    resultMessage: '',
  };
}

export function resetMoveLearningQueueState(state: MoveLearningQueueState): void {
  state.partyIndex = null;
  state.pokemonId = null;
  state.queue = [];
  state.current = null;
  state.evolution = null;
  state.resultMessage = '';
}

export function initializeMoveLearningQueue(
  state: MoveLearningQueueState,
  partyIndex: number,
  pokemonId: number,
  queue: LevelUpMoveResult[],
  evolution: EvolutionStep | null,
): void {
  state.partyIndex = partyIndex;
  state.pokemonId = pokemonId;
  state.queue = [...queue];
  state.current = null;
  state.evolution = evolution;
  state.resultMessage = '';
}

export function shiftNextMoveLearning(state: MoveLearningQueueState): LevelUpMoveResult | null {
  const next = state.queue.shift() ?? null;
  state.current = next;
  return next;
}

export function takeCurrentMoveLearning(state: MoveLearningQueueState): LevelUpMoveResult | null {
  const current = state.current;
  state.current = null;
  return current;
}

export function createMoveLearningSession(
  partyIndex: number,
  moveResult: LevelUpMoveResult,
  onComplete?: (resolution: MoveLearningResolution) => void,
): MoveLearningSession {
  return {
    partyIndex,
    moveId: moveResult.moveId,
    learned: moveResult.learned,
    onComplete,
  };
}

export function getMoveLearningAnnouncementLines(pokemonId: number, moveResult: LevelUpMoveResult): string[] {
  const name = getPokemonDisplayName(pokemonId);
  const moveName = getMoveDisplayName(moveResult.moveId);
  if (moveResult.learned) {
    return [t('battle.learnedMove', { name, move: moveName })];
  }
  return [t('battle.wantsLearnMove', { name, move: moveName }), t('battle.moveCapReached', { max: MAX_POKEMON_MOVES })];
}

export function getMoveLearningResolutionMessage(pokemonId: number, resolution: MoveLearningResolution): string | null {
  const moveName = getMoveDisplayName(resolution.moveId);
  const pokeName = getPokemonDisplayName(pokemonId);
  if (resolution.outcome === 'skipped') {
    return t('battle.didNotLearnMove', { name: pokeName, move: moveName });
  }
  if (resolution.outcome === 'replaced') {
    return t('battle.learnedMove', { name: pokeName, move: moveName });
  }
  return null;
}

export function nextMoveLearningQueueStep(
  state: MoveLearningQueueState,
  onResolution?: (resolution: MoveLearningResolution) => void,
): MoveLearningQueueStep {
  if (state.partyIndex === null || state.pokemonId === null) {
    return { kind: 'idle' };
  }

  if (state.resultMessage) {
    const message = state.resultMessage;
    state.resultMessage = '';
    return { kind: 'show-message', message };
  }

  if (!state.current && state.queue.length > 0) {
    const nextMove = shiftNextMoveLearning(state);
    if (!nextMove) return { kind: 'idle' };
    return {
      kind: 'show-message',
      message: getMoveLearningAnnouncementLines(state.pokemonId, nextMove).join(' '),
    };
  }

  if (state.current) {
    const currentMove = takeCurrentMoveLearning(state);
    if (!currentMove) return { kind: 'idle' };
    return {
      kind: 'open-session',
      session: createMoveLearningSession(state.partyIndex, currentMove, (resolution) => {
        state.resultMessage = getMoveLearningResolutionMessage(state.pokemonId!, resolution) ?? '';
        onResolution?.(resolution);
      }),
    };
  }

  const evolution = state.evolution;
  resetMoveLearningQueueState(state);
  return { kind: 'finish', evolution };
}
