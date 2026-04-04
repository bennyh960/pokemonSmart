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
  | 'story-event';

export type GatePenalty =
  | { type: 'none' }
  | { type: 'money'; amount: number }
  | { type: 'cooldown'; durationMs: number }
  | { type: 'money-and-cooldown'; amount: number; durationMs: number };

export interface QuestionGateDef {
  id: string;
  title: BilingualText;
  description?: BilingualText;
  triggerType: GateTriggerType;

  questionSetIds: string[];
  totalQuestions: number;
  passThreshold: number;
  timeLimitPerQuestion?: number;

  failurePenalty?: GatePenalty;
  successActions?: StoryAction[];
  failureActions?: StoryAction[];

  /** Gate stays open for this many ms after passing. 0 = permanent. undefined = always re-check. */
  reopenCooldownMs?: number;

  conditions?: StoryCondition[];
}

/** Registered gate definitions keyed by ID. */
export const GATES: Record<string, QuestionGateDef> = {
  // Example: route 1 → Sumville checkpoint
  'gate-route1-sumville': {
    id: 'gate-route1-sumville',
    title: { en: 'Route Checkpoint', he: 'מחסום שביל' },
    description: { en: 'The path is locked. Answer to continue.', he: 'המסלול חסום. ענה כדי להמשיך.' },
    triggerType: 'route-checkpoint',
    questionSetIds: ['placeholder'],
    totalQuestions: 1,
    passThreshold: 1,
    failurePenalty: { type: 'none' },
    reopenCooldownMs: 30 * 60 * 1000,  // 30 min
    successActions: [{ type: 'set-flag', flag: 'gate-route1-sumville-pass' }],
  },
};

export function getGate(id: string): QuestionGateDef | undefined {
  return GATES[id];
}

export function registerGate(def: QuestionGateDef): void {
  GATES[def.id] = def;
}
