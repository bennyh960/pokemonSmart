/**
 * StoryEngine — Evaluates story events, checks conditions, and executes actions.
 *
 * Usage:
 *   fireStoryTrigger({ type: 'map-enter', mapId: 'sumville' });
 *
 * The engine reads from `PlayerData.flags` (and story state) and writes back
 * to them. Cutscenes and gates are launched by pushing scenes onto the stack
 * via the provided StateMachine.
 *
 * All logic is data-driven — events/gates/cutscenes live in src/data/story/.
 */

import type { StateMachine } from '../engine/state-machine.js';
import type { PlayerStoryState } from '../types/index.js';
import { getPlayerData, hasActiveGame, autoSave, setFlag } from './game-state.js';
import { getStoryEvents } from '../data/story/events.js';
import type { StoryTrigger, StoryCondition, StoryAction } from '../data/story/events.js';
import { awaitCutsceneCompletion } from './cutscene-runner.js';
import { getCurrentMapId, getCachedMap } from './map-manager.js';
import { allTrainersDefeatedFlag } from '../data/story/flags.js';

let _stateMachine: StateMachine | null = null;

/** Call once at game startup so the engine can push scenes. */
export function initStoryEngine(sm: StateMachine): void {
  _stateMachine = sm;
}

// ---------------------------------------------------------------------------
// Auto-gate service map registry
// ---------------------------------------------------------------------------

type AutoGateService = 'pokecenter' | 'pokemarket' | 'gym';
const _autoGateMapRegistry = new Map<string, AutoGateService>();

/** Register a map ID → service type mapping so entering it triggers the auto-gate. */
export function registerAutoGateMap(mapId: string, service: AutoGateService): void {
  _autoGateMapRegistry.set(mapId, service);
}

const AUTO_GATE_IDS: Record<AutoGateService, string> = {
  pokecenter: 'auto-pokecenter',
  pokemarket: 'auto-pokemarket',
  gym: 'auto-gym', // we can use auto and also use gate guard as regular
};

function _checkAutoGate(mapId: string): void {
  const service = _autoGateMapRegistry.get(mapId);
  if (!service) return;

  // Gyms get a per-map gate ID so each gym unlocks independently
  const gateIdLockCheck = service === 'gym' ? `auto-gym-${mapId}` : AUTO_GATE_IDS[service];
  if (isGateUnlocked(gateIdLockCheck)) return;

  if (_stateMachine) {
    // Use per-map ID so unlock tracking is per-gym, not shared across all gyms
    setActiveGate(gateIdLockCheck);
    _stateMachine.push('GATE');
  }
}

// ---------------------------------------------------------------------------
// Auto all-trainers-defeated flag
// ---------------------------------------------------------------------------

function _autoCheckMapTrainersCleared(pd: ReturnType<typeof getPlayerData>): void {
  const mapId = getCurrentMapId();
  if (!mapId) return;

  const autoFlag = allTrainersDefeatedFlag(mapId);
  if (pd.flags[autoFlag]) return; // already set, skip

  const mapData = getCachedMap(mapId);
  if (!mapData?.npcs) return;

  const trainers = mapData.npcs.filter(
    (npc) => (npc.type === 'trainer' || npc.type === 'wild-pokemon') && !npc.excludeFromMapClear,
  );
  if (trainers.length === 0) return;

  if (trainers.every((npc) => pd.flags[`trainer-${npc.id}-defeated`])) {
    setFlag(pd, autoFlag);
    void fireStoryTrigger({ type: 'flag-set', flag: autoFlag });
  }
}

// ---------------------------------------------------------------------------
// Pending gate / cutscene — stored so the caller can read it after firing
// ---------------------------------------------------------------------------
let _pendingGateId: string | null = null;
let _pendingCutsceneId: string | null = null;

export function consumePendingGate(): string | null {
  const id = _pendingGateId;
  _pendingGateId = null;
  return id;
}

