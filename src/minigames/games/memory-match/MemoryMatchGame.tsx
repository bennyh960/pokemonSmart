/**
 * Word Pairs — play area: a grid of cards; match each English card (word + how it sounds + 🔊) with its Hebrew card
 * (translation + picture; colour cards are painted in their colour). The theme's Hebrew name is shown above the board.
 */

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { todayKey } from '../../english/learning.js';
import { LearnFirst } from '../../english/LearnFirst.js';
import { createRng } from '../../english/random.js';
import { WordPic } from '../../english/ui.js';
import { useWordStats } from '../../english/useWords.js';
import { THEME_NAMES } from '../../english/words.js';
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
const SHOW_WRONG_MS = 1200;
const FINISH_DELAY_MS = 1200;

const TEXT = {
  hint: { en: 'Find the pairs!', he: 'מצאו את הזוגות!' },
} satisfies Record<string, Bilingual>;

export function MemoryMatchGame(props: MiniGameProps<MemoryConfig>) {
  const [stats] = useWordStats();
  const [cards] = useState(() => {
    const seed = (Date.now() ^ Math.imul(props.runId + 1, 2654435761)) >>> 0;
    return generateMemory(props.level.config, createRng(seed), stats, todayKey());
  });
  return (
    <LearnFirst words={cards.filter((c) => c.face === 'en').map((c) => c.word)} theme={props.theme}>
      <PairsPlay {...props} cards={cards} />
    </LearnFirst>
  );
}

function PairsPlay({
  cards,
  level,
  paused,
  hud,
  sfx,
  onFinish,
}: MiniGameProps<MemoryConfig> & { cards: MemoryCard[] }) {
  const { locale } = useI18n();
  const reduced = useReducedMotion();
  const [, recordWords] = useWordStats();
  const cfg = level.config;
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
    const card = cards[i];
    const { state: next, result } = flip(cards, state, i);
    if (result === 'ignored') {
      // A face-up English card is its own 🔊 button
      const up = state.open.includes(i) || state.matched.includes(i);
      if (up && card.face === 'en') sfx.word(card.word.en);
      return;
    }
    setState(next);
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

  const cols = cards.length <= 6 ? 'grid-cols-3' : cards.length <= 8 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-5';

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:pt-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full bg-white px-4 py-1 text-lg font-black text-fuchsia-700 shadow" dir="rtl">
          {THEME_NAMES[cfg.theme].he}
        </span>
        <p className="mg-glass rounded-full px-5 py-1 text-lg font-black">{TEXT.hint[locale]}</p>
      </div>
      <div dir="ltr" className={`grid w-full max-w-3xl flex-1 content-center gap-2 sm:gap-3 ${cols}`}>
        {cards.map((card, i) => {
          const up = state.open.includes(i) || state.matched.includes(i);
          const wrong = state.open.length === 2 && state.open.includes(i);
          const swatch = card.face === 'he' && card.word.picture.kind === 'swatch' ? card.word.picture.color : null;
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
                <span
                  className="mg-memory-match-front"
                  style={swatch ? ({ background: swatch, color: textOn(swatch) } as CSSProperties) : undefined}
                >
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
  if (card.face === 'he') {
    return (
      <span className="flex flex-col items-center gap-1">
        {card.word.picture.kind !== 'swatch' && <WordPic word={card.word} size="sm" />}
        <span dir="rtl" className="text-xl font-black leading-tight sm:text-3xl">
          {card.word.he}
        </span>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span dir="ltr" className="text-xl font-black leading-tight sm:text-3xl">
        {card.word.en}
      </span>
      <span dir="rtl" className="text-base font-black text-fuchsia-600 sm:text-xl">
        {card.word.say}
      </span>
      <span className="text-base" aria-hidden>
        🔊
      </span>
    </span>
  );
}

/** Dark text on light colours (white, yellow…), white text on dark ones. */
function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160 ? '#1e1b4b' : '#ffffff';
}
