import type { MajorStatusId } from './battle-metadata.ts';

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
export type SceneId = 'TITLE' | 'HERO_SELECT' | 'HERO_NAME_SELECT' | 'STARTER_SELECT' | 'OVERWORLD' | 'BATTLE' | 'MENU' | 'DIALOGUE' | 'PARTY' | 'POKEDEX' | 'SHOP' | 'BAG' | 'PC' | 'WORLD_MAP' | 'EVOLUTION' | 'PHONE' | 'GATE' | 'CUTSCENE';

/** Top-level game state snapshot. */
export interface GameState {
  player: PlayerData;
  currentScene: SceneId;
  flags: Record<string, boolean>;
}

/** A single Pokemon instance (real Pokemon from Gen 1-2). */
export interface Pokemon {
  id: number;              // PokeAPI ID (1-251)
  name: string;            // e.g. "Cyndaquil"
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  types: PokemonType[];    // Real Pokemon can have 1-2 types
  moves: Move[];
  xp: number;
  xpToNext: number;
  isGlitched: boolean;     // Infected by NULL-X virus
  abilityId: number | null;   // PokeAPI ability ID — lookup in abilities.json
  natureId: number | null;    // PokeAPI nature ID (1-25) — lookup in natures.json
  heldItemId: number | null;  // PokeAPI item ID — lookup in items.json + item-defs.ts
  status: MajorStatusId | null; // Persistent major status between battles/items/healers
  caughtBall?: string;     // Item ID of the pokeball used to catch (e.g. 'poke-ball', 'great-ball')
  /** EV-like stat boosts from vitamins. Each stat capped at 31. Optional for save-file backwards-compat. */
  evs?: { hp: number; atk: number; def: number; spe: number; spa: number; spd: number };
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
  id: number;              // PokeAPI move ID
  name: string;            // e.g. "Flamethrower"
  type: PokemonType;
  power: number;           // 0-250 (from PokeAPI)
  accuracy: number;        // 0-100
  pp: number;
  currentPp: number;
  mathDifficulty: MathDifficulty;  // Derived from power: 1-40→1, 41-60→2, 61-80→3, 81-100→4, 101-120→5, 121+→6
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
  name: string;                   // e.g. "BOX 1"
  pokemon: (Pokemon | null)[];    // 30 slots (null = empty)
}

/** Persistent re-encounter state for a single trainer. */
export interface TrainerEncounterState {
  count: number;           // how many times player has defeated this trainer (including first)
  lastDefeatedAt: number;  // timestamp (ms) of last defeat
}

/** Story-mode infection level for a city. */
export type InfectionLevel = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'cleared';

/** Player story state — timed gates, city infection, active quest. */
export interface PlayerStoryState {
  gateUnlocks: Record<string, number>;          // gateId → expiry ms (0 = permanent)
  cityInfection: Record<string, InfectionLevel>;
  activeQuestId: string | null;
  completedQuestIds: string[];
}

/** A phone contact entry — saved when trainer is first defeated. */
export interface PhoneContactInfo {
  trainerId: string;
  trainerName: string;
  locationEn: string;
  locationHe: string;
}

/** Persistent player data (saved to localStorage). */
export interface PlayerData {
  saveVersion: number;           // Schema version for migration (current: 6)
  name: string;
  heroCharacterId: string;
  party: Pokemon[];
  boxes: PCBox[];                // PC storage — 10 boxes × 30 slots
  badges: number;
  serumParts: number;
  money: number;
  pokedex: Record<number, boolean>;
  items: Record<string, number>;  // item id → quantity
  flags: Record<string, boolean>; // e.g. 'trainer-bug1-defeated'
  position: { mapId: string; x: number; y: number };
  previousMapReturn?: { mapId: string; x: number; y: number } | null;
  lastPokemonCenter: { mapId: string; x: number; y: number };
  playtime: number;
  trainerEncounters: Record<string, TrainerEncounterState>; // trainerId → encounter state
  phoneContacts: PhoneContactInfo[];  // trainers added to phone after first defeat
  story?: PlayerStoryState;           // story mode state (gates, infection, quests)
  pokedexBatteryCharges: number;      // in-battle Pokedex uses remaining (max 50, free recharge at PokeCenter)
  battleHelperBattles: number;        // remaining Battle Helper battles (shows type effectiveness on moves)
  battleHelperEnabled: boolean;       // toggle: auto-consumes from battleHelperBattles each battle when ON
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
