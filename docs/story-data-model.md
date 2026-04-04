# Story Mode — Data Model & Architecture
**Version:** 1.1 | Companion to `story-mode-final.md`
**Updated:** After infrastructure audit — reflects actual codebase state

---

## Design Principles

1. **Flag-based progression** — `PlayerData.flags` remains the single source of truth for what has happened
2. **Data-driven** — story content lives in JSON/TS registries; scenes do not hardcode story logic
3. **Bilingual everywhere** — every player-facing string is `{ en: string; he: string }`
4. **Additive** — all new fields on `PlayerData` and `TileMapData` are optional; existing saves migrate gracefully
5. **Composable** — gates, cutscenes, quests, and events are independent primitives that reference each other by ID
6. **Development** — each change to NPC/tiles or anything requiring human touch: stop and consult first; if agreed, update editors before merging

---

## What Already Exists (Do NOT Re-implement)

The following infrastructure is production-ready and must be reused, not replaced:

| Existing | Location | Story use |
|---------|----------|-----------|
| `PlayerData.flags` | `types/index.ts` | All story progression, gate completions, quest steps |
| `PlayerData.badges` | `types/index.ts` | Story gate conditions |
| `PlayerData.money` | `types/index.ts` | Gate penalty deductions |
| `PlayerData.serumParts` | `types/index.ts` | Story reward tracking |
| `NPCData.hidden` | `systems/npc.ts` | Hide NPC until story flag triggers |
| `NPCData.spawnAfter` | `systems/npc.ts` | Show NPC when flag set |
| `NPCData.despawnAfter` | `systems/npc.ts` | Hide NPC when flag set |
| `DialogueReward.storyEvent` | `systems/npc.ts` | Set a story flag when NPC gives reward |
| `DialogueReward.flag` | `systems/npc.ts` | Prevent reward from re-firing |
| `TrainerReward.storyEvent` | `systems/npc.ts` | Set story flag on trainer defeat |
| `TrainerReward.badge` | `systems/npc.ts` | Award gym badge |
| `TrainerData.postBattleDialogue` | `systems/npc.ts` | Post-defeat story dialogue |
| `TileMapData.transitions` | `engine/tilemap.ts` | Map enter/exit (we hook events here) |
| `InteractArgs.flag` | `data/interact-types.ts` | Per-tile flag set on interaction |
| `InteractArgs.dialogue` | `data/interact-types.ts` | Per-tile dialogue override |
| Save migration chain | `systems/save.ts` | v6 is current; we add v7 |

---

## File Layout

```
src/data/story/
  events.ts           — story event registry
  gates.ts            — verification gate definitions
  quests.ts           — quest/objective definitions
  cutscenes.ts        — cutscene script definitions
  city-profiles.ts    — per-city infection + service config
  characters.ts       — named story character registry
  question-sets.ts    — question pool references (content added later)

src/systems/
  story-engine.ts     — runtime: evaluate events, execute actions, gate/cutscene control

src/scenes/
  gate-scene.ts       — verification gate UI (question sequence)
  cutscene-scene.ts   — scripted cutscene player
```

---

## 1. Player Story State

New optional field on `PlayerData`. Save migration v6 → v7 adds it.

```typescript
export interface PlayerStoryState {
  // Timed gate unlocks: gateId → expiry timestamp ms. Open while Date.now() < value. 0 = permanent.
  gateUnlocks: Record<string, number>;

  // City infection levels keyed by cityId
  cityInfection: Record<string, InfectionLevel>;

  // Quest tracking
  activeQuestId: string | null;
  completedQuestIds: string[];
}

export type InfectionLevel = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'cleared';

// Added to PlayerData:
// story?: PlayerStoryState;
```

---

## 2. Story Events

**File:** `src/data/story/events.ts`

Fires on a trigger, checks conditions, runs actions. Evaluated by `story-engine.ts`.

