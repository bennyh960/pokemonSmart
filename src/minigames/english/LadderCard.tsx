/**
 * The child's place on the English ladder: level name, the points bar to the next level and how many times each game
 * of the level was played (PLAYS_TO_CLIMB each to climb). Word Dex and Word Board.
 */

import { useI18n } from '../../ui-react/context/i18n-context.js';
import { getMiniGame } from '../registry.js';
import type { Bilingual, MiniGamesSave, Stars } from '../types.js';
import { ENGLISH_LADDER, ladderProgress, ladderStep, PLAY_MIN_STARS, PLAYS_TO_CLIMB, STAR_POINTS } from './ladder.js';

const TEXT = {
  step: { en: 'Level', he: 'רמה' },
  of: { en: 'of', he: 'מתוך' },
  nextStep: { en: 'To the next level:', he: 'לרמה הבאה:' },
  points: { en: 'points', he: 'נקודות' },
  topStep: { en: 'You reached the top level!', he: 'הגעתם לרמה הכי גבוהה!' },
  playEach: {
    en: 'Play every game {n} times with {stars} or more:',
    he: 'שחקו בכל משחק {n} פעמים עם {stars} ומעלה:',
  },
  level: { en: 'level', he: 'שלב' },
} satisfies Record<string, Bilingual>;

/** Star counts that earn points, for the "★★ = +1" hint. */
const SCORING: Stars[] = ([1, 2, 3] as const).filter((n) => STAR_POINTS[n] > 0);

export function LadderCard({ save }: { save: MiniGamesSave }) {
  const { locale } = useI18n();
  const stepIndex = ladderStep(save);
  const step = ENGLISH_LADDER[stepIndex];
  const bar = ladderProgress(save);
  return (
    <div className="mg-pop-in mg-glass rounded-3xl p-4">
      <p className="text-xl font-black">
        🪜 {TEXT.step[locale]} {stepIndex + 1} {TEXT.of[locale]} {ENGLISH_LADDER.length} — {step.name[locale]}
      </p>
      {bar ? (
        <>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm font-bold text-white/85">
            <span>
              {TEXT.nextStep[locale]} {bar.have}/{bar.need} {TEXT.points[locale]}
            </span>
            {SCORING.map((n) => (
              <span key={n} dir="ltr" className="text-yellow-200">
                {'★'.repeat(n)} = +{STAR_POINTS[n]}
              </span>
            ))}
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/25">
            <div
              className="h-full rounded-full bg-yellow-300 transition-[width] duration-500"
              style={{ width: `${(bar.have / bar.need) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-white/85">
            {TEXT.playEach[locale]
              .replace('{n}', String(PLAYS_TO_CLIMB))
              .replace('{stars}', '★'.repeat(PLAY_MIN_STARS))}
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {bar.plays.map(({ play, done }, i) => {
              const twice = step.play.filter((p) => p.gameId === play.gameId).length > 1;
              return (
                <li
                  key={i}
                  className={`rounded-full px-3 py-0.5 text-sm font-black ${
                    done >= PLAYS_TO_CLIMB ? 'bg-green-300 text-green-950' : 'bg-black/25 text-white'
                  }`}
                >
                  {getMiniGame(play.gameId).name[locale]}
                  {twice && typeof play.level === 'number' && ` (${TEXT.level[locale]} ${play.level})`}{' '}
                  <span dir="ltr">
                    {done >= PLAYS_TO_CLIMB ? '✓' : `${done}/${PLAYS_TO_CLIMB}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-1 font-bold text-green-200">{TEXT.topStep[locale]}</p>
      )}
    </div>
  );
}
