/**
 * Unown ambush in the overworld — the story side of `minigames/english/ambush.ts`.
 *
 * Lore: the Unown are Numeria's living letters, the ones that once wrote all its words. NULL-X's Glitch is
 * made of Unown it scrambled. Beat a glitched Pokémon and the Unown it was made of burst out, still mixed up —
 * reading their words with them sets them free. Prof. Algorithma explains it on the first ambush.
 *
 *   battle:    `noteGlitchBattleEnd()` (battle scene, won or fled) rolls the ambush
 *   overworld: `springDueAmbush()` (when the map is idle) plays the storm cutscene, which starts the game
 */

import mapManifest from '../data/maps/map-manifest.js';
import { registerCutscene } from '../data/story/cutscenes.js';
import { FLAGS } from '../data/story/flags.js';
import { ambushChance, endAmbush, rollAmbush, takeDueAmbush, type AmbushSource } from '../minigames/english/ambush.js';
import { startMiniGame } from '../minigames/index.js';
import type { MapId } from '../data/maps/map-ids.js';
import type { PlayerData } from '../types/index.js';
import type { BilingualText } from './npc.js';
import { getPlayerData, hasActiveGame } from './game-state.js';

export const UNOWN_AMBUSH_CUTSCENE_ID = 'unown-ambush';

const UNOWN_SPEAKER: BilingualText = { en: 'Unown', he: 'אנואון' };

/** Random openings: what the child sees when the storm settles (one is drawn per ambush). */
const INTROS: readonly BilingualText[][] = [
  [
    { en: 'The Glitch cracks open… it was made of Unown!', he: "הגליץ' נסדק… הוא היה עשוי מאנואון!" },
    { en: 'Their letters are all mixed up! Help them find their words!', he: 'האותיות שלהם התבלבלו! עזרו להם למצוא את המילים!' },
  ],
  [
    { en: 'Zzzt! Little letters fly out of the Glitch!', he: "זזזט! אותיות קטנות עפות מתוך הגליץ'!" },
    { en: 'Unown spin all around you! Read with them to calm them down!', he: 'אנואון מסתובבים סביבכם! קראו איתם כדי להרגיע אותם!' },
  ],
  [
    { en: 'A storm of Unown! The Glitch was hiding them!', he: "סערת אנואון! הגליץ' הסתיר אותם!" },
    { en: "Fix their words and they'll fly home!", he: 'תקנו את המילים שלהם והם יעופו הביתה!' },
  ],
  [
    { en: '?!?! The Unown are lost!', he: '?!?! האנואון הלכו לאיבוד!' },
    { en: 'NULL-X scrambled their letters. Only you can put them back!', he: 'נאל איקס ערבב את האותיות שלהם. רק אתם יכולים לסדר אותן!' },
  ],
  [
    { en: 'The air buzzes… letters everywhere!', he: 'האוויר מזמזם… אותיות בכל מקום!' },
    { en: 'These Unown remember a game you played. Show them you remember too!', he: 'האנואון האלה זוכרים משחק ששיחקתם. הראו להם שגם אתם זוכרים!' },
  ],
  [
    { en: 'Pop! Pop! Pop! Unown burst out of the Glitch!', he: "פופ! פופ! פופ! אנואון פורצים מתוך הגליץ'!" },
    { en: 'Quick — help them before the Glitch grabs them again!', he: "מהר — עזרו להם לפני שהגליץ' יתפוס אותם שוב!" },
  ],
];

/** A round left uncleared comes back with this. */
const RETRY_INTRO: BilingualText[] = [
  { en: 'The Unown are back! Their words are still mixed up.', he: 'האנואון חזרו! המילים שלהם עדיין מבולבלות.' },
  { en: "Let's fix them this time!", he: 'בואו נתקן אותן הפעם!' },
];

/** First ambush: the professor explains what just happened. */
const FIRST_CALL: BilingualText[] = [
  { en: 'Hello? Can you hear me? My radar shows a huge signal right where you are!', he: 'הלו? שומעים אותי? המכ"ם שלי מראה אות ענק בדיוק איפה שאתם!' },
  { en: 'Those are Unown — the living letters. Long ago they wrote every word of Numeria.', he: 'אלה אנואון — האותיות החיות. פעם הם כתבו את כל המילים של נומריה.' },
  {
    en: "NULL-X's Glitch is made of Unown it scrambled. Beat an infected Pokémon, and its Unown fall out — still mixed up!",
    he: "הגליץ' של נאל איקס עשוי מאנואון שהוא ערבב. כשמנצחים פוקימון נגוע, האנואון שלו נופלים החוצה — עדיין מבולבלים!",
  },
  { en: 'Read their words with them. Every Unown you fix makes the Glitch weaker!', he: "קראו איתם את המילים שלהם. כל אנואון שתתקנו מחליש את הגליץ'!" },
];

/** The game's intro card line. */
const GAME_INTRO: BilingualText = { en: 'Read with the Unown to fix their words!', he: 'קראו עם האנואון ותקנו את המילים שלהם!' };

let intro: BilingualText[] = [];
let launchGame: () => void = () => {};

registerCutscene({
  id: UNOWN_AMBUSH_CUTSCENE_ID,
  steps: [
    { type: 'play-sfx', sfxId: 'cry:201' },
    { type: 'screen-shake', durationMs: 900, intensity: 2 },
    { type: 'fx', kind: 'unown', durationMs: 2200, radius: 3, waitForComplete: true },
    { type: 'fx', kind: 'burst', durationMs: 400, radius: 2 },
    { type: 'play-sfx', sfxId: 'cry:201' },
    { type: 'dialogue', speakerName: UNOWN_SPEAKER, lines: () => intro },
    {
      type: 'if-flag',
      flag: FLAGS.UNOWN_AMBUSH_MET,
      thenSteps: [],
      elseSteps: [
        { type: 'dialogue', speakerId: 'Prof.Algorithma', lines: FIRST_CALL },
        { type: 'action', action: { type: 'set-flag', flag: FLAGS.UNOWN_AMBUSH_MET } },
      ],
    },
    { type: 'run', run: () => launchGame() },
  ],
});

/** City maps (and their houses): every map in the folder of a world-map city. */
const CITY_FOLDERS = new Set(mapManifest.cities.map((c) => c.id.split('/')[0]));

export function isCityMap(mapId: string): boolean {
  return CITY_FOLDERS.has(mapId.split('/')[0]);
}

/** A battle with a glitched Pokémon ended (won or fled): maybe the Unown it was made of burst out. */
export function noteGlitchBattleEnd(source: AmbushSource, mapId: string | null): void {
  if (!hasActiveGame() || !mapId) return;
  const pd = getPlayerData();
  const chance = ambushChance(source, pd.story?.mapInfection[mapId as MapId], isCityMap(mapId));
  rollAmbush(pd.miniGames ?? {}, pd.totalSteps, chance);
}

/** When an ambush is due: sets up its cutscene (play it with UNOWN_AMBUSH_CUTSCENE_ID) and returns true. */
export function springDueAmbush(pd: PlayerData): boolean {
  const due = takeDueAmbush(pd.totalSteps);
  if (!due) return false;
  intro = due.retry ? RETRY_INTRO : INTROS[Math.floor(Math.random() * INTROS.length)];
  const { gameId, level, stepIndex } = due.round;
  launchGame = () =>
    startMiniGame(gameId, {
      level,
      ambush: { stepIndex, intro: GAME_INTRO },
      onFinish: (outcome) => endAmbush(!!outcome?.cleared, getPlayerData().totalSteps),
    });
  return true;
}
