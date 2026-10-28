/** Memory Match — play area: a grid of cards; match each English word with its picture / Hebrew. */

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { todayKey } from '../../english/learning.js';
import { createRng } from '../../english/random.js';
import { WordPic } from '../../english/ui.js';
import { useWordStats } from '../../english/useWords.js';
import { useReducedMotion } from '../../shell/hooks.js';
import type { Bilingual, MiniGameProps } from '../../types.js';
import {
  closeOpen,
  COMBO_POINTS,
  flip,
  generateMemory,
  isDone,
  MATCH_POINTS,
  memoryAnswers,
  memoryStars,
  NEW_MEMORY,
  type MemoryCard,
  type MemoryConfig,
  type MemoryState,
} from './memory.js';
import './memory-match.css';

/** How long a wrong pair stays face up. */
const SHOW_WRONG_MS = 1000;
const FINISH_DELAY_MS = 1200;

const TEXT = {
  hint: { en: 'Find the pairs!', he: 'מצאו את הזוגות!' },
} satisfies Record<string, Bilingual>;

export function MemoryMatchGame({ level, runId, paused, hud, sfx, onFinish }: MiniGameProps<MemoryConfig>) {
  const { locale } = useI18n();
  const reduced = useReducedMotion();
  const [stats, recordWords] = useWordStats();
  const cfg = level.config;
  const [seed] = useState(() => (Date.now() ^ Math.imul(runId + 1, 2654435761)) >>> 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cards = useMemo(() => generateMemory(cfg, createRng(seed), stats, todayKey()), [seed]);
  const [state, setState] = useState<MemoryState>(NEW_MEMORY);
  const [score, setScore] = useState(0);
  const finished = useRef(false);

  useEffect(() => hud.setScore(0), [hud]);

  // A wrong pair turns back over after a moment (waits while paused)
  useEffect(() => {
    if (state.open.length < 2 || paused) return;
    const id = window.setTimeout(() => setState((s) => closeOpen(s)), SHOW_WRONG_MS);
    return () => window.clearTimeout(id);
  }, [state.open, paused]);

  // All pairs found → save the words, report the stars
  useEffect(() => {
    if (!isDone(cards, state) || finished.current || paused) return;
    const id = window.setTimeout(() => {
      finished.current = true;
      recordWords(memoryAnswers(cards, state));
      onFinish({ stars: memoryStars(state.mistakes, cfg.pairs), score, extra: { mistakes: state.mistakes } });
    }, FINISH_DELAY_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, paused]);

  function tap(i: number, e: MouseEvent) {
    if (paused) return;
    const { state: next, result } = flip(cards, state, i);
    if (result === 'ignored') return;
    setState(next);
    const card = cards[i];
    if (result === 'opened') {
      sfx.tap();
      if (card.face === 'en') sfx.word(card.word.en);
    } else if (result === 'match') {
      const points = MATCH_POINTS + (next.combo - 1) * COMBO_POINTS;
      setScore((s) => s + points);
      hud.addScore(points, { x: e.clientX, y: e.clientY });
      hud.setCombo(next.combo);
      sfx.correct(next.combo);
      window.setTimeout(() => sfx.word(card.word.en), 300);
      if (isDone(cards, next) && !reduced) hud.confetti();
    } else {
      hud.setCombo(0);
      sfx.wrong();
      if (card.face === 'en') sfx.word(card.word.en);
    }
  }

  const cols = cards.length <= 8 ? 'grid-cols-4' : cards.length <= 10 ? 'grid-cols-5' : 'grid-cols-4 sm:grid-cols-6';

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:pt-5">
      <p className="mg-glass rounded-full px-5 py-2 text-lg font-black">{TEXT.hint[locale]}</p>
      <div dir="ltr" className={`grid w-full max-w-3xl flex-1 content-center gap-2 sm:gap-3 ${cols}`}>
        {cards.map((card, i) => {
          const up = state.open.includes(i) || state.matched.includes(i);
          const wrong = state.open.length === 2 && state.open.includes(i);
          return (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => tap(i, e)}
              className={`mg-memory-match-card ${up ? 'is-up' : ''} ${state.matched.includes(i) ? 'is-matched' : ''} ${wrong ? 'is-wrong' : ''}`}
              aria-label={up ? card.word.en : '?'}
            >
              <span className="mg-memory-match-inner">
                <span className="mg-memory-match-back">?</span>
                <span className="mg-memory-match-front">
                  <CardFace card={card} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardFace({ card }: { card: MemoryCard }) {
  if (card.face === 'picture') return <WordPic word={card.word} size="md" />;
  if (card.face === 'hebrew')
    return (
      <span dir="rtl" className="text-lg font-black leading-tight sm:text-2xl">
        {card.word.he}
      </span>
    );
  return (
    <span dir="ltr" className="text-lg font-black leading-tight sm:text-2xl">
      {card.word.en}
    </span>
  );
}
