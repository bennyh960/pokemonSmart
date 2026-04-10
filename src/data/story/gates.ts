import type { BilingualText } from '../../systems/npc.js';
import type { StoryAction, StoryCondition } from './events.js';

export type GateTriggerType =
  | 'route-checkpoint'
  | 'city-entry'
  | 'city-exit'
  | 'gym-entry'
  | 'gym-leader'
  | 'elite-four'
  | 'service'
  | 'npc-trust'
  | 'story-event'
  // ── Auto-gate types (no gatekeeper NPC — fires on location entry) ──
  | 'auto-pokecenter'
  | 'auto-pokemarket'
  | 'auto-gym-entrance';

export type GatePenalty =
  | { type: 'none' }
  | { type: 'money'; amount: number }
  | { type: 'cooldown'; durationMs: number }
  | { type: 'money-and-cooldown'; amount: number; durationMs: number };

/** A single reward granted on successful pass of a session. */
export interface GateReward {
  type: 'money' | 'item';
  amount?: number;        // used when type === 'money'
  itemId?: string;        // used when type === 'item'
  quantity?: number;      // used when type === 'item'
}

/**
 * Session configuration for a gate.
 * Controls question count, timing, reward/penalty thresholds, and bonus questions.
 */
export interface GateSessionConfig {
  /** Year the player was born — used to calculate grade. Constant 2018 until date-of-birth is added. */
  birthYear: number;

  /** How many correct answers are required to pass. */
  questionsRequired: number;

  /** Time limit per question in seconds. 0 = no limit. */
  timeLimitPerQuestion: number;

  /**
   * Minimum success rate (correctAnswers / totalAttempts) needed to receive rewards.
   * Example: 0.8 = player must have answered correctly on at least 80% of all attempts.
   */
  rewardThreshold: number;

  /**
   * Success rate below which a money penalty is applied.
   * Example: 0.5 = if success rate < 50%, deduct `penaltyAmount` PokeCoins.
   */
  penaltyThreshold: number;

  /** Amount of PokeCoins deducted on penalty. */
  penaltyAmount: number;

  /** Rewards granted when the player clears `rewardThreshold`. */
  rewards: GateReward[];

  /**
   * Enable optional bonus question (one question at grade+1 difficulty).
   * If answered correctly: rewards are multiplied by `bonusMultiplier`.
   * If answered incorrectly: any active penalty is cleared.
   */
  bonusEnabled: boolean;

  /**
   * Multiplier applied to all money rewards when the bonus question is answered correctly.
   * Example: 2 = double all money rewards.
   */
  bonusMultiplier: number;
}

export interface QuestionGateDef {
  id: string;
  title: BilingualText;
  description?: BilingualText;
  triggerType: GateTriggerType;

  /** Which question-set templates to draw from ('*' = all). */
  questionSetIds: string[];
  totalQuestions: number;
  passThreshold: number;
  timeLimitPerQuestion?: number;

  /** @deprecated prefer sessionConfig */
  failurePenalty?: GatePenalty;
  successActions?: StoryAction[];
  failureActions?: StoryAction[];

  /** Gate stays open for this many ms after passing. 0 = permanent. undefined = always re-check. */
  reopenCooldownMs?: number;

  conditions?: StoryCondition[];

  /** Full session config (reward/penalty/bonus). If omitted, falls back to global defaults. */
  sessionConfig?: GateSessionConfig;
}

/** Registered gate definitions keyed by ID. Populated by registerGate(). */
export const GATES: Record<string, QuestionGateDef> = {};

export function getGate(id: string): QuestionGateDef | undefined {
  return GATES[id];
}

export function registerGate(def: QuestionGateDef): void {
  GATES[def.id] = def;
}
