/**
 * Story Flag Registry — Single source of truth for all story flags.
 *
 * Every flag used anywhere in story events, cutscene if-flag steps,
 * NPC spawnAfter/despawnAfter, or gate successActions MUST be defined here.
 *
 * Usage:
 *   import { FLAGS } from '../flags.js';
 *   { type: 'set-flag', flag: FLAGS.ACT0_INTRO_SEEN }
 *   spawnAfter: FLAGS.SUMVILLE_CRYSTAL_RETURNED  // in map JSON (copy the string value)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STATIC FLAGS — FLAGS enum below
 * ─────────────────────────────────────────────────────────────────────────────
 * Naming conventions:
 *   VISITED_*         — first-visit bookmarks (set once, never cleared)
 *   ACT{N}_*          — act-scoped one-shot flags (cutscene seen, NPC met, etc.)
 *   GATE_*_PASS       — gate passed successfully
 *   STORY_*           — major story state (badge milestones, character arcs)
 *   ROCKET_*          — Team Rocket events
 *   SUMVILLE_*        — Sumville city arc flags
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DYNAMIC FLAG PATTERNS — auto-generated at runtime, NOT in FLAGS enum
 * ─────────────────────────────────────────────────────────────────────────────
 * These live in pd.flags just like static flags and can be used in spawnAfter,
 * despawnAfter, and story event conditions exactly the same way.
 *
 * 1. Trainer defeated
 *      Key:     trainer-${trainerId}-defeated
 *      Example: trainer-rocket-mb-10-defeated
 *      Set by:  battle.ts on trainer win (also fires when isWildNpc flees)
 *      Use for: despawnAfter on that specific NPC; story event conditions
 *
 * 2. All trainers defeated on a map
 *      Key:     all-trainers-defeated-${mapId}
 *      Example: all-trainers-defeated-minusburg
 *      Set by:  story-engine.ts automatically after every trainer-defeated trigger,
 *               when every NPC with type:"trainer" (and excludeFromMapClear != true)
 *               on the current map is beaten
 *      Helper:  allTrainersDefeatedFlag('minusburg') — use this in TS, never hand-type
 *      Use for: despawnAfter on blocker NPCs; condition to set map infection to 'cleared'
 *
 * 3. Badge earned
 *      Key:     story-badge-${N}    (N = 1..8)
 *      Example: story-badge-3
 *      Set by:  battle.ts automatically when reward.badge is awarded — guaranteed,
 *               regardless of what reward.storyEvent the gym leader uses
 *      Also in: FLAGS enum as STORY_BADGE_1..8 — same string, use the enum in TS
 *      Use for: despawnAfter on post-gym NPCs; gate unlock conditions
 *
 * 4. Event done (internal — do not use directly)
 *      Key:     __event-done-${eventId}
 *      Example: __event-done-oak-warning
 *      Set by:  story-engine.ts after a non-repeatable story event fires
 *      Note:    Prevents re-firing. Override with event.completedFlag if you need
 *               a named flag instead of the auto-key.
 *
 * 5. Item tile collected (overworld field item)
 *      Key:     obj-${mapId}-${tileKey}-${x}-${y}-collected   (auto)
 *               OR a custom flag set in the tile's interactArgs.flag   (manual)
 *      Example: obj-route-3-item-ball-12-7-collected
 *      Set by:  overworld.ts when player picks up an item tile
 *      Note:    Object is filtered out of the map on load if this flag is set,
 *               so the item never reappears. Use interactArgs.flag in the map
 *               editor for a readable key; otherwise the auto-key is used.
 *
 * NPC give reward => npc-{npc-id}-rewarded
 *
 * 6. Cut tree cleared
 *      Key:     cut-${x}-${y}
 *      Example: cut-14-3
 *      Set by:  overworld.ts when HM Cut is used on a tree tile
 *      Note:    Tree tile is removed from map on load if flag is set.
 *               Coordinates are tile-grid positions, not pixels.
 *
 * 7. Strength boulder moved
 *      Key:     strength-${x}-${y}
 *      Example: strength-8-11
 *      Set by:  overworld.ts when HM Strength moves a boulder
 *      Note:    Same removal logic as cut trees.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW spawnAfter / despawnAfter WORK
 * ─────────────────────────────────────────────────────────────────────────────
 * Both fields on NPCData accept a flag STRING from pd.flags — nothing else.
 * They do NOT accept trigger types or conditions.
 *
 *   spawnAfter:   NPC is invisible until pd.flags[flag] === true
 *   despawnAfter: NPC is invisible once pd.flags[flag] === true
 *
 * To make an NPC react to a trigger (e.g. map-enter), wire a story event that
 * listens to the trigger and does { type: 'set-flag', flag: '...' }, then put
 * that flag string in spawnAfter/despawnAfter.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AVAILABLE STORY TRIGGERS (what can fire story events)
 * ─────────────────────────────────────────────────────────────────────────────
 * These are the trigger types the engine listens for. Each can have multiple
 * story events registered on the same trigger — all matching conditions fire
 * independently. Events are one-shot by default (repeatable: false).
 *
 *   map-enter        { type: 'map-enter',       mapId: string }
 *   map-exit         { type: 'map-exit',         mapId: string }
 *   npc-interact     { type: 'npc-interact',     npcId: string }
 *   trainer-defeated { type: 'trainer-defeated', trainerId: string }
 *   badge-earned     { type: 'badge-earned',     badge: number }   (1–8)
 *   gate-cleared     { type: 'gate-cleared',     gateId: string }
 *   flag-set         { type: 'flag-set',         flag: string }    (chained — fires after any set-flag action)
 *
 * NOT YET WIRED (defined in events.ts but no firing site):
 *   quest-complete, item-used, manual
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AVAILABLE STORY CONDITIONS (checkable in event.conditions[])
 * ─────────────────────────────────────────────────────────────────────────────
 *   { type: 'flag',           flag: string, value?: boolean }
 *   { type: 'flag-not',       flag: string }
 *   { type: 'badge-count',    min: number }          — player has ≥ N badges
 *   { type: 'badge-count-max',max: number }          — player has ≤ N badges
 *   { type: 'quest-active',   questId: string }
 *   { type: 'quest-complete', questId: string }
 *   { type: 'infection-level',mapId: MapId, value: InfectionLevel }
 *   { type: 'money-min',      amount: number }
 *   { type: 'gate-locked',    gateId: string }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AVAILABLE STORY ACTIONS (executable in event.actions[])
 * ─────────────────────────────────────────────────────────────────────────────
 *   { type: 'set-flag',         flag: string, value?: boolean }
 *   { type: 'set-infection',    mapId: MapId, value: InfectionLevel }
 *   { type: 'set-quest',        questId: string }
 *   { type: 'complete-quest',   questId: string }
 *   { type: 'give-item',        itemId: string, quantity: number }
 *   { type: 'give-money',       amount: number }
 *   { type: 'start-cutscene',   cutsceneId: string }
 *   { type: 'start-gate',       gateId: string }
 *   { type: 'teleport',         mapId: string, x: number, y: number }
 *   { type: 'play-music',       musicId: string }
 *   { type: 'show-message',     lines: BilingualText[] }
 *   { type: 'unlock-gate-timer',gateId: string, durationMs: number }
 *
 * InfectionLevel values: 'none' | 'low' | 'medium' | 'high' | 'critical' | 'cleared'
 */

