/**
 * NPC System - NPC data, collision, and interaction management.
 *
 * NPCs are loaded from map JSON data. Each NPC has a position, facing,
 * type (dialogue/trainer/shopkeeper/healer), dialogue lines, and sprite type.
 *
 * Dialogue lines are bilingual: { en: string; he: string }.
 * Legacy maps with plain string[] are auto-normalized at load time.
 */

/** A single bilingual text line. */
export interface BilingualText {
  en: string;
  he: string;
}

/** A single step in an NPC's walk pattern. */
export interface WalkStep {
  dir: 'up' | 'down' | 'left' | 'right';
  steps: number;   // tiles to walk in this direction
  delay: number;   // seconds to wait AFTER completing (or being blocked during) this step
}

/** Auto-walk configuration — NPC patrols following an ordered pattern. */
export interface AutoWalkConfig {
  pattern: WalkStep[];
  loop?: boolean;               // default true — repeat main pattern forever

  /** Played while NPC is not yet visible (before spawnAfter flag is set). NPC renders during this. */
  beforeSpawnPattern?: WalkStep[];
  beforeSpawnLoop?: boolean;    // default false — play once then wait; true = loop until visible

  /** Played once (unless *Loop=true) immediately after NPC first becomes visible. */
  afterSpawnPattern?: WalkStep[];
  afterSpawnLoop?: boolean;     // default false

  /** Played when despawn conditions are first met (NPC still rendered/interactable). Runs before afterDespawn. */
  beforeDespawnPattern?: WalkStep[];
  beforeDespawnLoop?: boolean;  // default false

  /** Played once (unless *Loop=true) after despawn conditions are met; NPC still renders until done. */
  afterDespawnPattern?: WalkStep[];
  afterDespawnLoop?: boolean;   // default false
}

/** Legacy auto-walk format (horizontal/vertical axes). Converted at load time. */
interface LegacyAutoWalkAxis {
  steps: number;
  delay: number;
}
interface LegacyAutoWalkConfig {
  horizontal?: LegacyAutoWalkAxis;
  vertical?: LegacyAutoWalkAxis;
}

/** Convert legacy {horizontal,vertical} autoWalk to pattern format. */
export function normalizeAutoWalk(raw: AutoWalkConfig | LegacyAutoWalkConfig | null | undefined): AutoWalkConfig | null {
  if (!raw) return null;
  // Already new format
  if ('pattern' in raw && Array.isArray(raw.pattern)) return raw as AutoWalkConfig;
  // Legacy format — convert to pattern: go right N, go left N, go down N, go up N
  const legacy = raw as LegacyAutoWalkConfig;
  const pattern: WalkStep[] = [];
  if (legacy.horizontal) {
    pattern.push({ dir: 'right', steps: legacy.horizontal.steps, delay: legacy.horizontal.delay });
    pattern.push({ dir: 'left', steps: legacy.horizontal.steps, delay: legacy.horizontal.delay });
  }
  if (legacy.vertical) {
    pattern.push({ dir: 'down', steps: legacy.vertical.steps, delay: legacy.vertical.delay });
    pattern.push({ dir: 'up', steps: legacy.vertical.steps, delay: legacy.vertical.delay });
  }
  return pattern.length > 0 ? { pattern, loop: true } : null;
}

/** Reward given by a dialogue NPC on first interaction. */
export interface DialogueReward {
  items?: RewardItem[];
  money?: number;
  badge?: number;       // Gym badge number (1-8) to award
  storyEvent?: string;  // Story progression flag to set (e.g. 'story-received-pokedex')
  flag?: string;        // Flag to set after giving reward (prevents re-giving)
}

/** NPC data as stored in map JSON. */
export interface NPCData {
  id: string;
  name?: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  type: 'dialogue' | 'trainer' | 'shopkeeper' | 'healer' | 'gate-guard';
  dialogue: BilingualText[];
  spriteType: string;
  autoWalk?: AutoWalkConfig | null;
  reward?: DialogueReward;  // Optional reward on first interaction (any NPC type)
  interactRange?: number;   // Max interaction distance in tiles (default 1 = adjacent)
  lineOfSight?: number;     // Used by gate-guards and blocker NPCs (default 3)
  // Story-ready fields
  hidden?: boolean;         // NPC exists but not rendered/interactable until triggered
  spawnAfter?: string;      // Flag — NPC appears only after this flag is set
  despawnAfter?: string;    // Flag — NPC disappears after this flag is set
  /** NPC disappears once player has at least `count` Pokémon at or above `minLevel`. */
  despawnWhenParty?: { count: number; minLevel: number };
  /** When true, NPC uses line-of-sight to block the player until despawn conditions are met. */
  blocker?: boolean;
}

