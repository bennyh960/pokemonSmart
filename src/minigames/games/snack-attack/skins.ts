/**
 * Skins of the Snack Attack games — the same rules (sim.ts), a different Pokémon world:
 * what falls, what it looks like, what the play area shows and what the floating texts say.
 * Player-visible text is bilingual (resolved with useI18n().locale); `{name}` = the Pokémon playing.
 */

import type { PokemonType } from '../../../types/index.js';
import type { Bilingual } from '../../types.js';
import type { BerryKind } from './sim.js';

/** Background of the play area — see Scenery in SnackAttackGame.tsx. */
export type SceneryId = 'orchard' | 'meadow' | 'volcano' | 'river' | 'storm';

export interface ItemLook {
  /** CSS background of the item body. */
  body: string;
  /** Number colour. */
  text: string;
  /** CSS border-radius (default a circle). */
  radius?: string;
  /** Draw a leaf + stem on top (berries). */
  leaf?: boolean;
  /** Small emoji in the corner. */
  decor?: string;
  /** Size multiplier (default 1). */
  scale?: number;
}

export interface SnackText {
  /** Target hit ("BURP!"). */
  hit: Bilingual;
  /** Went past the target. */
  overshoot: Bilingual;
  /** Caught a hazard (rotten berry, rock…). */
  hazard: Bilingual;
  feverStart: Bilingual;
  hintMove: Bilingual;
  hintAdd: Bilingual;
  hintSub: Bilingual;
  hintTimes: Bilingual;
  hintDiv: Bilingual;
}

/** The hazard is of this type: a Pokémon that has it eats the hazard for points instead (see sim `hazardFriendly`). */
export interface HazardFriend {
  type: PokemonType;
  /** Floating text when it eats one, `{name}` = the Pokémon. */
  text: Bilingual;
  /** Corner emoji instead of the hazard's own (so it looks like a treat). */
  decor: string;
}

export interface SnackSkin {
  scenery: SceneryId;
  items: Record<BerryKind, ItemLook>;
  text: SnackText;
  hazardFriend?: HazardFriend;
}

const ROUND_SHADOW_TEXT = '#fff';

export const SNORLAX_SKIN: SnackSkin = {
  scenery: 'orchard',
  items: {
    normal: {
      body: 'radial-gradient(circle at 35% 30%, #fecdd3 0 12%, #f43f5e 40%, #be123c 100%)',
      text: ROUND_SHADOW_TEXT,
      leaf: true,
    },
    minus: {
      body: 'radial-gradient(circle at 35% 30%, #dbeafe 0 12%, #3b82f6 40%, #1e3a8a 100%)',
      text: ROUND_SHADOW_TEXT,
      leaf: true,
    },
    rotten: {
      body: 'radial-gradient(circle at 35% 30%, #e7e5e4 0 10%, #78716c 45%, #44403c 100%)',
      text: '#e7e5e4',
      leaf: true,
      decor: '✕',
    },
    golden: {
      body: 'radial-gradient(circle at 35% 30%, #fffbeb 0 14%, #facc15 45%, #b45309 100%)',
      text: '#78350f',
      leaf: true,
    },
  },
  text: {
    hit: { en: 'BURP!', he: 'גרעפס!' },
    overshoot: { en: 'Tummy ache!', he: 'אוי, כאב בטן!' },
    hazard: { en: 'Yuck! Rotten!', he: 'איכס! רקוב!' },
    feverStart: { en: 'Golden Berry! FEVER!', he: 'פרי זהב! קדחת!' },
    hintMove: { en: '← → or drag {name}', he: '← → או לגרור את {name}' },
    hintAdd: { en: 'Eat berries that add up to the number at the top!', he: 'אוכלים פירות שמסתכמים במספר שלמעלה!' },
    hintSub: { en: 'Blue berries take away!', he: 'פירות כחולים מורידים!' },
    hintTimes: {
      en: 'Eat 2 berries that multiply to the number at the top!',
      he: 'אוכלים 2 פירות שמכפלתם היא המספר שלמעלה!',
    },
    hintDiv: { en: 'Eat the berry that divides the number!', he: 'אוכלים את הפרי שמחלק את המספר!' },
  },
};

