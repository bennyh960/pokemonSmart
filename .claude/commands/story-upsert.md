# /story-upsert — Create or Update a Story Act

You are implementing a **story quest** for Pokemon Math Adventure (Numeria).
A story act is one narrative arc — it may span one map or several maps, involve NPCs, cutscenes, trainer battles, and flag chains.

## Input

The user invoked `/story-upsert $ARGUMENTS`.

Parse as:

- **Arg 1** — act file name / short id (e.g. `fractalis`, `rocket-raid-sumville`)
- **Arg 2+** — free-text description of the story. Read it carefully. The user may describe it in natural language with locations, characters, and events. Extract everything you need from it.

---

## Game Context

The player is a Pokemon trainer journeying across Numeria, earning badges, and fighting NULL-X — a rogue AI stolen and controled by Team Rocket. NULL-X has ability to create glitch virus (fake man / fake pokemons) those cannot solve math, so **question gates** block its influence.

Full lore is still dynamic - if something missing - stop and ask the player (there is lore in spec but is not up-to-date)

---

## Step 1 — Read current state

Before anything else, read:

1. The target quest file if it exists: `src/data/story/content/act{N}/<name>.ts`
2. `src/data/story/flags.ts` — what flags already exist
3. All map JSONs the story touches (`src/data/maps/<MAP_ID>.json`) — check existing NPCs, transitions, spawn/despawn fields
4. Any adjacent quest files that reference the same maps or flags

---

## Step 2 — Plan the arc (PRESENT BEFORE IMPLEMENTING)

Break the story into **numbered phases**. Each phase = one trigger point (map-enter, npc-interact, etc.) that moves the story forward.

Present the plan as a phase table:

| #   | Trigger             | Condition flags            | Actions / Cutscene summary           | Sets flag         |
| --- | ------------------- | -------------------------- | ------------------------------------ | ----------------- |
| 1   | map-enter fractalis | flag-not VISITED_FRACTALIS | set quest, set infection             | VISITED_FRACTALIS |
| 2   | npc-interact wife   | flag-not WIFE_TALKED       | cutscene: wife explains + gives item | WIFE_TALKED       |
| …   | …                   | …                          | …                                    | …                 |

Then list **every new NPC** per map in a table:

| Map                | NPC ID            | spawnAfter | despawnAfter | type     | Notes                  |
| ------------------ | ----------------- | ---------- | ------------ | -------- | ---------------------- |
| fractalis/gymHouse | npc-engineer-wife | —          | —            | dialogue | triggers wife cutscene |
| …                  | …                 | …          | …            | …        | …                      |

Then list **new flags**:

| Flag                       | Set by                   | Read by             |
| -------------------------- | ------------------------ | ------------------- |
| ACT3_FRACTALIS_WIFE_TALKED | act3-wife-intro cutscene | engineer spawnAfter |
| …                          | …                        | …                   |

**Wait for user confirmation** before implementing if the arc is complex (multi-map, >3 phases). For simple acts (1–2 maps, no branching) you may proceed directly.

---

## Step 3 — Implement

### Files to edit

| File                                      | What you do                                                        |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `src/data/story/flags.ts`                 | Add new flags in the right act section + FLAG_DESCRIPTIONS entries |
| `src/data/story/content/act{N}/<name>.ts` | Quests, gates, cutscenes, story events                             |
| Map JSONs                                 | Add NPCs at placeholder coords (see rules below)                   |
| `routes/route-7.json` etc.                | Edit existing NPCs (add despawnAfter, etc.)                        |

### Flags.ts rules

- Add flags in a clearly labeled section (e.g. `// ── Act 3: Fractalis arc ──`)
- Add a matching entry in `FLAG_DESCRIPTIONS` for every new flag
- Use naming convention: `ACT{N}_{MAP}_{EVENT}` (e.g. `ACT3_FRACTALIS_WIFE_TALKED`)

### Quest lifecycle rule

**Always complete the previous quest before starting the next one** inside a cutscene:

```ts
{ type: 'action', action: { type: 'complete-quest', questId: 'main-act3-prev' } },
{ type: 'action', action: { type: 'set-quest',      questId: 'main-act3-next' } },
```

