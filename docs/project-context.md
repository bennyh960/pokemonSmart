# Project Context — Open Work

Keep this file short. Delete an item as soon as it's done (git history is the archive).

## Where the story stands
Playable up to: badge 6 (Symmetrika) → Zapdos cave → Raikou arc → Route 9 (Reminder's Pidgeot) → Percentile "The Burning Chance" arc (built, **not playtested**).
Burning Chance (`act4/quest-percentile-burning-chance.ts`): city clues → lab (core lore) → Reminder → Route 12 Heat Collectors → Admin Kelvin → Entei (Core X4) + Moltres (Core X5) → Oak in the lab → Lance + Jenny → badge 7 + HM02 → sets `act4-minusburg-open`. Last quest: `main-act5-minusburg` — nothing built after it yet.

## Story direction (agreed, not built)
- After Percentile: 7 badges, 5 NULL-X cores (X1–X5), 5 legendaries met (Zapdos, Articuno, Raikou, Entei, Moltres). Cores = NULL-X's 8 modules, hidden inside legendaries (X4 = Chance, X5 = Energy).
- Give more screen time to rivals (Reminder, Gary), professors, gym leaders, Officer Jenny and the Elite Four.
- Route to the small forest / Percentile is long and branches into 2 paths, so no story goes there.
- **Minusburg arc (next):** Officer Jenny `jenny-mb` (minusburg.json, 44,0) now despawns on `act4-minusburg-open` (badge 7). Build the arc under Minusburg with Gary, Jenny, Lance (+ others): cores X6 + X7 and 1 legendary (Suicune suggested). X8 at the NULL-X Tower.

## TODO — main story
- [ ] Burning Chance arc: playtest end to end (Rocket Base `rocket-base/b1..b4` included; Route 12 exits are blocked by police until Suicune is freed). Check NPC spots in the editor (Route 12 guards/admin/Max/Entei/Moltres, Reminder 39,2 + gym helper 41,2, Lance 16,28, coin kid, ball thief, Oak) and that the new cutscene `fx` step (fire/smoke/burst) looks right
- [ ] Algebria (gym 8): `act4/quest-algebria.ts` is old "Absoluta" placeholder (map id `absoluta/absoluta` doesn't exist, `questionSetIds: ['placeholder']`) — rewrite for Algebria
- [ ] Forest: `caves/deep-forest` and `routes/small forest` partly built — no story yet
- [ ] Forest region `forest/*` (Algebria → League, branch to Zeroville) — layout done, no story/NPCs/trainers yet. Algebria east gate → `algebria-woods` → `frost-trail` → `league-summit` (League gate, snow Pokemon Center + Mart); `algebria-woods` → `zeroville-trail` → Zeroville west gate. Hidden: `mossy-grotto` (behind a Cut tree), `frost-cave` (its top "Frozen Sanctum" chamber is empty, reserved for a legendary), interiors `frost-hut` / `ranger-cabin` (empty `house-small` instances)
- [ ] `league-summit` door → `league/l1` is one-way: `l1` has no exit back to the summit yet
- [ ] `forest/league-summit` is a world-map route label only — decide if it should be a Fly city (it has a Pokemon Center)
- [ ] Legendary caves: Zapdos + Raikou done; remaining legendaries not placed
- [ ] League (`league/*`) + NULL-X Tower: maps exist with 1 NPC each; `act5/quest-nullx-tower.ts` references `nullx-floor-1..5` which don't exist (only `tower`, `floor-6`)

## Trainer Rank perks (`feature/player-rank`, stories: `docs/stories/player-rank.md`)
- [ ] Stories 1–8 built + unit-tested, **not playtested** — run the QA checklist in the stories doc
- [ ] Editor: no UI yet for `enteredFrom` (NPC) and `hallOfFame` (trainer reward) — edit the JSON
- [ ] Legendary gates (Elite birds/dogs, Master Mewtwo/Lugia/Ho-Oh, Legendary Mew): place blocker NPCs (`blocker` + `despawnAfter: rank-<id>`) once those maps exist; replace the "TBD" hint in the rank-up call

## Mini-games (`feature/mini-games`, design: `docs/stories/mini-games.md`)
- [ ] Games are reached in the world: libraries (English, by choice — Word Board + NPC hosts), labs (logic entry gate), wild care rounds. Admin only: start menu → Actions → Mini Games
- [ ] Section A built, **not playtested**: Snack Attack family (Snorlax, Bulbasaur, Charmander, Squirtle, Pikachu lines) + overworld care trigger (`games/snack-attack/`, `minigames/care.ts`, design §3b). Check each skin's look, the trigger rate (10/20/50% per step by HP, 100-step cooldown) and that Squirtle's levels 4–5 stay fair with more rocks (`SNACK_TUNE=1` tune test)
- [ ] Lab gates built, **not playtested** (`docs/stories/building-gates.md` → QA). Replay the lab story scenes (Percentile lab, Algorithma lab intro) from admin snapshots — the gate must not interrupt them
- [ ] English rework built, **not playtested** (`docs/stories/library-english.md` → QA, Round 2 too): 7 English games, English ladder, learn-first cards, Word Dex. A Hebrew speaker should review `src/data/english-words.json` — the `he` words and the `say` pronunciations (niqqud) were written by Claude
- [ ] Word Board built, **not playtested** (`docs/stories/english-board.md`). **Place the board:** in the tileset editor give a library board tile interact type `english-board` (every placed copy of that tile becomes a board). Then check the librarian intro walk, prize odds/balance, and the rare-Pokémon prize at the top level
- [ ] Free-play hosts only in 3 libraries (Sumville, Multiplia, Percentile). Minusburg library, Sumville lab, Percentile lab, Algorithma lab have none — add an NPC with `"miniGame": { "category": "english" | "logic" }` in the editor (the editor has no field for it yet — edit the JSON)
- [ ] More games later: labs have only Poké-Doku (logic) — add logic games, maybe with their own ladder/board like English
- [ ] Load-time / lazy-loading review postponed until the game strategy settles (main.js is 1.5 MB, mostly JSON data)

## Gates (kids-friendly pass)
- [ ] Gate lights (`systems/gate-lights.ts`): only Sumville has lights (Route 1 guard, Pokémon Center door). Place the rest with the editor's "Light X/Y" on each gate-guard / gated door
- [ ] On hold: city guards stay open until you leave the map (in vs out)

## Libraries, labs & friendly NPCs (2026-10-29, not playtested)
- [ ] Every built city has a library + lab now. New interiors replaced plain houses (doors re-pointed); the old house maps are no longer reachable — delete if not needed: `dividia/house-3`, `dividia/house-4`, `fractalis/template-house-open`, `fractalis/house-1`, `symmetrika/h1`, `minusburg/template-house-open`, `multiplia/h4`, `zeroville/h6`
- [ ] Algebria has no houses yet — give it a library + lab when the city is built (its Word Board already has Master Ball prizes in `english/board-cities.ts`)
- [ ] Friendly quiz NPCs (2 per city: `friendly-fan-*`, `friendly-kid-*`) in Zeroville, Minusburg, Multiplia, Dividia, Fractalis, Symmetrika — check spots + sprites in the editor
- [ ] Only 10 later-gen Pokémon exist in `pokemon.json` for board prizes; fetch more to widen each city's rare list

## Bugs
- [ ] Erika (family house) has a gift AND a story scene on the same talk: the clue scene seemed not to run after the gift popup. Covered by a recovery event on entering the house — find the real cause (reward text box vs. pending cutscene)
- [ ] Route 9 cave, Reminder's farewell (`quest-route9.ts` ~line 222): EN says "I am heading to Percentile", HE says "I'm debating whether to…"; typos "heared", "invastigate"
- [ ] Trainer "VS" intro scene before battle (old bug #8, `docs/bugs.md`)
- [ ] `english/__tests__/board.test.ts` "epic: never below 3 stars…" fails on main (after the Word Board prize rebalance)

## Tech debt
- [ ] `src/data/badges.ts` badge 8: leader is `???`, type/mathTopic still old placeholders — fill in when the Algebria gym is designed
- [ ] `src/data/maps/backup/` and `templates/backup/` — old map snapshots, remove if not needed
- [ ] Stale commented-out reset script at the bottom of `act3/quest-raikou.ts`
- [ ] `/sprites/pokemon/front/${id}.png` is built by hand in battle, evolution — use `pokemonFrontSpriteUrl()` from `systems/overworld-pokemon-anim.ts` (or move it to a shared sprite module)
- [ ] 7 of 13 vitest files fail on main (pre-existing)
- [ ] `public/audio/` is gitignored — the only copy is the `gh-pages` branch. A fresh clone has no sound; restore with `git archive origin/gh-pages audio | tar -x -C public` (the Pages workflow `.github/workflows/deploy.yml` does this before building). Store it somewhere durable (LFS / release asset) — if `gh-pages` is ever recreated without `audio/`, prod loses sound again
- [ ] English speech uses the browser voice (no recorded files in `public/audio/words`, `public/audio/phonics`) — quality depends on the device. Check with a child; if poor, record mp3s named `<word>.mp3` / `<letter>.mp3` there (the audio manager plays them before falling back to the voice)
- [ ] `scripts/enrich-pokemon-metadata.ts` overwrites height / weight / category / description from PokeAPI on every run — it would undo hand edits in `pokemon.json` (e.g. Charmander height 7 vs API 6). Make it fill missing fields only before running it again
- [ ] `encounter-tables.json`: some old entries have minLevel > maxLevel (sumville Pineco 10/5, route-3 Nidoran-f 24/20, small-forest Murkrow 30/14, cave-20-30 Phanpy 29/25)
- [ ] Math in battle disabled — needs a less intrusive mechanic
