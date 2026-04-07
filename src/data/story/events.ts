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
  | { type: 'money-min';        amount: number };

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

// ---------------------------------------------------------------------------
// Sumville Arc — Bridge Crystal story
// ---------------------------------------------------------------------------

// When player enters Sumville for the first time, activate the Sumville quest
registerStoryEvent({
  id: 'ev-sumville-arrive',
  label: 'Sumville: First Arrival',
  trigger: { type: 'map-enter', mapId: 'sumville' },
  conditions: [
    { type: 'flag-not', flag: 'sumville-arrived' },
  ],
  actions: [
    { type: 'set-flag', flag: 'sumville-arrived' },
    { type: 'set-quest', questId: 'main-sumville-investigate' },
  ],
  completedFlag: 'sumville-arrived',
});

// When player talks to gym blocker → Jessie & James spawn near the bridge
registerStoryEvent({
  id: 'ev-sumville-gym-blocker-talked',
  label: 'Sumville: Gym Blocker Talked',
  trigger: { type: 'flag-set', flag: 'sumville-gym-blocker-talked' },
  actions: [
    { type: 'set-quest', questId: 'main-sumville-rocket' },
  ],
});

// When Jessie drops the crystal → advance quest to return it
registerStoryEvent({
  id: 'ev-sumville-crystal-found',
  label: 'Sumville: Crystal Found',
  trigger: { type: 'flag-set', flag: 'sumville-crystal-found' },
  actions: [
    { type: 'set-quest', questId: 'main-sumville-crystal' },
  ],
});

// When crystal is returned → advance quest to challenge Adda
registerStoryEvent({
  id: 'ev-sumville-crystal-returned',
  label: 'Sumville: Crystal Returned',
  trigger: { type: 'flag-set', flag: 'sumville-crystal-returned' },
  actions: [
    { type: 'set-quest', questId: 'main-act1-gym1' },
    {
      type: 'show-message',
      lines: [
        { en: 'The Bridge Crystal is restored! Power flows back to the Addition Gym...', he: 'גביש הגשר שוחזר! הכוח זורם בחזרה למכון...' },
        { en: 'Adda has returned to the gym. Go challenge her!', he: 'אדה חזרה למכון. לך לאתגר אותה!' },
      ],
    },
  ],
});

// When gym is cleared → advance story to Route 2
registerStoryEvent({
  id: 'ev-sumville-gym-cleared',
  label: 'Sumville: Gym Cleared',
  trigger: { type: 'flag-set', flag: 'sumville-gym-cleared' },
  actions: [
    { type: 'complete-quest', questId: 'main-act1-gym1' },
    { type: 'set-quest', questId: 'main-act1-route2' },
    {
      type: 'show-message',
      lines: [
        { en: 'You earned the Sum Badge and HM01 Cut!', he: 'הרווחת את תג הסכום ו-HM01 גזירה!' },
        { en: 'The path to Route 2 — Difference Pass — is now open. Minusburg awaits!', he: 'הדרך לשביל 2 — מעבר ההפרש — פתוחה עכשיו. מינוסבורג ממתין!' },
      ],
    },
  ],
});

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
