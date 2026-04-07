# /story-map — Story Layer for a Map

You are the **story author** for Pokemon Math Adventure (Numeria). Your job is to read a map and its surrounding context, then wire up a coherent story layer: NPC dialogues, flags, spawn/despawn conditions, Team Rocket encounters, and story events — all written into the map JSON and the `src/data/story/` files.

## Input

The user invoked `/story-map $ARGUMENTS`.

Parse the arguments as:
- **Arg 1** — map ID (e.g. `sumville`, `route-2`, `minusburg`)
- **Arg 2+** — optional free-text description of the story beat to implement (may be empty)

---

## Step 1 — Read the world

Read these files **before doing anything else**:

1. `docs/game-spec.md` — world lore, city descriptions, main story arc, characters, gym leaders
2. `src/data/maps/<MAP_ID>.json` — the target map (tiles, NPCs, objects, transitions)
3. All maps referenced in the target map's `transitions` array — read each one to check bidirectionality
4. `src/data/story/events.ts` — registered story triggers/conditions/actions (type definitions)
5. `src/data/story/gates.ts` — registered question gates
6. `src/data/story/quests.ts` — registered quests
7. `src/data/story/characters.ts` — named characters (especially rocket: jessie, james, meowth; gym leaders; rivals)
8. `src/systems/npc.ts` — NPCData, GateGuardData, TrainerData, DialogueReward interfaces

---

## Step 2 — Audit transitions

Check every `transition` in the map JSON against the world connection map from `game-spec.md`:

```
Main path: Zeroville → Route 1 → Sumville → Route 2 → Minusburg → Route 3 → Multiplia
           → Route 4 → Dividia → Route 5 → Primore → Route 6 → Symmetrika
           → Route 7 → Integrala → Route 8 → Absoluta → NULL-X Tower

Shortcuts: Route 9 (Zeroville↔Dividia), Route 11 (Sumville↔Primore),
           Route 12 (Minusburg↔Symmetrika), Route 10 (Absoluta↔Multiplia)

Side areas: Deep Forest (from Zeroville), Safari Zone (from Multiplia),
            Mountain Pass + Mountain Cave (from Dividia), Infinity Plateau (from Symmetrika)
```

- Every transition must be **bidirectional** — the target map must have a matching transition back
- Building interiors (e.g. `sumville-house-1`) must transition back to their parent city
- Fix any missing or mismatched transitions by editing both JSON files

---

## Step 3 — Design the story layer

Based on the map's city/route lore AND the optional user description, design:

### A. Main story beat
What is the player supposed to do here in the main story? Options:
- Collect a Serum component (badge = serum piece, from gym leader)
- Encounter NULL-X corruption / glitch effect
- Get information from an NPC that advances the quest
- Rival Remainder appears for a battle or story moment
- Team Rocket is operating here and must be stopped

### B. NPC roles
For each NPC in the map:
- Does their dialogue fit the city theme and the current story beat?
- Should any NPC give a `storyEvent` reward (sets a flag) — e.g. an info-giver, a gate-unlocker?
- Should any NPC spawn or despawn based on a flag or party level?
- Should any NPC be a `blocker` (line-of-sight, blocks path until condition met)?

### C. Team Rocket presence (include in every city/route unless it makes no sense)
Team Rocket in Numeria works for NULL-X, corrupting wild Pokémon with the Glitch.
- Add 1–3 Rocket Grunts as `trainer` NPCs with `despawnOnDefeat: true` and `despawnAfter: "<map>-rocket-cleared"`
- Add a flag `<map>-rocket-cleared` that gets set via the last grunt's `reward.storyEvent`
- Optional: add Jessie/James/Meowth as a trio encounter (special trainer or NPC dialogue)
- After clearing Rocket: another NPC (grateful citizen) spawns via `spawnAfter: "<map>-rocket-cleared"`, gives a small reward

