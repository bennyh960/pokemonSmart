/**
 * Unown Word Quest — play area. Renders one question at a time and reports score / combo / finish.
 * Question generation + scoring are pure modules (questions.ts, scoring.ts); this file is UI + sound.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import type { KeyBinding } from '../../../engine/input/react/types.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../../ui-react/hooks/usePlayerData.js';
import { ensureGameProgress } from '../../progress.js';
import { useReducedMotion } from '../../shell/hooks.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { Bilingual, FloatTextOptions, MiniGameProps } from '../../types.js';
import type { UnownWordsConfig } from './config.js';
import { getContent } from './content.js';
import { generateQuestions, type ChoiceQuestion, type OrderQuestion, type Question, type Speech, type SpellQuestion } from './questions.js';
import { createRng, pick } from './random.js';
import { newTally, starsForMistakes, tallyQuestionDone, tallyWrong, type Tally } from './scoring.js';
import { mergeSeen, readSeen } from './seen.js';
import { BIG_SMALL_PROMPTS, PRAISE, PROMPTS, TEXT } from './text.js';
import { UnownTile, type TileState } from './UnownTile.js';
import './unown-words.css';

const GAME_ID = 'unown-words';
/** Pause after a solved question before the next one (lets the word + cry play). */
const REVEAL_MS = 1900;
const SPEAK_DELAY_MS = 380;

/** Letter keys (P is the shell's pause key — tap P on screen), digits for picture/word choices, Space = 🔊. */
const KEY_BINDINGS: KeyBinding[] = [
  ...'abcdefghijklmnoqrstuvwxyz'.split('').flatMap((l) => [
    { code: `Key${l.toUpperCase()}`, action: `letter:${l}` },
    { code: `Key${l.toUpperCase()}`, shift: true, action: `letter:${l}` },
  ]),
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [
    { code: `Digit${n}`, action: `num:${n}` },
    { code: `Numpad${n}`, action: `num:${n}` },
  ]),
  { code: 'Space', action: 'replay' },
];

interface Wrong {
  key: string;
  n: number;
}

