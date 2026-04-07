/**
 * Quest Registry — All main-story and side quests.
 *
 * A quest has:
 *   - id: unique string key
 *   - title: short bilingual name shown in HUD
 *   - objective: current "what to do" line shown in HUD
 *
 * Quests are set/completed via StoryAction { type: 'set-quest' / 'complete-quest' }.
 * The player has at most one activeQuestId at a time (main story is linear).
 */

import type { BilingualText } from '../../systems/npc.js';

export interface QuestDef {
  id: string;
  title: BilingualText;
  objective: BilingualText;
}

const QUESTS: Record<string, QuestDef> = {};

export function registerQuest(def: QuestDef): void {
  QUESTS[def.id] = def;
}

export function getQuest(id: string): QuestDef | undefined {
  return QUESTS[id];
}

// ---------------------------------------------------------------------------
// Act 0 — Quiet Start
// ---------------------------------------------------------------------------

registerQuest({
  id: 'main-act0',
  title: { en: 'New Adventure', he: 'הרפתקה חדשה' },
  objective: { en: 'Visit Prof. Algorithma\'s lab', he: 'בקר במעבדה של פרופ׳ אלגוריתמה' },
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

// ---------------------------------------------------------------------------
// Act 1 — The First Gate
// ---------------------------------------------------------------------------

registerQuest({
  id: 'main-act1-route1',
  title: { en: 'Head to Sumville', he: 'לך לסאמוויל' },
  objective: { en: 'Travel through Route 1 to reach Sumville', he: 'עבור דרך שביל 1 כדי להגיע לסאמוויל' },
});

registerQuest({
  id: 'main-act1-gate',
  title: { en: 'First Verification', he: 'אימות ראשון' },
  objective: { en: 'Pass the verification gate on Route 1', he: 'עבור את שער האימות בשביל 1' },
});

registerQuest({
  id: 'main-act1-sumville',
  title: { en: 'Sumville', he: 'סאמוויל' },
  objective: { en: 'Meet Prof. Oak and explore Sumville', he: 'פגוש את פרופ׳ אוק וחקור את סאמוויל' },
});

// --- Sumville story arc sub-quests ---

registerQuest({
  id: 'main-sumville-investigate',
  title: { en: 'Locked Gym', he: 'חדר כושר נעול' },
  objective: { en: 'Investigate why the Addition Gym is closed', he: 'חקור מדוע חדר הכושר של החיבור סגור' },
});

registerQuest({
  id: 'main-sumville-rocket',
  title: { en: 'Bridge Crystal', he: 'גביש הגשר' },
  objective: { en: 'Defeat Team Rocket at the bridge and recover the stolen Crystal Core', he: 'נצח את רוקט בגשר ושחזר את גביש הליבה הגנוב' },
});

registerQuest({
  id: 'main-sumville-crystal',
  title: { en: 'Return the Crystal', he: 'החזר את הגביש' },
  objective: { en: 'Return the Bridge Crystal to the Crystal Keeper at the bridge', he: 'החזר את גביש הגשר לשומרת הגביש בגשר' },
});

registerQuest({
  id: 'main-act1-gym1',
  title: { en: 'Sumville Gym', he: 'חדר הכושר של סאמוויל' },
  objective: { en: 'Defeat Adda at the Addition Gym', he: 'נצח את אדה בחדר הכושר של החיבור' },
});

registerQuest({
  id: 'main-act1-route2',
  title: { en: 'Onward to Minusburg', he: 'קדימה לעיר מינוסבורג' },
  objective: { en: 'Cross Route 2 and reach Minusburg', he: 'חצה את שביל 2 והגע למינוסבורג' },
});

registerQuest({
  id: 'main-act1-gym2',
  title: { en: 'Minusburg Gym', he: 'חדר הכושר של מינוסבורג' },
  objective: { en: 'Defeat Minus at the Subtraction Gym', he: 'נצח את מינוס בחדר הכושר של החיסור' },
});

// ---------------------------------------------------------------------------
// Act 2
// ---------------------------------------------------------------------------

registerQuest({
  id: 'main-act2-multiplia',
  title: { en: 'Multiplia', he: 'מולטיפליה' },
  objective: { en: 'Reach Multiplia and investigate the Pokemon Center', he: 'הגע למולטיפליה וחקור את מרכז הפוקמון' },
});

registerQuest({
  id: 'main-act2-gym3',
  title: { en: 'Multiplia Gym', he: 'חדר הכושר של מולטיפליה' },
  objective: { en: 'Defeat Mila at the Multiplication Gym', he: 'נצח את מילה בחדר הכושר של הכפל' },
});

registerQuest({
  id: 'main-act2-dividia',
  title: { en: 'Save Remainder', he: 'הצל את ריי-מיינדר' },
  objective: { en: 'Find Remainder at Dividia and cure the Glitch', he: 'מצא את ריי-מיינדר בדיווידיה ורפא את הגליץ׳' },
});

registerQuest({
  id: 'main-act2-gym4',
  title: { en: 'Dividia Gym', he: 'חדר הכושר של דיווידיה' },
  objective: { en: 'Defeat Divon at the Division Gym', he: 'נצח את דיבון בחדר הכושר של החילוק' },
});

// ---------------------------------------------------------------------------
// Act 3 — Language Layer
// ---------------------------------------------------------------------------

registerQuest({
  id: 'main-act3-primore',
  title: { en: 'Primore', he: 'פרימור' },
  objective: { en: 'Reach Primore and find Gary Oak', he: 'הגע לפרימור ומצא את גארי אוק' },
});

registerQuest({
  id: 'main-act3-gym5',
  title: { en: 'Primore Gym', he: 'חדר הכושר של פרימור' },
  objective: { en: 'Defeat Prima at the Prime Gym', he: 'נצח את פרימה בחדר הכושר של מספרי הראשוניים' },
});

registerQuest({
  id: 'main-act3-symmetrika',
  title: { en: 'Symmetrika', he: 'סימטריקה' },
  objective: { en: 'Investigate the glitched terminal at Symmetrika', he: 'חקור את הטרמינל הפגום בסימטריקה' },
});

registerQuest({
  id: 'main-act3-gym6',
  title: { en: 'Symmetrika Gym', he: 'חדר הכושר של סימטריקה' },
  objective: { en: 'Defeat Symma at the Symmetry Gym', he: 'נצח את סימה בחדר הכושר של הסימטריה' },
});

// ---------------------------------------------------------------------------
// Act 4 — Rocket Escalation
// ---------------------------------------------------------------------------

registerQuest({
  id: 'main-act4-integrala',
  title: { en: 'Integrala', he: 'אינטגרלה' },
  objective: { en: 'Meet Prof. Elm and learn about NULL-X\'s history', he: 'פגוש את פרופ׳ אלם ולמד על ההיסטוריה של NULL-X' },
});

registerQuest({
  id: 'main-act4-gym7',
  title: { en: 'Integrala Gym', he: 'חדר הכושר של אינטגרלה' },
  objective: { en: 'Defeat Formax at the Formula Gym', he: 'נצח את פורמקס בחדר הכושר של הנוסחאות' },
});

registerQuest({
  id: 'main-act4-absoluta',
  title: { en: 'Absoluta', he: 'אבסולוטה' },
  objective: { en: 'Fight through Rocket patrols and reach the gym', he: 'לחם דרך סיורי רוקט והגע לחדר הכושר' },
});

registerQuest({
  id: 'main-act4-gym8',
  title: { en: 'Absoluta Gym', he: 'חדר הכושר של אבסולוטה' },
  objective: { en: 'Defeat Absa at the Absolute Gym', he: 'נצח את אבסה בחדר הכושר של הערך המוחלט' },
});

registerQuest({
  id: 'main-act4-serum',
  title: { en: 'Assemble the Serum', he: 'הרכב את הסרום' },
  objective: { en: 'Assemble all 8 serum fragments to open NULL-X Tower', he: 'אסוף את כל 8 חלקי הסרום כדי לפתוח את מגדל NULL-X' },
});

// ---------------------------------------------------------------------------
// Act 5 — The Core
// ---------------------------------------------------------------------------

registerQuest({
  id: 'main-act5-tower',
  title: { en: 'NULL-X Tower', he: 'מגדל NULL-X' },
  objective: { en: 'Enter NULL-X Tower and reach the top floor', he: 'כנס למגדל NULL-X והגע לקומה העליונה' },
});

registerQuest({
  id: 'main-act5-elite',
  title: { en: 'Elite Four', he: 'ארבעת האליטה' },
  objective: { en: 'Defeat the four guardian programs: PARSE, RECURSE, NULL-Y, AXIOM', he: 'נצח את ארבעת תוכניות השמירה: PARSE, RECURSE, NULL-Y, AXIOM' },
});

registerQuest({
  id: 'main-act5-nullx',
  title: { en: 'Confront NULL-X', he: 'עמות את NULL-X' },
  objective: { en: 'Face NULL-X and save Numeria', he: 'עמוד מול NULL-X והצל את נומריה' },
});
