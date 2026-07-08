import { getPokemonDisplayName } from '../../../../services/pokemon-data';
import type { DayCarePhase } from '../../../../systems/day-care';
import type { DayCareEntry } from '../../../../types';
import { NPC_GREETINGS, pickRandom } from './trainer.dialogue';

// Shown when phase === 'adapting' (just dropped off, no levels gained yet)
const DAYCARE_ADAPTING_LINES: ((pokeName: string) => { en: string; he: string })[] = [
  (pokeName) => ({
    en: `${pokeName} is still settling in — getting used to the daily routine here.`,
    he: `${pokeName} עדיין מתרגל להיות כאן, לומד את השגרה היומית.`,
  }),
  (pokeName) => ({
    en: `${pokeName} just arrived, we're still getting to know each other!`,
    he: `${pokeName} רק הגיע אלינו, אנחנו עדיין מתחילים להכיר.`,
  }),
];

// Shown when phase === 'doing-well' (training in progress, gaining levels)
const DAYCARE_DOING_WELL_LINES: ((pokeName: string) => { en: string; he: string })[] = [
  (pokeName) => ({
    en: `${pokeName} is doing really well! Growing stronger every day.`,
    he: `${pokeName} מתקדם ממש יפה! מתחזק כל יום.`,
  }),
  (pokeName) => ({
    en: `${pokeName}'s training is going great — you'll notice the difference when you pick them up.`,
    he: `האימונים של ${pokeName} מתקדמים מצוין, תבחין בהבדל כשתאסוף אותו.`,
  }),
];

// Shown when phase === 'stop-grow' (hit the level cap, ready to come back)
const DAYCARE_STOP_GROW_LINES: ((pokeName: string) => { en: string; he: string })[] = [
  (pokeName) => ({
    en: `${pokeName} has grown as much as they can here — it's time to come pick them up!`,
    he: `${pokeName} התחזק כמה שהוא יכול כאן, הגיע הזמן לבוא לאסוף אותו!`,
  }),
  (pokeName) => ({
    en: `${pokeName} avoid for listen to us.It might be need you now , please came soon as you can.`,
    he: `${pokeName} לא הקשיב לנו, אולי הוא צריך אותך עכשיו, בבקשה בוא בהקדם האפשרי.`,
  }),
  (pokeName) => ({
    en: `${pokeName} show signs of evolution , please came fast to not missed that. We stop the training till you came.`,
    he: `${pokeName} מראה סימני התפתחות, בבקשה בוא מהר כדי לא לפספס את זה. עצרנו את האימונים עד שתגיע.`,
  }),
];

// Optional day-care flavor/hint lines
const DAYCARE_HINT_LINES: { en: string; he: string }[] = [
  {
    en: 'Did you know Pokémon sometimes learn moves faster while staying here?',
    he: 'ידעת שפוקימונים לפעמים לומדים מהלכים מהר יותר כשהם נשארים כאן?',
  },
  {
    en: "Some trainers say walking more brings out a Pokémon's hidden potential.",
    he: 'חלק מהמאמנים אומרים שהליכה רבה מוציאה לפועל פוטנציאל חבוי של הפוקימון.',
  },
  {
    en: "You'd be surprised how much a Pokémon can grow with the right care.",
    he: 'תופתע כמה פוקימון יכול להתחזק עם הטיפול הנכון.',
  },
];

export const generateDaycareDialogue = (entry: DayCareEntry, phase: DayCarePhase): { en: string; he: string }[] => {
  const pokeName = getPokemonDisplayName(entry.pokemon.id);

  const bodyPool =
    phase === 'stop-grow'
      ? DAYCARE_STOP_GROW_LINES
      : phase === 'doing-well'
        ? DAYCARE_DOING_WELL_LINES
        : DAYCARE_ADAPTING_LINES;

  const lines: { en: string; he: string }[] = [];

  lines.push(pickRandom(NPC_GREETINGS));

  const bodyLine = pickRandom(bodyPool);
  lines.push({ en: bodyLine(pokeName).en, he: bodyLine(pokeName).he });

  if (Math.random() < 0.4) {
    lines.push(pickRandom(DAYCARE_HINT_LINES));
  }

  return lines;

  // Kept for reference until real authored day-care dialogue exists:
  // return npc.dialogue;
};
