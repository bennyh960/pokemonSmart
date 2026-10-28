# Feature: Library & Lab Gates (mini-games as NULL-X checks)

Branch: `feature/mini-games` (start after Section A — the Snorlax/overworld work — is merged on this branch)

Entering a **library** starts the English game; entering a **lab** starts a logic game (Poké-Doku for now).
Same idea as the Pokémon Center / Mart / gym entrance checks: *prove you are not a NULL-X glitch* — a glitch can't
read words and can't reason. Pass → free entry for a while. Prizes come from the mini-game itself.

## What exists (build on it, don't copy it)
- Auto-gates: `registerAutoGateMap(mapId, service, overrides)` in `src/systems/story-engine.ts`, registrations in
  `src/data/story/global-gate-config.ts`. Entering a registered map → `_checkAutoGate()` → `GATE` scene, unless
  `isGateUnlocked(gateId)` (timed pass in `pd.story.gateUnlocks`).
- Gym gates already get **one gate id per map** (`auto-gym-<mapId>`) with per-map overrides — libraries and labs use
  the same pattern, so each building has its own pass.
- Mini-games: `startMiniGame(gameId, { level, onFinish })` in `src/minigames/launch.ts`; `onFinish` gets
  `{ stars, cleared, ... }` or `null` (left without finishing).

## Maps
| Service | Maps |
|---------|------|
| library | `sumville/library`, `minusburg/library`, `multiplia/library`, `percentile/library` |
| lab | `sumville/lab`, `percentile/lab`, `zeroville/algorithma-lab` |

⚠ `MapId.MINUSBURG_MINUSBURG_LIBRARY` points at `minusburg/minusburg-library`, but the file is `minusburg/library.json` —
check before registering.

## Decisions (change before building)
- **Pass = finish the round with ≥1★.** 0★ / quit = same as failing a question gate (you're walked back out).
- **Pass lasts 30 min per building** (same as the Pokémon Center). A building with an active story scene never blocks
  (see Story 4).
- **Prizes = the mini-game's own prizes only** (first clear, 3★, daily-capped replay). The gate adds no second reward,
  so the gate can't be farmed more than the game itself.
- **Level comes from progress, not a per-city list:** `level = f(badge count)` per game (Story 2). A map can still override
  it (like gym overrides), e.g. a tutorial library in Sumville.
- **Gate rounds still count** toward stars / level unlocks / records (they are normal rounds).
- **The start-menu "Mini Games" entry becomes dev/admin only** (`ADMIN_NAME`) — players reach the games in buildings.

---

## Story 1: Mini-game gate type
**Goal:** a gate can be "play this mini-game" instead of "answer questions".
- `QuestionGateDef` gains `miniGame?: { gameIds: MiniGameId[]; level?: number }` (several ids → pick one; labs will get
  more logic games later). `questionSetIds` / `sessionConfig` are ignored when `miniGame` is set.
- `AutoGateService` gains `'library' | 'lab'`; `registerAutoGateMap()` gives them per-map ids
  (`auto-library-<mapId>`, `auto-lab-<mapId>`) like gyms — generalise the gym branch instead of adding two more copies.
- The `GATE` scene, when the def has `miniGame`: calls `startMiniGame()` with `onFinish` → on pass run the existing
  pass path (`unlockGateTimed`, `gate-cleared` trigger, success actions); on fail run the existing fail path.
- Mini-game shell "gate mode" (a launch option): intro card shows the fixed level and a short NULL-X line instead of the
  level picker; results show "Exit" only (no "Next level" / "Play again" — the pass is what matters).

**Acceptance:** entering a registered library plays the English game; ≥1★ lets you in and re-entering within 30 min
doesn't ask again; 0★ / quit walks you out; existing Pokémon Center / Mart / gym gates behave exactly as before.

## Story 2: Level by progress
**Goal:** harder rounds as the player advances, from data that already exists.
- Each mini-game def gets `gateLevel(pd) → number` (default: spread the game's levels across the 8 badges, from
  `pd.badges`; e.g. Poké-Doku 5 levels → L1 at 0–1 badges … L5 at 7–8).
- Per-map override `{ miniGame: { level } }` wins.
- Unit test: every badge count maps to an existing level for every game.

## Story 3: Register the buildings + lore lines
- Register the 4 libraries (`'library'`, English game) and 3 labs (`'lab'`, `['poke-doku']`) in `global-gate-config.ts`.
- Gate intro text (bilingual, kid style), e.g. library: "NULL-X glitches can't read! Show the Unown you can."
  lab: "Only a real trainer can think it through. Solve the puzzle to come in!"
- A librarian / scientist NPC inside each building: after you're in, talk to play again (free play, normal prizes).

## Story 4: Story safety
**Goal:** the gate never breaks a story moment.
- If the map has a story cutscene/event that will run on entry (queued cutscene, `map-enter` story trigger, NPC
  `spawnAfter` story scene), skip the gate this time. Reuse how gyms already avoid this; if they don't, fix it once in
  `_checkAutoGate()` for all services.
- Playtest the lab/library scenes that exist today: `act2/quest-multiplia.ts` (library) and
  `act4/quest-percentile-burning-chance.ts` (lab → Oak in the lab).
- Admin Story tab snapshots must restore inside a building without a gate popping up (`resumedInside` already covers
  saved position — confirm).

**Acceptance:** replay both quests from an admin snapshot; no gate interrupts them; after the scene, re-entering asks.

## Story 5: QA
- `npm run build`, `npm test`.
- Fresh save: Sumville library + lab ask; pass; re-enter (no ask); wait / clear `gateUnlocks` (admin) → asks again.
- Badge 0 vs badge 6 save: different levels.
- Update `docs/project-context.md` (remove the "Triggers not built" TODO for buildings).
