/**
 * Unown Letters — play area. One question at a time: hear a letter / sound, tap the right Unown or Pokémon.
 * Question generation is pure (questions.ts); the round loop is the shared English one (useWordRound).
 */

import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import type { KeyBinding } from '../../../engine/input/react/types.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../../ui-react/hooks/usePlayerData.js';
import { showHebrewHelp } from '../../english/help.js';
import { createRng } from '../../english/random.js';
import { UnownTile, type TileState } from '../../english/UnownTile.js';
import { EN_TEXT, ProgressDots, PromptBar } from '../../english/ui.js';
import { useWordRound } from '../../english/useWordRound.js';
import { ensureGameProgress } from '../../progress.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { Bilingual, MiniGameProps, MiniGameResult } from '../../types.js';
import type { UnownWordsConfig } from './config.js';
import { getContent } from './content.js';
import { generateQuestions, type Question, type Speech } from './questions.js';
import { mergeSeen, readSeen } from './seen.js';
import { BIG_SMALL_PROMPTS, PROMPTS } from './text.js';

const GAME_ID = 'unown-words';

/** Letter keys (P is the shell's pause key — tap P on screen), digits for picture choices, Space = 🔊. */
const KEY_BINDINGS: KeyBinding[] = [
  ...'abcdefghijklmnoqrstuvwxyz'.split('').flatMap((l) => [
    { code: `Key${l.toUpperCase()}`, action: `letter:${l}` },
    { code: `Key${l.toUpperCase()}`, shift: true, action: `letter:${l}` },
  ]),
  ...[1, 2, 3, 4].flatMap((n) => [
    { code: `Digit${n}`, action: `num:${n}` },
    { code: `Numpad${n}`, action: `num:${n}` },
  ]),
  { code: 'Space', action: 'replay' },
];

export function UnownWordsGame({ level, runId, paused, hud, sfx, onFinish }: MiniGameProps<UnownWordsConfig>) {
  const { locale } = useI18n();
  const [, mutate] = usePlayerData();
  const [seed] = useState(() => (Date.now() ^ Math.imul(runId + 1, 2654435761)) >>> 0);
  const questions = useMemo(() => generateQuestions(level.config, createRng(seed), getContent()), [level.config, seed]);

  function speak(s: Speech) {
    if (s.kind === 'letter') sfx.letter(s.text);
    else sfx.word(s.text);
  }

  /** Learned letters / Pokémon names are kept for the progressive-English system, then the shell gets the stars. */
  function finish(result: MiniGameResult) {
    mutate((pd) => {
      pd.miniGames ??= {};
      const data = (ensureGameProgress(pd.miniGames, GAME_ID).data ??= {});
      data.seen = mergeSeen(
        readSeen(data),
        questions.map((x) => x.learned),
      );
    });
    onFinish(result);
  }

  const round = useWordRound({
    total: questions.length,
    paused,
    hud,
    sfx,
    onFinish: finish,
    wordIdsOf: () => [], // letters, not word-bank words
    onReveal: (i) => {
      speak(questions[i].speech);
      const cry = questions[i].cryId;
      if (cry) window.setTimeout(() => sfx.cry(cry), 900);
    },
  });
  const q = questions[round.index];
  const [speakKey, setSpeakKey] = useState(0);

  function replay() {
    if (paused) return;
    setSpeakKey((n) => n + 1);
    speak(q.speech);
  }

  // Speak the question when it appears.
  useEffect(() => {
    const id = window.setTimeout(() => speak(questions[round.index].speech), 530);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.index, questions]);

  function choose(i: number, e?: MouseEvent) {
    if (paused || round.solved || i < 0 || i >= q.options.length) return;
    if (i === q.answer) round.solve(e ? { x: e.clientX, y: e.clientY } : undefined);
    else {
      round.miss(q.options[i].key);
      round.later(() => speak(q.speech), 600);
    }
  }

  useInputLayer({
    id: 'mg-unown-words',
    name: 'Unown Letters',
    keyBindings: KEY_BINDINGS,
    active: !paused,
    onAction: (action) => {
      if (action === 'replay') return replay();
      const [kind, value] = action.split(':');
      if (kind === 'num') choose(Number(value) - 1);
      else if (q.optionKind === 'letter') {
        const i = q.options.findIndex((o) => o.key === value);
        if (i >= 0) choose(i);
        else if (!round.solved) round.miss(value);
      }
    },
  });

  const prompt = promptFor(q);
  const showHebrew = showHebrewHelp(level.config.hebrewHelp, locale, round.tally.questionMistakes);
  const tileState = (key: string, isAnswer: boolean): TileState => {
    if (round.solved) return isAnswer ? 'correct' : 'dim';
    return round.wrong?.key === key ? 'wrong' : 'idle';
  };

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:gap-5 sm:pt-5">
      <ProgressDots total={questions.length} current={round.index} solved={round.solved} />
      <PromptBar
        en={prompt.en}
        he={showHebrew ? prompt.he : undefined}
        onSpeak={replay}
        speakKey={speakKey}
        speakLabel={EN_TEXT.replay[locale]}
      />

      <div
        key={round.index}
        className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 sm:gap-6"
      >
        {q.optionKind === 'letter' ? (
          <>
            {q.show && <UnownTile glyph={q.show} size="xl" state={round.solved ? 'correct' : 'idle'} />}
            <div dir="ltr" className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {q.options.map((o, i) => (
                <UnownTile
                  key={o.key}
                  glyph={o.en}
                  size="lg"
                  delay={i * 70}
                  state={tileState(o.key, i === q.answer)}
                  shakeKey={round.wrong?.n}
                  onClick={(e) => choose(i, e)}
                />
              ))}
            </div>
          </>
        ) : (
          <div dir="ltr" className="grid w-full grid-cols-3 gap-3 sm:gap-4">
            {q.options.map((o, i) => {
              const state = tileState(o.key, i === q.answer);
              return (
                <span key={o.key} className="mg-en-pop" style={{ '--uw-delay': `${i * 80}ms` } as CSSProperties}>
                  <button
                    key={state === 'wrong' ? `w${round.wrong?.n}` : 'i'}
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => choose(i, e)}
                    className={`mg-en-card flex w-full flex-col items-center gap-1 px-2 pb-3 pt-4 ${state === 'idle' ? '' : `is-${state}`}`}
                  >
                    <span className="mg-en-keyhint">{i + 1}</span>
                    <PokemonSprite id={o.pokemonId!} className="h-20 w-20 object-contain sm:h-28 sm:w-28" />
                    <span className="min-h-[1.5rem] text-center text-sm font-black leading-tight sm:text-base">
                      {round.solved ? <FirstLetterWord word={o.en} /> : showHebrew ? <span dir="rtl">{o.he}</span> : ''}
                    </span>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function promptFor(q: Question): Bilingual {
  if (q.task === 'big-small' && q.show) {
    return q.show === q.show.toUpperCase() ? BIG_SMALL_PROMPTS.toSmall : BIG_SMALL_PROMPTS.toBig;
  }
  return PROMPTS[q.task];
}

function FirstLetterWord({ word }: { word: string }) {
  return (
    <span>
      <span className="text-lg text-fuchsia-600">{word[0]}</span>
      {word.slice(1)}
    </span>
  );
}
