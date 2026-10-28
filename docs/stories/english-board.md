# E. The Word Board (library English, played often)

Goal: children play English much more often, because they want to. A board in the library lets them play as often as
they like. Every game fills their bar. Prizes are shown in advance, get better with more stars, and get rarer at
higher levels. Builds on the English ladder (`library-english.md`, Round 2).

## Stories

1. **Board tile** ✅: a tileset tile with interact type `english-board` opens the Word Board. The type is picked in
   the tileset editor, and every placed copy of the tile becomes a board.
2. **Librarian intro** ✅: the first time the player enters a library that has a board, the librarian says NULL-X
   can't trick a trainer who knows English. The player then walks to the board on the shortest path and hears how it
   works. Flag: `english-board-intro-done`.
   - Nothing is hand-listed: the overworld checks the map for a board when the map loads.
   - A story scene on the same entry wins, and the intro plays on the next entry.
   - The library entry gate waits while the intro plays.
3. **Play many times** ✅: the board has a Play button that starts one game from the child's ladder step. "Play
   again" picks a new round from the board. There is no daily cap.
4. **Level = ladder step, filled by stars** ✅: every ladder round (Word Board or library gate) earns points by its
   stars (`STAR_POINTS`): 1★ = 0, 2★ = +1, 3★ = +3. A full bar (`pointsToNext`: 6, 6, 9, 9, 12, 12, 15) moves the
   child to the next, harder level, and the results screen says so. The old learning goals (letters seen, words
   answered right twice) no longer move the ladder. The board is labelled "Level N" (the Word Dex uses the same card).
5. **See the prizes** ✅: the board lists every level and its prizes, grouped by rarity (common / good / rare / epic).
   The child's current level is highlighted ("You are here!"), and a legend shows how stars turn into prizes.
6. **Stars → prizes** ✅: each star gives one prize. Each prize's rarity is drawn from `RARITY_ODDS_BY_STARS`:

   | Stars | Common | Good | Rare |
   |-------|--------|------|------|
   | 1★    | 80%    | 19%  | 1%   |
   | 2★    | 55%    | 35%  | 10%  |
   | 3★    | 30%    | 40%  | 30%  |

   The prize is then drawn from that step's pool of that rarity. If the pool has no prize of that rarity, the draw
   falls back to the next lower rarity.
   **Epic prizes** come only from a 3★ round, and at most one per round. Each epic prize of the level
   (`LadderStep.epic`, `rarePokemon`) has its own chance per 3★ round, rolled once, and replaces one of the 3 prizes:
   Master Ball 2%, rare Pokémon 5%, other epics 5%. The board shows each chance on its prize.
7. **Rare Pokémon** ✅: the epic pool also holds a Pokémon the player doesn't own (not in the party or the PC).
   Level 7 offers Trapinch, Feebas, Absol and Deino. Level 8 offers all of `BOARD_POKEMON`, the first stage of every
   line after Gen 2 in `pokemon.json` (Riolu, Gible, Bagon, Beldum, Axew…). They arrive at Lv. 10 and go to the PC
   when the party is full. The Master Ball is a level 8 prize only (2% of 3★ rounds).
8. **Louder speech** ✅: spoken letters and words always play at full volume (`SPEECH_VOLUME`), not at the effects
   volume.

## Where things live
- Prize pools: `prizes` on each step in `src/minigames/english/ladder.ts`.
- Odds and drawing: `src/minigames/english/board.ts`.
- Screen: `src/minigames/english/EnglishBoard.tsx`.
- Intro: `src/data/story/content/english-board.ts`.
- Walking: the cutscene step `walk-to-interact` uses `src/systems/grid-path.ts`.
- Admin shortcut: start menu → Actions → Word Board.

## QA
- [ ] Place the board tile in a library. On a fresh save, the first entry plays the intro, the walk reaches the
      board, and the entry gate doesn't interrupt.
- [ ] Rounds follow the ladder. Playing again works, and leaving returns to the board.
- [ ] The number of prizes equals the stars, and their rarities look right. The economy feels fair after ~20 rounds.
- [ ] The top level gives a rare Pokémon that isn't owned. With a full party, it goes to the PC.
- [ ] Hebrew text on the board and in the intro reads naturally.
