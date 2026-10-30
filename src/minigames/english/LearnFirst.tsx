/**
 * Learn first — a word is never asked before it was shown. Wrap a mode's play area: the round's never-met words
 * appear one by one as big cards (picture, English, how it sounds in Hebrew letters, Hebrew meaning, 🔊), then
 * the play area mounts (so its timers and sounds start only after the cards). With `recap`, every word of the round
 * is then shown together once more — for modes whose answers hide what the word looks like (e.g. colours as text).
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
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
  remember: { en: 'Remember them!', he: 'זכרו אותם!' },
  go: { en: "Let's go!", he: 'יוצאים לדרך!' },
} satisfies Record<string, Bilingual>;

/** Delay before a card says its word (lets the card pop in). */
const SAY_DELAY_MS = 350;

interface Props {
  /** Every word the round will ask. The never-met ones get a card. */
  words: readonly Word[];
  theme: MiniGameTheme;
  /** After the new-word cards, show all the round's words together before playing. */
  recap?: boolean;
  children: ReactNode;
}

export function LearnFirst({ words, theme, recap = false, children }: Props) {
  const [stats, , shown] = useWordStats();
  // Decided once, when the round starts
  const [toLearn] = useState(() => words.filter((w) => !stats[w.id]));
  const [stage, setStage] = useState<'learn' | 'recap' | 'play'>(
    toLearn.length > 0 ? 'learn' : recap ? 'recap' : 'play',
  );
  if (stage === 'play') return <>{children}</>;
  if (stage === 'recap') return <RecapCards words={words} theme={theme} onDone={() => setStage('play')} />;
  return (
    <LearnCards
      words={toLearn}
      theme={theme}
      onDone={() => {
        shown(toLearn.map((w) => w.id));
        setStage(recap ? 'recap' : 'play');
      }}
    />
  );
}

/** All the round's words at once (picture, English, how it sounds, Hebrew) — tap one to hear it. */
function RecapCards({ words, theme, onDone }: { words: readonly Word[]; theme: MiniGameTheme; onDone: () => void }) {
  const { locale } = useI18n();

  useInputLayer({
    id: 'mg-learn-recap',
    name: 'Learn recap',
    keyBindings: [{ code: 'Enter', action: 'next' }],
    onAction: onDone,
  });

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto px-4 pb-6 pt-4">
      <p className="mg-glass rounded-full px-5 py-2 text-xl font-black">👀 {TEXT.remember[locale]}</p>
      <div dir="ltr" className="grid w-full max-w-3xl flex-1 grid-cols-2 content-center gap-3 sm:grid-cols-3">
        {words.map((w, i) => (
          <span key={w.id} className="mg-en-pop" style={{ '--uw-delay': `${i * 60}ms` } as CSSProperties}>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => miniGameSfx.word(w.en)}
              className="mg-en-card flex w-full flex-col items-center gap-1 px-2 pb-3 pt-3"
            >
              <WordPic word={w} size="md" />
              <span className="text-xl font-black leading-none">{w.en}</span>
              <span dir="rtl" className="text-base font-black text-fuchsia-600">
                {w.say}
              </span>
              <span dir="rtl" className="text-sm font-bold opacity-80">
                {w.he}
              </span>
            </button>
          </span>
        ))}
      </div>
      <MgButton theme={theme} variant="primary" glow onClick={onDone} className="min-w-[200px] !py-4 !text-2xl">
        {TEXT.go[locale]}
      </MgButton>
    </div>
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