/** Reward item given after defeating a trainer. */
export interface RewardItem {
  itemId: string;
  quantity: number;
}

/** Trainer reward — money plus optional items, badges, and story events. */
export interface TrainerReward {
  money: number;
  items?: RewardItem[];
  badge?: number;       // Gym badge number (1-8) to award
  storyEvent?: string;  // Story progression flag to set
}

/** Re-encounter configuration on a trainer NPC. */
export interface ReencounterConfig {
  count: number;           // max additional encounters after the first (e.g. 3 = 4 total fights)
  lvlStep: number;         // level boost applied to all party members per re-encounter
  /**
   * Trigger mode — choose ONE of the following:
   *
   * • timeInterval (number, hours) — classic mode: available X hours after the last defeat.
   * • triggerFlag (string) — flag mode: becomes available as soon as this story flag is set.
   * • triggerFlag + triggerFlagDelayHours — delayed-flag mode: available X hours after the
   *   story flag was first set (e.g. "1 hour after winning gym 1").
   *
   * If no trigger is specified the trainer is immediately available for a rematch after each defeat.
   */
  timeInterval?: number;
  triggerFlag?: string;              // story flag that must be set (e.g. 'gym1-cleared')
  triggerFlagDelayHours?: number;    // hours after triggerFlag was set before reencounter is ready
  partyExtra?: { pokemonId: number; level: number }[];  // extra Pokemon added from 2nd encounter onwards
  addToPhone?: boolean;    // whether to add trainer to phone list after first defeat (default: true)
}

/**
 * Gate-guard NPC — blocks the path until the player passes a verification gate.
 *
 * Map JSON example:
 * {
 *   "id": "route1-guard",
 *   "type": "gate-guard",
 *   "gateId": "gate-route1-sumville",
 *   "dialogue": [{ "en": "You shall not pass!", "he": "אסור לעבור!" }],
 *   "passedDialogue": [{ "en": "Welcome!", "he": "ברוך הבא!" }],
 *   ...
 * }
 */
export interface GateGuardData extends NPCData {
  type: 'gate-guard';
  gateId: string;
  /** How many tiles in front the guard can see. Default 3. */
  lineOfSight?: number;
  /** Dialogue shown after the gate has been passed. Defaults to a generic "you may pass" line. */
  passedDialogue?: BilingualText[];
}

/** Trainer NPC with party and battle data. */
export interface TrainerData extends NPCData {
  type: 'trainer';
  party: { pokemonId: number; level: number; moves?: number[] }[];
  defeated?: boolean;
  /** When true the trainer sprite disappears from the map after the player wins. */
  despawnOnDefeat?: boolean;
  reward: TrainerReward;
  lineOfSight: number;
  postBattleDialogue?: BilingualText[];  // Dialogue shown after defeating this trainer
  reencounter?: ReencounterConfig;       // Optional re-encounter config
  location?: BilingualText;             // Human-readable location for phone display (e.g. "Route 1")
}

/** Normalize a reward field that may be a legacy plain number. */
export function normalizeReward(reward: TrainerReward | number | undefined): TrainerReward {
  if (typeof reward === 'number') return { money: reward };
  if (!reward) return { money: 0 };
  return reward;
}

/** Direction vectors for NPC facing. */
const FACING_VECTORS: Record<string, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

/** Check if an NPC should be visible given the current story flags and player party. */
export function isNPCVisible(
  npc: NPCData,
  flags: Record<string, boolean>,
  party?: import('../types/index.js').Pokemon[],
): boolean {
  if (npc.hidden) return false;
  if (npc.spawnAfter && !flags[npc.spawnAfter]) return false;
  if (npc.despawnAfter && flags[npc.despawnAfter]) return false;

  // Disappear once player has ≥ count Pokémon at or above minLevel
  if (npc.despawnWhenParty && party) {
    const { count, minLevel } = npc.despawnWhenParty;
    if (party.filter(p => p.level >= minLevel).length >= count) return false;
  }

  // Trainers with despawnOnDefeat vanish after the player beats them
  if (npc.type === 'trainer' && (npc as TrainerData).despawnOnDefeat) {
    if (flags[`trainer-${npc.id}-defeated`]) return false;
  }

  return true;
}