```typescript
export interface StoryEventDef {
  id: string;
  label?: string;                    // internal debug label
  trigger: StoryTrigger;
  conditions?: StoryCondition[];
  actions: StoryAction[];
  repeatable?: boolean;              // default false
  completedFlag?: string;            // auto-set when event fires (blocks re-fire)
}

export type StoryTrigger =
  | { type: 'map-enter';         mapId: string }
  | { type: 'map-exit';          mapId: string }
  | { type: 'npc-interact';      npcId: string }
  | { type: 'trainer-defeated';  trainerId: string }
  | { type: 'badge-earned';      badge: number }
  | { type: 'gate-cleared';      gateId: string }
  | { type: 'quest-complete';    questId: string }
  | { type: 'flag-set';          flag: string }
  | { type: 'item-used';         itemId: string }
  | { type: 'manual';            key: string };

export type StoryCondition =
  | { type: 'flag';              flag: string; value?: boolean }
  | { type: 'flag-not';          flag: string }
  | { type: 'badge-count';       min: number }
  | { type: 'badge-count-max';   max: number }
  | { type: 'quest-active';      questId: string }
  | { type: 'quest-complete';    questId: string }
  | { type: 'infection-level';   cityId: string; value: InfectionLevel }
  | { type: 'money-min';         amount: number };

// NOTE: set-flag, give-item, give-money already handled by existing DialogueReward/TrainerReward.
// StoryAction covers the extra cases those systems don't handle.
export type StoryAction =
  | { type: 'set-flag';          flag: string; value?: boolean }
  | { type: 'set-infection';     cityId: string; value: InfectionLevel }
  | { type: 'start-cutscene';    cutsceneId: string }
  | { type: 'start-gate';        gateId: string }
  | { type: 'set-quest';         questId: string | null }
  | { type: 'complete-quest';    questId: string }
  | { type: 'give-item';         itemId: string; quantity: number }
  | { type: 'give-money';        amount: number }
  | { type: 'unlock-gate-timer'; gateId: string; durationMs: number }
  | { type: 'teleport';          mapId: string; x: number; y: number }
  | { type: 'show-message';      lines: BilingualText[] }
  | { type: 'play-music';        musicId: string };
```

---

## 3. Verification Gates

**File:** `src/data/story/gates.ts`

Gates are triggered either by a tile interact (`interactType: 'gate'`) or by a `StoryAction`.

**Default configuration for all gates during development:**
- `totalQuestions: 1`
- `passThreshold: 1`
- `questionSetIds: ['placeholder']`
- Gate scene renders a simple "Press Enter to continue" text — real questions added in the question sprint

```typescript
export type GateTriggerType =
  | 'route-checkpoint'
  | 'city-entry'
  | 'city-exit'
  | 'gym-entry'
  | 'gym-leader'
  | 'elite-four'
  | 'service'           // shop bonus, premium heal, PC
  | 'npc-trust'         // verifying NPC is not a Rocket disguise
  | 'story-event';      // arbitrary in-story gate

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

  // Question config — defaults to 1/placeholder during development
  questionSetIds: string[];
  totalQuestions: number;
  passThreshold: number;
  timeLimitPerQuestion?: number;     // seconds; undefined = no timer

  failurePenalty?: GatePenalty;
  successActions?: StoryAction[];
  failureActions?: StoryAction[];

  // Gate stays open for this many ms after passing (0 = permanent, undefined = always re-check)
  reopenCooldownMs?: number;

  conditions?: StoryCondition[];
}
```

---

## 4. Gate Interact Type (New tile type)

Add `'gate'` to `src/data/interact-types.ts`. A gate tile blocks passage and triggers a `QuestionGateDef` by ID.