export const FLAGS = {
  // ── Act 0: Zeroville ────────────────────────────────────────────────────────
  ACT0_INTRO_SEEN: 'act0-intro-seen', // Professor's intro cutscene played
  ACT0_REMAINDER_MET: 'act0-remainder-met', // Remainder reacted to player's starter
  ACT0_COMPLETE: 'act0-complete', // Player left Zeroville → Route 1
  VISITED_ZEROVILLE: 'visited-zeroville',

  // ── Act 1: Route 1 ──────────────────────────────────────────────────────────
  ACT1_NULLX_INTRO_SEEN: 'act1-nullx-intro-seen', // Algorithma warned about NULL-X at exit
  GATE_ROUTE1_PASS: 'gate-route1-pass', // Route 1 → Sumville checkpoint passed
  GATE_SUMVILLE_ROUTE2_PASS: 'gate-sumville-route2-pass', // Sumville → Route 2 checkpoint passed

  // ── Act 1: Sumville ─────────────────────────────────────────────────────────
  VISITED_SUMVILLE: 'visited-sumville',
  ACT1_OAK_WARNING_HEARD: 'act1-oak-warning-heard', // Prof. Oak arrival cutscene seen
  SUMVILLE_ARRIVED: 'sumville-arrived', // Sumville quest started (investigate gym)
  SUMVILLE_GYM_BLOCKER_TALKED: 'sumville-gym-blocker-talked', // Talked to guard blocking the gym
  SUMVILLE_CRYSTAL_FOUND: 'sumville-crystal-found', // Jessie dropped the Bridge Crystal
  SUMVILLE_CRYSTAL_RETURNED: 'sumville-crystal-returned', // Crystal returned to keeper at bridge
  SUMVILLE_GYM_CLEARED: 'sumville-gym-cleared', // Addition Gym trainer defeated
  GATE_SUMVILLE_GYM_PASS: 'gate-sumville-gym-pass', // Passed Addition Gym gate
  //! @depercated : SAFARI IS MOVED TO OTHER PLACE - WILL USE LATER
  GATE_SUMVILLE_SAFARI_PASS: 'gate-sumville-safari-pass', // Passed Sumville Safari gate (optional challenge)
  // ── Act 1: Route 2 + Minusburg ──────────────────────────────────────────────
  ACT1_PROF_ALGORITHMA_ROUTE2_SCENE_SEEN: 'act1-prof-algorithma-route2-scene-seen', // Prof. Algorithma cutscene at Route 2 seen
  ACT1_RIVAL_TRIGGER_CALL: 'act1-rival-trigger-call', // First rival battle dialogue started
  ACT1_RIVAL_RUN_1: 'act1-rival-run-1', // Rival run 1 started (Route 2)
  ACT1_RIVAL_BATTLE_1: 'act1-rival-battle-1', // Rival battle 1 started (Route 2)
  GATE_ROUTE2_PASS: 'gate-route2-pass', // Route 2 → Minusburg checkpoint passed
  VISITED_MINUSBURG: 'visited-minusburg',
  ACT1_REMAINDER_BATTLE_STARTED: 'act1-remainder-battle-started',
  ACT1_REMAINDER_FIRST_BATTLE_DONE: 'act1-remainder-first-battle-done',
  GATE_MINUSBURG_GYM_PASS: 'gate-minusburg-gym-pass', // Subtraction Gym entry passed
  MINUSBURG_GARY_MET: 'minusburg-gary-met', // Gary Oak + Minessa encounter cutscene seen
  MINUSBURG_GYM_BLOCKER_MET: 'minusburg-gym-blocker-met', // Gym blocker encounter cutscene seen
  MINUSBURG_GYM_LEADER_FOUND: 'minusburg-gym-leader-found', // (legacy flag, kept for save compat)
  MINUSBURG_BLOCKER_PLACED: 'minusburg-blocker-placed', // Blocker NPC spawned on eastern path
  ROCKET_MINUSBURG_ALL_DEFEATED: 'rocket-minusburg-all-defeated', // All 10 Rocket grunts driven out
  ACT1_COLLECT_DOCS_FROM_BEN: 'act1-collect-docs-from-ben', // Player collected Prof. Elm's documents from Ben in Minusburg
  ACT1_BRING_DOCUMENTS_TO_ALGORITHMA: 'act1-bring-documents-to-algorithma', // Player brought Prof. Elm's documents to Prof. Algorithma in Sumville

  // ── Act 1: Route 3 ─────────────────────────────────────────────────────────
  ACT1_ROUTE3_MEET_MISTY: 'act1-route3-meet-misty', // First encounter with Misty on Route 3
  ACT1_ROUTE3_REWARD_RECEIVED: 'npc-give-fishing-rod-rewarded', // this flag is set automaticly
  ACT1_ROUTE_3_MISTY_JENNI_ARRIVED: 'act1-route3-misty-jenni-arrived', // Misty and Jenni arrived at Route 3 blocking path to Route 4
  ACT1_ROUTE_3_MISTY_JENNI_GO: 'act1-route3-misty-jenni-go', // Misty and Jenni left Route 3

  // ── Act 1: Route 4 ─────────────────────────────────────────────────────────
  ACT1_ROUTE4_ASSEMBLY_STARTED: 'act1-route4-assembly-started', // Big assembly cutscene triggered (all trainers defeated)
  ACT1_ROUTE4_ASSEMBLY_DONE: 'act1-route4-assembly-done', // Assembly cutscene finished, all NPCs despawn
  ACT1_SECRET_DOC_2_RECEIVED: 'act1-route4-secret-doc-2-received', // Leon handed Secret Document 2 to the player

  //! dont use yet on the FLAGS after this line
  // ── Act 2: Multiplia ────────────────────────────────────────────────────────
  GATE_ROUTE9_PASS: 'gate-route9-pass',
  VISITED_MULTIPLIA: 'visited-multiplia',
  GATE_MULTIPLIA_GYM_PASS: 'gate-multiplia-gym-pass',

  // ── Act 2: Multiplia quest arc ───────────────────────────────────────────────
  ACT2_LIBRARY_SCENE_DONE: 'act2-library-scene-done', // Library cutscene with Oak + Kefel seen
  ACT2_GYM_LEADER_CALLED: 'act2-gym-leader-called', // Gym entry phone call from Kefel done
  ACT2_ROUTE6_JENNY_DONE: 'act2-route6-jenny-done', // Route 6 — Jenny cutscene finished
  ACT2_MEDICINE_RECEIVED: 'act2-medicine-received', // Medicine from Rick in Zeroville received
  ACT2_LAB_CALL_RECEIVED: 'act2-lab-call-received', // Oak called after Revive House exit and asked to visit the lab
  ACT2_WIFE_HELPED: 'act2-wife-helped', // Medicine given to Kefel's wife
  ACT2_LAB_CUTSCENE_DONE: 'act2-lab-cutscene-done', // Oak + Algo + Lance lab reveal seen

  // ── Act 2: Dividia ──────────────────────────────────────────────────────────
  ACT2_ROUTE5_JENNY_TALKED: 'act2-route5-jenny-talked', // First interaction with Jenny on Route 5
  GATE_ROUTE4_PASS: 'gate-route4-pass',
  VISITED_DIVIDIA: 'visited-dividia',
  GATE_DIVIDIA_GYM_PASS: 'gate-dividia-gym-pass',
  ACT2_BROCK_MET: 'act2-brock-met',
  STORY_REMAINDER_GLITCHED: 'story-remainder-glitched', // Remainder's Pokemon got infected
  STORY_REMAINDER_INFECTED: 'story-remainder-infected', // Alias — set at same time as GLITCHED
  STORY_REMAINDER_SAVED: 'story-remainder-saved', // Player used serum to cure Remainder
  STORY_REMAINDER_CURED: 'story-remainder-cured', // Alias — set at same time as SAVED

  // ── Act 3: Primore ──────────────────────────────────────────────────────────
  GATE_ROUTE5_PASS: 'gate-route5-pass',
  VISITED_PRIMORE: 'visited-primore',
  GATE_PRIMORE_PASS: 'gate-primore-pass', // Set after badge 5 — unlocks route 6
  GATE_PRIMORE_GYM_PASS: 'gate-primore-gym-pass',
  ACT3_GARY_MET: 'act3-gary-met',
  ACT3_GARY_BATTLE_DONE: 'act3-gary-battle-done',
  STORY_REMAINDER_ALLY: 'story-remainder-ally', // Remainder rejoined as ally at Primore
  STORY_REMAINDER_JOINED: 'story-remainder-joined', // Alias — set at same time as ALLY

  // ── Act 3: Symmetrika ───────────────────────────────────────────────────────
  GATE_ROUTE6_PASS: 'gate-route6-pass',
  VISITED_SYMMETRIKA: 'visited-symmetrika',
  GATE_SYMMETRIKA_GYM_PASS: 'gate-symmetrika-gym-pass',
  ACT3_TRACEY_MET: 'act3-tracey-met',
  STORY_NULLX_FIRST_CONTACT: 'story-nullx-first-contact', // NULL-X spoke to player at terminal

  // ── Act 3: Symmetrika story arc ──────────────────────────────────────────────
  ACT3_SYM_BADGE_CUTSCENE_DONE: 'act3-sym-badge-cutscene-done', // Sima post-badge cutscene done → quest: meet Lance at DayCare
  ACT3_SYM_LANCE_DAYCARE_MET: 'act3-sym-lance-daycare-met', // Lance gave HM Surf at DayCare → quest: go to cave
  ACT3_SYM_ROCKET_AMBUSH_DONE: 'act3-sym-rocket-ambush-done', // Ambush cutscene done → grunts spawn in both caves
  ACT3_SYM_POKEMON_STOLEN: 'act3-sym-pokemon-stolen', // 3 Pokemon stolen by Jesse/James
  ACT3_SYM_THIEF_DEFEATED: 'act3-sym-thief-defeated', // Jesse/James defeated → Pokemon restored
  ACT3_SYM_POKEMON_RESTORED: 'act3-sym-pokemon-restored', // Stolen Pokemon returned → Lance-return spawns
  ACT3_SYM_LANCE_CAVE_RETURN: 'act3-sym-lance-cave-return', // Investigate cutscene done → Zapdos spawns
  ACT3_SYM_ZAPDOS_CAVE_DEFEATED: 'act3-sym-zapdos-cave-defeated', // Zapdos fled, NULL-X Core X1 collected
  ACT3_SYM_NULLX_CORE5_COLLECTED: 'hide-null-x-core5', // (internal flag) Core 5 collected → hide it from the cave
  ACT3_SYM_ARC_COMPLETE: 'act3-sym-arc-complete', // Full Symmetrika arc done → head to Percentile

  // ── Act 3: Fractalis arc ─────────────────────────────────────────────────────
  VISITED_FRACTALIS: 'visited-fractalis',
  ACT3_FRACTALIS_WIFE_TALKED: 'act3-fractalis-wife-talked', // Wife gave item → engineer spawns at beach
  ACT3_FRACTALIS_ENGINEER_MET: 'act3-fractalis-engineer-met', // Beach cutscene done → heading to route-7
  ACT3_FRACTALIS_ROUTE7_SCENE_DONE: 'act3-fractalis-route7-scene-done', // Jenny scene done → route-8 blocker removed
  ACT3_FRACTALIS_ROUTE8_ENTERED: 'act3-fractalis-route8-entered', // Engineer arrival cutscene done
  ACT3_FRACTALIS_ZAPDOS_DEFEATED: 'act3-fractalis-zapdos-defeated', // Zapdos battle done, core collected
  ACT3_FRACTALIS_GYM_INVITE: 'act3-fractalis-gym-invite', // Engineer invited player to gym
  GATE_FRACTALIS_GYM_PASS: 'gate-fractalis-gym-pass',

  // ── Act 4: Integrala ────────────────────────────────────────────────────────
  GATE_ROUTE7_PASS: 'gate-route7-pass',
  VISITED_INTEGRALA: 'visited-integrala',
  GATE_INTEGRALA_GYM_PASS: 'gate-integrala-gym-pass',
  STORY_ELM_ARRIVED: 'story-elm-arrived', // Prof. Elm revealed NULL-X origins

  // ── Act 4: Absoluta ─────────────────────────────────────────────────────────
  GATE_ROUTE8_PASS: 'gate-route8-pass',
  VISITED_ABSOLUTA: 'visited-absoluta',
  GATE_ABSOLUTA_GYM_PASS: 'gate-absoluta-gym-pass',
  ROCKET_SERUM_ATTEMPT_FAILED: 'rocket-serum-attempt-failed', // Jessie/James backed down

  // ── Act 5: NULL-X Tower ─────────────────────────────────────────────────────
  STORY_SERUM_COMPLETE: 'story-serum-complete', // All 8 serum fragments assembled
  VISITED_NULLX_TOWER: 'visited-nullx-tower',
  GATE_TOWER_ENTRY_PASS: 'gate-tower-entry-pass',
  GATE_ELITE_PARSE_PASS: 'gate-elite-parse-pass',
  GATE_ELITE_RECURSE_PASS: 'gate-elite-recurse-pass',
  GATE_ELITE_NULL_Y_PASS: 'gate-elite-null-y-pass',
  GATE_ELITE_AXIOM_PASS: 'gate-elite-axiom-pass',
  GATE_NULLX_FINAL_PASS: 'gate-nullx-final-pass',
  STORY_NULLX_DEFEATED: 'story-nullx-defeated',
  STORY_COMPLETE: 'story-complete',

  // ── Badge milestones (set when badge N is earned) ───────────────────────────
  STORY_BADGE_1: 'story-badge-1',
  STORY_BADGE_2: 'story-badge-2',
  STORY_BADGE_3: 'story-badge-3',
  STORY_BADGE_4: 'story-badge-4',
  STORY_BADGE_5: 'story-badge-5',
  STORY_BADGE_6: 'story-badge-6',
  STORY_BADGE_7: 'story-badge-7',
  STORY_BADGE_8: 'story-badge-8',
} as const;

