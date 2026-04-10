import type { BilingualText } from '../../systems/npc.js';
import type { InfectionLevel } from '../../types/index.js';

export type StoryTrigger =
  | { type: 'map-enter';        mapId: string }
  | { type: 'map-exit';         mapId: string }
  | { type: 'npc-interact';     npcId: string }
  | { type: 'trainer-defeated'; trainerId: string }
  | { type: 'badge-earned';     badge: number }
  | { type: 'gate-cleared';     gateId: string }
  | { type: 'quest-complete';   questId: string }
  | { type: 'flag-set';         flag: string }
  | { type: 'item-used';        itemId: string }
  | { type: 'manual';           key: string };

export type StoryCondition =
  | { type: 'flag';             flag: string; value?: boolean }
  | { type: 'flag-not';         flag: string }
  | { type: 'badge-count';      min: number }
  | { type: 'badge-count-max';  max: number }
  | { type: 'quest-active';     questId: string }
  | { type: 'quest-complete';   questId: string }
  | { type: 'infection-level';  cityId: string; value: InfectionLevel }
  | { type: 'money-min';        amount: number }
  /** True when the named gate is NOT currently unlocked (i.e. should re-check). */
  | { type: 'gate-locked';      gateId: string };

export type StoryAction =
  | { type: 'set-flag';         flag: string; value?: boolean }
  | { type: 'set-infection';    cityId: string; value: InfectionLevel }
  | { type: 'start-cutscene';   cutsceneId: string }
  | { type: 'start-gate';       gateId: string }
  | { type: 'set-quest';        questId: string | null }
  | { type: 'complete-quest';   questId: string }
  | { type: 'give-item';        itemId: string; quantity: number }
  | { type: 'give-money';       amount: number }
  | { type: 'unlock-gate-timer'; gateId: string; durationMs: number }
  | { type: 'teleport';         mapId: string; x: number; y: number }
  | { type: 'show-message';     lines: BilingualText[] }
  | { type: 'play-music';       musicId: string };

export interface StoryEventDef {
  id: string;
  label?: string;
  trigger: StoryTrigger;
  conditions?: StoryCondition[];
  actions: StoryAction[];
  repeatable?: boolean;
  completedFlag?: string;
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
  return EVENTS.filter(e => e.trigger.type === trigger.type);
}