### D. Blockers
Use `blocker: true` with appropriate conditions:
- **By party strength** (`despawnWhenParty`) — guard blocking a harder route until player is ready
- **By flag** (`despawnAfter`) — NPC blocks a path until a story event has happened
- Multi-condition: combine both (NPC stays until BOTH flag is set AND party is strong enough)

Example patterns:
- Path to next city blocked by a guard until gym badge is earned (`despawnAfter: "<city>-gym-cleared"`)
- Rocket roadblock cleared by defeating last grunt
- Rival blocks the exit until you talk to a key NPC first

### E. Flag naming conventions
Always use kebab-case, prefixed with the map or area:

| Pattern | Example |
|---|---|
| `<map>-rocket-cleared` | `sumville-rocket-cleared` |
| `<map>-gym-cleared` | `sumville-gym-cleared` |
| `<map>-npc-<role>-talked` | `sumville-mayor-talked` |
| `trainer-<trainerId>-defeated` | auto-set by engine |
| `visited-<mapId>` | auto-set by engine |
| `story-received-starter` | auto-set by starter select |

---

## Step 4 — Write the changes

### 4a. Edit the map JSON (`src/data/maps/<MAP_ID>.json`)

For each NPC that needs changes:
- Update `dialogue` (bilingual `{ en, he }[]`) to match story context
- Add `reward.storyEvent` where the NPC should set a flag
- Add `spawnAfter` / `despawnAfter` / `despawnWhenParty` as needed
- Add `blocker: true` + `lineOfSight` for path-blocking NPCs
- Add `despawnOnDefeat: true` on Rocket Grunts (trainers)

For new NPCs (Rocket Grunts, grateful citizen, etc.):
- Pick a vacant tile position (check existing NPCs/objects for conflicts)
- Use `spriteType` values that match existing NPCs in the map for consistency
- Assign unique IDs: `<map>-<role>-<index>` e.g. `sumville-rocket-grunt-1`

Fix any transition issues found in Step 2.

### 4b. Register story events (`src/data/story/events.ts`)

For each flag that needs to trigger a follow-on action, add a `registerStoryEvent` call. Only add events that have real consequences (quest advance, flag chain, etc.). Do not invent unnecessary events.

Example — after clearing Rocket, advance quest:
```ts
registerStoryEvent({
  id: '<map>-rocket-cleared',
  trigger: { type: 'flag-set', flag: '<map>-rocket-cleared' },
  actions: [{ type: 'set-quest', questId: 'main-...' }],
});
```

### 4c. Register quests (`src/data/story/quests.ts`) if needed

Only if this map introduces a new named quest step. Add a `registerQuest` call with bilingual title + objective.

### 4d. Register gates (`src/data/story/gates.ts`) if needed

Only if a gate-guard NPC is used (type `gate-guard` with `gateId`). Add the `QuestionGateDef` to `GATES`.

---

## Step 5 — Self-check

Before finishing, verify:
- [ ] All `despawnAfter` / `spawnAfter` flags are actually SET somewhere (NPC reward, trainer reward, story event, or auto)
- [ ] All `blocker: true` NPCs have at least one despawn condition (`despawnWhenParty` or `despawnAfter`)
- [ ] Transitions are bidirectional — both maps point to each other
- [ ] No two NPCs share the same tile position
- [ ] Rocket grunt IDs are unique within the map
- [ ] The last Rocket grunt's `reward.storyEvent` sets `<map>-rocket-cleared`
- [ ] The `spawnAfter` NPC that appears after Rocket is cleared references the same flag
- [ ] All new NPC dialogues are bilingual `{ en, he }[]`

---

## Output

After writing all changes, summarize:
1. **Transitions fixed** — list any you corrected
2. **Story beat** — one sentence: what happens here in the main story
3. **Flags introduced** — table of all new flags, what sets them, what reads them
4. **NPCs changed** — list with what changed (dialogue / spawnAfter / blocker / new)
5. **Story files updated** — which of events.ts / quests.ts / gates.ts were touched

Keep the summary concise — the map JSON is the real output.
