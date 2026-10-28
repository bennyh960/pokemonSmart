/** Pokémon Says — play area: the Pokémon calls an action, the player taps its picture before time runs out. */

import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import type { KeyBinding } from '../../../engine/input/react/types.js';
import { getPokemonDisplayName } from '../../../services/pokemon-data.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../../ui-react/hooks/usePlayerData.js';
import { showHebrewHelp } from '../../english/help.js';
import { todayKey } from '../../english/learning.js';
import { createRng } from '../../english/random.js';
import { EN_TEXT, ProgressDots, PromptBar, WordPic } from '../../english/ui.js';
import { useWordRound } from '../../english/useWordRound.js';
import { useWordStats } from '../../english/useWords.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { MiniGameProps } from '../../types.js';
import { generateSays, type SaysConfig } from './says.js';
import './pokemon-says.css';

const KEYS: KeyBinding[] = [
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [
    { code: `Digit${n}`, action: `num:${n}` },
    { code: `Numpad${n}`, action: `num:${n}` },
  ]),
  { code: 'Space', action: 'replay' },
];

export function PokemonSaysGame({ level, runId, paused, hud, sfx, pokemonId, onFinish }: MiniGameProps<SaysConfig>) {
  const { locale } = useI18n();
  const [pd] = usePlayerData();
  const [stats] = useWordStats();
  const cfg = level.config;
  const [seed] = useState(() => (Date.now() ^ Math.imul(runId + 1, 2654435761)) >>> 0);
  const questions = useMemo(() => {
    const speakers = pd.party.length > 0 ? pd.party.map((p) => p.id) : [pokemonId];
    return generateSays(cfg, createRng(seed), stats, todayKey(), speakers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const round = useWordRound({
    total: questions.length,
    paused,
    hud,
    sfx,
    onFinish,
    wordIdsOf: (i) => [questions[i].word.id],
    onReveal: (i) => sfx.word(questions[i].word.en),
  });
  const q = questions[round.index];
  const [speakKey, setSpeakKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cfg.seconds);

  function speak() {
    if (paused) return;
    setSpeakKey((n) => n + 1);
    sfx.word(q.word.en);
  }

  // Each command: cry, then the word; the clock restarts.
  useEffect(() => {
    setTimeLeft(cfg.seconds);
    const a = window.setTimeout(() => sfx.cry(q.pokemonId), 150);
    const b = window.setTimeout(() => sfx.word(q.word.en), 750);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.index]);

  // Per-question clock (stops while paused or after the answer).
  useEffect(() => {
    if (!cfg.seconds || round.solved || paused) return;
    const id = window.setInterval(() => setTimeLeft((t) => Math.max(0, t - 0.1)), 100);
    return () => window.clearInterval(id);
  }, [cfg.seconds, round.solved, paused]);
  useEffect(() => {
    if (cfg.seconds && timeLeft <= 0 && !round.solved) round.fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function choose(i: number, e?: MouseEvent) {
    if (paused || round.solved || i < 0 || i >= q.options.length) return;
    if (i === q.answer) round.solve(e ? { x: e.clientX, y: e.clientY } : undefined);
    else round.miss(q.options[i].id);
  }

  useInputLayer({
    id: 'mg-pokemon-says',
    name: 'Pokémon Says',
    keyBindings: KEYS,
    active: !paused,
    onAction: (action) => {
      if (action === 'replay') return speak();
      choose(Number(action.split(':')[1]) - 1);
    },
  });

  const name = getPokemonDisplayName(q.pokemonId);
  const command = q.word.en.toUpperCase();
  const hebrew = showHebrewHelp(cfg.hebrewHelp, locale, round.tally.questionMistakes);

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:gap-4 sm:pt-5">
      <ProgressDots total={questions.length} current={round.index} solved={round.solved} />

      <PromptBar
        en={
          <>
            {name}, <span className="text-yellow-300">{command}!</span>
          </>
        }
        he={hebrew ? `${name}, ${q.word.he}!` : undefined}
        onSpeak={speak}
        speakKey={speakKey}
        speakLabel={EN_TEXT.replay[locale]}
      />

      <div key={round.index} className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4">
        <div className="mg-pop-in relative">
          <PokemonSprite
            id={q.pokemonId}
            className={`h-28 w-28 object-contain drop-shadow-lg sm:h-36 sm:w-36 ${round.solved && !round.failed ? 'mg-pokemon-says-hop' : 'mg-bob'}`}
          />
          <span dir="ltr" className="mg-pokemon-says-bubble">
            {command}!
          </span>
        </div>

        {cfg.seconds > 0 && (
          <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-black/25">
            <div
              className="h-full rounded-full transition-[width] duration-100 ease-linear"
              style={{
                width: `${(timeLeft / cfg.seconds) * 100}%`,
                background: timeLeft < cfg.seconds * 0.3 ? '#f87171' : '#facc15',
              }}
            />
          </div>
        )}

        <div
          dir="ltr"
          className={`grid w-full gap-3 sm:gap-4 ${q.options.length <= 3 ? 'grid-cols-3' : q.options.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}
        >
          {q.options.map((o, i) => {
            const isAnswer = i === q.answer;
            const state = round.solved
              ? isAnswer
                ? 'is-correct'
                : 'is-dim'
              : round.wrong?.key === o.id
                ? 'is-wrong'
                : '';
            return (
              <span key={o.id} className="mg-en-pop" style={{ '--uw-delay': `${i * 70}ms` } as CSSProperties}>
                <button
                  key={state === 'is-wrong' ? `w${round.wrong?.n}` : 'i'}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => choose(i, e)}
                  className={`mg-en-card flex w-full flex-col items-center gap-1 px-2 pb-3 pt-4 ${state}`}
                >
                  <span className="mg-en-keyhint">{i + 1}</span>
                  <WordPic word={o} size="lg" />
                  <span className="min-h-[1.5rem] text-center text-base font-black">
                    {round.solved && isAnswer ? o.en : ''}
                  </span>
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
