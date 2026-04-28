# /story-upsert — Create or Update a Story Act

You are implementing a **story quest** for Pokemon Math Adventure (Numeria). A story quest is 1 big part from 1 story act . while story act is one beat of the game's narrative — it may span one map or several maps, involve NPCs, cutscenes, trainer battles, and flag chains.

## Input

The user invoked `/story-upsert $ARGUMENTS`.

Parse the arguments as:

- **Arg 1** — act name / short id (e.g. `rocket-raid-sumville`, `rival-first-battle`)
- **Arg 2+** — free-text description of the act. May include the list of maps to use, or may ask you to suggest maps. May be empty.

---

## Game Context

The player is a new Pokemon trainer on a journey to meet other trainers, catch Pokemon, earn badges, and win the league. **Team Rocket controls a rogue AI called NULL-X** that causes chaos across Numeria. NULL-X's one weakness: it cannot solve math and logic problems — which is why **question gates** block its influence throughout the world.

Full lore in `docs/game-spec.md` (read only if the act requires lore you do not already know).

---

## System Capabilities (use this reference — do NOT re-read source files to learn what exists)

### Story engine — `src/data/story/events.ts`

**Triggers:**

- `map-enter` — entering a map (has `mapId`)
- `map-exit` — leaving a map
- `npc-interact` — talking to an NPC (has `npcId`)
- `flag-set` — any story flag being set (has `flag`) — **use this for post-trainer-defeat logic** (see below)
- `badge-earned` — acquiring a gym badge
- `gate-cleared` — passing a question gate
- `quest-complete` — completing a quest
- `item-used` — using an item
- `trainer-defeated` — ⚠️ historically flaky, **do not use directly**
- `manual` — manually fired

**Actions:**

- `set-flag` — set / unset a story flag
- `set-infection` — adjust city infection level
- `start-cutscene` — launch a cutscene by id
- `start-gate` — push a question gate onto the scene stack
- `set-quest` / `complete-quest`
- `give-item` / `give-money`
- `unlock-gate-timer`
- `teleport` — `{ mapId, x, y }`
- `show-message`
- `play-music`

**Conditions:**

- `flag` / `flag-not`
- `badge-count` / `badge-count-max`
- `quest-active` / `quest-complete`
- `infection-level`
- `money-min`
- `gate-locked`

### Cutscene runner — `src/systems/cutscene-runner.ts`

**Step types:**

- Dialogue / UI: `dialogue`, `phone-ring`, `overlay`, `wait-input`
- Camera: `camera-snap`, `camera-pan`
- Screen: `screen-fade`
- NPC control: `face-npc`, `show-npc`, `hide-npc`, `move-npc`
- Player control: `hide-player`, `show-player`, `move-player` — ⚠️ may be **unimplemented**. If needed and the fix is small (a few lines), implement it. Otherwise design around it.
- Audio: `play-music`, `stop-music`, `play-sfx`
- Flow: `wait`, `if-flag`, `action` (executes any story action inline)
- Transitions: `start-battle` (may be unimplemented), `start-gate` (may be unimplemented), `start-scene`

### NPC system — `src/systems/npc.ts`

**NPC types:** `npc`, `trainer`, `shopkeeper`, `healer`, `gate-guard`

**Spawn / despawn — reuse these, do not invent new ones:**

- `spawnAfter: "<flag>"` — NPC appears once flag is set
- `despawnAfter: "<flag>"` — NPC disappears once flag is set
- `despawnWhenParty: { count, level }` — disappears when party has N Pokemon at level ≥ X
- `despawnOnDefeat: true` — trainer auto-despawns after losing

**Movement — reuse these, do not invent a new movement system:**

- `autoWalk` — patrol pattern with directional steps, optional delay
- `afterSpawnPattern` — one-time walk when NPC first appears (flag-persisted)
- `beforeDespawnPattern` — one-time walk before despawn condition kicks in (flag-persisted)

**Rewards:**

- `DialogueReward` on dialogue NPC: `items`, `money`, `badge`, `storyEvent: "<flag>"`
- `TrainerReward` on trainer NPC: same fields + `postBattleDialogue`

### Post-trainer-defeat flag

The engine auto-sets a flag when a trainer is defeated. **Use `flag-set` trigger on that auto-flag instead of `trainer-defeated`**. Before writing the event, open `src/systems/story-engine.ts` once to confirm the exact flag pattern (likely `trainer-<trainerId>-defeated`).

### Map enter

