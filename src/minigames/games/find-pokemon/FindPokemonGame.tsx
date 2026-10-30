/** Find the Pokémon — play area: read (and hear) the clues, tap the one Pokémon that fits them all. */

import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import type { KeyBinding } from '../../../engine/input/react/types.js';
import { getPokemonDisplayName } from '../../../services/pokemon-data.js';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { showHebrewHelp } from '../../english/help.js';
import { todayKey } from '../../english/learning.js';
import { createRng } from '../../english/random.js';
import { LearnFirst } from '../../english/LearnFirst.js';
import { EN_TEXT, ProgressDots, PromptBar, WordPic } from '../../english/ui.js';
import { useWordRound } from '../../english/useWordRound.js';
import { useWordStats } from '../../english/useWords.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { Bilingual, MiniGameProps } from '../../types.js';
import {
  findPool,
  generateFind,
  shownGroups,
  type FindConfig,
  type FindPokemon,
  type FindQuestion,
  type TraitGroup,
} from './find.js';

const POKEMON = findPool();

const KEYS: KeyBinding[] = [
  ...[1, 2, 3, 4].flatMap((n) => [
    { code: `Digit${n}`, action: `num:${n}` },
    { code: `Numpad${n}`, action: `num:${n}` },
  ]),
  { code: 'Space', action: 'replay' },
  { code: 'KeyH', action: 'hint' },
];

const TEXT = {
  find: { en: 'Find the', he: 'מצאו את הפוקימון:' },
  pokemon: { en: 'Pokémon!', he: '' },
  hint: { en: 'Hint', he: 'רמז' },
  ofType: { en: 'of type', he: 'מסוג' },
} satisfies Record<string, Bilingual>;

/** Card stats — the numbers the describing words are about (so the answer is read, not guessed from the picture). */
const STAT: Record<TraitGroup, { label: Bilingual; value: (p: FindPokemon, locale: string) => string }> = {
  size: { label: { en: 'Height', he: 'גובה' }, value: (p, l) => `${p.height / 10} ${l === 'he' ? 'מ׳' : 'm'}` },
  weight: { label: { en: 'Weight', he: 'משקל' }, value: (p, l) => `${p.weight / 10} ${l === 'he' ? 'ק״ג' : 'kg'}` },
  speed: { label: { en: 'Speed', he: 'מהירות' }, value: (p) => String(p.speed) },
  attack: { label: { en: 'Attack', he: 'התקפה' }, value: (p) => String(p.attack) },
};

/** The whole question in Hebrew ("מצאו את הפוקימון הגדול והאיטי מסוג מים!") — shown once it is solved. */
function hebrewSentence(q: FindQuestion): string {
  const adjectives = q.clues.filter((c) => !c.word.typeId).map((c) => `ה${c.word.he}`);
  const type = q.clues.find((c) => c.word.typeId);
  const parts = [TEXT.find.he.replace(':', ''), adjectives.join(' ו'), type ? `${TEXT.ofType.he} ${type.word.he}` : ''];
  return `${parts.filter(Boolean).join(' ')}!`;
}

function phrase(q: FindQuestion): string {
  return q.clues.map((c) => c.word.en).join(' ');
}

export function FindPokemonGame(props: MiniGameProps<FindConfig>) {
  const [stats] = useWordStats();
  const [questions] = useState(() => {
    const seed = (Date.now() ^ Math.imul(props.runId + 1, 2654435761)) >>> 0;
    return generateFind(props.level.config, createRng(seed), POKEMON, stats, todayKey());
  });
  return (
    <LearnFirst words={[...new Set(questions.flatMap((q) => q.clues.map((c) => c.word)))]} theme={props.theme}>
      <FindPlay {...props} questions={questions} />
    </LearnFirst>
  );
}

