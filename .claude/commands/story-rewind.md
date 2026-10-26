The user wants to replay a story point. Their description: $ARGUMENTS

Work out which flags to clear so that point replays, then give short step-by-step instructions for the admin page Story tab. Don't change any code or save data yourself.

## 1. Research (silently, from the code; never guess)
1. Find the quest file in `src/data/story/content/act*/` that matches the description. Read the whole file.
2. **Start trigger:** find the event that starts the arc, i.e. its `trigger` (map-enter / map-exit / flag-set / trainer-defeated / badge-earned) and `conditions`.
   - `flag` conditions are **prerequisites**: they must stay set.
   - `flag-not` conditions must be cleared.
3. **Flags to clear**, all derived from the code:
   - `__event-done-<eventId>` for every `registerStoryEvent` in the arc, or its `completedFlag` if one is set (see `src/systems/story-engine.ts`)
   - every `set-flag` in the arc's events and cutscenes; resolve `FLAGS.X` values in `src/data/story/flags.ts`
   - `trainer-<npcId>-defeated` for trainer battles in the arc (`trainer-defeated` triggers, or flags referenced in the file)
   - key-item flags: the `keyFlag` and `usedFlag` in `src/data/item-defs.ts` for items the arc gives
   - flags used as `spawnAfter`/`despawnAfter` by the arc's NPCs in `src/data/maps/**`
4. **Downstream arcs:** search other quest files for triggers or conditions on the flags you're clearing. If a later arc depends on them, include its flags too, using the same rules.
5. **Reset act safety:** the admin "Reset act" button clears every `FLAGS.X` the file mentions, including prerequisites in conditions. Allow Reset act only if the file mentions no prerequisite flag. Otherwise list the individual flags to Clear.
6. **Where to stand:** the map and position that fire the start trigger, so the user can use G (teleport) to get there.
7. Note leftovers that flags don't undo, such as items in the bag or completed quests, but only if they could block the replay.

## 2. Reply: short, same format every time
Keep it under ~15 lines. The user doesn't read long replies. Use this structure:

> Don't use **Reset act** on X. It would also clear Y.  ← only when it applies
> 1. **Close the game tab**, open `localhost:<port>/admin.html` → **Story** tab.
> 2. Pick the **adminBenny slot**, then click **Snapshot current save** as a backup.
> 3. Act **"Act N — name"**: search `term` and click **Clear** on:
>    - `flag-a`
>    - `flag-b`
> 4. (next act / search term, or "**Reset act**, which is safe for this one")
> 5. Open the game, load the slot, press **G** → `map-id` → <the action that fires the trigger>. <What should happen.>
>
> One-line note on harmless leftovers. Once you're there, click **Snapshot current save** so next time it's one Restore click.

If the description matches more than one arc, or you can't find it, ask one short question instead of guessing.
