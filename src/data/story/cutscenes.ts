import type { BilingualText } from '../../systems/npc.js';
import type { StoryAction } from './events.js';

export type CutsceneStep =
  | { type: 'camera-pan'; x: number; y: number; durationMs: number }
  | { type: 'camera-snap'; x: number; y: number }
  | { type: 'screen-fade'; direction: 'in' | 'out'; durationMs: number; color?: string }
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
  | { type: 'overlay'; color: string | null }
  | { type: 'move-npc'; npcId: string; path: Array<'up' | 'down' | 'left' | 'right'>; waitForComplete?: boolean }
  | { type: 'face-npc'; npcId: string; dir: 'up' | 'down' | 'left' | 'right' }
  | { type: 'show-npc'; npcId: string }
  | { type: 'hide-npc'; npcId: string }
  | { type: 'hide-player' }
  | { type: 'show-player' }
  | { type: 'move-player'; path: Array<'up' | 'down' | 'left' | 'right'>; waitForComplete?: boolean }
  | {
      type: 'dialogue';
      speakerId?: string;
      speakerName?: string;
      lines: BilingualText[] | (() => BilingualText[]);
      portrait?: string;
    }
  | { type: 'wait'; durationMs: number }
  | { type: 'wait-input' }
  | { type: 'play-music'; musicId: string }
  | { type: 'play-sfx'; sfxId: string }
  | { type: 'stop-music' }
  | { type: 'action'; action: StoryAction }
  | { type: 'if-flag'; flag: string; thenSteps: CutsceneStep[]; elseSteps?: CutsceneStep[] }
  | { type: 'start-battle'; trainerId: string }
  | { type: 'start-gate'; gateId: string }
  | { type: 'start-scene'; sceneId: string }
  | {
      type: 'thief-npc';
      npcId: string;
      restoredFlag?: string;
      condition?: { amount?: number; aboveLevel?: number; belowLevel?: number };
    };

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

export function getAllCutscenes(): CutsceneDef[] {
  return Object.values(CUTSCENES);
}

// Team rocket lines

export const TEAM_ROCKET_LINES: CutsceneStep[] = [
  { type: 'stop-music' }, // fade out map music
  { type: 'play-music', musicId: 'team-rocket-bgm' }, // dramatic sting
  {
    type: 'dialogue',
    speakerId: 'rocket-jessi',
    lines: [
      {
        en: 'Prepare for trouble!',
        he: 'היכונו לצרות!',
      },
    ],
  },
  {
    type: 'dialogue',
    speakerId: 'rocket-james',
    lines: [
      {
        en: 'Make it double!',
        he: 'כפולות ומכופלות',
      },
    ],
  },
  {
    type: 'dialogue',
    speakerId: 'rocket-jessi',
    lines: [
      {
        en: 'To protect the world from devastation!',
        he: 'כדי להגן על העולם מהרס חסר תקנה',
      },
    ],
  },
  {
    type: 'dialogue',
    speakerId: 'rocket-james',
    lines: [{ en: 'To unite all the people of the country', he: 'כדי לאחד את כל תושבי המדינה' }],
  },
  {
    type: 'dialogue',
    speakerId: 'rocket-jessi',
    lines: [{ en: 'To conquer the land, air, and water', he: 'כדי לכבוש את היבשה, האוויר והמים' }],
  },
  {
    type: 'dialogue',
    speakerId: 'rocket-james',
    lines: [{ en: 'To reach even the stars in the sky', he: 'כדי להגיע אף לכוכבים שבשמיים' }],
  },

  { type: 'dialogue', speakerId: 'rocket-jessi', lines: [{ en: 'Jessi!', he: "ג'סי!" }] },
  {
    type: 'dialogue',
    speakerId: 'rocket-james',
    lines: [{ en: 'James', he: "ג'יימס" }],
  },
];