Overworld fires `fireStoryTrigger({ type: 'map-enter', mapId })` on every map load. Register a story event with `trigger: { type: 'map-enter', mapId: '<map>' }` + conditions to react to it.

### Bilingual text

All player-visible strings must be `{ en: string, he: string }`. Hebrew can be a copy of English for now — the structure must always be bilingual.

---

## Step 1 — Ask clarifying questions (if needed)

Before implementing, ask about anything unclear:

- Which maps the act touches (if not specified)
- Player's assumed starting state (badges, items, flags)
- Act's success / completion conditions
- Whether specific NPCs already exist or need to be created

**Do not implement until ambiguity is resolved.**

---

## Step 2 — Design the act

Break into a clear flow:

1. **Entry point** — map-enter, NPC interact, flag-set, etc.
2. **Progression** — ordered sequence of beats the player completes
3. **Exit point** — what flag marks the act complete, and what does it unlock?

For each beat: cutscene needed? New NPC or reuse? Spawn/despawn? Auto-walk before/after? Trainer battle? Gate? Item?

---

## Step 3 — Implement

Write the code. **Open files only when writing a register call** — use the capability reference above instead of re-reading source to learn what exists.

Files you typically edit:

- `src/data/story/content/act{N}/<act-name>.ts` — quests, gates, cutscenes, story events
- `src/data/story/flags.ts` — add any new flags
- `src/data/maps/<MAP_ID>.json` — **see NPC placement rules below**

**Every `despawnAfter` / `spawnAfter` / condition flag must be set somewhere in the chain.**

### NPC placement rules

For every new NPC the act requires:

1. **Check if the target map JSON exists** (`src/data/maps/<MAP_ID>.json`).
   - If the map **exists**: add the NPC to its `"npcs"` array with placeholder coordinates `x: <story-order-index>, y: 0` (first NPC gets x:0, second x:1, etc., all at y:0). Set all fields — `id`, `name`, `type`, `spriteType`, `dialogue`, `party` (trainers), `reward`, `spawnAfter`, `despawnAfter`, `lineOfSight`, `postBattleDialogue` — fully filled in. Use `spriteType: "npc-m"` / `"npc-f"` / `"trainer-m"` / `"trainer-f"` as defaults ("legacy sprites").
   - If the map **does not exist**: do NOT create a map JSON. Instead, add a ⚠️ block to the output (see Step 4) explaining what map is missing and what the user needs to do.

2. The user's only job for NPC placement is to **move the placeholder coordinates to the real map position**. Everything else — id, flags, dialogue, party, rewards — is already set.

3. NPCs that appear on **multiple maps** get separate entries in each relevant map file.

---

## Step 4 — Output summary (mandatory, in this exact order)

### 1. Act overview

One or two sentences.

### 2. Cross-map flow

Plain language. Example:

> "Talk to Gary on `minusburg` → enter `gym-minusburg` → beat 10 Rocket grunts → finale cutscene"

### 3. NPCs added to maps

For each map that received new NPCs, confirm:

- **Map file**: `src/data/maps/<MAP_ID>.json`
- List each NPC: `id`, placeholder coords, role, spawn/despawn flags

If a required map does not exist yet:

> ⚠️ **Map `<MAP_ID>` does not exist**
> The story event `<event-id>` targets this map. To unblock:
>
> 1. Create `src/data/maps/<MAP_ID>.json`
> 2. Register it in `src/systems/map-manager.ts`
> 3. Add a transition tile from `<SOURCE_MAP>` at approximately (x, y)
>    NPCs intended for this map are listed below — add them once the map exists.

### 4. Map-enter events

For each `map-enter` trigger:

- **Map ID**, **Conditions**, **Actions**

### 5. Resource list

- Story event IDs, Cutscene IDs, Flag names, Quest IDs, Gate IDs

### 6. User TODO list

- [ ] Move NPC `<id>` from placeholder (x, y) to real position on `<map>`
- [ ] _(any missing maps or other manual work)_

---

## Rules

- **Ask first** if ambiguous
- **Do not re-read engine source to learn capabilities** — use the reference above. Only open files when writing a register call.
- **Bilingual `{ en, he }`** for every player-visible string
- **Reuse existing auto-walk** — do not invent new movement
- **Never use `trainer-defeated` trigger directly** — use the auto-set flag via `flag-set`
- **Every referenced flag must be set somewhere** in the chain
- **Always write NPCs into the map JSON at placeholder coords** — the user only moves them, never re-types them
- **If a map is missing, say so clearly** with exact steps to create it — never silently skip
- **Summary in the exact order shown**
