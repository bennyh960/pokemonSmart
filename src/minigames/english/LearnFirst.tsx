/**
 * Learn first — a word is never asked before it was shown. Wrap a mode's play area: the round's never-met words
 * appear one by one as big cards (picture, English, how it sounds in Hebrew letters, Hebrew meaning, 🔊), then
 * the play area mounts (so its timers and sounds start only after the cards).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useInputLayer } from '../../engine/input/index.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { miniGameSfx } from '../shell/sfx.js';
import { MgButton } from '../shell/ui.js';
import type { Bilingual, MiniGameTheme } from '../types.js';
import { EN_TEXT, ProgressDots, WordPic } from './ui.js';
import { useWordStats } from './useWords.js';
import { THEME_NAMES, type Word } from './words.js';

const TEXT = {
  newWords: { en: 'New words!', he: 'מילים חדשות!' },
  gotIt: { en: 'Got it!', he: 'הבנתי!' },
  sounds: { en: 'Sounds like:', he: 'נשמע כמו:' },
} satisfies Record<string, Bilingual>;

/** Delay before a card says its word (lets the card pop in). */
const SAY_DELAY_MS = 350;

interface Props {
  /** Every word the round will ask. The never-met ones get a card. */
  words: readonly Word[];
  theme: MiniGameTheme;
  children: ReactNode;
}

export function LearnFirst({ words, theme, children }: Props) {
  const [stats, , shown] = useWordStats();
  // Decided once, when the round starts
  const [toLearn] = useState(() => words.filter((w) => !stats[w.id]));
  const [done, setDone] = useState(toLearn.length === 0);
  if (done) return <>{children}</>;
  return (
    <LearnCards
      words={toLearn}
      theme={theme}
      onDone={() => {
        shown(toLearn.map((w) => w.id));
        setDone(true);
      }}
    />
  );
}

function LearnCards({ words, theme, onDone }: { words: readonly Word[]; theme: MiniGameTheme; onDone: () => void }) {
  const { locale } = useI18n();
  const [i, setI] = useState(0);
  const word = words[i];

  useEffect(() => {
    const id = window.setTimeout(() => miniGameSfx.word(word.en), SAY_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [word]);

  function next() {
    if (i < words.length - 1) setI(i + 1);
    else onDone();
  }

  useInputLayer({
    id: 'mg-learn-first',
    name: 'Learn first',
    keyBindings: [
      { code: 'Enter', action: 'next' },
      { code: 'Space', action: 'say' },
    ],
    onAction: (a) => (a === 'next' ? next() : miniGameSfx.word(word.en)),
  });

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto px-4 pb-6 pt-4">
      <p className="mg-glass rounded-full px-5 py-2 text-xl font-black">✨ {TEXT.newWords[locale]}</p>
      <ProgressDots total={words.length} current={i} solved={false} />

      <div
        key={word.id}
        className="mg-pop-in flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 rounded-[2rem] bg-white/95 p-6 text-indigo-950 shadow-2xl"
      >
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-black" dir="rtl">
          {THEME_NAMES[word.theme].he}
        </span>
        <WordPic word={word} size="lg" />
        <p dir="ltr" className="text-6xl font-black leading-none">
          {word.en}
        </p>
        <p dir="rtl" className="text-3xl font-black text-fuchsia-600">
          <span className="text-base font-bold text-indigo-900/60">{TEXT.sounds.he} </span>
          {word.say}
        </p>
        <p dir="rtl" className="text-2xl font-bold">
          = {word.he}
        </p>
        <button
          type="button"
          tabIndex={-1}
          aria-label={EN_TEXT.replay[locale]}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => miniGameSfx.word(word.en)}
          className="mg-en-speaker"
        >
          🔊
        </button>
      </div>

      <MgButton theme={theme} variant="primary" glow onClick={next} className="min-w-[200px] !py-4 !text-2xl">
        {TEXT.gotIt[locale]}
      </MgButton>
    </div>
  );
}