export function consumePendingCutscene(): string | null {
  const id = _pendingCutsceneId;
  _pendingCutsceneId = null;
  return id;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fire a story trigger and execute all matching events. */
export async function fireStoryTrigger(trigger: StoryTrigger): Promise<void> {
  if (!hasActiveGame()) return;
  const pd = getPlayerData();

  // Ensure story state exists (guard against old saves without migration)
  if (!pd.story) {
    pd.story = {
      gateUnlocks: {},
      mapInfection: {},
      activeQuestId: null,
      completedQuestIds: [],
    };
  }

  const events = getStoryEvents();

  for (const event of events) {
    // Trigger type must match
    if (!triggerMatches(event.trigger, trigger)) continue;

    // Skip if already fired (non-repeatable)
    const doneFlag = event.completedFlag ?? `__event-done-${event.id}`;
    if (!event.repeatable && pd.flags[doneFlag]) continue;

    // Check conditions
    if (event.conditions && !allConditionsMet(event.conditions, pd)) continue;

    // Execute actions — if a cutscene is queued, await its completion before
    // marking the event done. This prevents the done-flag from being saved
    // before the cutscene's own set-flag actions run.
    let cutscenePromise: Promise<void> | null = null;
    for (const action of event.actions) {
      if (action.type === 'start-cutscene') {
        _pendingCutsceneId = action.cutsceneId;
        cutscenePromise = awaitCutsceneCompletion();
      } else {
        executeAction(action, pd);
      }
    }

    if (cutscenePromise) {
      autoSave(); // persist intermediate flags (e.g. VISITED_SUMVILLE) before waiting
      await cutscenePromise;
    }

    // Mark as done unless repeatable — happens AFTER cutscene completes
    if (!event.repeatable) {
      setFlag(pd, doneFlag);
    }
  }

  // ── Auto-gate check for service map entry ────────────────────────────────
  if (trigger.type === 'map-enter') {
    _checkAutoGate((trigger as { mapId: string }).mapId);
  }

  // ── Auto all-trainers-defeated flag ──────────────────────────────────────
  // After any trainer defeat, check if every trainer on the current map is
  // now beaten. If so, set all-trainers-defeated-{mapId} so NPCs and story
  // events can react without needing a manually-maintained flag.
  if (trigger.type === 'trainer-defeated') {
    _autoCheckMapTrainersCleared(pd);
  }

  autoSave();
}

/** Check if a gate is currently unlocked (timed pass still active). */
export function isGateUnlocked(gateId: string): boolean {
  if (!hasActiveGame()) return false;
  const pd = getPlayerData();
  const story = pd.story;
  if (!story) return false;
  const expiry = story.gateUnlocks[gateId];
  if (expiry === undefined) return false;
  if (expiry === 0) return true; // permanent
  return Date.now() < expiry;
}

/** Unlock a gate permanently (after passing). */
export function unlockGatePermanent(gateId: string): void {
  if (!hasActiveGame()) return;
  const pd = getPlayerData();
  ensureStory(pd.story!);
  pd.story!.gateUnlocks[gateId] = 0;
  autoSave();
}

/** Unlock a gate for a limited duration. */
export function unlockGateTimed(gateId: string, durationMs: number): void {
  if (!hasActiveGame()) return;
  const pd = getPlayerData();
  ensureStory(pd.story!);
  pd.story!.gateUnlocks[gateId] = Date.now() + durationMs;
  autoSave();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function triggerMatches(a: StoryTrigger, b: StoryTrigger): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'map-enter':
    case 'map-exit':
      return (a as { mapId: string }).mapId === (b as { mapId: string }).mapId;
    case 'npc-interact':
      return (a as { npcId: string }).npcId === (b as { npcId: string }).npcId;
    case 'trainer-defeated':
      return (a as { trainerId: string }).trainerId === (b as { trainerId: string }).trainerId;
    case 'badge-earned':
      return (a as { badge: number }).badge === (b as { badge: number }).badge;
    case 'gate-cleared':
      return (a as { gateId: string }).gateId === (b as { gateId: string }).gateId;
    // case 'quest-complete':  // NOT WIRED
    //   return (a as { questId: string }).questId === (b as { questId: string }).questId;
    case 'flag-set':
      return (a as { flag: string }).flag === (b as { flag: string }).flag;
    // case 'item-used':  // NOT WIRED
    //   return (a as { itemId: string }).itemId === (b as { itemId: string }).itemId;
    // case 'manual':     // NOT WIRED
    //   return (a as { key: string }).key === (b as { key: string }).key;
    default:
      return false;
  }
}

function allConditionsMet(conditions: StoryCondition[], pd: ReturnType<typeof getPlayerData>): boolean {
  for (const cond of conditions) {
    if (!checkCondition(cond, pd)) return false;
  }
  return true;
}

