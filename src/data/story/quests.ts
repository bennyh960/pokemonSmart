/**
 * Quest Registry — types + register/get only.
 *
 * Quest definitions live in content/act{N}/ files, alongside the
 * story events and cutscenes they belong to. See content/index.ts.
 *
 * A quest has:
 *   - id: unique string key
 *   - title: short bilingual name shown in HUD
 *   - objective: current "what to do" line shown in HUD
 *
 * Quests are set/completed via StoryAction { type: 'set-quest' / 'complete-quest' }.
 * The player has at most one activeQuestId at a time (main story is linear).
 */

import type { BilingualText } from '../../systems/npc.js';

export interface QuestDef {
  id: string;
  title: BilingualText;
  objective: BilingualText;
}

const QUESTS: Record<string, QuestDef> = {};

export function registerQuest(def: QuestDef): void {
  QUESTS[def.id] = def;
}

export function getQuest(id: string): QuestDef | undefined {
  return QUESTS[id];
}