/** Union type of all valid flag string values. Useful for typed flag parameters. */
export type StoryFlag = (typeof FLAGS)[keyof typeof FLAGS];

// ── Auto-computed per-map flags ─────────────────────────────────────────────
//
// The story engine automatically sets "all-trainers-defeated-{mapId}" in
// pd.flags the moment every type:"trainer" NPC on the current map has been
// beaten at least once.  No manual registerStoryEvent needed.
//
// Use the helper below so the flag name is never a hand-typed string:
//
//   NPC json:   "despawnAfter": "all-trainers-defeated-minusburg"
//   TS story:   conditions: [{ type: 'flag', flag: allTrainersDefeatedFlag('minusburg') }]
//
/** Returns the auto-computed flag string for "all trainers on mapId defeated". */
export function allTrainersDefeatedFlag(mapId: string): string {
  return `all-trainers-defeated-${mapId}`;
}

/**
 * Human-readable descriptions for each flag — used by the map editor
 * to show tooltips in the spawnAfter/despawnAfter autocomplete dropdowns.
 */
export const FLAG_DESCRIPTIONS: Record<string, string> = {
  [FLAGS.ACT0_INTRO_SEEN]: "Professor's intro cutscene played",
  [FLAGS.ACT0_REMAINDER_MET]: "Remainder reacted to player's starter",
  [FLAGS.ACT0_COMPLETE]: 'Player left Zeroville → Route 1',
  [FLAGS.VISITED_ZEROVILLE]: 'First visit to Zeroville',
  [FLAGS.ACT1_NULLX_INTRO_SEEN]: 'Algorithma warned about NULL-X at Route 1 exit',
  [FLAGS.GATE_ROUTE1_PASS]: 'Route 1 → Sumville checkpoint passed',
  [FLAGS.GATE_SUMVILLE_ROUTE2_PASS]: 'Sumville → Route 2 checkpoint passed',
  [FLAGS.VISITED_SUMVILLE]: 'First arrival at Sumville',
  [FLAGS.ACT1_OAK_WARNING_HEARD]: 'Prof. Oak arrival cutscene seen',
  [FLAGS.SUMVILLE_ARRIVED]: 'Sumville quest started (investigate gym)',
  [FLAGS.SUMVILLE_GYM_BLOCKER_TALKED]: 'Talked to guard blocking the gym',
  [FLAGS.SUMVILLE_CRYSTAL_FOUND]: 'Jessie dropped the Bridge Crystal',
  [FLAGS.SUMVILLE_CRYSTAL_RETURNED]: 'Crystal returned to keeper at bridge',
  [FLAGS.SUMVILLE_GYM_CLEARED]: 'Addition Gym trainer defeated',
  [FLAGS.GATE_SUMVILLE_GYM_PASS]: 'Passed Addition Gym gate',
  [FLAGS.GATE_ROUTE2_PASS]: 'Route 2 → Minusburg checkpoint passed',
  [FLAGS.ACT1_RIVAL_BATTLE_1]: 'Rival battle 1 started (Route 2)',
  [FLAGS.VISITED_MINUSBURG]: 'First arrival at Minusburg',
  [FLAGS.ACT1_REMAINDER_BATTLE_STARTED]: 'Remainder battle dialogue started',
  [FLAGS.ACT1_REMAINDER_FIRST_BATTLE_DONE]: 'Remainder first battle complete',
  [FLAGS.GATE_MINUSBURG_GYM_PASS]: 'Subtraction Gym entry gate passed',
  [FLAGS.MINUSBURG_GARY_MET]: 'Gary Oak + Minessa encounter cutscene seen',
  [FLAGS.MINUSBURG_GYM_LEADER_FOUND]: 'Legacy flag — kept for save compatibility',
  [FLAGS.MINUSBURG_BLOCKER_PLACED]: 'Eastern-path blocker NPC spawned after city cleared',
  [FLAGS.ROCKET_MINUSBURG_ALL_DEFEATED]: 'All 10 Team Rocket grunts in Minusburg defeated',
  [FLAGS.ACT1_ROUTE4_ASSEMBLY_STARTED]: 'Route 4 post-clear assembly cutscene started',
  [FLAGS.ACT1_ROUTE4_ASSEMBLY_DONE]: 'Route 4 assembly cutscene finished, all cutscene NPCs despawned',
  [FLAGS.ACT1_SECRET_DOC_2_RECEIVED]: 'Champion Leon gave Secret Document 2 to the player',
  [FLAGS.VISITED_MULTIPLIA]: 'First arrival at Multiplia',
  [FLAGS.GATE_MULTIPLIA_GYM_PASS]: 'Passed Multiplication Gym gate',
  [FLAGS.ACT2_LIBRARY_SCENE_DONE]: 'Library cutscene with Oak + Kefel completed',
  [FLAGS.ACT2_GYM_LEADER_CALLED]: 'Kefel phone call on gym entry done — Route 6 quest started',
  [FLAGS.ACT2_ROUTE6_JENNY_DONE]: 'Route 6 — all Rocket defeated + Jenny cutscene finished',
  [FLAGS.ACT2_MEDICINE_RECEIVED]: 'Special medicine received from Rick in Zeroville h1',
  [FLAGS.ACT2_LAB_CALL_RECEIVED]:
    'Oak called after leaving Revive House — visit-lab phase active (use for Zeroville blocker spawnAfter)',
  [FLAGS.ACT2_WIFE_HELPED]: "Medicine delivered to Kefel's wife — gym blocker despawns",
  [FLAGS.ACT2_LAB_CUTSCENE_DONE]: 'Oak + Algo + Lance lab cutscene (AI Cores reveal) seen',
  [FLAGS.GATE_ROUTE4_PASS]: 'Route 4 → Dividia checkpoint passed',
  [FLAGS.VISITED_DIVIDIA]: 'First arrival at Dividia',
  [FLAGS.GATE_DIVIDIA_GYM_PASS]: 'Passed Division Gym gate',
  [FLAGS.ACT2_BROCK_MET]: 'Brock greeted the player at Dividia',
  [FLAGS.STORY_REMAINDER_GLITCHED]: "Remainder's Pokemon got infected by Glitch",
  [FLAGS.STORY_REMAINDER_INFECTED]: 'Alias for GLITCHED (set at same time)',
  [FLAGS.STORY_REMAINDER_SAVED]: 'Player used serum to cure Remainder',
  [FLAGS.STORY_REMAINDER_CURED]: 'Alias for SAVED (set at same time)',
  [FLAGS.GATE_ROUTE5_PASS]: 'Route 5 → Primore checkpoint passed',
  [FLAGS.VISITED_PRIMORE]: 'First arrival at Primore',
  [FLAGS.GATE_PRIMORE_PASS]: 'Set after badge 5 — unlocks Route 6',
  [FLAGS.GATE_PRIMORE_GYM_PASS]: 'Passed Prime Gym gate',
  [FLAGS.ACT3_GARY_MET]: 'Gary Oak challenged the player',
  [FLAGS.ACT3_GARY_BATTLE_DONE]: 'Gary Oak battle complete',
  [FLAGS.STORY_REMAINDER_ALLY]: 'Remainder rejoined as ally at Primore',
  [FLAGS.STORY_REMAINDER_JOINED]: 'Alias for ALLY (set at same time)',
  [FLAGS.GATE_ROUTE6_PASS]: 'Route 6 → Symmetrika checkpoint passed',
  [FLAGS.VISITED_SYMMETRIKA]: 'First arrival at Symmetrika',
  [FLAGS.GATE_SYMMETRIKA_GYM_PASS]: 'Passed Symmetry Gym gate',
  [FLAGS.ACT3_TRACEY_MET]: 'Tracey observed Glitch patterns',
  [FLAGS.STORY_NULLX_FIRST_CONTACT]: 'NULL-X spoke to player at terminal',
  [FLAGS.ACT3_SYM_BADGE_CUTSCENE_DONE]: 'Sima post-badge cutscene done — quest: meet Lance at DayCare',
  [FLAGS.ACT3_SYM_LANCE_DAYCARE_MET]: 'Lance gave HM Surf at DayCare — quest: go to cave route-7',
  [FLAGS.ACT3_SYM_ROCKET_AMBUSH_DONE]: 'Ambush cutscene done — Rocket grunts spawn in both caves',
  [FLAGS.ACT3_SYM_POKEMON_STOLEN]: '3 Pokemon stolen by Jesse/James in cave ambush',
  [FLAGS.ACT3_SYM_THIEF_DEFEATED]: 'Jesse/James defeated — Pokemon restoration triggered',
  [FLAGS.ACT3_SYM_POKEMON_RESTORED]: 'Stolen Pokemon returned to player — Lance-return spawns in cave1',
  [FLAGS.ACT3_SYM_LANCE_CAVE_RETURN]: 'Investigate cutscene done — Zapdos spawns in cave1',
  [FLAGS.ACT3_SYM_ZAPDOS_CAVE_DEFEATED]: 'Zapdos fled cave, NULL-X Core X1 collected',
  [FLAGS.ACT3_SYM_NULLX_CORE5_COLLECTED]: 'Core 5 collected — hide it from the cave with this internal flag',
  [FLAGS.ACT3_SYM_ARC_COMPLETE]: 'Full Symmetrika story arc complete — player heads to Percentile',
  [FLAGS.VISITED_FRACTALIS]: 'First arrival at Fractalis',
  [FLAGS.ACT3_FRACTALIS_WIFE_TALKED]: 'Wife gave item → engineer spawns at beach',
  [FLAGS.ACT3_FRACTALIS_ENGINEER_MET]: 'Beach cutscene done — player heads to route-7 with engineer',
  [FLAGS.ACT3_FRACTALIS_ROUTE7_SCENE_DONE]: 'Jenny/Zapdos route-7 scene done — route-8 blocker removed',
  [FLAGS.ACT3_FRACTALIS_ROUTE8_ENTERED]: 'Engineer arrival cutscene in route-8 done',
  [FLAGS.ACT3_FRACTALIS_ZAPDOS_DEFEATED]: 'Zapdos defeated in route-8, NULL-X Core 5 collected',
  [FLAGS.ACT3_FRACTALIS_GYM_INVITE]: 'Engineer invited player to power station gym',
  [FLAGS.GATE_FRACTALIS_GYM_PASS]: 'Passed Electric Gym entry gate',
  [FLAGS.GATE_ROUTE7_PASS]: 'Route 7 → Integrala checkpoint passed',
  [FLAGS.VISITED_INTEGRALA]: 'First arrival at Integrala',
  [FLAGS.GATE_INTEGRALA_GYM_PASS]: 'Passed Formula Gym gate',
  [FLAGS.STORY_ELM_ARRIVED]: 'Prof. Elm revealed NULL-X origins',
  [FLAGS.GATE_ROUTE8_PASS]: 'Route 8 → Absoluta checkpoint passed',
  [FLAGS.VISITED_ABSOLUTA]: 'First arrival at Absoluta',
  [FLAGS.GATE_ABSOLUTA_GYM_PASS]: 'Passed Absolute Gym gate',
  [FLAGS.ROCKET_SERUM_ATTEMPT_FAILED]: 'Jessie/James backed down from stealing serum',
  [FLAGS.STORY_SERUM_COMPLETE]: 'All 8 serum fragments assembled',
  [FLAGS.VISITED_NULLX_TOWER]: 'First entry into NULL-X Tower',
  [FLAGS.GATE_TOWER_ENTRY_PASS]: 'Passed NULL-X Tower entry gate',
  [FLAGS.GATE_ELITE_PARSE_PASS]: 'Defeated PARSE (Floor 2)',
  [FLAGS.GATE_ELITE_RECURSE_PASS]: 'Defeated RECURSE (Floor 3)',
  [FLAGS.GATE_ELITE_NULL_Y_PASS]: 'Defeated NULL-Y (Floor 4)',
  [FLAGS.GATE_ELITE_AXIOM_PASS]: 'Defeated AXIOM (Floor 5)',
  [FLAGS.GATE_NULLX_FINAL_PASS]: 'Passed NULL-X final equation gate',
  [FLAGS.STORY_NULLX_DEFEATED]: 'NULL-X was defeated and patched',
  [FLAGS.STORY_COMPLETE]: 'Game complete — Numeria saved',
  [FLAGS.STORY_BADGE_1]: 'Badge 1 earned (Sumville)',
  [FLAGS.STORY_BADGE_2]: 'Badge 2 earned (Minusburg)',
  [FLAGS.STORY_BADGE_3]: 'Badge 3 earned (Multiplia)',
  [FLAGS.STORY_BADGE_4]: 'Badge 4 earned (Dividia)',
  [FLAGS.STORY_BADGE_5]: 'Badge 5 earned (Primore)',
  [FLAGS.STORY_BADGE_6]: 'Badge 6 earned (Symmetrika)',
  [FLAGS.STORY_BADGE_7]: 'Badge 7 earned (Integrala)',
  [FLAGS.STORY_BADGE_8]: 'Badge 8 earned (Absoluta)',
};
