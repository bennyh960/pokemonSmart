import { countBadges } from '../../../../data/badges';
import { getPokemonDisplayName } from '../../../../services/pokemon-data';
import type { TrainerData } from '../../../../systems/npc';
import type { PlayerData } from '../../../../types';

export const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- NPC dialogue pattern pools ---

export const NPC_GREETINGS: { en: string; he: string }[] = [
  { en: 'Hello! How are you doing?', he: 'שלום! מה שלומך?' },
  { en: 'Hey there! How have you been?', he: 'היי! מה נשמע?' },
  { en: "Hello! How's your journey going?", he: 'שלום! איך המסע שלך מתקדם?' },
];

// Shown when reEncounterStatus.eligible is false (on cooldown)
const TRAINER_NOT_ELIGIBLE_LINES: ((pokemonName: { en: string; he: string }) => { en: string; he: string })[] = [
  () => ({
    en: "I need a bit more training time... but let's keep in touch!",
    he: 'אני צריך עוד קצת זמן אימונים... אבל נשאר בקשר!',
  }),
  () => ({
    en: "I'm focusing on my next challenge right now. I hope I'll be ready for our rematch soon!",
    he: 'כרגע אני מתמקד באתגר הבא שלי. אני מקווה שבקרוב אהיה מוכן למקצה החוזר שלנו.',
  }),
  (pokemonName) => ({
    en: `${pokemonName.en} is getting so much stronger — we're working hard together.`,
    he: `${pokemonName.he} מתחזק כל כך הרבה, אנחנו עובדים על זה קשה ביחד.`,
  }),
];

// Shown when reEncounterStatus.eligible is true
const TRAINER_ELIGIBLE_LINES: ((pokemonName: { en: string; he: string }) => { en: string; he: string })[] = [
  (pokemonName) => ({
    en: `You have to see how strong ${pokemonName.en} has gotten. Wonder if you'll even recognize them!`,
    he: `אתה חייב לראות כמה ${pokemonName.he} התחזק. תוהה אם בכלל תזהה אותו!`,
  }),
  () => ({
    en: "I've been waiting for our rematch. It won't be easy for you this time!",
    he: 'חיכיתי למקצה החוזר שלנו. הפעם זה לא יהיה קל בשבילך.',
  }),
  () => ({
    en: "Ready whenever you are — let's see if your training paid off.",
    he: 'מוכן מתי שתרצה, בוא נראה אם האימונים שלך השתלמו.',
  }),
];

// Optional flavor line referencing player's badge count
const buildBadgeCommentLine = (badgeCount: number): { en: string; he: string } | null => {
  if (badgeCount <= 0) return null;
  return {
    en: `Oh nice, you already have ${badgeCount} badge${badgeCount > 1 ? 's' : ''}! Impressive.`,
    he: `וואו, כבר יש לך ${badgeCount} תגים! מרשים.`,
  };
};

// Optional generic world-flavor hint line
const WORLD_HINT_LINES: { en: string; he: string }[] = [
  {
    en: 'I heard some tough water Pokémon roam near the coastline.',
    he: 'שמעתי שפוקימוני מים חזקים במיוחד מסתובבים ליד קו החוף.',
  },
  {
    en: 'I use a lot in pokedex in battle , it helps me find the right pokemon for the right situation.',
    he: 'אני משתמש הרבה בפוקדקס בקרב, זה עוזר לי למצוא את הפוקימון הנכון למצב הנכון.',
  },
  {
    en: 'Its amazing to see how weather can affect the battle, I love to see how it changes the battle.',
    he: 'זה מדהים לראות איך מזג האוויר יכול להשפיע על הקרב, אני אוהב לראות איך זה משנה את הקרב.',
  },
];

export const generateTrainerDialogue = (
  party: TrainerData['party'],
  isEligible: boolean,
  pd: PlayerData | null,
): { en: string; he: string }[] => {
  // Find the strongest Pokémon in the trainer's party (highest level) to reference in dialogue
  const strongestPokemon = party.reduce((prev, curr) => (curr.level > prev.level ? curr : prev), party[0]);

  const pokemonId = strongestPokemon.pokemonId;
  const pokemonName = pokemonId
    ? { en: getPokemonDisplayName(pokemonId), he: getPokemonDisplayName(pokemonId) }
    : { en: 'my Pokémon', he: 'הפוקימון שלי' };

  const lines: { en: string; he: string }[] = [];

  lines.push(pickRandom(NPC_GREETINGS));

  const bodyPool = isEligible ? TRAINER_ELIGIBLE_LINES : TRAINER_NOT_ELIGIBLE_LINES;
  lines.push(pickRandom(bodyPool)(pokemonName));

  const badgeCount = countBadges(pd?.badges ?? 0);
  if (Math.random() < 0.3 && badgeCount > 3) {
    const badgeLine = buildBadgeCommentLine(badgeCount);
    if (badgeLine) lines.push(badgeLine);
  }

  if (Math.random() < 0.5) {
    lines.push(pickRandom(WORLD_HINT_LINES));
  }

  return lines;

  // Kept for reference until the real authored dialogue is verified:
  // return npc.dialogue;
};
