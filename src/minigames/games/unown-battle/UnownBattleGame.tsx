/** Unown Battle — play area: a wild Unown shows a word's picture; every right letter is a hit. */

import { useEffect, useState, type MouseEvent } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import type { KeyBinding } from '../../../engine/input/react/types.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { showHebrewHelp } from '../../english/help.js';
import { todayKey } from '../../english/learning.js';
import { createRng } from '../../english/random.js';
import { UnownTile } from '../../english/UnownTile.js';
import { LearnFirst } from '../../english/LearnFirst.js';
import { EN_TEXT, ProgressDots, PromptBar, WordPic } from '../../english/ui.js';
import { useWordRound } from '../../english/useWordRound.js';
import { useWordStats } from '../../english/useWords.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { Bilingual, MiniGameProps } from '../../types.js';
import { generateBattle, type BattleConfig, type BattleWord } from './battle.js';
import './unown-battle.css';

const UNOWN = 201;
const KEYBOARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Letter keys (P is the shell's pause key — tap P on screen), Space = 🔊. */
const KEYS: KeyBinding[] = [
  ...'abcdefghijklmnoqrstuvwxyz'.split('').flatMap((l) => [
    { code: `Key${l.toUpperCase()}`, action: `letter:${l}` },
    { code: `Key${l.toUpperCase()}`, shift: true, action: `letter:${l}` },
  ]),
  { code: 'Space', action: 'replay' },
];

const TEXT = {
  appeared: { en: 'A wild Unown appeared! Spell the word!', he: 'אנאון פראי הופיע! אייתו את המילה!' },
  critical: { en: 'Critical hit!', he: 'מכה קריטית!' },
} satisfies Record<string, Bilingual>;

export function UnownBattleGame(props: MiniGameProps<BattleConfig>) {
  const [stats] = useWordStats();
  const [battle] = useState(() => {
    const seed = (Date.now() ^ Math.imul(props.runId + 1, 2654435761)) >>> 0;
    return generateBattle(props.level.config, createRng(seed), stats, todayKey());
  });
  return (
    <LearnFirst words={battle.map((b) => b.word)} theme={props.theme}>
      <BattlePlay {...props} battle={battle} />
    </LearnFirst>
  );
}

function BattlePlay({
  battle,
  level,
  paused,
  hud,
  sfx,
  onFinish,
}: MiniGameProps<BattleConfig> & { battle: BattleWord[] }) {
  const { locale } = useI18n();
  const cfg = level.config;

  const round = useWordRound({
    total: battle.length,
    paused,
    hud,
    sfx,
    onFinish,
    wordIdsOf: (i) => [battle[i].word.id],
    onReveal: (i) => sfx.word(battle[i].word.en),
    revealMs: 1900,
  });
  const b = battle[round.index];
  const [step, setStep] = useState(0);
  const [used, setUsed] = useState<number[]>([]);
  const [hitKey, setHitKey] = useState(0);
  const [speakKey, setSpeakKey] = useState(0);

  // New Unown: reset the spelling, say the word
  useEffect(() => {
    setStep(0);
    setUsed([]);
    const id = window.setTimeout(() => sfx.word(b.word.en), 500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.index]);

  function speak() {
    if (paused) return;
    setSpeakKey((n) => n + 1);
    sfx.word(b.word.en);
  }

  /** A letter typed or tapped (`tile` = tile index). */
  function hit(letter: string, tile?: number, e?: MouseEvent) {
    if (paused || round.solved) return;
    const L = letter.toUpperCase();
    let tileIndex = tile;
    if (b.tiles && tileIndex === undefined) {
      tileIndex = b.tiles.findIndex((t, i) => t === L && !used.includes(i));
      if (tileIndex < 0) tileIndex = undefined;
    }
    if (L !== b.letters[step]) {
      round.miss(b.tiles ? `t${tileIndex ?? L}` : L);
      return;
    }
    if (tileIndex !== undefined) setUsed((u) => [...u, tileIndex!]);
    setHitKey((n) => n + 1);
    const next = step + 1;
    setStep(next);
    if (next >= b.letters.length) {
      round.solve(e ? { x: e.clientX, y: e.clientY } : undefined);
      hud.floatText(TEXT.critical.en, { color: '#fde047' });
      round.later(() => sfx.cry(UNOWN), 900);
    } else {
      sfx.letter(L.toLowerCase());
    }
  }

  useInputLayer({
    id: 'mg-unown-battle',
    name: 'Unown Battle',
    keyBindings: KEYS,
    active: !paused,
    onAction: (action) => (action === 'replay' ? speak() : hit(action.split(':')[1])),
  });

  const hebrew = showHebrewHelp(cfg.hebrewHelp, locale, round.tally.questionMistakes);
  const hpLeft = 1 - step / b.letters.length;
  const glowNext = cfg.letterHint && round.tally.questionMistakes > 0 && !round.solved;
  const target = b.letters[step];

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-y-auto px-3 pb-6 pt-3 sm:gap-4 sm:pt-5">
      <ProgressDots total={battle.length} current={round.index} solved={round.solved} />

      <PromptBar
        en={TEXT.appeared.en}
        he={hebrew ? `${TEXT.appeared.he} (${b.word.he})` : undefined}
        onSpeak={speak}
        speakKey={speakKey}
        speakLabel={EN_TEXT.replay[locale]}
      />

      <div key={round.index} className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4">
        {/* The wild Unown + its HP, and the word's picture */}
        <div className="flex items-center gap-6">
          <div className="mg-pop-in flex flex-col items-center gap-2">
            <div className="h-3 w-32 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${hpLeft * 100}%`,
                  background: hpLeft > 0.5 ? '#4ade80' : hpLeft > 0.2 ? '#facc15' : '#f87171',
                }}
              />
            </div>
            <PokemonSprite
              key={hitKey}
              id={UNOWN}
              className={`h-24 w-24 object-contain drop-shadow-lg sm:h-32 sm:w-32 ${
                round.solved ? 'mg-unown-battle-faint' : hitKey ? 'mg-unown-battle-hit' : 'mg-bob'
              }`}
            />
          </div>
          <div className="mg-pop-in mg-glass rounded-3xl p-3" style={{ animationDelay: '120ms' }}>
            <WordPic word={b.word} size="lg" />
          </div>
        </div>

        {/* Spelled so far */}
        <div dir="ltr" className="flex flex-wrap justify-center gap-2">
          {b.letters.map((letter, i) => (
            <span key={i} className={`mg-en-slot ${i === step && !round.solved ? 'is-current' : ''}`}>
              {i < step && <UnownTile glyph={letter} size="sm" state={round.solved ? 'correct' : 'idle'} />}
            </span>
          ))}
        </div>

        {/* Letters to tap */}
        <div
          dir="ltr"
          className={`flex flex-wrap justify-center ${b.tiles ? 'gap-3 sm:gap-4' : 'max-w-xl gap-1.5 sm:gap-2'}`}
        >
          {b.tiles
            ? b.tiles.map((letter, i) => (
                <UnownTile
                  key={i}
                  glyph={letter}
                  size="lg"
                  delay={i * 60}
                  state={
                    used.includes(i)
                      ? 'used'
                      : round.wrong?.key === `t${i}`
                        ? 'wrong'
                        : glowNext && letter === target
                          ? 'hint'
                          : 'idle'
                  }
                  shakeKey={round.wrong?.n}
                  onClick={(e) => hit(letter, i, e)}
                />
              ))
            : KEYBOARD.map((letter, i) => (
                <UnownTile
                  key={letter}
                  glyph={letter}
                  size="sm"
                  delay={i * 15}
                  state={round.wrong?.key === letter ? 'wrong' : glowNext && letter === target ? 'hint' : 'idle'}
                  shakeKey={round.wrong?.n}
                  onClick={(e) => hit(letter, undefined, e)}
                />
              ))}
        </div>
      </div>
    </div>
  );
}