/** Create an NPC manager for a set of NPCs on a map. */
export function createNPCManager(npcs: NPCData[]) {
  // Normalize legacy autoWalk configs at load time
  for (const npc of npcs) {
    npc.autoWalk = normalizeAutoWalk(npc.autoWalk);
  }

  return {
    /** Get all NPCs. */
    getNPCs(): NPCData[] {
      return npcs;
    },

    /** Check if there is an NPC at the given grid position (any NPC, including invisible ones). */
    isNPCAt(x: number, y: number): boolean {
      return npcs.some(npc => npc.x === x && npc.y === y);
    },

    /** Check if there is a VISIBLE NPC at the given grid position. Invisible/unspawned NPCs are ignored. */
    isVisibleNPCAt(x: number, y: number, flags: Record<string, boolean>, party?: import('../types/index.js').Pokemon[]): boolean {
      return npcs.some(npc => npc.x === x && npc.y === y && isNPCVisible(npc, flags, party));
    },

    /** Get the NPC at a given grid position. */
    getNPCAt(x: number, y: number): NPCData | undefined {
      return npcs.find(npc => npc.x === x && npc.y === y);
    },

    /** Get the NPC the player is facing (checks up to interactRange tiles in facing direction). */
    getFacingNPC(playerX: number, playerY: number, facing: string): NPCData | undefined {
      const vec = FACING_VECTORS[facing];
      if (!vec) return undefined;
      // Check closest tile first, then further — return nearest match
      const maxRange = Math.max(1, ...npcs.map(n => n.interactRange || 1));
      for (let dist = 1; dist <= maxRange; dist++) {
        const tx = playerX + vec.dx * dist;
        const ty = playerY + vec.dy * dist;
        const npc = npcs.find(n => n.x === tx && n.y === ty && (n.interactRange || 1) >= dist);
        if (npc) return npc;
      }
      return undefined;
    },

    /** Get all trainer NPCs. */
    getTrainers(): TrainerData[] {
      return npcs.filter((npc): npc is TrainerData => npc.type === 'trainer');
    },
  };
}

/**
 * Check if any trainer NPC has line-of-sight to the player.
 * Returns the first trainer that can see the player, or null.
 */
export function checkTrainerLineOfSight(
  trainers: TrainerData[],
  playerX: number,
  playerY: number,
  defeatedFlags: Record<string, boolean>,
  party?: import('../types/index.js').Pokemon[],
): TrainerData | null {
  for (const trainer of trainers) {
    // Skip already-defeated or hidden trainers
    if (defeatedFlags[`trainer-${trainer.id}-defeated`]) continue;
    if (!isNPCVisible(trainer, defeatedFlags, party)) continue;

    const vec = FACING_VECTORS[trainer.facing];
    if (!vec) continue;

    const range = trainer.lineOfSight || 3;
    for (let d = 1; d <= range; d++) {
      const checkX = trainer.x + vec.dx * d;
      const checkY = trainer.y + vec.dy * d;
      if (checkX === playerX && checkY === playerY) {
        return trainer;
      }
    }
  }
  return null;
}

/**
 * Normalize a dialogue array: converts legacy string[] to BilingualText[].
 * Handles mixed arrays where some entries are strings and some are objects.
 */
export function normalizeDialogue(raw: (string | BilingualText)[]): BilingualText[] {
  return raw.map(line =>
    typeof line === 'string' ? { en: line, he: '' } : line
  );
}

/** Resolve bilingual dialogue to a string array for the given locale. Falls back to en if he is empty. */
export function resolveDialogue(lines: BilingualText[], locale: 'en' | 'he'): string[] {
  return lines.map(line => {
    const text = line[locale];
    return text || line.en || '';
  });
}

/** Return type for use in type annotations. */
export type NPCManager = ReturnType<typeof createNPCManager>;