export const BULBASAUR_SKIN: SnackSkin = {
  scenery: 'meadow',
  items: {
    normal: {
      body: 'radial-gradient(circle at 35% 30%, #fefce8 0 14%, #facc15 45%, #ea580c 100%)',
      text: '#7c2d12',
      decor: '☀️',
    },
    minus: {
      body: 'radial-gradient(circle at 35% 30%, #f1f5f9 0 14%, #94a3b8 45%, #475569 100%)',
      text: ROUND_SHADOW_TEXT,
      radius: '45% 55% 50% 50% / 60% 60% 40% 40%',
      decor: '☁️',
    },
    rotten: {
      body: 'radial-gradient(circle at 35% 30%, #f5d0fe 0 10%, #a855f7 45%, #581c87 100%)',
      text: '#f5d0fe',
      decor: '☠️',
    },
    golden: {
      body: 'conic-gradient(#f43f5e, #f59e0b, #facc15, #22c55e, #3b82f6, #a855f7, #f43f5e)',
      text: '#fff',
      decor: '✨',
    },
  },
  text: {
    hit: { en: 'BLOOM!', he: 'פריחה!' },
    overshoot: { en: 'Too much sun!', he: 'יותר מדי שמש!' },
    hazard: { en: 'Ouch! Poison spore!', he: 'אאוץ׳! נבג רעיל!' },
    feverStart: { en: 'Rainbow drop! FEVER!', he: 'טיפת קשת! קדחת!' },
    hintMove: { en: '← → or drag {name}', he: '← → או לגרור את {name}' },
    hintAdd: { en: 'Catch sun drops that add up to the number!', he: 'תופסים טיפות שמש שמסתכמות במספר!' },
    hintSub: { en: 'Grey clouds take away!', he: 'עננים אפורים מורידים!' },
    hintTimes: { en: 'Catch 2 sun drops that multiply to the number!', he: 'תופסים 2 טיפות שמש שמכפלתן היא המספר!' },
    hintDiv: { en: 'Catch the sun drop that divides the number!', he: 'תופסים את טיפת השמש שמחלקת את המספר!' },
  },
  // The whole Bulbasaur line is Poison: spores are a treat
  hazardFriend: {
    type: 'poison',
    text: { en: 'Yum! {name} loves poison spores!', he: 'יאמי! {name} אוהב נבגים רעילים!' },
    decor: '💜',
  },
};

export const CHARMANDER_SKIN: SnackSkin = {
  scenery: 'volcano',
  items: {
    normal: {
      body: 'radial-gradient(circle at 40% 70%, #fef08a 0 15%, #f97316 50%, #b91c1c 100%)',
      text: ROUND_SHADOW_TEXT,
      radius: '50% 50% 50% 50% / 65% 65% 35% 35%',
      decor: '🔥',
    },
    minus: {
      body: 'radial-gradient(circle at 35% 30%, #cbd5e1 0 12%, #475569 50%, #1e293b 100%)',
      text: ROUND_SHADOW_TEXT,
      radius: '55% 45% 50% 50%',
      decor: '💨',
    },
    rotten: {
      body: 'radial-gradient(circle at 35% 30%, #ecfeff 0 14%, #22d3ee 45%, #0e7490 100%)',
      text: '#ecfeff',
      radius: '50% 50% 50% 50% / 35% 35% 65% 65%',
      decor: '💧',
    },
    golden: {
      body: 'radial-gradient(circle at 40% 70%, #fffbeb 0 15%, #facc15 45%, #c2410c 100%)',
      text: '#7c2d12',
      radius: '50% 50% 50% 50% / 65% 65% 35% 35%',
      decor: '✨',
    },
  },
  text: {
    hit: { en: 'WHOOSH!', he: 'ווּש!' },
    overshoot: { en: 'Too hot! Puff…', he: 'חם מדי! פוף…' },
    hazard: { en: 'Splash! Water!', he: 'אוי! מים!' },
    feverStart: { en: 'Golden flame! FEVER!', he: 'להבת זהב! קדחת!' },
    hintMove: { en: '← → or drag {name}', he: '← → או לגרור את {name}' },
    hintAdd: { en: 'Catch embers that add up to the number!', he: 'תופסים גחלים שמסתכמות במספר!' },
    hintSub: { en: 'Smoke puffs take away!', he: 'ענני עשן מורידים!' },
    hintTimes: { en: 'Catch 2 embers that multiply to the number!', he: 'תופסים 2 גחלים שמכפלתן היא המספר!' },
    hintDiv: { en: 'Catch the ember that divides the number!', he: 'תופסים את הגחלת שמחלקת את המספר!' },
  },
};

