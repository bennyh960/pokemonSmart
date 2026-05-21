import type { BilingualText } from '../../systems/npc.js';
import type { InfectionLevel } from '../../types/index.js';
import type { MapId } from '../maps/map-ids.js';

export type StoryTrigger =
  | { type: 'map-enter'; mapId: MapId } // fired: overworld on map load
  | { type: 'map-exit'; mapId: MapId } // fired: overworld on transition start
  | { type: 'npc-interact'; npcId: string } // fired: overworld on A/Space press
  | { type: 'trainer-defeated'; trainerId: string } // fired: battle scene on win
  | { type: 'badge-earned'; badge: number } // fired: battle scene on badge reward
  | { type: 'gate-cleared'; gateId: string } // fired: gate-scene on exit
  // | { type: 'quest-complete'; questId: string }     // NOT WIRED — no firing site yet
  | { type: 'flag-set'; flag: string }; // fired: story-engine executeAction set-flag
// | { type: 'item-used';     itemId: string }       // NOT WIRED — no firing site yet
// | { type: 'manual';        key: string }          // NOT WIRED — no firing site yet

export type StoryCondition =
  | { type: 'flag'; flag: string; value?: boolean }
  | { type: 'flag-not'; flag: string }
  | { type: 'badge-count'; min: number }
  | { type: 'badge-count-max'; max: number }
  | { type: 'quest-active'; questId: string }
  | { type: 'quest-complete'; questId: string }
  | { type: 'infection-level'; mapId: MapId; value: InfectionLevel }
  | { type: 'money-min'; amount: number }
  /** True when the named gate is NOT currently unlocked (i.e. should re-check). */
  | { type: 'gate-locked'; gateId: string };

export type StoryAction =
  | { type: 'set-flag'; flag: string; value?: boolean }
  | { type: 'set-infection'; mapId: MapId; value: InfectionLevel }
  | { type: 'start-cutscene'; cutsceneId: string }
  | { type: 'start-gate'; gateId: string }
  | { type: 'set-quest'; questId: string | null }
  | { type: 'complete-quest'; questId: string }
  | { type: 'give-item'; itemId: string; quantity: number }
  | { type: 'give-money'; amount: number }
  | { type: 'unlock-gate-timer'; gateId: string; durationMs: number }
  | { type: 'teleport'; mapId: MapId; x: number; y: number }
  | { type: 'show-message'; lines: BilingualText[] }
  | { type: 'play-music'; musicId: string }
  | { type: 'set-repel'; steps: number };

export interface StoryEventDef {
  id: string;
  label?: string;
  trigger: StoryTrigger;
  conditions?: StoryCondition[];
  actions: StoryAction[];
  repeatable?: boolean;
  completedFlag?: string;
  /** Seconds to wait after trigger conditions are met before executing actions. Survives refresh. */
  triggerDelayPostFlag?: number;
}

/** All registered story events. */
const EVENTS: StoryEventDef[] = [];

export function registerStoryEvent(def: StoryEventDef): void {
  EVENTS.push(def);
}

export function getStoryEvents(): readonly StoryEventDef[] {
  return EVENTS;
}

/** Get all events matching a specific trigger type. */
export function getEventsForTrigger(trigger: StoryTrigger): StoryEventDef[] {
  return EVENTS.filter((e) => e.trigger.type === trigger.type);
}