```typescript
// Extend InteractArgs with:
gateId?: string | null;       // QuestionGateDef ID to trigger on interact

// Extend INTERACT_TYPE_IDS:
export const INTERACT_TYPE_IDS = ['pc', 'sign', 'item', 'cut', 'strength', 'gate'] as const;

// New default:
gate: {
  id: 'gate',
  label: { en: 'Checkpoint', he: 'מחסום' },
  dialogue: [],
  itemId: null,
  itemQty: null,
  flag: null,
  gateId: null,
}
```

The gate tile is a **blocking** tile. When the player tries to walk into it (or presses Enter facing it), the gate scene launches. On pass: tile becomes walkable for `reopenCooldownMs`. On fail: penalty applied, player stays.

---

## 5. Question Sets

**File:** `src/data/story/question-sets.ts`

Reference layer only — content is generated at runtime by the question engine (Sprint 8).
During story development, the only set needed is `'placeholder'`.

```typescript
export type QuestionCategory =
  | 'math-addition' | 'math-subtraction' | 'math-multiplication' | 'math-division' | 'math-mixed'
  | 'logic-patterns' | 'logic-sequences' | 'logic-reasoning'
  | 'english-words' | 'english-sentences'
  | 'clock-reading'
  | 'game-logic'
  | 'placeholder';        // development stub — renders "Press Enter to continue"

export interface QuestionSetDef {
  id: string;
  label: string;
  category: QuestionCategory;
  difficultyMin: number;
  difficultyMax: number;
  tags?: string[];
}
```

---

## 6. Quests

**File:** `src/data/story/quests.ts`

```typescript
export type QuestCategory = 'main' | 'side' | 'character' | 'tutorial';

export interface QuestDef {
  id: string;
  title: BilingualText;
  description: BilingualText;
  category: QuestCategory;
  steps: QuestStep[];
  completionFlag?: string;
  rewards?: { items?: { itemId: string; quantity: number }[]; money?: number };
  visibleAfterFlag?: string;
}

export interface QuestStep {
  id: string;
  text: BilingualText;
  completionConditions: StoryCondition[];
  completionFlag?: string;
}
```

---

## 7. Cutscenes

**File:** `src/data/story/cutscenes.ts`

```typescript
export interface CutsceneDef {
  id: string;
  skippable?: boolean;
  steps: CutsceneStep[];
}

export type CutsceneStep =
  | { type: 'camera-pan';    x: number; y: number; durationMs: number }
  | { type: 'camera-snap';   x: number; y: number }
  | { type: 'screen-fade';   direction: 'in' | 'out'; durationMs: number; color?: string }
  | { type: 'move-npc';      npcId: string; path: Array<'up'|'down'|'left'|'right'>; waitForComplete?: boolean }
  | { type: 'face-npc';      npcId: string; dir: 'up'|'down'|'left'|'right' }
  | { type: 'show-npc';      npcId: string }
  | { type: 'hide-npc';      npcId: string }
  | { type: 'hide-player' }
  | { type: 'show-player' }
  | { type: 'move-player';   path: Array<'up'|'down'|'left'|'right'>; waitForComplete?: boolean }
  | { type: 'dialogue';      speakerId?: string; lines: BilingualText[]; portrait?: string }
  | { type: 'wait';          durationMs: number }
  | { type: 'wait-input' }
  | { type: 'play-music';    musicId: string }
  | { type: 'play-sfx';      sfxId: string }
  | { type: 'stop-music' }
  | { type: 'action';        action: StoryAction }
  | { type: 'if-flag';       flag: string; thenSteps: CutsceneStep[]; elseSteps?: CutsceneStep[] }
  | { type: 'start-battle';  trainerId: string }
  | { type: 'start-gate';    gateId: string };
```

---

## 8. Characters Registry

**File:** `src/data/story/characters.ts`

Used as `speakerId` in cutscene dialogue steps.

```typescript
export interface StoryCharacterDef {
  id: string;
  name: BilingualText;
  role: 'mentor' | 'rival' | 'villain' | 'ally' | 'rocket' | 'gym-leader' | 'elite-four' | 'ai' | 'civilian';
  portraitId?: string;
}
```

