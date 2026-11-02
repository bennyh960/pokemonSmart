/** Dusty levels (dust.ts) on the Word Board: which ones, and that 3★ cleans them for a bonus prize. Hidden when none. */

import { useI18n } from '../../ui-react/context/i18n-context.js';
import { getMiniGame } from '../registry.js';
import type { Bilingual, MiniGamesSave } from '../types.js';
import { DUST_CLEAN_STARS, DUST_DAYS } from './dust.js';
import { dustyRounds, ladderStep } from './ladder.js';

const TEXT = {
  title: { en: 'Dusty levels!', he: 'שלבים מאובקים!' },
  why: {
    en: 'Not played for {days} days. They come back in your rounds — win with {stars} to clean them and get a bonus prize!',
    he: 'לא שיחקתם בהם {days} ימים. הם יחזרו בסיבובים שלכם — נצחו עם {stars} כדי לנקות אותם ולקבל פרס בונוס!',
  },
  level: { en: 'level', he: 'שלב' },
} satisfies Record<string, Bilingual>;

export function DustyCard({ save, now }: { save: MiniGamesSave; now: number }) {
  const { locale } = useI18n();
  const dusty = dustyRounds(save, now, ladderStep(save));
  if (dusty.length === 0) return null;
  return (
    <div className="mg-pop-in rounded-3xl bg-stone-700/60 p-4 ring-2 ring-stone-300/40">
      <p className="text-xl font-black">🕸️ {TEXT.title[locale]}</p>
      <p className="mt-1 text-sm font-bold text-white/85">
        {TEXT.why[locale]
          .replace('{days}', String(DUST_DAYS))
          .replace('{stars}', '★'.repeat(DUST_CLEAN_STARS))}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {dusty.map((r) => (
          <li key={`${r.gameId}:${r.level}`} className="rounded-full bg-black/30 px-3 py-0.5 text-sm font-black">
            🕸️ {getMiniGame(r.gameId).name[locale]} ({TEXT.level[locale]} {r.level})
          </li>
        ))}
      </ul>
    </div>
  );
}
