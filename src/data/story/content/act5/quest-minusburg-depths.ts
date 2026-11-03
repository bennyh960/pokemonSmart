/**
 * ACT 5: Minusburg — "The Depths" (start of the arc)
 * ─────────────────────────────────────────────────────────────────────────────
 * After badge 7, Max's Charizard flies the player (and Max) to Minusburg
 * (act4/quest-percentile-burning-chance.ts, beat 13). Gary and Officer Jenny wait there:
 * the glitch comes from under the city, where the next NULL-X core hides. Lance went down first.
 *
 * STORY BEATS (in order):
 *   1. Landing at 44,3 → Max flies home → Jenny + Gary explain what is under the city.
 *   2. (next — not built) Lance's signal → the way down under Minusburg.
 *
 * FLAGS SET:  ACT5_MB_ARC_STARTED
 * FLAGS READ: ACT4_PCT_GARY_CALLED, ACT4_PCT_FLY_HILL (Max came along)
 *
 * NPC IDs (minusburg.json): npc-mb-gary-landing, npc-mb-jenny-landing, npc-mb-max-landing
 */

import { registerCutscene } from '../../cutscenes.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { registerQuest } from '../../quests.js';
import { MapId } from '../../../maps/map-ids.js';

const CITY = MapId.MINUSBURG_MINUSBURG;
const CHARIZARD = 6;
const GARY = 'npc-mb-gary-landing';
const JENNY = 'npc-mb-jenny-landing';
const MAX = 'npc-mb-max-landing';

registerQuest({
  id: 'main-act5-mb-depths',
  title: { en: 'Under Minusburg', he: 'מתחת למינוסבורג' },
  objective: {
    en: 'Lance is looking around under the city. Get your team ready for his signal!',
    he: 'לאנס בודק מה יש מתחת לעיר. תכין את הקבוצה שלך לאות שלו!',
  },
});

// ── Beat 1: Landing → Max flies home → Gary + Jenny start the arc ─────────────

registerStoryEvent({
  id: 'evt-mb-landing',
  trigger: { type: 'map-enter', mapId: CITY },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_GARY_CALLED },
    { type: 'flag-not', flag: FLAGS.ACT5_MB_ARC_STARTED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-mb-landing' }],
});

registerCutscene({
  id: 'cutscene-mb-landing',
  steps: [
    {
      type: 'dialogue',
      speakerId: GARY,
      lines: [{ en: 'You made it! Nice ride, show-off.', he: 'הגעת! טיסה יפה, שוויצר.' }],
    },
    {
      // Max only came along on the Charizard ride (old saves got Gary's call in Percentile instead)
      type: 'if-flag',
      flag: FLAGS.ACT4_PCT_FLY_HILL,
      thenSteps: [
        {
          type: 'dialogue',
          speakerId: MAX,
          lines: [
            {
              en: 'My gym needs me, so I must fly home. Good luck, young mathematician!',
              he: 'המכון שלי צריך אותי, אז אני חייב לטוס הביתה. בהצלחה, מתמטיקאי צעיר!',
            },
          ],
        },
        { type: 'pokemon-anim', pokemonId: CHARIZARD, motion: 'fly', from: { npcId: MAX } },
        { type: 'hide-npc', npcId: MAX },
      ],
    },
    {
      type: 'dialogue',
      speakerId: JENNY,
      lines: [
        {
          en: 'Welcome back to Minusburg. Something strange is going on under our city.',
          he: 'ברוך שובך למינוסבורג. משהו מוזר קורה מתחת לעיר שלנו.',
        },
        {
          en: 'The ground shakes at night, and the street numbers keep dropping to zero!',
          he: 'האדמה רועדת בלילה, והמספרים ברחובות כל הזמן יורדים לאפס!',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: GARY,
      lines: [
        {
          en: 'Grandpa Oak was right. The next NULL-X core is hiding down there.',
          he: 'סבא אוק צדק. הליבה הבאה של NULL-X מתחבאת שם למטה.',
        },
        {
          en: 'Lance went down first to look around. When he sends the signal, we go in together.',
          he: 'לאנס ירד ראשון לבדוק. כשהוא ישלח את האות, ניכנס ביחד.',
        },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act5-minusburg' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act5-mb-depths' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT5_MB_ARC_STARTED } },
  ],
});