A quest that is started and never completed stays "active" forever.

### Cutscene rules

1. **Every `dialogue` step must have `speakerName`** — never omit it, even for player lines.
   Format: `'Character Name / שם הדמות'` unless the dialouge already have speakerID . in such a case we have speakerID no need speakerName (the logic doing lookup to name)

2. **`move-npc` followed by `hide-npc` or `set-flag` must use `waitForComplete: true`** — otherwise the NPC disappears before finishing the walk:

   ```ts
   { type: 'move-npc', npcId: 'npc-x', path: [...], waitForComplete: true },
   { type: 'hide-npc', npcId: 'npc-x' },   // fires AFTER walk completes
   ```

3. **Flag set order in cutscenes** — set the "phase gate" flag AFTER all hide-npc/move-npc steps, so `despawnAfter` NPCs vanish at the right moment.

4. **Use `phoneCaller: { en, he }`** on a cutscene to make it open as an incoming phone call.

5. **`face-npc`** before every NPC's first dialogue step, so they look at the player.

6. **`speakerId`** resolves portraits from NPCs in the CURRENT map only. If the NPC is in a different map (e.g. gym interior), omit `speakerId` or add `speakerName` as fallback.

### NPC placement rules

For every new NPC:

1. Place it in the correct map JSON at **placeholder coords**: `"x": <story-index>, "y": 0` (first NPC gets x:0, second x:1, etc.).
2. Fill every field fully: `id`, `name`, `type`, `spriteType`, `dialogue`, `spawnAfter`, `despawnAfter`, `facing`, and for trainers: `party`, `reward`.
3. Default sprites: `npc-m` / `npc-f` (male/female civilian), `officer-Jenny` (Jenny), `gate-officer` (route officer).
4. The user's only job is to **move the placeholder coords to the real position** — everything else is already set.

For NPCs on **multiple maps**, add a separate entry to each map JSON.

If the map JSON does not exist yet, add a ⚠️ block in the output (see Step 4).

### Story events rules

- **`map-enter`** — fires on every load of the map. Use `flag-not: VISITED_*` to make it one-shot.
- **`npc-interact`** — fires when player talks to NPC. Use `flag-not` condition to make it one-shot.
- **`trainer-defeated`** — valid to use directly for wild-pokemon NPC encounters (legendary battles etc.). For regular trainer NPCs, prefer the auto-set `trainer-<id>-defeated` flag via `flag-set` trigger.
- **Every referenced flag must be set somewhere** in the flag chain. Verify this before finishing.

### Flag chain verification (do before finishing)

For each `spawnAfter: "X"` and `despawnAfter: "X"`, confirm:

- [ ] Flag `X` is set somewhere (cutscene action, story event action, or NPC reward)
- [ ] The flag is defined in `flags.ts`
- [ ] The flag is NOT set BEFORE the NPC needs to be visible

---

## Step 4 — Output summary (mandatory, in this exact order)

### 1. Arc overview

One paragraph: what happens, which maps, what the player does.

### 2. Phase flow

Plain language, e.g.:

> Talk to wife in gymHouse → engineer spawns at beach → interact with engineer → enter Route 7 (jenny scene + route-8 unlocks) → find Zapdos in Route 8 → defeat Zapdos → core reveal → gym opens

### 3. NPCs added / modified per map

For each map that was touched:

- **Map file:** `src/data/maps/<MAP_ID>.json`
- Table: `id` | placeholder coords | role | spawnAfter | despawnAfter

If a map does not exist:

> ⚠️ **Map `<MAP_ID>` does not exist**
> Story event `<event-id>` targets this map.
>
> 1. Create `src/data/maps/<MAP_ID>.json`
> 2. Register it in `src/systems/map-manager.ts`
> 3. Add a transition from `<SOURCE_MAP>` at approx (x, y)
>    NPCs intended for this map: [list]

### 4. Flag chain summary

| Flag | Set by | Read by (spawnAfter / despawnAfter / condition) |
| ---- | ------ | ----------------------------------------------- |

