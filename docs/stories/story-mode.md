# Feature: Story Mode, Gates, and World Progression

## Overview

This document expands the current Numeria / NULL-X story into a more "Pokemon-like" campaign with stronger character beats, clearer world progression, and gameplay hooks that make learning systems feel native to the world.

It is designed to **extend** `docs/game-spec.md`, not replace it. The core setting stays the same:

- **Numeria** is the region
- **NULL-X** is the AI threat
- **Team Rocket** exploits the crisis
- The game remains bilingual (**Hebrew first, English exposure over time**)

The main addition is a more character-driven "story mode" structure using recognizable Pokemon season 1-2 characters as mentors, rivals, blockers, and recurring threats.

---

## Story Pillars

1. **Classic Pokemon journey**
   - Starter Pokemon
   - Routes, towns, gyms, rivals, Team Rocket encounters
   - Exploration-first structure with light gating

2. **Learning as world logic**
   - Math, logic, time, and English are not detached quizzes
   - They are the tools used to verify identity, unlock routes, repair systems, and outsmart NULL-X

3. **Bilingual progression**
   - The world starts mostly in Hebrew
   - As the player proves understanding, parts of the UI and story content intentionally remain in English
   - This should feel like "the player gained access to a new layer of the system"

4. **Suspicion and identity**
   - Team Rocket can impersonate NPCs and interfere with services
   - The player learns to question the world, not just fight through it

---

## Narrative Direction

### Baseline Premise

NULL-X was built to help run Numeria's infrastructure: transport, educational tools, Pokemon Center systems, storage PCs, and route security.

Team Rocket infiltrates the system and turns one of its weaknesses into a weapon: the AI can analyze language, mimic people, and process huge amounts of data, but it becomes unstable when forced to resolve conflicting arithmetic, time logic, and practical reasoning. The result is a regional "verification crisis":

- gates lock and unlock incorrectly
- prices and services become unreliable
- NPCs may be genuine, glitched, or disguised
- route checkpoints require thought-based validation
- English text becomes a deliberate part of system access and trust

The player is one of the few trainers who can consistently "stabilize" the world by answering correctly and spotting contradictions.

### How This Fits Existing Lore

To stay compatible with the current game spec:

- **Prof. Algorithma** remains the creator of NULL-X and the region's main resident professor
- **Professor Oak** appears as an external authority from Kanto who recognizes the scale of the crisis
- **Professor Elm** appears later as the Johto-side systems expert
- **Remainder** can remain the local rival, while **Gary** can serve as an advanced rival / recurring benchmark trainer

This keeps the existing Numeria identity while still using beloved anime-era characters.

---

## Proposed Story Arc

### Act 0 - Quiet Start

- The player begins in the starting town with a normal Pokemon opening loop
- Early route trainers introduce basic combat and safe question prompts
- Small signs of corruption appear:
  - wrong time on clocks
  - contradictory signs
  - incorrect shop totals
  - strange NPC dialogue

### Act 1 - The First Gate

- On the first major route gate, the player is stopped by **Gym Leader 1**
- A new "virus" warning prevents young trainers from leaving freely
- **Professor Oak** arrives, confirms that Team Rocket is interfering with Numeria's AI infrastructure, and explains that identity checks now require reasoning challenges
- The gym leader opens the path only if the player passes a fixed question gate
- On failure, the player pays a small in-world penalty and retries the whole gate

This is the moment where the story explicitly teaches:

- gates can require questions
- failure can have a cost
- the world treats learning as security

### Act 2 - Trust Nobody

- Team Rocket begins appearing in disguise
- City entry, city exit, and certain key services can trigger short verification sequences
- **Jessie, James, and Meowth** become recurring pseudo-comic villains who are still dangerous because they exploit confusion, not just battle strength
- **Brock** and **Misty** can each anchor a town/route chapter:
  - Brock -> structure, consistency, grounded logic
  - Misty -> timing, flow, movement, confidence

### Act 3 - Language Layer

- As the player clears English-related milestones, the world intentionally exposes more English
- This is justified as NULL-X switching the player into deeper "system literacy" layers
- **Tracey** can support observational and vocabulary tasks
- **Gary** can challenge the player with higher-skill verification sequences and trainer battles

### Act 4 - Rocket Escalation

- Team Rocket actively jams services:
  - Pokemon Center advanced heal options
  - shop discounts and inventory access
  - PC storage verification
  - route checkpoint reliability
- The player learns that some systems can be stabilized temporarily, creating time-limited safe paths
- **Professor Elm** enters the story to explain how NULL-X's verification core works

### Act 5 - The Core and the Choice

