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
  ACT0_INTRO_SEEN:                  'act0-intro-seen',               // Professor's intro cutscene played
  ACT0_REMAINDER_MET:               'act0-remainder-met',            // Remainder reacted to player's starter
  ACT0_COMPLETE:                    'act0-complete',                  // Player left Zeroville → Route 1
  VISITED_ZEROVILLE:                'visited-zeroville',

  // ── Act 1: Route 1 ──────────────────────────────────────────────────────────
  ACT1_NULLX_INTRO_SEEN:            'act1-nullx-intro-seen',         // Algorithma warned about NULL-X at exit
  GATE_ROUTE1_PASS:                 'gate-route1-pass',              // Route 1 → Sumville checkpoint passed
  GATE_SUMVILLE_ROUTE2_PASS:        'gate-sumville-route2-pass',     // Sumville → Route 2 checkpoint passed

  // ── Act 1: Sumville ─────────────────────────────────────────────────────────
  VISITED_SUMVILLE:                 'visited-sumville',
  ACT1_OAK_WARNING_HEARD:           'act1-oak-warning-heard',        // Prof. Oak arrival cutscene seen
  SUMVILLE_ARRIVED:                 'sumville-arrived',              // Sumville quest started (investigate gym)
  SUMVILLE_GYM_BLOCKER_TALKED:      'sumville-gym-blocker-talked',   // Talked to guard blocking the gym
  SUMVILLE_CRYSTAL_FOUND:           'sumville-crystal-found',        // Jessie dropped the Bridge Crystal
  SUMVILLE_CRYSTAL_RETURNED:        'sumville-crystal-returned',     // Crystal returned to keeper at bridge
  SUMVILLE_GYM_CLEARED:             'sumville-gym-cleared',          // Addition Gym trainer defeated
  GATE_SUMVILLE_GYM_PASS:           'gate-sumville-gym-pass',        // Passed Addition Gym gate

  // ── Act 1: Route 2 + Minusburg ──────────────────────────────────────────────
  GATE_ROUTE2_PASS:                 'gate-route2-pass',              // Route 2 → Minusburg checkpoint passed
  VISITED_MINUSBURG:                'visited-minusburg',
  ACT1_REMAINDER_BATTLE_STARTED:    'act1-remainder-battle-started',
  ACT1_REMAINDER_FIRST_BATTLE_DONE: 'act1-remainder-first-battle-done',

  // ── Act 2: Multiplia ────────────────────────────────────────────────────────
  VISITED_ROUTE3:                   'visited-route3',
  GATE_ROUTE3_PASS:                 'gate-route3-pass',
  VISITED_MULTIPLIA:                'visited-multiplia',
  GATE_MULTIPLIA_GYM_PASS:          'gate-multiplia-gym-pass',
  ACT2_MISTY_MET:                   'act2-misty-met',
  ROCKET_MULTIPLIA_NURSE_REVEALED:  'rocket-multiplia-nurse-revealed', // Jessie unmasked in pokecenter
  ROCKET_MULTIPLIA_NURSE_EXPOSED:   'rocket-multiplia-nurse-exposed',  // Jessie/James defeated and fled

  // ── Act 2: Dividia ──────────────────────────────────────────────────────────
  GATE_ROUTE4_PASS:                 'gate-route4-pass',
  VISITED_DIVIDIA:                  'visited-dividia',
  GATE_DIVIDIA_GYM_PASS:            'gate-dividia-gym-pass',
  ACT2_BROCK_MET:                   'act2-brock-met',
  STORY_REMAINDER_GLITCHED:         'story-remainder-glitched',      // Remainder's Pokemon got infected
  STORY_REMAINDER_INFECTED:         'story-remainder-infected',      // Alias — set at same time as GLITCHED
  STORY_REMAINDER_SAVED:            'story-remainder-saved',         // Player used serum to cure Remainder
  STORY_REMAINDER_CURED:            'story-remainder-cured',         // Alias — set at same time as SAVED

  // ── Act 3: Primore ──────────────────────────────────────────────────────────
  GATE_ROUTE5_PASS:                 'gate-route5-pass',
  VISITED_PRIMORE:                  'visited-primore',
  GATE_PRIMORE_PASS:                'gate-primore-pass',             // Set after badge 5 — unlocks route 6
  GATE_PRIMORE_GYM_PASS:            'gate-primore-gym-pass',
  ACT3_GARY_MET:                    'act3-gary-met',
  ACT3_GARY_BATTLE_DONE:            'act3-gary-battle-done',
  STORY_REMAINDER_ALLY:             'story-remainder-ally',          // Remainder rejoined as ally at Primore
  STORY_REMAINDER_JOINED:           'story-remainder-joined',        // Alias — set at same time as ALLY

  // ── Act 3: Symmetrika ───────────────────────────────────────────────────────
  GATE_ROUTE6_PASS:                 'gate-route6-pass',
  VISITED_SYMMETRIKA:               'visited-symmetrika',
  GATE_SYMMETRIKA_GYM_PASS:         'gate-symmetrika-gym-pass',
  ACT3_TRACEY_MET:                  'act3-tracey-met',
  STORY_NULLX_FIRST_CONTACT:        'story-nullx-first-contact',     // NULL-X spoke to player at terminal

  // ── Act 4: Integrala ────────────────────────────────────────────────────────
  GATE_ROUTE7_PASS:                 'gate-route7-pass',
  VISITED_INTEGRALA:                'visited-integrala',
  GATE_INTEGRALA_GYM_PASS:          'gate-integrala-gym-pass',
  STORY_ELM_ARRIVED:                'story-elm-arrived',             // Prof. Elm revealed NULL-X origins

  // ── Act 4: Absoluta ─────────────────────────────────────────────────────────
  GATE_ROUTE8_PASS:                 'gate-route8-pass',
  VISITED_ABSOLUTA:                 'visited-absoluta',
  GATE_ABSOLUTA_GYM_PASS:           'gate-absoluta-gym-pass',
  ROCKET_SERUM_ATTEMPT_FAILED:      'rocket-serum-attempt-failed',   // Jessie/James backed down

  // ── Act 5: NULL-X Tower ─────────────────────────────────────────────────────
  STORY_SERUM_COMPLETE:             'story-serum-complete',          // All 8 serum fragments assembled
  VISITED_NULLX_TOWER:              'visited-nullx-tower',
  GATE_TOWER_ENTRY_PASS:            'gate-tower-entry-pass',
  GATE_ELITE_PARSE_PASS:            'gate-elite-parse-pass',
  GATE_ELITE_RECURSE_PASS:          'gate-elite-recurse-pass',
  GATE_ELITE_NULL_Y_PASS:           'gate-elite-null-y-pass',
  GATE_ELITE_AXIOM_PASS:            'gate-elite-axiom-pass',
  GATE_NULLX_FINAL_PASS:            'gate-nullx-final-pass',
  STORY_NULLX_DEFEATED:             'story-nullx-defeated',
  STORY_COMPLETE:                   'story-complete',

  // ── Badge milestones (set when badge N is earned) ───────────────────────────
  STORY_BADGE_1:                    'story-badge-1',
  STORY_BADGE_2:                    'story-badge-2',
  STORY_BADGE_3:                    'story-badge-3',
  STORY_BADGE_4:                    'story-badge-4',
  STORY_BADGE_5:                    'story-badge-5',
  STORY_BADGE_6:                    'story-badge-6',
  STORY_BADGE_7:                    'story-badge-7',
  STORY_BADGE_8:                    'story-badge-8',

} as const;

/** Union type of all valid flag string values. Useful for typed flag parameters. */
export type StoryFlag = typeof FLAGS[keyof typeof FLAGS];
