/**
 * ACT 0: Zeroville Intro
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act0, main-act0-starter, main-act0-explore
 * TRIGGERS: Player enters Zeroville → enters Algorithma's lab → leaves to Route 1
 *
 * STORY BEATS (in order):
 *   1. Player enters Zeroville → quest "New Adventure" starts
 *   2. Player enters Algorithma's lab → intro cutscene → starter selection scene
 *   3. Player returns to lab → Remainder reacts jealously
 *   4. Player steps onto Route 1 → Algorithma farewell → act0 complete
 *
 * FLAGS SET: ACT0_INTRO_SEEN, ACT0_REMAINDER_MET, ACT0_COMPLETE, VISITED_ZEROVILLE
 * FLAGS READ: ACT0_INTRO_SEEN, ACT0_REMAINDER_MET, ACT0_COMPLETE
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { MapId } from '../../../maps/map-ids.js';
import type { BilingualText } from '../../../../systems/npc.js';
import { getPlayerData } from '../../../../systems/game-state.js';

const getStarterLines = (): BilingualText[] => {
  const [starter] = getPlayerData().party;
  switch (starter?.id) {
    case 1:
      return [
        { en: 'Bulbasaur! A Grass type — strategic and resilient.', he: 'בלבזואר! סוג דשא — אסטרטגי ועמיד.' },
        {
          en: 'Grass type pokemon are strong against Water , Rock , Ground types. They can learn moves that sap the strength of their opponents, and even heal themselves! A great choice for new trainers.',
          he: 'פוקמוני סוג דשא חזקים נגד סוגי מים, סלע ואדמה. הם יכולים ללמוד מהלכים שמחלישים את יריביהם ואפילו לרפא את עצמם! בחירה מצוינת לשותף הראשון .',
        },
      ];
    case 4:
      return [
        { en: 'Charmander! Fire type — bold and fierce.', he: 'צ׳רמנדר! סוג אש — נועז ואמיץ בעל כח התקפה משובח.' },
        {
          en: 'Fire type pokemon are strong against Grass , Bug , Ice , Steel types. They can learn powerful moves that deal heavy damage, but watch out — they can be a bit fragile! A fiery choice for new trainers.',
          he: 'פוקמוני סוג אש חזקים נגד סוגי דשא, חרק, קרח, פלדה. הם יכולים ללמוד מהלכים רבי עוצמה שגורמים נזק כבד, אבל שימו לב — הם יכולים להיות קצת פגיעים! בחירה לוהטת למאמנים חדשים.',
        },
      ];
    case 7:
      return [
        {
          en: 'Squirtle! Water type — adaptable and steady.',
          he: 'סקווירטל! סוג מים — גמיש עם הגנה גבוהה בזכות השריון שלו .',
        },
        {
          en: 'Water type pokemon are strong against Fire , Ground , Rock types. They can learn moves that control the battlefield and support their team. A reliable choice for new trainers.',
          he: 'פוקמוני סוג מים חזקים נגד סוגי אש, אדמה וסלע. הם יכולים ללמוד מהלכים ששולטים בשדה הקרב ותומכים בקבוצה שלהם. בחירה אמינה למאמנים חדשים.',
        },
      ];
    default:
      return [{ en: 'A fine choice!', he: 'בחירה מצוינת!' }];
  }
};

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act0',
  title: { en: 'New Adventure', he: 'הרפתקה חדשה' },
  objective: { en: "Visit Prof. Algorithma's lab", he: 'בקר במעבדה של פרופ׳ אלגוריתמה' },
});

registerQuest({
  id: 'main-act0-starter',
  title: { en: 'Choose Your Partner', he: 'בחר את השותף שלך' },
  objective: { en: 'Choose your starter Pokemon', he: 'בחר את פוקמון ההתחלה שלך' },
});

registerQuest({
  id: 'main-act0-explore',
  title: { en: 'Explore Zeroville', he: 'חקור את אפסוויל' },
  objective: { en: 'Look around Zeroville and talk to people', he: 'סייר בעיר ודבר עם האנשים' },
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

registerCutscene({
  id: 'act0-intro',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'in', durationMs: 500 },
    {
      type: 'dialogue',
      speakerId: 'algorithma',
      lines: [
        {
          en: "Ah, you're here! Welcome to my lab. I'm Professor Algorithma.",
          he: 'או, הגעת! ברוך הבא למעבדה שלי. אני פרופסור אלגוריתמה.',
        },
        {
          en: 'This is Numeria — a region where knowledge and Pokemon go hand in hand.',
          he: 'זוהי נומריה — אזור שבו ידע ופוקמונים הולכים יד ביד.',
        },
        {
          en: "Every trainer in Numeria begins their journey by choosing a partner Pokemon. It's time for you to choose yours.",
          he: 'כל מאמן ומאמנת בנומריה מתחילים את מסעם בבחירת פוקמון שותף. הגיע תורך לבחור.',
        },
      ],
    },

    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT0_INTRO_SEEN } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act0-starter' } },
    // start-scene calls deactivateCutscene() immediately — nothing after this line ever runs.
    // Post-starter content (Algorithma reaction + Remainder encounter) is in
    // act0-remainder-meets-player, which evt-act0-remainder queues while this cutscene
    // is still active and the overworld fires it as soon as it resumes after STARTER_SELECT.
    { type: 'start-scene', sceneId: 'STARTER_SELECT' },
  ],
});

registerCutscene({
  id: 'act0-remainder-meets-player',
  skippable: true,
  steps: [
    // Fade in after returning from STARTER_SELECT (which fades to black before switching scenes)
    { type: 'screen-fade', direction: 'in', durationMs: 400 },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act0-starter' } },
    {
      type: 'dialogue',
      speakerId: 'algorithma',
      lines: getStarterLines,
    },
    {
      type: 'dialogue',
      speakerId: 'algorithma',
      lines: [
        {
          en: 'In your Journey you will meet diferent types of pokemons',
          he: 'במסע שלך תפגוש סוגים שונים של פוקמונים',
        },
        {
          en: 'Some has 1 type only but some has 2 types. you will learn it soon enough.',
          he: 'יש פוקמונים עם סוג אחד ויש עם שני סוגים. תלמד את זה בקרוב.',
        },
        {
          en: "Each type has its strenghts and weaknesses. For example, your starter is strong against some types but weak against others. It's important to have a variety of pokemons in your team to be ready for any challenge!",
          he: 'לכל סוג יש חוזקות וחולשות. למשל, הפוקמון ההתחלתי שלך חזק נגד סוגים מסוימים אבל חלש נגד אחרים. חשוב שיהיה לך מגוון פוקמונים בקבוצה שלך כדי להיות מוכן לכל אתגר!',
        },
        {
          en: 'I strongly advice you use your pokedex to learn more about pokemons types and moves. It will be a great help in your journey.',
          he: 'אני מאוד ממליץ לך להשתמש בפוקדקס שלך כדי ללמוד עוד על סוגי פוקמונים ומהלכים. זה יהיה עזר גדול במסע שלך.',
        },
        {
          en: ' As you progress through the journey - the game will automatically save for you at certain points - but it is recommended to initiate saving by pressing the ENTER button - and then save manually before important challenges or before exiting the game.',
          he: ' ככל שתתקדם במסע - המשחק ישמר עבורך בנקודות שונות בצורה אוטומטית - אבל מומלץ ליזום שמירה בעזרת לחיצה על לחצן ENTER - ואז שמור ידני לפני אתגרים חשובים או לפני יציאה מהמשחק. ',
        },
        { en: 'Also, here are some items to help you get started:', he: 'בנוסף, הנה כמה פריטים שיעזרו לך להתחיל:' },
        {
          en: 'Pokeballs are essential for capturing and storing Pokemon.',
          he: 'כדורי פוקבול הם חיוניים ללכידת פוקמונים ואחסונם.',
        },
        {
          en: 'Potionsm are useful for healing your Pokemon after battles.',
          he: 'שיקויים שימושיים לריפוי הפוקמונים שלך אחרי קרבות.',
        },
        {
          en: ' Battle-Helper is very useful to new trainers. It gives you tips during battles and helps you understand type advantages.',
          he: ' עוזר קרב - מאוד שימושי למאמנים חדשים. הוא נותן לך טיפים במהלך קרבות ועוזר לך להבין את היתרונות של סוגים שונים. אפשר לכבות ולהדליק אותו במידת הצורך.',
        },
        {
          en: 'I want give you some rewards , came close to me please',
          he: 'אני רוצה לתת לך את הפריטים האלה - , תבוא אליי בבקשה',
        },
      ],
    },
    { type: 'face-npc', npcId: 'remainder-lab', dir: 'down' },

    {
      type: 'dialogue',
      speakerId: 'rival-reminder',
      lines: [
        { en: "Oh. YOU got chosen? I've been studying here for months.", he: 'או. אתה נבחרת? למדתי כאן חודשים שלמים.' },
        { en: "Whatever. Don't expect any help from me on the road.", he: 'נו טוב. אל תצפה לעזרה ממני בדרך.' },
      ],
    },
    { type: 'face-npc', npcId: 'remainder-lab', dir: 'up' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT0_REMAINDER_MET } },
  ],
});

registerCutscene({
  id: 'act0-leave-zeroville',
  skippable: true,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'דרך 1 ',
      lines: [
        {
          en: 'Welcome to Route 1 — the path connecting Zeroville and Sumville, the City of Connection.',
          he: 'ברוכים הבאים לשביל 1 — השביל שמחבר בין זירוויל לסאמוויל, עיר החיבור.',
        },
        {
          en: 'Along the way, you can encounter wild Pokémon, young trainers, and surprises.',
          he: 'לאורך הדרך ניתן לפגוש פוקימונים פראיים, מאמנים צעירים והפתעות.',
        },
        {
          en: 'Spend some time here to grow stronger before continuing to Sumville.',
          he: 'מומלץ להקדיש זמן לאזור ולהתחזק לפני שממשיכים אל סאמוויל.',
        },
        {
          en: 'Sumville lies at the end of the route. It has a Pokémon Gym.',
          he: 'סאמוויל נמצאת בקצה הדרך ובה ממוקם מכון פוקימונים. - במכון נמצאים מאמנים חזקים שתצטרכו להתמודד מולם',
        },
        {
          en: 'If your skills are strong enough, you can earn a Gym Badge.',
          he: 'אם היכולות מספיקות — ניתן לזכות בתג מכון.',
        },
        {
          en: 'Trainers who collect all 8 badges can enter the Numeria League Championship.',
          he: 'איסוף של 8 תגים מאפשר השתתפות באליפות ליגת נומריה.',
        },
        {
          en: 'That goal is far ahead — for now, focus on your journey.',
          he: 'זה יעד רחוק — בינתיים, כדאי להתמקד במסע.',
        },
        {
          en: 'The journey is not easy — many challenges and strong trainers await.',
          he: 'הדרך אינה פשוטה — מחכים אתגרים וקרבות מול מאמנים חזקים.',
        },
        {
          en: 'Explore bushes, mountains, beaches, and seas to find wild Pokémon that you can catch and add to your team.',
          he: 'בשיחים, הרים, חופים והים ניתן למצוא פוקימונים פראיים שניתן לתפוס ולצרף לצוות שלך.',
        },

        {
          en: 'Pokémon gain experience from battles and become stronger over time - as they level up, they learn new moves and grow as partners.',
          he: 'פוקימונים צוברים ניסיון מקרבות ומתחזקים בהדרגה - עם העלייה ברמות נלמדות מתקפות חדשות וגם הכח של הפוקימונים גדל.',
        },

        {
          en: 'Train your Pokémon to be ready for upcoming challenges.',
          he: 'אימון קבוע יעזור להיות מוכנים לאתגרים בהמשך.',
        },
        {
          en: 'To catch Pokémon, weaken them first before using a Poké Ball.',
          he: 'כדי לתפוס פוקימון יש להחליש אותו לפני שימוש בפוכדור. החלשה יכולה להיעשות באמצעות קרבות או מהלכים שמחלישים את היריב.',
        },
        {
          en: 'If it fails, weaken it further and try again.',
          he: 'אם לא הצליח — המשך להחליש ונסה שוב.',
        },
        {
          en: 'Pokémon Centers in every city can heal your team.',
          he: 'מרכזי פוקימונים בכל עיר מאפשרים ריפוי לצוות.',
        },
        {
          en: 'Professor Algoritmia in Zeroville can also help heal Pokémon.',
          he: 'פרופסור אלגוריתמיה בזירוויל יכול גם לסייע בריפוי.',
        },
      ],
    },

    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-route1' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT0_COMPLETE } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────
// registerStoryEvent({
//   id: 'start-test',
//   trigger: { type: 'map-enter', mapId: 'zeroville-house-tl' },
//   // conditions: [{ type: 'flag-not', flag: FLAGS.TEST_EVENT_SEEN }],
//   repeatable: true, // flag-not condition is the guard; cutscene sets TEST_EVENT_SEEN
//   actions: [{ type: 'start-cutscene', cutsceneId: 'test' }],
// });

// Entering Zeroville for the first time — set visit flag + start opening quest
registerStoryEvent({
  id: 'start-game',
  trigger: { type: 'map-enter', mapId: 'zeroville/zeroville' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_ZEROVILLE }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_ZEROVILLE },
    { type: 'set-infection', mapId: MapId.ZEROVILLE_ZEROVILLE, value: 'none' },
    { type: 'set-quest', questId: 'main-act0' },
  ],
});

// Entering Algorithma's lab before the intro → play intro cutscene
registerStoryEvent({
  id: 'evt-act0-intro',
  trigger: { type: 'map-enter', mapId: 'zeroville/algorithma-lab' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT0_INTRO_SEEN }],
  repeatable: true, // flag-not condition is the guard; cutscene sets ACT0_INTRO_SEEN
  actions: [{ type: 'start-cutscene', cutsceneId: 'act0-intro' }],
});

// After starter is chosen, OVERWORLD reloads the lab — fire Remainder encounter then.
// Trigger: map-enter (fires fresh every time the lab loads, no cross-scene state to preserve).
// Conditions guard against replaying: needs intro seen + starter picked + Remainder not met yet.
registerStoryEvent({
  id: 'evt-act0-remainder',
  trigger: { type: 'map-enter', mapId: 'zeroville/algorithma-lab' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT0_INTRO_SEEN },
    { type: 'flag-not', flag: FLAGS.ACT0_REMAINDER_MET },
  ],
  repeatable: true, // flag-not condition is the guard; cutscene sets ACT0_REMAINDER_MET
  actions: [{ type: 'start-cutscene', cutsceneId: 'act0-remainder-meets-player' }],
});

// Stepping onto Route 1 for the first time → Algorithma farewell + act0 done
registerStoryEvent({
  id: 'evt-act0-leave',
  trigger: { type: 'map-enter', mapId: 'routes/route-1' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT0_INTRO_SEEN },
    { type: 'flag-not', flag: FLAGS.ACT0_COMPLETE },
  ],
  repeatable: true, // flag-not condition is the guard; cutscene sets ACT0_COMPLETE
  actions: [{ type: 'start-cutscene', cutsceneId: 'act0-leave-zeroville' }],
});

// ----------Tests

registerStoryEvent({
  id: 'test-event',
  trigger: { type: 'npc-interact', npcId: 'thif-test123' },
  actions: [{ type: 'start-cutscene', cutsceneId: 'test' }],
});

registerCutscene({
  id: 'test',
  skippable: true,
  steps: [{ type: 'thief-npc', npcId: 'thif-test123', condition: { amount: 1, aboveLevel: 40 } }],
});