- The region enters lockdown mode
- Major cities have visible "infection" levels
- The player gathers enough proof, badges, and stabilized route access to reach the core
- Final story sequences combine:
  - battles
  - verification challenges
  - cutscenes
  - a final decision to repair or destroy the system

The preferred ending is repair: NULL-X is corrected and returned to a limited, supervised role.

---

## Key Characters

### Existing Numeria Characters

- **Prof. Algorithma** - owner of the deeper NULL-X backstory, local mentor
- **NULL-X** - central antagonist; cold, logical, unstable
- **Remainder** - region-native rival with a strong arc and replay value

### Season 1-2 Characters to Integrate

- **Professor Oak** - legitimizes the crisis and introduces the broader Pokemon world
- **Gary Oak** - advanced rival benchmark; pushes the player intellectually and competitively
- **Brock** - mentor for grounded reasoning, systems, and reliability
- **Misty** - mentor for timing, route flow, and confidence-focused events
- **Tracey** - observation, comparison, and descriptive challenges
- **Professor Elm** - late-game systems expert for the NULL-X core
- **Jessie / James / Meowth** - recurring antagonists, disguises, fake-service events, ambushes

Optional later integrations:

- **Nurse Joy / Officer Jenny variants** for "trust but verify" side events
- **Morty** for illusion-heavy logic sequences
- **Whitney** for pressure-based timed challenge gates
- **Jasmine / Clair** for more serious late-game mentors

---

## Gameplay Systems Story Mode Needs

### 1. Verification Gates

Used for:

- city entry / exit
- gym leader qualification
- key NPC trust checks
- Pokemon Center premium actions
- shop bonuses or restricted inventory
- PC access or special storage actions

Design rules:

- city gates use short sequences
- gym leaders use longer sequences
- service actions should usually reward success rather than over-punish failure
- failed route gates can impose a money penalty because they are "security retries"

### 2. Timed Safe Paths

When a gate is passed, the route can remain open for a limited time in the direction just traveled, reducing annoyance and reinforcing the fiction that the checkpoint was temporarily stabilized.

### 3. World Infection

Each city or route can have a story-visible corruption state:

- low -> mostly normal
- medium -> minor service disruptions
- high -> fake NPCs, broken signs, unstable checkpoints
- cleared -> restored state after story progress

### 4. Suspicion Encounters

The player may:

- trust the NPC
- ask for verification
- challenge suspicious dialogue
- expose a Team Rocket disguise

This creates a second layer beyond battle.

### 5. English Exposure Progression

The existing playtime-based exposure system should also support story-flavored unlocks:

- first exposed terms through guided prompts
- repeated correct answers unlock "known words"
- some scenes intentionally keep terms in English once learned

### 6. Hybrid Boss Fights

Important Rocket admins, gym leaders, and the final NULL-X confrontation should be able to combine:

- battle phases
- question gates
- cutscene beats
- flag-driven world changes

---

## Recommended Data Model

The current codebase already has strong foundations:

- `PlayerData.flags`
- map JSON with `npcs`, `transitions`, `objects`
- `spawnAfter` / `despawnAfter`
- `DialogueReward.storyEvent`
- `TrainerReward.storyEvent`

The best next step is **not** a giant monolithic story engine. Instead, add a small set of data-driven structures that build on the existing flag model.

---

## Core Principles

1. Keep story progression **flag-based**
2. Keep player-facing strings **bilingual**
3. Keep map JSON mostly simple, but allow optional story hooks
4. Use central registries for reusable gates, events, cutscenes, and quests

---

### 1. Story Flags

Keep using `PlayerData.flags: Record<string, boolean>` as the primary progression source.

Recommended flag naming groups:

- `story-*` -> major narrative progression
- `gate-*` -> route or city gate completion
- `quest-*` -> side or main objective state
- `rocket-*` -> Team Rocket reveals / disguises / defeats
- `service-*` -> service system repairs
- `lang-*` -> English learning milestones
- `city-*` -> city infection / cleanup states

Examples:

- `story-oak-warning-heard`
- `gate-sumville-north-pass`
- `rocket-route2-nurse-exposed`
- `city-minusburg-stabilized`
- `lang-items-phase-unlocked`

---

### 2. PlayerData Extensions

Current `PlayerData` is enough for basic flags, but story mode will likely want richer state:

```ts
export interface PlayerStoryState {
  activeQuestId?: string | null;
  completedQuestIds: string[];
  gateUnlocks: Record<string, number>;      // gateId -> expiry timestamp / playtime seconds
  cityInfection: Record<string, InfectionLevel>;
  knownEnglishTerms: Record<string, boolean>;
  serviceCooldowns: Record<string, number>; // optional anti-spam / retry timers
  suspicionScore?: number;                  // optional for disguise systems
}

export type InfectionLevel = 'low' | 'medium' | 'high' | 'cleared';
```