---

## 9. City Profiles

**File:** `src/data/story/city-profiles.ts`

```typescript
export interface CityProfile {
  cityId: string;
  displayName: BilingualText;
  defaultInfection: InfectionLevel;
  stabilizedByFlag?: string;
  serviceGates?: { heal?: string; shop?: string; pc?: string };
  entryGateId?: string;
  rocketEventIds?: string[];
}
```

---

## 10. Map Story Hooks

Optional field added to `TileMapData`. Maps opt in gradually.

```typescript
export interface MapStoryHooks {
  cityId?: string;
  onEnterEventIds?: string[];
  onExitEventIds?: string[];
  gateIds?: string[];          // which gates can activate on this map
}
// TileMapData gains: story?: MapStoryHooks;
```

---

## 11. NPC Story Extension

Additive optional field on `NPCData`.
**Do NOT duplicate** `spawnAfter`/`despawnAfter`/`hidden` — those already exist on `NPCData`.

```typescript
export interface NPCStoryMeta {
  characterId?: string;        // links to StoryCharacterDef for cutscene speaker resolution
  role?: 'mentor' | 'rival' | 'villain' | 'ally' | 'rocket' | 'civilian';
  gateId?: string;             // if set: interacting triggers gate instead of normal dialogue
  questIds?: string[];         // quests this NPC advances when interacted with
  disguiseGroup?: string;      // Team Rocket identity chain (for suspicion system, later)
}
// NPCData gains: story?: NPCStoryMeta;
```

---

## 12. Story Engine API

**File:** `src/systems/story-engine.ts`

```typescript
// Check registered events matching the trigger. Fires actions on match.
export function evaluateStoryEvents(trigger: StoryTrigger): void;

// Check all conditions against current PlayerData.
export function checkConditions(conditions: StoryCondition[]): boolean;

// Execute a single StoryAction.
export function executeStoryAction(action: StoryAction, stateMachine: StateMachine): void;

// Gate helpers
export function isGateOpen(gateId: string): boolean;
export function unlockGate(gateId: string, durationMs: number): void;

// Called from overworld.ts on map load/transition
export function onMapEnter(mapId: string, stateMachine: StateMachine): void;
export function onMapExit(mapId: string, stateMachine: StateMachine): void;
```

---

## 13. Save Migration v6 → v7

```typescript
7: (data) => {
  if (!data.story) {
    data.story = {
      gateUnlocks: {},
      cityInfection: {},
      activeQuestId: null,
      completedQuestIds: [],
    };
  }
  data.saveVersion = 7;
},
```

---

## 14. Implementation Order (Sprint 7A)

Build in this exact order — each step is independently testable:

| # | What | Key files |
|---|------|-----------|
| 1 | `PlayerStoryState` type + save migration v7 | `types/index.ts`, `systems/save.ts`, `systems/game-state.ts`, `systems/player.ts` |
| 2 | `gate` interact type + `gateId` in `InteractArgs` | `data/interact-types.ts` |
| 3 | Story data registries (empty stubs with one example each) | `data/story/*.ts` |
| 4 | `story-engine.ts` — conditions, actions, event evaluation | `systems/story-engine.ts` |
| 5 | Gate scene — placeholder "Press Enter to continue" UI | `scenes/gate-scene.ts`, register in `engine/game.ts` |
| 6 | Wire gates into overworld interact flow | `scenes/overworld.ts` |
| 7 | Cutscene scene — dialogue + NPC movement + fade | `scenes/cutscene-scene.ts`, register in `engine/game.ts` |
| 8 | Wire `onMapEnter` events in overworld transition | `scenes/overworld.ts` |
| 9 | Map/NPC `story?` optional fields (TypeScript only, no JSON migration needed) | `engine/tilemap.ts`, `systems/npc.ts` |
