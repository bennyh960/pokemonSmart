import type { BilingualText } from '../../systems/npc.js';
import type { StoryAction } from './events.js';

export type CutsceneStep =
  | { type: 'camera-pan';   x: number; y: number; durationMs: number }
  | { type: 'camera-snap';  x: number; y: number }
  | { type: 'screen-fade';  direction: 'in' | 'out'; durationMs: number; color?: string }
  | { type: 'move-npc';     npcId: string; path: Array<'up'|'down'|'left'|'right'>; waitForComplete?: boolean }
  | { type: 'face-npc';     npcId: string; dir: 'up'|'down'|'left'|'right' }
  | { type: 'show-npc';     npcId: string }
  | { type: 'hide-npc';     npcId: string }
  | { type: 'hide-player' }
  | { type: 'show-player' }
  | { type: 'move-player';  path: Array<'up'|'down'|'left'|'right'>; waitForComplete?: boolean }
  | { type: 'dialogue';     speakerId?: string; lines: BilingualText[]; portrait?: string }
  | { type: 'wait';         durationMs: number }
  | { type: 'wait-input' }
  | { type: 'play-music';   musicId: string }
  | { type: 'play-sfx';     sfxId: string }
  | { type: 'stop-music' }
  | { type: 'action';       action: StoryAction }
  | { type: 'if-flag';      flag: string; thenSteps: CutsceneStep[]; elseSteps?: CutsceneStep[] }
  | { type: 'start-battle'; trainerId: string }
  | { type: 'start-gate';   gateId: string };

export interface CutsceneDef {
  id: string;
  skippable?: boolean;
  steps: CutsceneStep[];
}

const CUTSCENES: Record<string, CutsceneDef> = {};

export function registerCutscene(def: CutsceneDef): void {
  CUTSCENES[def.id] = def;
}

export function getCutscene(id: string): CutsceneDef | undefined {
  return CUTSCENES[id];
}
