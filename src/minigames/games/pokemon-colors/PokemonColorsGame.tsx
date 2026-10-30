/** Pokémon Colours — play area: "What color is Charmander?" → tap the colour (swatch + English + how it sounds). */

import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import type { KeyBinding } from '../../../engine/input/react/types.js';
import { getPokemon } from '../../../services/pokemon-data.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { showHebrewHelp } from '../../english/help.js';
import { todayKey } from '../../english/learning.js';
import { LearnFirst } from '../../english/LearnFirst.js';
import { createRng } from '../../english/random.js';
import { EN_TEXT, ProgressDots, PromptBar, WordPic } from '../../english/ui.js';
import { useWordRound } from '../../english/useWordRound.js';
import { useWordStats } from '../../english/useWords.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { MiniGameProps } from '../../types.js';
import { colorPool, colorWords, generateColors, type ColorQuestion, type ColorsConfig } from './colors.js';

const POKEMON = colorPool();

const KEYS: KeyBinding[] = [
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [
    { code: `Digit${n}`, action: `num:${n}` },
    { code: `Numpad${n}`, action: `num:${n}` },
  ]),
  { code: 'Space', action: 'replay' },
];

export function PokemonColorsGame(props: MiniGameProps<ColorsConfig>) {
  const [stats] = useWordStats();
  const [questions] = useState(() => {
    const seed = (Date.now() ^ Math.imul(props.runId + 1, 2654435761)) >>> 0;
    return generateColors(props.level.config, createRng(seed), POKEMON, stats, todayKey());
  });
  return (
    <LearnFirst words={colorWords(props.level.config)} theme={props.theme}>
      <ColorsPlay {...props} questions={questions} />
    </LearnFirst>
  );
}

function ColorsPlay({
  questions,
  level,
  paused,
  hud,
  sfx,
  onFinish,
}: MiniGameProps<ColorsConfig> & { questions: ColorQuestion[] }) {
  const { locale } = useI18n();
  const cfg = level.config;
  const round = useWordRound({
    total: questions.length,
    paused,
    hud,
    sfx,
    onFinish,
    wordIdsOf: (i) => [questions[i].options[questions[i].answer].id],
    onReveal: (i) => sfx.word(questions[i].options[questions[i].answer].en),
  });
  const q = questions[round.index];
  const mon = getPokemon(q.pokemonId);
  const [speakKey, setSpeakKey] = useState(0);

  function speak() {
    if (paused) return;
    setSpeakKey((n) => n + 1);
    sfx.word(`what color is ${mon?.name.en ?? ''}?`);
  }

  // A new Pokémon: its cry, then the question
  useEffect(() => {
    const a = window.setTimeout(() => sfx.cry(q.pokemonId), 200);
    const b = window.setTimeout(() => sfx.word(`what color is ${mon?.name.en ?? ''}?`), 900);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.index]);

  function choose(i: number, e?: MouseEvent) {
    if (paused || round.solved || i < 0 || i >= q.options.length) return;
    if (i === q.answer) round.solve(e ? { x: e.clientX, y: e.clientY } : undefined);
    else {
      round.miss(q.options[i].id);
      sfx.word(q.options[i].en); // hear the colour that was tapped
    }
  }

  useInputLayer({
    id: 'mg-pokemon-colors',
    name: 'Pokémon Colours',
    keyBindings: KEYS,
    active: !paused,
    onAction: (action) => (action === 'replay' ? speak() : choose(Number(action.split(':')[1]) - 1)),
  });

  const hebrew = showHebrewHelp(cfg.hebrewHelp, locale, round.tally.questionMistakes);

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:gap-4 sm:pt-5">
      <ProgressDots total={questions.length} current={round.index} solved={round.solved} />
      <PromptBar
        en={
          <>
            What color is <span className="text-yellow-300">{mon?.name.en}</span>?
          </>
        }
        he={hebrew ? `באיזה צבע ${mon?.name.he ?? ''}?` : undefined}
        onSpeak={speak}
        speakKey={speakKey}
        speakLabel={EN_TEXT.replay[locale]}
      />

      <div key={round.index} className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5">
        <PokemonSprite
          id={q.pokemonId}
          className={`mg-pop-in h-36 w-36 object-contain drop-shadow-xl sm:h-48 sm:w-48 ${round.solved ? '' : 'mg-bob'}`}
        />
        <div
          dir="ltr"
          className={`grid w-full gap-3 ${q.options.length <= 3 ? 'grid-cols-3' : q.options.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}
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
                  <WordPic word={o} size="md" />
                  <span className="text-xl font-black leading-none">{o.en}</span>
                  <span dir="rtl" className="text-base font-black text-fuchsia-600">
                    {o.say}
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
