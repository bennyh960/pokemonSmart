/**
 * ACT 4: Percentile — the Poké Mart that sells held items
 * ─────────────────────────────────────────────────────────────────────────────
 * Percentile's mart is the shared `shared/mart-interior`, but entered from Percentile it shows its
 * own shopkeeper (`npc-pct-mart-keeper`, `enteredFrom`) who also sells held items. Kalfon's
 * neighbour outside (`npc-percentile-mart-fan`) tells the player about it.
 *
 * STORY BEAT: first time in the shop — after the shop's questions (or straight away when the
 * player already holds a shop pass) — the shopkeeper explains held items and the Exp Share.
 *
 * FLAGS SET: PERCENTILE_MART_INTRO
 */

import { registerStoryEvent } from '../../events.js';
import type { StoryCondition } from '../../events.js';
import { registerCutscene } from '../../cutscenes.js';
import { FLAGS } from '../../flags.js';
import { MapId } from '../../../maps/map-ids.js';
import { getItem } from '../../../items.js';
import { getAutoGateId } from '../../../../systems/story-engine.js';
import { EXP_SHARE_ITEM_ID, SHARED_XP_CONFIG } from '../../../../systems/shared-xp.js';

const MART = MapId.SHARED_MART_INTERIOR;
const MART_GATE = getAutoGateId('pokemarket', MART);
const KEEPER = 'npc-pct-mart-keeper';
const KEEPER_NAME = { en: 'Penny', he: 'פני' };

const FIRST_VISIT_FROM_PERCENTILE: StoryCondition[] = [
  { type: 'entered-from', mapIds: [MapId.PERCENTILE_PERCENTILE] },
  { type: 'flag-not', flag: FLAGS.PERCENTILE_MART_INTRO },
];

// Questions asked on the way in → the scene starts once they're answered
registerStoryEvent({
  id: 'evt-pct-mart-intro-after-gate',
  trigger: { type: 'gate-cleared', gateId: MART_GATE },
  conditions: FIRST_VISIT_FROM_PERCENTILE,
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-mart-intro' }],
});

// Shop pass still open (no questions this time) → the scene starts on entry
registerStoryEvent({
  id: 'evt-pct-mart-intro-open-pass',
  trigger: { type: 'map-enter', mapId: MART },
  conditions: [...FIRST_VISIT_FROM_PERCENTILE, { type: 'gate-open', gateId: MART_GATE }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-mart-intro' }],
});

const pct = (fraction: number) => Math.round(fraction * 100);

registerCutscene({
  id: 'cutscene-pct-mart-intro',
  steps: [
    { type: 'play-sfx', sfxId: 'exclaim' },
    {
      type: 'dialogue',
      speakerId: KEEPER,
      speakerName: KEEPER_NAME,
      lines: [
        {
          en: 'Welcome, welcome! You found the best shop in all of Numeria!',
          he: 'ברוך הבא! מצאת את החנות הכי טובה בכל נומריה!',
        },
        {
          en: 'Other shops sell balls and potions. Here you also get HELD ITEMS!',
          he: 'בחנויות אחרות יש כדורים ושיקויים. פה יש גם אביזרים מיוחדים!',
        },
        {
          en: 'A held item is a gift your Pokémon carries into battle. It works all by itself!',
          he: 'אביזר הוא מתנה שהפוקימון שלך לוקח איתו לקרב. הוא עובד לבד!',
        },
        {
          en: 'Leftovers heal a little every turn. A Choice Band makes attacks hit harder!',
          he: 'שאריות מרפאות קצת בכל תור. סרט הבחירה מחזק את ההתקפות!',
        },
        {
          en: 'To give one: open your party, pick a Pokémon, and go to "Held Items".',
          he: 'כדי לתת אביזר: פתח את הקבוצה, בחר פוקימון ולך ל"אביזרים".',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: KEEPER,
      speakerName: KEEPER_NAME,
      lines: () => {
        const price = getItem(EXP_SHARE_ITEM_ID)?.price ?? 0;
        const share = pct(SHARED_XP_CONFIG.watcherShare);
        const gap = SHARED_XP_CONFIG.watcherLevelGap;
        return [
          {
            en: 'And my favourite: the Exp Share!',
            he: 'והאהוב עליי: משתף הניסיון!',
          },
          {
            en: `A Pokémon holding it watches the battle from the bench. When you win, it gets ${share}% of the EXP!`,
            he: `פוקימון שמחזיק אותו צופה בקרב מהספסל. כשאתה מנצח, הוא מקבל ${share}% מהניסיון!`,
          },
          {
            en: 'Perfect for a weak Pokémon — like a Magikarp that only knows Splash!',
            he: "מושלם לפוקימון חלש — כמו מג'יקארפ שיודע רק התזה!",
          },
          {
            en: `But it only works if the Pokémon can still evolve, and it stops ${gap} levels below the weakest Pokémon in the fight.`,
            he: `אבל הוא עובד רק אם הפוקימון עוד יכול להתפתח, ונעצר ${gap} רמות מתחת לפוקימון הכי חלש בקרב.`,
          },
          {
            en: 'So watch stronger battles to keep growing — then let it fight on its own!',
            he: 'אז צפה בקרבות חזקים יותר כדי להמשיך לגדול — ואז תן לו להילחם בעצמו!',
          },
          {
            en: 'Tip: a Pokémon that fought and was switched out gets EXP too!',
            he: 'טיפ: גם פוקימון שנלחם והוחלף מקבל ניסיון!',
          },
          {
            en: `The Exp Share costs ₽${price}. Come and look around!`,
            he: `משתף הניסיון עולה ₽${price}. בוא תסתכל!`,
          },
        ];
      },
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.PERCENTILE_MART_INTRO } },
  ],
});