Recommended `PlayerData` addition:

```ts
story?: PlayerStoryState;
```

Why this helps:

- avoids overloading `flags` with time-based state
- keeps timed gates and city cleanup easy to inspect
- supports English exposure without coupling everything to raw playtime checks

---

### 3. Story Event Definitions

Use a central registry such as `src/data/story/events.ts`.

```ts
export interface StoryEventDef {
  id: string;
  title: BilingualText;
  when: StoryTrigger;
  conditions?: StoryCondition[];
  actions: StoryAction[];
  repeatable?: boolean;
}
```

### Triggers

```ts
export type StoryTrigger =
  | { type: 'map-enter'; mapId: string }
  | { type: 'map-exit'; mapId: string }
  | { type: 'npc-interact'; npcId: string }
  | { type: 'trainer-defeated'; trainerId: string }
  | { type: 'badge-earned'; badge: number }
  | { type: 'service-use'; serviceId: string }
  | { type: 'gate-cleared'; gateId: string }
  | { type: 'manual'; key: string };
```

### Conditions

```ts
export type StoryCondition =
  | { type: 'flag'; flag: string; value?: boolean }
  | { type: 'badge-count'; min: number }
  | { type: 'map'; mapId: string }
  | { type: 'quest-active'; questId: string }
  | { type: 'quest-complete'; questId: string }
  | { type: 'english-phase'; phase: string }
  | { type: 'infection-level'; cityId: string; value: InfectionLevel };
```

### Actions

```ts
export type StoryAction =
  | { type: 'set-flag'; flag: string; value?: boolean }
  | { type: 'give-reward'; reward: DialogueReward | TrainerReward }
  | { type: 'start-cutscene'; cutsceneId: string }
  | { type: 'start-gate'; gateId: string }
  | { type: 'set-active-quest'; questId: string | null }
  | { type: 'complete-quest'; questId: string }
  | { type: 'set-infection'; cityId: string; value: InfectionLevel }
  | { type: 'unlock-gate-timer'; gateId: string; durationSec: number }
  | { type: 'teleport'; mapId: string; x: number; y: number }
  | { type: 'spawn-npc-flag'; flag: string }
  | { type: 'despawn-npc-flag'; flag: string };
```

Why this helps:

- centralizes story flow without hardcoding scene logic everywhere
- works with existing flags and rewards
- supports both linear story beats and optional side events

---

### 4. Question Gate Definitions

This is the most important new structure because your story depends on it heavily.

Use a central registry such as `src/data/story/gates.ts`.

```ts
export type GateTriggerType =
  | 'city-enter'
  | 'city-exit'
  | 'gym-entry'
  | 'gym-leader'
  | 'key-npc'
  | 'heal'
  | 'shop'
  | 'pc'
  | 'route-checkpoint';

export interface QuestionGateDef {
  id: string;
  title: BilingualText;
  triggerType: GateTriggerType;
  questionSetIds: string[];
  minQuestions: number;
  passCorrectAnswers: number;
  timeLimitSec?: number;
  failurePenalty?: GatePenalty;
  successActions?: StoryAction[];
  failureActions?: StoryAction[];
  reopenDurationSec?: number;
  conditions?: StoryCondition[];
}

export type GatePenalty =
  | { type: 'money'; amount: number }
  | { type: 'retry-lock'; durationSec: number }
  | { type: 'none' };
```

Why this helps:

- route gates, gym gates, and service checks all use one model
- your "X questions on city entry" / "Y questions on gym leader encounter" idea becomes data-driven
- timers and penalties are explicit, testable, and easy to tune

---

### 5. Question Set Metadata

The puzzle system itself may live elsewhere, but story mode needs a thin reference layer:

```ts
export interface QuestionSetRef {
  id: string;
  category: 'math' | 'logic' | 'english' | 'clock' | 'game-logic';
  difficultyMin: number;
  difficultyMax: number;
  tags?: string[];
}
```

Examples:

- `route1-basic-addition`
- `sumville-entry-logic`
- `gym1-leader-mixed`
- `rocket-disguise-observation`
- `clock-station-basic`

---

### 6. Quest Definitions

Even if the game stays mostly linear, a formal quest layer will keep story UX clean.

```ts
export interface QuestDef {
  id: string;
  title: BilingualText;
  description: BilingualText;
  category: 'main' | 'side' | 'character' | 'tutorial';
  steps: QuestStep[];
  rewards?: DialogueReward;
}

export interface QuestStep {
  id: string;
  text: BilingualText;
  conditions: StoryCondition[];
}
```

