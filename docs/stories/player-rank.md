# Feature: Trainer Rank Perks

Branch: `feature/player-rank`

The Trainer Card shows a rank (Rookie → Legendary) with an "Active Rank Perk". This feature makes every perk real,
tells the player when a new rank is reached (a phone call from Prof. Algorithma), and fixes the rank's data issues.

## Decisions (change any of them before merge)
- **Ranks are permanent.** When a rank is reached a flag `rank-<id>` is set. Perks stay even if XP later drops
  (releasing Pokémon, removing held items). The card shows the higher of the live rank and the earned rank.
- **Rank flags are the single gate.** Every feature checks `hasRank(pd, id)` (one flag read, no XP math).
  Map NPCs use the existing `spawnAfter` / `despawnAfter` fields with the rank flag, so there is no new NPC code path
  and the editor / admin Story tab already understand them.
- **Perks are data, not text.** Each rank lists what it unlocks (shop items, catch bonus, obey level, features). The
  perk text on the Trainer Card and in the phone call is generated from that data.
- **League win = beating a trainer whose reward has `hallOfFame: true`** (set on the last Elite Four trainer, `league/e4-4`).
- **Shops hide items that need a higher rank** (no locked rows).
- **The Ability Tutor locations in the call are found by scanning every linked map** (one async load of all map
  JSON, once per save at Expert). Bundling an NPC index instead would add ~300 KB to every page load.
- **Ability Tutor locations:** Percentile and League Summit Pokémon Centers (both use the shared `shared/pokecenter-2`
  interior, so the NPC is limited to those cities by a new `enteredFrom` field) + the League Pokémon Center
  (`shared/pokecenter-mart-interior`). Algebria has no Pokémon Center.

---

## Story 1: Hall of Fame + League wins
**Goal:** League wins come from real data, not `LEAGUE_WON = 0`.
- `PlayerData.hallOfFame: HallOfFameEntry[]` — `{ date, playtime, party: { id, level, abilityId, heldItemId }[] }`.
  Capped at 99 entries (oldest dropped). Save migration v21 adds `[]`.
- `TrainerReward.hallOfFame?: boolean` — on a win against that trainer, push a snapshot of the party.
- `leagueWon = pd.hallOfFame.length` feeds the rank calculation.
- Trainer Card shows the League wins count.

**Acceptance:** beating `league-e4-lance` adds one entry; Master/Legendary can now be reached; old saves load with `[]`.

## Story 2: Rank engine (data + tracker)
**Goal:** one module owns rank math, flags and perks.
- Move `rank.config.ts` out of the React folder to `src/data/trainer-ranks.ts` (data) + `src/systems/trainer-rank.ts` (logic).
- XP sources become a data table (`RANK_XP_SOURCES`: id, points, label). The calculation and the "how to rank up"
  explanation both read it.
- `updateTrainerRank(pd)` sets `rank-*` flags and returns newly reached ranks. Overworld calls it every few seconds while
  idle (playtime counts as XP, so rank can change while walking). Cheap: party + boxes scan only.
- `hasRank`, `getEarnedRank`, `getPerkValue` (best value among earned ranks).
- Remove the duplicated `RANK_THEMES` in `TrainerData.tsx`, the double rank calculation in the ability-swap NPC,
  the stale comment, and the duplicate 🥈 badge (Rookie gets its own).

## Story 3: Rank-up phone call
**Goal:** the player learns what changed.
- On a new rank, Prof. Algorithma calls (existing `phoneCaller` cutscene). One call covers every rank reached since the
  last one.
- Lines are built from data: congratulations + rank name → each perk's explanation → next rank's requirements.
- The first call also explains how to earn rank XP (from `RANK_XP_SOURCES`).
- The call waits until the overworld is idle (no dialogue, cutscene, transition).

## Story 4: Amateur — shop unlocks + catch skill
- Shops sell status cures (Antidote … Full Heal) and Ultra Balls only from Amateur.
- Call lists each unlocked item with its description from `items.json`.
- **Catch skill (every rank):** each rank has a `catchBonus` (×1.00 … ×1.25 on the capture chance) and a `throwSpin`
  (extra ball spins + faster throw). Call says "your throws are now X% stronger".

## Story 5: Pro — X-items + obedience
- Shops sell battle items (X Attack, X Defense, … Guard Spec, Dire Hit) from Pro.
- **Obedience system** (new):
  - Each rank has `obeyLevel`: Pokémon at or below it always obey (Rookie/Amateur 30, Pro 40, Expert+ all).
  - Above that, compare the Pokémon to the strongest *other* Pokémon the player owns (party + boxes).
    `gap = (level − otherBest) / otherBest`; chance to disobey = `min(1, gap / 0.5)` (50% gap → always, 25% → half).
  - Disobeying = it uses a random other move with PP. Text rotates: "doesn't trust you yet", "is too confident",
    "ignores your order" + one hint per battle: train another Pokémon to Lv.X or reach rank Y (both derived).
  - Ends forever once the player has owned 2 Pokémon at Lv.40+ (flag `obedience-earned`, so releasing later doesn't
    bring it back), or at Expert.
  - Forced moves (charge / lock-in / Struggle) are never replaced.

## Story 6: Expert — Ability Tutor
- Ability-swap NPCs spawn only at Expert (`spawnAfter: rank-expert`) in the 3 Pokémon Centers above.
- New NPC field `enteredFrom?: string[]` — NPC on a shared interior shows only when entered from those maps.
- The existing Percentile lab NPC keeps its "not allowed yet" message, now built from the rank data.
- Call explains abilities using the player's first 1–3 party Pokémon (name, ability, description) and lists where the
  tutors are (found by scanning the maps for `abilities-swap` NPCs).

## Story 7: Elite / Master / Legendary — legendary gates
- Generic gate: an NPC with `blocker: true` and `despawnAfter: rank-<id>` blocks a path until that rank.
  Its dialogue gets generated lines: required rank + player's rank + Trainer Card hint.
- Elite → 3 birds + 3 dogs, Master → Mewtwo / Lugia / Ho-Oh, Legendary → Mew.
- Maps for these encounters don't exist yet → no blockers placed; call hint text is "TBD" (tracked in project-context).

## Story 8: Lab rank advisor
**Goal:** the player can ask in person how to rank up.
- New NPC type `rank-advisor` ("Rank Researcher"). Its own dialogue is an intro; the rest is generated:
  current rank + XP → what is still missing for the next rank (only unmet XP / counters) → the 3 best XP sources →
  what the next rank unlocks → Trainer Card hint. At the top rank it says so.
- Placed in `templates/lab-template` (so every lab built from it gets one: Sumville, Percentile) and in
  Prof. Algorithma's lab (Zeroville), which has its own layout.

---

## QA checklist
- [ ] New save: rank Rookie, shop has no status cures / Ultra / X-items
- [ ] Reach Amateur → phone call after a few seconds, shop shows the unlocks
- [ ] Capture chance log shows the rank multiplier; ball spins more at higher ranks
- [ ] Lv.35 Pokémon with best other Lv.20 at Rookie disobeys; at Pro it obeys
- [ ] Two Pokémon Lv.40+ → obedience gone, still gone after releasing one
- [ ] Expert → tutor appears in Percentile + League Summit PCs, not in other cities' PCs
- [ ] Beat `league-e4-lance` → Hall of Fame entry, League wins on Trainer Card
- [ ] Rank Researcher in Zeroville, Sumville and Percentile labs lists only the missing requirements
- [ ] Hebrew + English text in every new line