function FindPlay({
  questions,
  level,
  paused,
  hud,
  sfx,
  onFinish,
}: MiniGameProps<FindConfig> & { questions: FindQuestion[] }) {
  const { locale } = useI18n();
  const cfg = level.config;

  // Clue words translated for this question (the hint) — saved as not known yet
  const [hinted, setHinted] = useState<string[]>([]);
  const round = useWordRound({
    total: questions.length,
    paused,
    hud,
    sfx,
    onFinish,
    wordIdsOf: (i) => questions[i].clues.map((c) => c.word.id),
    helpedWordIds: () => hinted,
    onReveal: (i) => sfx.cry(questions[i].options[questions[i].answer].id),
  });
  const q = questions[round.index];
  const [speakKey, setSpeakKey] = useState(0);
  const hintsLeft = (cfg.hints ?? 0) - hinted.length;
  const groups = shownGroups(cfg);
  const showTypes = cfg.clues.includes('type');

  function speak() {
    if (paused) return;
    setSpeakKey((n) => n + 1);
    sfx.word(`find the ${phrase(q)} pokemon`);
  }

  // Say the clues when a question appears
  useEffect(() => {
    setHinted([]);
    const id = window.setTimeout(() => sfx.word(`find the ${phrase(q)} pokemon`), 500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.index]);

  function hint() {
    if (paused || round.solved || hintsLeft <= 0) return;
    const next = q.clues.find((c) => !hinted.includes(c.word.id));
    if (!next) return;
    setHinted([...hinted, next.word.id]);
    sfx.word(next.word.en);
  }

  function choose(i: number, e?: MouseEvent) {
    if (paused || round.solved || i < 0 || i >= q.options.length) return;
    if (i === q.answer) round.solve(e ? { x: e.clientX, y: e.clientY } : undefined);
    else {
      round.miss(String(q.options[i].id));
      sfx.word(phrase(q));
    }
  }

  useInputLayer({
    id: 'mg-find-pokemon',
    name: 'Find the Pokémon',
    keyBindings: KEYS,
    active: !paused,
    onAction: (action) =>
      action === 'replay' ? speak() : action === 'hint' ? hint() : choose(Number(action.split(':')[1]) - 1),
  });

  const hebrew = showHebrewHelp(cfg.hebrewHelp, locale, round.tally.questionMistakes);

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:gap-4 sm:pt-5">
      <ProgressDots total={questions.length} current={round.index} solved={round.solved} />

      <PromptBar
        en={
          <>
            {TEXT.find.en}{' '}
            {q.clues.map((c, i) => (
              <span key={c.word.id} className="text-yellow-300">
                {c.word.en.toUpperCase()}
                {i < q.clues.length - 2 ? ', ' : ' '}
              </span>
            ))}
            {TEXT.pokemon.en}
          </>
        }
        // The clue words stay English — their meaning is taught on the Learn First cards, not given here
        // Once solved the whole sentence is translated — the reveal is where the meaning is learned
        he={
          locale === 'he' && round.solved
            ? hebrewSentence(q)
            : hebrew
              ? `${TEXT.find.he} ${q.clues.map((c) => c.word.en.toUpperCase()).join(' + ')}`
              : undefined
        }
        onSpeak={speak}
        speakKey={speakKey}
        speakLabel={EN_TEXT.replay[locale]}
      />

      {/* Hint — translates one clue word */}
      {(cfg.hints ?? 0) > 0 && !round.solved && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {q.clues
            .filter((c) => hinted.includes(c.word.id))
            .map((c) => (
              <span key={c.word.id} className="mg-pop-in mg-glass flex items-center gap-2 rounded-2xl px-3 py-1">
                <WordPic word={c.word} size="sm" />
                <span dir="ltr" className="text-lg font-black">
                  {c.word.en.toUpperCase()}
                </span>
                {locale === 'he' && (
                  <span dir="rtl" className="text-lg font-bold text-yellow-200">
                    = {c.word.he}
                  </span>
                )}
              </span>
            ))}
          {hintsLeft > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={hint}
              className="mg-glass rounded-full px-4 py-1 text-base font-black"
            >
              💡 {TEXT.hint[locale]}
            </button>
          )}
        </div>
      )}

      {/* Clue pictures — shown on reveal only (before that they give the answer away) */}
      <div
        key={`c${round.index}`}
        className={`flex min-h-[4.5rem] flex-wrap justify-center gap-2 ${round.solved ? '' : 'invisible'}`}
      >
        {q.clues.map((c, i) => (
          <span
            key={c.word.id}
            className="mg-pop-in mg-glass flex items-center gap-1 rounded-2xl px-3 py-1"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <WordPic word={c.word} size="md" />
            <span dir="ltr" className="text-2xl font-black">
              {c.word.en}
            </span>
            {locale === 'he' && (
              <span dir="rtl" className="text-xl font-bold text-yellow-200">
                = {c.word.he}
              </span>
            )}
          </span>
        ))}
      </div>

      <div
        key={round.index}
        dir="ltr"
        className={`grid w-full max-w-3xl flex-1 content-center gap-3 sm:gap-4 ${q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}
      >
        {q.options.map((p, i) => {
          const isAnswer = i === q.answer;
          const state = round.solved
            ? isAnswer
              ? 'is-correct'
              : 'is-dim'
            : round.wrong?.key === String(p.id)
              ? 'is-wrong'
              : '';
          return (
            <span key={p.id} className="mg-en-pop" style={{ '--uw-delay': `${i * 80}ms` } as CSSProperties}>
              <button
                key={state === 'is-wrong' ? `w${round.wrong?.n}` : 'i'}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => choose(i, e)}
                className={`mg-en-card flex w-full flex-col items-center gap-1 px-2 pb-3 pt-4 ${state}`}
              >
                <span className="mg-en-keyhint">{i + 1}</span>
                <PokemonSprite id={p.id} className="h-20 w-20 object-contain sm:h-28 sm:w-28" />
                <span className="min-h-[1.5rem] text-center text-sm font-black sm:text-base">
                  {round.solved ? getPokemonDisplayName(p.id) : ''}
                </span>
                {showTypes && (
                  <span className="flex flex-wrap justify-center gap-1">
                    {p.types.map((t) => (
                      <TypeBadge key={t} type={t} locale={locale === 'he' ? 'he' : 'en'} />
                    ))}
                  </span>
                )}
                {groups.length > 0 && (
                  <span
                    dir={locale === 'he' ? 'rtl' : 'ltr'}
                    className="flex w-full flex-col gap-0.5 px-1 text-xs sm:text-sm"
                  >
                    {groups.map((g) => (
                      <span key={g} className="flex justify-between gap-2 rounded-md bg-black/20 px-2">
                        <span className="opacity-80">{STAT[g].label[locale]}</span>
                        <span dir="ltr" className="font-black">
                          {STAT[g].value(p, locale)}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