function checkCondition(cond: StoryCondition, pd: ReturnType<typeof getPlayerData>): boolean {
  switch (cond.type) {
    case 'flag':
      return pd.flags[cond.flag] === (cond.value ?? true);
    case 'flag-not':
      return !pd.flags[cond.flag];
    case 'badge-count':
      return countBits(pd.badges) >= cond.min;
    case 'badge-count-max':
      return countBits(pd.badges) <= cond.max;
    case 'quest-active':
      return pd.story?.activeQuestId === cond.questId;
    case 'quest-complete':
      return pd.story?.completedQuestIds.includes(cond.questId) ?? false;
    case 'infection-level':
      return pd.story?.mapInfection[cond.mapId] === cond.value;
    case 'money-min':
      return pd.money >= cond.amount;
    case 'gate-locked':
      return !isGateUnlocked(cond.gateId);
    default:
      return true;
  }
}

function executeAction(action: StoryAction, pd: ReturnType<typeof getPlayerData>): void {
  switch (action.type) {
    case 'set-flag':
      pd.flags[action.flag] = action.value ?? true;
      // Fire flag-set trigger after the current synchronous chain unwinds.
      // void (no await) prevents stack recursion while still letting chained
      // flag-set story events react in the same game tick.
      void fireStoryTrigger({ type: 'flag-set', flag: action.flag });
      break;

    case 'set-infection':
      ensureStory(pd.story!);
      pd.story!.mapInfection[action.mapId] = action.value;
      break;

    case 'set-quest':
      ensureStory(pd.story!);
      pd.story!.activeQuestId = action.questId;
      break;

    case 'complete-quest':
      ensureStory(pd.story!);
      if (!pd.story!.completedQuestIds.includes(action.questId)) {
        pd.story!.completedQuestIds.push(action.questId);
      }
      if (pd.story!.activeQuestId === action.questId) {
        pd.story!.activeQuestId = null;
      }
      break;

    case 'give-item':
      pd.items[action.itemId] = (pd.items[action.itemId] || 0) + action.quantity;
      break;

    case 'give-money':
      pd.money += action.amount;
      break;

    case 'start-cutscene':
      // Overworld polls consumePendingCutscene() and activates the runner internally
      _pendingCutsceneId = action.cutsceneId;
      break;

    case 'start-gate':
      _pendingGateId = action.gateId;
      if (_stateMachine) {
        setActiveGate(action.gateId);
        _stateMachine.push('GATE');
      }
      break;

    case 'teleport':
      // Teleport is handled externally via consumePendingTeleport
      _pendingTeleport = { mapId: action.mapId, x: action.x, y: action.y };
      break;

    case 'play-music':
      // Caller handles via consumePendingMusic
      _pendingMusic = action.musicId;
      break;

    case 'show-message':
      _pendingMessage = action.lines;
      break;

    case 'unlock-gate-timer':
      ensureStory(pd.story!);
      pd.story!.gateUnlocks[action.gateId] = Date.now() + action.durationMs;
      break;
  }
}

// ---------------------------------------------------------------------------
// Pending side-effects (consumed by the caller scene)
// ---------------------------------------------------------------------------

let _pendingTeleport: { mapId: string; x: number; y: number } | null = null;
let _pendingMusic: string | null = null;
let _pendingMessage: import('../systems/npc.js').BilingualText[] | null = null;

export function consumePendingTeleport(): { mapId: string; x: number; y: number } | null {
  const v = _pendingTeleport;
  _pendingTeleport = null;
  return v;
}

export function consumePendingMusic(): string | null {
  const v = _pendingMusic;
  _pendingMusic = null;
  return v;
}

export function consumePendingMessage(): import('../systems/npc.js').BilingualText[] | null {
  const v = _pendingMessage;
  _pendingMessage = null;
  return v;
}

// ---------------------------------------------------------------------------
// Active gate/cutscene shared state (so scenes can read what was queued)
// ---------------------------------------------------------------------------

let _activeGateId: string | null = null;
let _activeCutsceneId: string | null = null;

export function setActiveGate(id: string): void {
  _activeGateId = id;
}
export function setActiveCutscene(id: string): void {
  _activeCutsceneId = id;
}
export function getActiveGateId(): string | null {
  return _activeGateId;
}
export function getActiveCutsceneId(): string | null {
  return _activeCutsceneId;
}
export function clearActiveGate(): void {
  _activeGateId = null;
}
export function clearActiveCutscene(): void {
  _activeCutsceneId = null;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function countBits(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

function ensureStory(story: PlayerStoryState): void {
  // story object must exist (caller already checked), this is a no-op type guard
  if (!story) throw new Error('story state missing — migration not applied');
}
