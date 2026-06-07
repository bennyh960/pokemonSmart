import type { MajorStatusId } from './battle-metadata.ts';
import type { MapId } from '../data/maps/map-ids.js';

/**
 * Shared TypeScript types and interfaces for Pokemon Math Adventure.
 * All core data structures used across the game are defined here.
 */

/** Scene lifecycle interface - all game scenes must implement this. */
export interface Scene {
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

/** Scene identifiers used by the state machine. */
export type SceneId =
  | 'TITLE'
  | 'HERO_SELECT'
  | 'HERO_NAME_SELECT'
  | 'STARTER_SELECT'
  | 'OVERWORLD'
  | 'BATTLE'
  | 'MENU'
  | 'DIALOGUE'
  | 'PARTY'
  | 'POKEDEX'
  | 'SHOP'
  | 'BAG'
  | 'PC'
  | 'WORLD_MAP'
  | 'EVOLUTION'
  | 'PHONE'
  | 'GATE'
  | 'CUTSCENE'
  | 'SAVE_SLOTS'
  | 'START_MENU'
  | 'ENGLISH_LEARNING';

/** Top-level game state snapshot. */
export interface GameState {
  player: PlayerData;
  currentScene: SceneId;
  flags: Record<string, boolean>;
}

/** A single Pokemon instance (real Pokemon from Gen 1-2). */
export interface Pokemon {
  uuid: string; // Unique instance ID — stable across party reordering / box transfers
  id: number; // PokeAPI ID (1-251)
  name: string; // e.g. "Cyndaquil"
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  types: PokemonType[]; // Real Pokemon can have 1-2 types
  moves: Move[];
  xp: number;
  xpToNext: number;
  isGlitched: boolean; // Infected by NULL-X virus
  abilityId: number | null; // PokeAPI ability ID — lookup in abilities.json
  natureId: number | null; // PokeAPI nature ID (1-25) — lookup in natures.json
  heldItemId: string | null; // PokeAPI item ID — lookup in items.json + item-defs.ts
  status: MajorStatusId | null; // Persistent major status between battles/items/healers
  caughtBall?: string; // Item ID of the pokeball used to catch (e.g. 'poke-ball', 'great-ball')
  /** EV-like stat boosts from vitamins. Each stat capped at 31. Optional for save-file backwards-compat. */
  evs?: { hp: number; atk: number; def: number; spe: number; spa: number; spd: number };
  /** Individual size genetics as % offset from species base. Set on creation, never changes. */
  wPercent?: number;
  hPercent?: number;
}

/** Pokemon elemental types (real Gen 2 types + Glitch). */
export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'glitch';

/** A move that a Pokemon can use in battle (real moves from PokeAPI). */
export interface Move {
  id: number; // PokeAPI move ID
  name: string; // e.g. "Flamethrower"
  type: PokemonType;
  power: number; // 0-250 (from PokeAPI)
  accuracy: number; // 0-100
  pp: number;
  currentPp: number;
}

/** Difficulty levels for math problems (1-6, mapped to game progression). */
export type MathDifficulty = 1 | 2 | 3 | 4 | 5 | 6;

/** A math problem presented during battle. */
export interface MathProblem {
  question: string;
  correctAnswer: number;
  choices?: number[];
  difficulty: MathDifficulty;
  timeLimit: number;
  category: string;
}

/** Result of the player answering a math problem. */
export interface MathResult {
  correct: boolean;
  timeTaken: number;
  bonusMultiplier: number;
  answer: number;
}

/** Adaptive difficulty state tracking. */
export interface AdaptiveState {
  currentDifficulty: MathDifficulty;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  totalCorrect: number;
  totalAttempted: number;
  streak: number;
}

/** A single PC storage box. */
export interface PCBox {
  name: string; // e.g. "BOX 1"
  pokemon: (Pokemon | null)[]; // 30 slots (null = empty)
}

/** Persistent re-encounter state for a single trainer. */
export interface TrainerEncounterState {
  count: number; // how many times player has defeated this trainer (including first)
  lastDefeatedAt: number; // timestamp (ms) of last defeat
}

/** Story-mode infection level for a map/region. */
export type InfectionLevel = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'cleared';

/** Player story state — timed gates, map infection, active quest. */
export interface PlayerStoryState {
  gateUnlocks: Record<string, number>; // gateId → expiry ms (0 = permanent)
  mapInfection: Partial<Record<MapId, InfectionLevel>>;
  activeQuestId: string | null;
  completedQuestIds: string[];
  /** Pending delayed events: eventId → readyAt timestamp (ms). Persisted so refresh can resume. */
  delayedEvents?: Record<string, number>;
}

/** A phone contact entry — saved when trainer is first defeated. */
export interface PhoneContactInfo {
  trainerId: string;
  trainerName: { en: string; he: string };
  /** 'day-care' marks a day-care NPC contact (vs a trainer re-encounter contact). */
  contactType?: 'day-care';
  /** Map the trainer lives on — used to derive the display location at runtime (any locale). */
  mapId?: string;
  /** Legacy fallback: pre-stored English location (populated for contacts before mapId was introduced). */
  locationEn: string;
  locationHe: string;
  /** Stored at registration time so the phone scene can compute live re-encounter status. */
  reencounterConfig?: {
    count: number;
    lvlStep: number;
    infinite?: boolean;
    timeInterval?: number;
    triggerFlag?: string;
    triggerFlagDelayHours?: number;
    minPartyLevelBoost?: number;
    /** Cached trainer max base party level — required for minPartyLevelBoost check in the phone scene. */
    maxBasePartyLevel?: number;
  };
}

/** A Pokemon stolen by a thief NPC — removed from party and locked until thief is defeated. */
export interface StolenEntry {
  kind: 'stolen';
  pokemon: Pokemon; // removed from party during theft
  thiefSpriteType: string;
  thiefName: { en: string; he: string };
  restoredFlag: string;
}

/** A Pokemon deposited at a day-care NPC — removed from party, gains EXP per step. */
export interface DayCareEntry {
  kind: 'day-care';
  pokemon: Pokemon;
  depositedAtSteps: number;
  npcId: string;
  route: { en: string; he: string };
  /** Steps needed per level — stored at deposit so phone can compute phase without NPC config. */
  stepsPerLevel: number;
}

export type AwayPokemonEntry = StolenEntry | DayCareEntry;

/** Persistent player data (saved to localStorage). */
export interface PlayerData {
  saveVersion: number; // Schema version for migration (current: 11)
  name: string;
  birthYear: number; // Player's birth year — used to compute school grade for math questions
  heroCharacterId: string;
  party: Pokemon[];
  boxes: PCBox[]; // PC storage — 10 boxes × 30 slots
  badges: number;
  serumParts: number;
  money: number;
  pokedex: Record<number, boolean>;
  items: Record<string, number>; // item id → quantity
  flags: Record<string, boolean>; // e.g. 'trainer-bug1-defeated'
  flagTimestamps: Record<string, number>; // unix ms when each flag was first set
  position: { mapId: string; x: number; y: number };
  previousMapReturn?: { mapId: string; x: number; y: number } | null;
  lastPokemonCenter: { mapId: string; x: number; y: number };
  playtime: number;
  trainerEncounters: Record<string, TrainerEncounterState>; // trainerId → encounter state
  phoneContacts: PhoneContactInfo[]; // trainers added to phone after first defeat
  story?: PlayerStoryState; // story mode state (gates, infection, quests)
  pokedexBatteryCharges: number; // in-battle Pokedex uses remaining (max 50, free recharge at PokeCenter)
  battleHelperBattles: number; // remaining Battle Helper battles (shows type effectiveness on moves)
  battleHelperEnabled: boolean; // toggle: auto-consumes from battleHelperBattles each battle when ON
  repelStepsRemaining: number; // steps left on active repel (0 = no repel)
  surfing?: boolean; // player is currently surfing (survives battle transitions)
  surfingPokemonId?: number | null; // id of the surf pokemon
  /** Away Pokemon: key = Pokemon.uuid. Stolen entries lock the Pokemon in party; day-care entries hold the Pokemon object. */
  awayPokemon: Record<string, AwayPokemonEntry>;
  totalSteps: number; // cumulative steps walked — used for day-care EXP calculation
}

/** Options for text rendering. */
export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  font?: string;
  direction?: 'ltr' | 'rtl';
  maxWidth?: number;
  lineHeight?: number;
}
