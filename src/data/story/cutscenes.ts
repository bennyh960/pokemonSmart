import type { BilingualText } from '../../systems/npc.js';
import type { StoryAction } from './events.js';

export type CutsceneStep =
  | { type: 'camera-pan';   x: number; y: number; durationMs: number }
  | { type: 'camera-snap';  x: number; y: number }
  | { type: 'screen-fade';  direction: 'in' | 'out'; durationMs: number; color?: string }
  /**
   * overlay — set a persistent background behind dialogue.
   *   color: '#000000'  → solid black screen (or any hex color)
   *   color: null       → clear the overlay, world shows through again
   * Place before dialogue steps that need a background, clear it after.
   * Example:
   *   { type: 'screen-fade', direction: 'out', durationMs: 400 }
   *   { type: 'overlay', color: '#000000' }   ← holds black while dialogue plays
   *   { type: 'dialogue', ... }
   *   { type: 'overlay', color: null }         ← clear before fading back in
   *   { type: 'screen-fade', direction: 'in', durationMs: 400 }
   */
  | { type: 'overlay';      color: string | null }
  | { type: 'move-npc';     npcId: string; path: Array<'up'|'down'|'left'|'right'>; waitForComplete?: boolean }
  | { type: 'face-npc';     npcId: string; dir: 'up'|'down'|'left'|'right' }
  | { type: 'show-npc';     npcId: string }
  | { type: 'hide-npc';     npcId: string }
  | { type: 'hide-player' }
  | { type: 'show-player' }
  | { type: 'move-player';  path: Array<'up'|'down'|'left'|'right'>; waitForComplete?: boolean }
  | { type: 'dialogue';     speakerId?: string; speakerName?: string; lines: BilingualText[] | (() => BilingualText[]); portrait?: string }
  | { type: 'wait';         durationMs: number }
  | { type: 'wait-input' }
  | { type: 'play-music';   musicId: string }
  | { type: 'play-sfx';     sfxId: string }
  | { type: 'stop-music' }
  | { type: 'action';       action: StoryAction }
  | { type: 'if-flag';      flag: string; thenSteps: CutsceneStep[]; elseSteps?: CutsceneStep[] }
  | { type: 'start-battle'; trainerId: string }
  | { type: 'start-gate';   gateId: string }
  | { type: 'start-scene';  sceneId: string };

export interface CutsceneDef {
  id: string;
  skippable?: boolean;
  /**
   * When set, the cutscene opens with a phone-ring notification before the first step.
   * The player sees an "Incoming Call" overlay with the caller's name and presses Enter to answer.
   * If undefined, no phone ring — cutscene starts immediately as normal.
   *
   * Example: phoneCaller: { en: 'Alex', he: 'אלכס' }
   */
  phoneCaller?: BilingualText;
  steps: CutsceneStep[];
}

const CUTSCENES: Record<string, CutsceneDef> = {};

export function registerCutscene(def: CutsceneDef): void {
  CUTSCENES[def.id] = def;
}

export function getCutscene(id: string): CutsceneDef | undefined {
  return CUTSCENES[id];
}
