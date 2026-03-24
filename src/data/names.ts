/**
 * Pokemon-world character names for NPC/sprite naming.
 * Used by both the sprite editor and map editor.
 */

export interface BilingualName {
  en: string;
  he: string;
}

/** Curated list of Pokemon-world trainer/NPC names. */
export const CHARACTER_NAMES: BilingualName[] = [
  // Male trainers
  { en: 'Joey', he: "ג'ואי" },
  { en: 'Ben', he: 'בן' },
  { en: 'Rick', he: 'ריק' },
  { en: 'Jimmy', he: "ג'ימי" },
  { en: 'Tommy', he: 'טומי' },
  { en: 'Alex', he: 'אלכס' },
  { en: 'Sam', he: 'סם' },
  { en: 'Max', he: 'מקס' },
  { en: 'Jake', he: "ג'ייק" },
  { en: 'Ethan', he: 'איתן' },
  { en: 'Red', he: 'רד' },
  { en: 'Blue', he: 'בלו' },
  { en: 'Gold', he: 'גולד' },
  { en: 'Silver', he: 'סילבר' },
  { en: 'Brock', he: 'ברוק' },
  { en: 'Gary', he: 'גארי' },
  { en: 'Lance', he: 'לאנס' },
  { en: 'Bruno', he: 'ברונו' },
  { en: 'Bugsy', he: 'באגסי' },
  { en: 'Morty', he: 'מורטי' },
  // Female trainers
  { en: 'Jenny', he: "ג'ני" },
  { en: 'Lisa', he: 'ליסה' },
  { en: 'Amy', he: 'איימי' },
  { en: 'Mia', he: 'מיה' },
  { en: 'Luna', he: 'לונה' },
  { en: 'Noa', he: 'נועה' },
  { en: 'Maya', he: 'מאיה' },
  { en: 'Talia', he: 'טליה' },
  { en: 'Shira', he: 'שירה' },
  { en: 'Crystal', he: 'קריסטל' },
  { en: 'Misty', he: 'מיסטי' },
  { en: 'Erika', he: 'אריקה' },
  { en: 'Sabrina', he: 'סברינה' },
  { en: 'Whitney', he: 'וויטני' },
  { en: 'Jasmine', he: "ג'סמין" },
  { en: 'Clair', he: 'קלייר' },
  // Professors / special
  { en: 'Oak', he: 'אוק' },
  { en: 'Elm', he: 'אלם' },
  { en: 'Nurse Joy', he: "אחות ג'וי" },
  { en: 'Officer Jenny', he: "שוטרת ג'ני" },
];

/** Pick a random name from the list. */
export function getRandomName(): BilingualName {
  return CHARACTER_NAMES[Math.floor(Math.random() * CHARACTER_NAMES.length)];
}