export const SQUIRTLE_SKIN: SnackSkin = {
  scenery: 'river',
  items: {
    normal: {
      body: 'radial-gradient(circle at 32% 28%, #ffffff 0 12%, rgba(186,230,253,0.9) 30%, rgba(14,165,233,0.85) 100%)',
      text: '#0c4a6e',
    },
    minus: {
      body: 'conic-gradient(from 30deg, #7c3aed, #c4b5fd, #7c3aed, #c4b5fd, #7c3aed)',
      text: ROUND_SHADOW_TEXT,
      decor: '🌀',
    },
    // Rocks are the obstacles: bigger and lumpy
    rotten: {
      body: 'radial-gradient(circle at 35% 30%, #d6d3d1 0 10%, #78716c 50%, #292524 100%)',
      text: '#e7e5e4',
      radius: '42% 58% 52% 48% / 55% 45% 55% 45%',
      scale: 1.35,
      decor: '🪨',
    },
    golden: {
      body: 'radial-gradient(circle at 35% 30%, #fffbeb 0 18%, #fde68a 45%, #d97706 100%)',
      text: '#78350f',
      decor: '🐚',
    },
  },
  text: {
    hit: { en: 'SPLASH!', he: 'שפריץ!' },
    overshoot: { en: 'Glug! Too many bubbles!', he: 'גלוג! יותר מדי בועות!' },
    hazard: { en: 'Bonk! A rock!', he: 'בום! סלע!' },
    feverStart: { en: 'Golden shell! FEVER!', he: 'צדף זהב! קדחת!' },
    hintMove: { en: '← → or drag to swim', he: '← → או לגרור כדי לשחות' },
    hintAdd: {
      en: 'Swim into bubbles that add up to the number — dodge the rocks!',
      he: 'שוחים אל בועות שמסתכמות במספר — ונזהרים מהסלעים!',
    },
    hintSub: { en: 'Whirlpools take away!', he: 'מערבולות מורידות!' },
    hintTimes: { en: 'Grab 2 bubbles that multiply to the number!', he: 'תופסים 2 בועות שמכפלתן היא המספר!' },
    hintDiv: { en: 'Grab the bubble that divides the number!', he: 'תופסים את הבועה שמחלקת את המספר!' },
  },
};

export const PIKACHU_SKIN: SnackSkin = {
  scenery: 'storm',
  items: {
    normal: {
      body: 'radial-gradient(circle at 35% 30%, #fefce8 0 14%, #fde047 45%, #ca8a04 100%)',
      text: '#422006',
      decor: '⚡',
    },
    minus: {
      body: 'radial-gradient(circle at 35% 30%, #f3e8ff 0 12%, #a855f7 45%, #4c1d95 100%)',
      text: ROUND_SHADOW_TEXT,
      decor: '⚡',
    },
    // Ground beats Electric: mud balls drain the charge
    rotten: {
      body: 'radial-gradient(circle at 35% 30%, #e7d7c1 0 10%, #a16207 45%, #451a03 100%)',
      text: '#fef3c7',
      radius: '48% 52% 45% 55% / 52% 48% 52% 48%',
      decor: '🟤',
    },
    golden: {
      body: 'radial-gradient(circle at 35% 30%, #ffffff 0 18%, #fef08a 45%, #f59e0b 100%)',
      text: '#78350f',
      decor: '⭐',
    },
  },
  text: {
    hit: { en: 'ZAP! Charged!', he: 'זאפ! טעון!' },
    overshoot: { en: 'Overload! Bzzt…', he: 'עומס! בזזט…' },
    hazard: { en: 'Mud! No zap…', he: 'בוץ! אין חשמל…' },
    feverStart: { en: 'Thunder star! FEVER!', he: 'כוכב רעם! קדחת!' },
    hintMove: { en: '← → or drag {name}', he: '← → או לגרור את {name}' },
    hintAdd: { en: 'Catch bolts that add up to the number!', he: 'תופסים ברקים שמסתכמים במספר!' },
    hintSub: { en: 'Purple bolts take away!', he: 'ברקים סגולים מורידים!' },
    hintTimes: { en: 'Catch 2 bolts that multiply to the number!', he: 'תופסים 2 ברקים שמכפלתם היא המספר!' },
    hintDiv: { en: 'Catch the bolt that divides the number!', he: 'תופסים את הברק שמחלק את המספר!' },
  },
};

/** Shared floating texts. */
export const STR = {
  fever: { en: 'FEVER ×2', he: 'קדחת ×2' },
  takeAway: { en: 'Take away!', he: 'להוריד!' },
  addUp: { en: 'Add up!', he: 'לחבר!' },
} satisfies Record<string, Bilingual>;
