import { getGlobalAudio } from '../../audio/audio-manager.js';
import type { MiniGameSfx, PrizeRarity } from '../types.js';

/** Tier index for the mg-prize cue (3 = epic shimmer tail). */
export const RARITY_TIER: Record<PrizeRarity, number> = { common: 0, good: 1, rare: 2, epic: 3 };

/** The sfx object handed to games (and used by the shell). Thin wrapper over the global audio manager. */
export const miniGameSfx: MiniGameSfx = {
  tap: () => getGlobalAudio()?.playMiniGameCue('mg-tap'),
  correct: (combo) => getGlobalAudio()?.playMiniGameCue('mg-correct', { step: Math.max(0, combo - 1) }),
  wrong: () => getGlobalAudio()?.playMiniGameCue('mg-wrong'),
  cry: (id) => getGlobalAudio()?.playCry(id),
  letter: (l) => getGlobalAudio()?.playLetter(l),
  word: (w) => getGlobalAudio()?.playWord(w),
  cue: (name, opts) => getGlobalAudio()?.playMiniGameCue(name, opts),
};
