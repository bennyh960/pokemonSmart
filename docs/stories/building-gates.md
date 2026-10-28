# Feature: Library & Lab Gates (mini-games as NULL-X checks)

Branch: `feature/mini-games` — **built (Stories 1–4), not playtested.** Run Story 5 (QA).

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

(The Minusburg library's JSON `id` was `minusburg-library`, which made a wrong `MapId`; fixed to `library` → `MapId.MINUSBURG_LIBRARY`.)

## Decisions (change before building)
- **Pass = finish the round with ≥1★.** 0★ / quit = same as failing a question gate (you're walked back out).
- **Pass lasts 30 min per building** (same as the Pokémon Center). A building with an active story scene never blocks
  (see Story 4).
- **Prizes = the mini-game's own prizes only** (first clear, 3★, daily-capped replay). The gate adds no second reward,
  so the gate can't be farmed more than the game itself.
- **Level comes from the trainer rank, not a per-city list** — the same `levelForRank()` care rounds use (Story 2).
  A map can still override it (`miniGame: { level }`, like gym overrides).
- **Games by category:** libraries play any `english` game, labs any `logic` game (`MiniGameDef.category`) — a new game
  joins its buildings without touching the gate config.
- **Gate rounds still count** toward stars / level unlocks / records (they are normal rounds).
- **The start-menu "Mini Games" entry is admin only** (`ADMIN_NAME`) — players reach the games in buildings.
- **Free play:** an NPC with `miniGame` (ids or category) ends every talk with "Want to play?" — but only after its own
  gift (if any) was given, so existing NPCs keep their dialogue and rewards.

---

## Story 1: Mini-game gate type
**Goal:** a gate can be "play this mini-game" instead of "answer questions".
- `QuestionGateDef` gains `miniGame?: { gameIds?; category?; level? }` (one game picked at random each time).
  `questionSetIds` / `sessionConfig` are ignored when `miniGame` is set.
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
- `levelForRank(rankIndex, def)` (progress.ts, shared with care rounds): lowest rank → level 1 … highest → last level.
- Per-map override `{ miniGame: { level } }` wins.

## Story 3: Register the buildings + lore lines
- Register the 4 libraries (`'library'`, English game) and 3 labs (`'lab'`, `['poke-doku']`) in `global-gate-config.ts`.
- Gate intro text (bilingual, kid style), e.g. library: "NULL-X glitches can't read! Show the Unown you can."
  lab: "Only a real trainer can think it through. Solve the puzzle to come in!"
- A librarian / scientist NPC inside each building: after you're in, talk to play again (free play, normal prizes).

## Story 4: Story safety
**Goal:** the gate never breaks a story moment.
- Built: `_checkAutoGate()` skips the gate (for every service) when a `map-enter` story event queued a cutscene — it
  asks again on the next entry. NPC-talk story scenes inside the building are reached after passing the gate.
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
