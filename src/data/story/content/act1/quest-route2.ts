/**
 * ACT 1: Route 2 — Train Harder
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act1-route2
 * GATES:    none
 *
 * STORY BEATS (in order):
 *   1. Player Has first tag , reaches Route 2 , meet rival and start cutscene for first battle. 
//  * rival explain on phone usage and re-encounters 
*    2. player meet more trainers and battle them , on before exit Prof Algorithma calls and explain more about NUll-x (trigger by CUSTOM_DEFAT_TRAINER id)
 *   2. Player reaches the gate checkpoint → math questions (5 required)
 *
 * FLAGS SET: ACT1_RIVAL_BATTLE_1,CUSTOM_DEFAT_TRAINER, GATE_ROUTE2_MINISBURG_PASS
 * FLAGS READ: ACT0_COMPLETE, ACT1_NULLX_INTRO_SEEN, GATE_ROUTE1_PASS
 *
 * MAP IDs:  'route-2'   (NPC id: 'route2-exit-npc' placed near the gate)
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act1-route2',
  title: { en: 'Train Harder', he: 'התאמן קשה יותר' },
  objective: { en: 'Travel through Route 2 and face new challenges', he: 'עבור דרך שביל 2 והתמודד עם אתגרים חדשים' },
});

registerQuest({
  id: 'main-act1-route2-rival-search',
  title: { en: 'Rei Miinder - Search', he: 'ריי מיינדר - חיפוש' },
  objective: { en: 'Find and challenge your rival on Route 2', he: 'מצא את היריב שלך ואתגר אותו בשביל 2' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────
// Gates on :
// route 2 -> minsburg
// sumvile->route2

// ── Cutscenes ─────────────────────────────────────────────────────────────────

registerCutscene({
  id: 'act1-scene-prof-algorithma-route2',
  skippable: false,
  phoneCaller: { en: 'Prof. Algorithma', he: "פרופ' אלגוריתמה" },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: 'Congratulations on your progress. Adda the Gym Leader mentioned you were doing well.',
          he: 'ברכות על ההתקדמות שלך. אדא מנהיגת ה-מכון הזכירה שאתה עושה עבודה טובה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: 'You helped Sumvile return the bridge Crystal, you where brave to defeat team rocket but thier resources are vast and they will keep coming. I suggest you train harder and explore Route 2, there are some trainers there that can give you a good fight.',
          he: 'עזרת לסאמוויל להחזיר את גביש הגשר, היית אמיץ להילחם בצוות רוקט אך המשאבים שלהם עצומים והם ימשיכו להגיע. אני מציע שתתאמן יותר ותחקור את שביל 2, יש שם כמה מאמנים שיכולים לתת לך קרב טוב.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: 'Rei Minder also should be in route 2. He also has been training hard and will provide a tough challenge.',
          he: 'ריי מיינדר גם אמור להיות בשביל 2. הוא גם התאמץ קשה ויספק אתגר קשה.',
        },
      ],
    },

    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-route2-rival-search' } },
  ],
});

registerCutscene({
  id: 'act1-scene-rival-route2',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Rei Minder / ריי שארית',
      lines: [
        {
          en: "Hey again. I see you've made it to Route 2. I've been waiting for you. Ready for our battle?",
          he: 'היי שוב. אני רואה שהגעת לשביל 2. חיכיתי לך. מוכן לקרב שלנו?',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_RIVAL_BATTLE_1 } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// Talking to the Route 2 enter
registerStoryEvent({
  id: 'evt-route2-enter',
  trigger: { type: 'map-enter', mapId: 'route-2' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT1_PROF_ALGORITHMA_ROUTE2_SCENE_SEEN }],
  repeatable: true,
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act1-scene-prof-algorithma-route2' },
    { type: 'set-quest', questId: 'main-act1-route2-rival-search' },
    { type: 'set-flag', flag: FLAGS.ACT1_PROF_ALGORITHMA_ROUTE2_SCENE_SEEN },
  ],
});

// Gate 1 cleared → advance quest (if exit NPC cutscene already played this is a no-op)
registerStoryEvent({
  id: 'evt-ACT1_RIVAL_BATTLE_1',
  trigger: { type: 'npc-interact', npcId: 'rival-reminder-act1-battle-1' },
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-scene-rival-route2' }],
});