### 5. Resource IDs

List: quest IDs, gate IDs, cutscene IDs, story event IDs, new flag names.

### 6. User TODO

- [ ] Move NPC `<id>` from placeholder (x, y) to real position on `<map>`
- [ ] (any missing maps, sprite changes, or other manual work)

---

## System Capabilities Reference

Use this — do NOT re-read engine source to learn capabilities.

### Story triggers

- `map-enter` — `{ mapId }`
- `map-exit` — `{ mapId }`
- `npc-interact` — `{ npcId }`
- `flag-set` — `{ flag }` — use for chaining off trainer defeats
- `trainer-defeated` — `{ trainerId }` — OK for wild/legendary NPC battles
- `badge-earned` — `{ badge: 1–8 }`
- `gate-cleared` — `{ gateId }`

### Story actions

- `set-flag` / `set-flag (value: false)`
- `set-infection` — `{ mapId, value: 'none'|'low'|'medium'|'high'|'critical'|'cleared' }`
- `start-cutscene` — `{ cutsceneId }`
- `start-gate` — `{ gateId }`
- `set-quest` / `complete-quest`
- `give-item` — `{ itemId, quantity }`
- `give-money` — `{ amount }`
- `teleport` — `{ mapId, x, y }`
- `show-message` — `{ lines: BilingualText[] }`
- `play-music` — `{ musicId }`

### Story conditions

- `flag` / `flag-not`
- `badge-count` / `badge-count-max`
- `quest-active` / `quest-complete`
- `infection-level`
- `money-min`
- `gate-locked`

### Cutscene steps

- `dialogue` — `{ speakerName, speakerId?, lines, portrait? }`
- `face-npc` — `{ npcId, dir }`
- `show-npc` / `hide-npc` — `{ npcId }`
- `move-npc` — `{ npcId, path: dir[], waitForComplete? }`
- `move-player` — `{ path, waitForComplete? }` (may be unimplemented — design around if not needed)
- `hide-player` / `show-player`
- `camera-pan` — `{ x, y, durationMs }`
- `camera-snap` — `{ x, y }`
- `screen-fade` — `{ direction: 'in'|'out', durationMs, color? }`
- `overlay` — `{ color: string|null }`
- `wait` — `{ durationMs }`
- `wait-input`
- `play-music` / `stop-music` / `play-sfx`
- `if-flag` — `{ flag, thenSteps, elseSteps? }`
- `action` — `{ action: StoryAction }` (any story action inline)
- `start-battle` / `start-gate` / `start-scene`

### NPC spawn / despawn

- `spawnAfter: "<flag>"` — appears once flag is true
- `despawnAfter: "<flag>"` — disappears once flag is true
- `despawnWhenParty: { count, level }` — based on party strength
- `despawnOnDefeat: true` — auto-despawns trainer after loss

### NPC movement

- `autoWalk` — looping patrol: `{ pattern: [{dir, steps, delay}], loop, floating? }`
- `afterSpawnPattern` — one-time walk on first appearance
- `beforeDespawnPattern` — one-time walk before despawn flag kicks in

### MapId type

`MapId` is auto-generated from `src/data/maps/map-ids.ts`. Use `'some/map' as MapId` only when the string is not in the registry. Prefer the enum constants: `MapId.FRACTALIS_FRACTALIS` etc., but string literals with `as MapId` cast also work.

---

## Rules

- **Plan first, confirm, then implement** (for arcs >2 maps or >3 phases)
- **Always bilingual** `{ en, he }` for every player-visible string
- **Every `spawnAfter`/`despawnAfter` flag must be set somewhere in the chain**
- **Complete quests before starting the next one** (`complete-quest` → `set-quest`)
- **`waitForComplete: true` on any `move-npc` that precedes a `hide-npc` or `set-flag`**
- **`speakerName` on every `dialogue` step — never omit**
- **Write NPCs into map JSONs at placeholder coords** — user only moves them
- **If a map is missing, say so clearly** with exact steps — never silently skip
- **`face-npc` before the NPC's first dialogue line** in any cutscene