Recommended use:

- main line through towns and gyms
- character quests for Oak / Brock / Misty / Gary / Elm
- optional anti-Rocket side quests

---

### 7. Cutscene Definitions

The roadmap already anticipates a cutscene engine. Keep cutscenes data-driven:

```ts
export interface CutsceneDef {
  id: string;
  steps: CutsceneStep[];
  skippable?: boolean;
}

export type CutsceneStep =
  | { type: 'camera-pan'; x: number; y: number; durationMs: number }
  | { type: 'move-npc'; npcId: string; path: Array<'up' | 'down' | 'left' | 'right'> }
  | { type: 'face-npc'; npcId: string; dir: 'up' | 'down' | 'left' | 'right' }
  | { type: 'dialogue'; speaker?: string; lines: BilingualText[] }
  | { type: 'wait'; durationMs: number }
  | { type: 'sfx'; id: string }
  | { type: 'set-flag'; flag: string; value?: boolean }
  | { type: 'start-battle'; trainerId: string }
  | { type: 'start-gate'; gateId: string };
```

Why this helps:

- story intros and major reveals stop being special-case scene code
- gym leader gate scenes and Team Rocket reveals become reusable content

---

### 8. Map-Level Story Hooks

Minimal additive extension to `TileMapData`:

```ts
export interface MapStoryHooks {
  onEnterEventIds?: string[];
  onExitEventIds?: string[];
  gateIds?: string[];
  cityId?: string;
  servicePoints?: ServicePointRef[];
}

export interface ServicePointRef {
  id: string;
  type: 'heal' | 'shop' | 'pc' | 'sign' | 'checkpoint';
  x: number;
  y: number;
  gateId?: string;
}
```

Recommended `TileMapData` addition:

```ts
story?: MapStoryHooks;
```

Why this helps:

- story logic stays discoverable from the map
- route entry/exit validation is easy to wire
- service actions can be gated without hardcoding coordinates in scenes

---

### 9. NPC / Trainer Story Extensions

Current NPC structures are already close. Add only what story mode truly needs:

```ts
export interface StoryNPCMeta {
  role?: 'mentor' | 'rival' | 'villain' | 'civilian' | 'service';
  disguiseGroup?: string;      // Team Rocket identity chains
  gateId?: string;             // gate to trigger when interacting
  questIds?: string[];
  trustChecks?: string[];      // references to gate/question sets
}
```

Recommended additions:

```ts
story?: StoryNPCMeta;
```

Potential uses:

- Gym Leader 1 blocks the route and triggers a gate
- fake Nurse Joy references a disguise group
- Gary encounter can activate both battle and story actions

---

### 10. English Exposure State

The roadmap already defines phased exposure. Story mode should be able to reference it explicitly:

```ts
export interface EnglishExposureState {
  phaseByCategory: Record<'types' | 'items' | 'abilities' | 'moves' | 'natures' | 'pokemon', number>;
  learnedTerms: Record<string, boolean>;
}
```

This can either live inside `PlayerStoryState` or remain in a separate progression service. The important part is that story gates and dialogues can query it.

---

### 11. City Infection Registry

Use a simple definition file for world-state tuning:

```ts
export interface CityStoryProfile {
  cityId: string;
  displayName: BilingualText;
  defaultInfection: InfectionLevel;
  stabilizedFlag?: string;
  serviceGateIds?: string[];
  rocketEventIds?: string[];
}
```

Why this helps:

- cities can visually and mechanically evolve over time
- map variants, NPC swaps, and service behavior can all key off one city profile

---

## Suggested File Layout

```txt
src/data/story/
  events.ts
  gates.ts
  quests.ts
  cutscenes.ts
  city-profiles.ts
  question-set-refs.ts
```

If map-level hooks are added, existing map JSON can opt in gradually instead of forcing a whole-world migration.

---

## Implementation Order

1. Add **question gate definitions** and a small runtime executor
2. Add **story event registry** with basic trigger/action handling
3. Add **cutscene definitions** for intro + first gate
4. Add **quest definitions** for clearer main progression UX
5. Add **player story state** for timers, infection, and language knowledge
6. Add **map story hooks** where needed
7. Add **disguise / suspicion** mechanics as a polish layer

---

## Practical Recommendation

If we want the fastest path to value, the first implementation slice should be:

- intro cutscene with Oak + Algorithma
- first blocked route with Gym Leader 1
- one `QuestionGateDef`
- one `StoryEventDef`
- one `CutsceneDef`
- one `PlayerData.story.gateUnlocks` timer

That will prove the whole story-mode architecture before scaling it across cities, gyms, and services.
