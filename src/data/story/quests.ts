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
