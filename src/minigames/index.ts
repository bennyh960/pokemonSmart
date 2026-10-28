/** Public API of the mini-game framework (see README.md). */
export { startMiniGame, openMiniGamePicker, type MiniGameOutcome, type StartMiniGameOptions } from './launch.js';
export { createMiniGameReactScene } from './scene.js';
export { getMiniGame, MINI_GAME_LIST, isMiniGameId } from './registry.js';
export type { MiniGameId } from './types.js';