export function UnownWordsGame({ level, runId, paused, hud, sfx, onFinish }: MiniGameProps<UnownWordsConfig>) {
  const { locale } = useI18n();
  const [, mutate] = usePlayerData();
  const reducedMotion = useReducedMotion();
  const [seed] = useState(() => (Date.now() ^ Math.imul(runId + 1, 2654435761)) >>> 0);
  const questions = useMemo(
    () => generateQuestions(level.config, createRng(seed), getContent()),
    [level.config, seed],
  );

  const [qi, setQi] = useState(0);
  const [tally, setTally] = useState<Tally>(newTally);
  /** Letters / words placed so far (spell + order). */
  const [step, setStep] = useState(0);
  /** Tile indices already used (scramble + order). */
  const [used, setUsed] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<Wrong | null>(null);
  const [speakerBump, setSpeakerBump] = useState(0);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  const q = questions[qi];
  const help = level.config.hebrewHelp;
  const showHebrew = locale === 'he' && (help === 'always' || (help === 'after-mistake' && tally.questionMistakes > 0));

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  useEffect(() => hud.setScore(0), [hud]);

  // ── Sound ────────────────────────────────────────────────────────────────
  function speak(s: Speech) {
    if (s.kind === 'letter') sfx.letter(s.text);
    else sfx.word(s.text);
  }
  /** What 🔊 says right now: Type Speller says the next letter, everything else the question sound. */
  function currentSpeech(): Speech {
    if (q.kind === 'spell' && q.speakNextLetter && !solved) return { kind: 'letter', text: q.word[step].toLowerCase() };
    return q.speech;
  }
  /** What is said after the answer: the whole word / sentence. */
  function answerSpeech(): Speech {
    return q.kind === 'spell' ? { kind: 'word', text: q.word.toLowerCase() } : q.speech;
  }
  function replay() {
    if (paused) return;
    setSpeakerBump((n) => n + 1);
    speak(currentSpeech());
  }

  // Speak the question when it appears.
  useEffect(() => {
    const id = window.setTimeout(() => speak(questions[qi].speech), SPEAK_DELAY_MS + 150);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, questions]);

  // ── Answers ──────────────────────────────────────────────────────────────
  function onWrong(key: string) {
    setTally((t) => tallyWrong(t));
    hud.setCombo(0);
    sfx.wrong();
    if (!reducedMotion) hud.shake();
    setWrong((w) => ({ key, n: (w?.n ?? 0) + 1 }));
    later(() => setWrong((w) => (w?.key === key ? null : w)), 500);
    later(() => speak(currentSpeech()), 600);
  }

  function onSolved(pos?: FloatTextOptions) {
    const { tally: next, points } = tallyQuestionDone(tally);
    setTally(next);
    setSolved(true);
    hud.addScore(points, pos);
    hud.setCombo(next.combo);
    sfx.correct(next.combo);
    hud.floatText(pick(Math.random, PRAISE));
    const say = answerSpeech();
    const cry = q.cryId;
    later(() => speak(say), SPEAK_DELAY_MS);
    if (cry) later(() => sfx.cry(cry), SPEAK_DELAY_MS + 900);
    if (qi === questions.length - 1 && !reducedMotion) later(() => hud.confetti(), 300);
  }

  function finishRound(final: Tally) {
    if (finished.current) return;
    finished.current = true;
    mutate((pd) => {
      pd.miniGames ??= {};
      const data = (ensureGameProgress(pd.miniGames, GAME_ID).data ??= {});
      data.seen = mergeSeen(
        readSeen(data),
        questions.map((x) => x.learned),
      );
    });
    onFinish({
      stars: starsForMistakes(final.mistakes),
      score: final.score,
      extra: { mistakes: final.mistakes, bestCombo: final.bestCombo },
    });
  }

  // Move on after the reveal (waits while paused).
  useEffect(() => {
    if (!solved || paused) return;
    const id = window.setTimeout(() => {
      if (qi >= questions.length - 1) {
        finishRound(tally);
        return;
      }
      setQi(qi + 1);
      setStep(0);
      setUsed([]);
      setSolved(false);
      setWrong(null);
    }, REVEAL_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, paused, qi]);

  const posOf = (e?: MouseEvent): FloatTextOptions | undefined => (e ? { x: e.clientX, y: e.clientY } : undefined);

  function choose(i: number, e?: MouseEvent) {
    if (paused || solved || q.kind !== 'choice' || i < 0 || i >= q.options.length) return;
    if (i === q.answer) onSolved(posOf(e));
    else onWrong(q.options[i].key);
  }

  /** A letter for a spelling question — typed, or a tile/key tapped (`tile` = scramble tile index). */
  function spellLetter(letter: string, tile?: number, e?: MouseEvent) {
    if (paused || solved || q.kind !== 'spell') return;
    const target = q.word[step];
    const L = letter.toUpperCase();
    let tileIndex = tile;
    if (q.tiles && tileIndex === undefined) {
      tileIndex = q.tiles.findIndex((t, i) => t === L && !used.includes(i));
      if (tileIndex < 0) tileIndex = undefined;
    }
    if (L !== target) {
      onWrong(q.tiles ? `t${tileIndex ?? L}` : L);
      return;
    }
    if (tileIndex !== undefined) setUsed((u) => [...u, tileIndex!]);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep >= q.word.length) {
      onSolved(posOf(e));
      return;
    }
    sfx.tap();
    if (q.speakNextLetter) later(() => sfx.letter(q.word[nextStep].toLowerCase()), 250);
    else sfx.letter(target.toLowerCase());
  }

  function placeWord(tile: number, e?: MouseEvent) {
    if (paused || solved || q.kind !== 'order' || used.includes(tile) || tile < 0 || tile >= q.tiles.length) return;
    const word = q.tiles[tile];
    if (word !== q.words[step]) {
      onWrong(`t${tile}`);
      return;
    }
    setUsed((u) => [...u, tile]);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep >= q.words.length) onSolved(posOf(e));
    else {
      sfx.tap();
      sfx.word(word);
    }
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useInputLayer({
    id: 'mg-unown-words',
    name: 'Unown Word Quest',
    keyBindings: KEY_BINDINGS,
    active: !paused,
    onAction: (action) => {
      if (action === 'replay') return replay();
      const [kind, value] = action.split(':');
      if (kind === 'letter') {
        if (q.kind === 'spell') spellLetter(value);
        else if (q.kind === 'choice' && q.optionKind === 'letter') {
          const i = q.options.findIndex((o) => o.key === value);
          if (i >= 0) choose(i);
          else if (!solved) onWrong(value);
        }
      } else if (kind === 'num') {
        const i = Number(value) - 1;
        if (q.kind === 'choice') choose(i);
        else if (q.kind === 'order') placeWord(i);
      }
    },
  });

  // ── Render ───────────────────────────────────────────────────────────────
  const prompt = promptFor(q);
  const tileState = (key: string, isAnswer: boolean): TileState => {
    if (solved) return isAnswer ? 'correct' : 'dim';
    return wrong?.key === key ? 'wrong' : 'idle';
  };

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:gap-5 sm:pt-5">
      <ProgressDots total={questions.length} current={qi} solved={solved} />

      <div className="mg-glass flex w-full max-w-2xl items-center gap-3 rounded-3xl px-4 py-3">
        <button
          type="button"
          tabIndex={-1}
          aria-label={TEXT.replay[locale]}
          onMouseDown={(e) => e.preventDefault()}
          onClick={replay}
          key={speakerBump}
          className={`mg-unown-words-speaker ${speakerBump ? 'is-playing' : ''}`}
        >
          🔊
        </button>
        <div className="min-w-0 flex-1">
          <p dir="ltr" className="text-start text-lg font-black leading-tight text-white drop-shadow sm:text-2xl">
            {prompt.en}
          </p>
          {showHebrew && (
            <p dir="rtl" className="mg-slide-up mt-1 text-base font-bold text-yellow-200 sm:text-lg">
              {prompt.he}
              {q.helpHe && (
                <span className="ms-2 rounded-full bg-white/20 px-3 py-0.5 text-white">
                  {TEXT.meaning.he} {q.helpHe}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div key={qi} className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 sm:gap-6">
        {q.kind === 'choice' && (
          <ChoiceView q={q} solved={solved} showHebrew={showHebrew} tileState={tileState} wrong={wrong} onChoose={choose} />
        )}
        {q.kind === 'spell' && (
          <SpellView
            q={q}
            step={step}
            used={used}
            solved={solved}
            showHelp={tally.questionMistakes > 0 && help !== 'never'}
            showHebrew={showHebrew}
            wrong={wrong}
            onLetter={spellLetter}
          />
        )}
        {q.kind === 'order' && <OrderView q={q} step={step} used={used} solved={solved} wrong={wrong} onPlace={placeWord} />}
      </div>
    </div>
  );
}

function promptFor(q: Question): Bilingual {
  if (q.kind === 'choice' && q.task === 'big-small' && q.show) {
    return q.show === q.show.toUpperCase() ? BIG_SMALL_PROMPTS.toSmall : BIG_SMALL_PROMPTS.toBig;
  }
  return PROMPTS[q.task];
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function ProgressDots({ total, current, solved }: { total: number; current: number; solved: boolean }) {
  return (
    <div className="flex gap-1.5" dir="ltr" aria-label={`${current + 1}/${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current || (i === current && solved);
        return (
          <span
            key={i}
            className={`h-3 w-3 rounded-full transition-all duration-300 ${
              done ? 'bg-yellow-300 shadow' : i === current ? 'mg-glow scale-125 bg-white' : 'bg-white/30'
            }`}
          />
        );
      })}
    </div>
  );
}

interface ChoiceViewProps {
  q: ChoiceQuestion;
  solved: boolean;
  showHebrew: boolean;
  wrong: Wrong | null;
  tileState: (key: string, isAnswer: boolean) => TileState;
  onChoose: (i: number, e?: MouseEvent) => void;
}

function ChoiceView({ q, solved, showHebrew, wrong, tileState, onChoose }: ChoiceViewProps) {
  if (q.optionKind === 'letter') {
    return (
      <>
        {q.show && <UnownTile glyph={q.show} size="xl" state={solved ? 'correct' : 'idle'} />}
        <div dir="ltr" className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {q.options.map((o, i) => (
            <UnownTile
              key={o.key}
              glyph={o.en}
              size="lg"
              delay={i * 70}
              state={tileState(o.key, i === q.answer)}
              shakeKey={wrong?.n}
              onClick={(e) => onChoose(i, e)}
            />
          ))}
        </div>
      </>
    );
  }
  return (
    <div dir="ltr" className={`grid w-full gap-3 sm:gap-4 ${q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {q.options.map((o, i) => {
        const state = tileState(o.key, i === q.answer);
        return (
          <span key={o.key} className="mg-unown-words-pop" style={{ '--uw-delay': `${i * 80}ms` } as CSSProperties}>
            <button
              key={state === 'wrong' ? `w${wrong?.n}` : 'i'}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => onChoose(i, e)}
              className={`mg-unown-words-card flex w-full flex-col items-center gap-1 px-2 pb-3 pt-4 ${state === 'idle' ? '' : `is-${state}`}`}
            >
              <span className="mg-unown-words-keyhint">{i + 1}</span>
              {o.pokemonId ? (
                <PokemonSprite id={o.pokemonId} className="h-20 w-20 object-contain sm:h-28 sm:w-28" />
              ) : (
                <img
                  src={o.sprite}
                  alt=""
                  draggable={false}
                  className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
              <span className="min-h-[1.5rem] text-center text-sm font-black leading-tight sm:text-base">
                {solved ? (
                  q.task === 'first-sound' ? (
                    <FirstLetterWord word={o.en} />
                  ) : (
                    o.en
                  )
                ) : showHebrew && q.task === 'first-sound' ? (
                  <span dir="rtl">{o.he}</span>
                ) : (
                  ''
                )}
              </span>
            </button>
          </span>
        );
      })}
    </div>
  );
}

function FirstLetterWord({ word }: { word: string }) {
  return (
    <span>
      <span className="text-lg text-fuchsia-600">{word[0]}</span>
      {word.slice(1)}
    </span>
  );
}

interface SpellViewProps {
  q: SpellQuestion;
  step: number;
  used: number[];
  solved: boolean;
  /** After a mistake (not on English-only levels): glow the next key. */
  showHelp: boolean;
  showHebrew: boolean;
  wrong: Wrong | null;
  onLetter: (letter: string, tile?: number, e?: MouseEvent) => void;
}

const KEYBOARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function SpellView({ q, step, used, solved, showHelp, showHebrew, wrong, onLetter }: SpellViewProps) {
  const target = q.word[step];
  return (
    <>
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {q.hints.map((h, i) => (
          <div key={h.id} className="mg-pop-in flex flex-col items-center" style={{ animationDelay: `${i * 90}ms` }}>
            <PokemonSprite id={h.id} className={`${q.hints.length === 1 ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-20 w-20 sm:h-28 sm:w-28'} mg-bob object-contain drop-shadow-lg`} />
            {showHebrew && <span className="text-sm font-bold text-white/90">{h.he}</span>}
          </div>
        ))}
      </div>

      <div dir="ltr" className="flex flex-wrap justify-center gap-2">
        {q.word.split('').map((letter, i) => (
          <span key={i} className={`mg-unown-words-slot ${i === step && !solved ? 'is-current' : ''}`}>
            {i < step && <UnownTile glyph={letter} size="sm" state={solved ? 'correct' : 'idle'} />}
          </span>
        ))}
      </div>

      <div dir="ltr" className={`flex flex-wrap justify-center ${q.tiles ? 'gap-3 sm:gap-4' : 'max-w-xl gap-1.5 sm:gap-2'}`}>
        {q.tiles
          ? q.tiles.map((letter, i) => (
              <UnownTile
                key={i}
                glyph={letter}
                size="lg"
                delay={i * 60}
                state={used.includes(i) ? 'used' : wrong?.key === `t${i}` ? 'wrong' : 'idle'}
                shakeKey={wrong?.n}
                onClick={(e) => onLetter(letter, i, e)}
              />
            ))
          : KEYBOARD.map((letter, i) => (
              <UnownTile
                key={letter}
                glyph={letter}
                size="sm"
                delay={i * 15}
                state={
                  wrong?.key === letter ? 'wrong' : showHelp && !solved && letter === target ? 'hint' : 'idle'
                }
                shakeKey={wrong?.n}
                onClick={(e) => onLetter(letter, undefined, e)}
              />
            ))}
      </div>
    </>
  );
}

interface OrderViewProps {
  q: OrderQuestion;
  step: number;
  used: number[];
  solved: boolean;
  wrong: Wrong | null;
  onPlace: (tile: number, e?: MouseEvent) => void;
}

function OrderView({ q, step, used, solved, wrong, onPlace }: OrderViewProps) {
  return (
    <>
      <div className="mg-pop-in">
        {q.pokemonId ? (
          <PokemonSprite id={q.pokemonId} className="mg-bob h-28 w-28 object-contain drop-shadow-lg sm:h-36 sm:w-36" />
        ) : q.item ? (
          <img
            src={q.item.sprite}
            alt=""
            draggable={false}
            className="mg-bob h-20 w-20 object-contain drop-shadow-lg sm:h-24 sm:w-24"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : null}
      </div>

      <div
        dir="ltr"
        className={`flex min-h-[4.5rem] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-4 border-dashed px-3 py-3 transition-colors ${
          solved ? 'border-yellow-300 bg-yellow-300/20' : 'border-white/40 bg-white/10'
        }`}
      >
        {q.words.map((w, i) =>
          i < step ? (
            <span key={i} className="mg-pop-in rounded-2xl bg-white px-3 py-2 text-xl font-black text-indigo-950 shadow sm:text-2xl">
              {w}
            </span>
          ) : (
            <span key={i} className="h-10 w-14 rounded-2xl bg-white/15" />
          ),
        )}
        {solved && <span className="text-2xl font-black text-white">.</span>}
      </div>

      <div dir="ltr" className="flex flex-wrap justify-center gap-3">
        {q.tiles.map((w, i) => {
          const state = used.includes(i) ? 'is-used' : wrong?.key === `t${i}` ? 'is-wrong' : '';
          return (
            <span key={i} className="mg-unown-words-pop" style={{ '--uw-delay': `${i * 80}ms` } as CSSProperties}>
              <button
                key={state === 'is-wrong' ? `w${wrong?.n}` : 'i'}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => onPlace(i, e)}
                className={`mg-unown-words-card min-h-[3.5rem] px-5 py-3 text-xl font-black sm:text-2xl ${state}`}
              >
                <span className="mg-unown-words-keyhint">{i + 1}</span>
                {w}
              </button>
            </span>
          );
        })}
      </div>
    </>
  );
}
