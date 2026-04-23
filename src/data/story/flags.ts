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
 * Naming conventions:
 *   VISITED_*         — first-visit bookmarks (set once, never cleared)
 *   ACT{N}_*          — act-scoped one-shot flags (cutscene seen, NPC met, etc.)
 *   GATE_*_PASS       — gate passed successfully
 *   STORY_*           — major story state (badge milestones, character arcs)
 *   ROCKET_*          — Team Rocket events
 *   SUMVILLE_*        — Sumville city arc flags
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

  // ── Act 2: Multiplia ────────────────────────────────────────────────────────
  VISITED_ROUTE3: 'visited-route3',
  GATE_ROUTE3_PASS: 'gate-route3-pass',
  VISITED_MULTIPLIA: 'visited-multiplia',
  GATE_MULTIPLIA_GYM_PASS: 'gate-multiplia-gym-pass',
  ACT2_MISTY_MET: 'act2-misty-met',
  ROCKET_MULTIPLIA_NURSE_REVEALED: 'rocket-multiplia-nurse-revealed', // Jessie unmasked in pokecenter
  ROCKET_MULTIPLIA_NURSE_EXPOSED: 'rocket-multiplia-nurse-exposed', // Jessie/James defeated and fled

  // ── Act 2: Dividia ──────────────────────────────────────────────────────────
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
  [FLAGS.VISITED_ROUTE3]: 'First step onto Route 3',
  [FLAGS.GATE_ROUTE3_PASS]: 'Route 3 → Multiplia checkpoint passed',
  [FLAGS.VISITED_MULTIPLIA]: 'First arrival at Multiplia',
  [FLAGS.GATE_MULTIPLIA_GYM_PASS]: 'Passed Multiplication Gym gate',
  [FLAGS.ACT2_MISTY_MET]: 'Misty greeted the player at Multiplia',
  [FLAGS.ROCKET_MULTIPLIA_NURSE_REVEALED]: 'Jessie unmasked in the Pokemon Center',
  [FLAGS.ROCKET_MULTIPLIA_NURSE_EXPOSED]: 'Jessie/James defeated and fled',
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
