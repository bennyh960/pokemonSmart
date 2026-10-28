/** Word Catcher — play area: catch the falling English word that matches the picture. */

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { showHebrewHelp } from '../../english/help.js';
import { todayKey } from '../../english/learning.js';
import { createRng, type Rng } from '../../english/random.js';
import { LearnFirst } from '../../english/LearnFirst.js';
import { EN_TEXT, WordPic } from '../../english/ui.js';
import { useWordStats } from '../../english/useWords.js';
import { anyKeyDown } from '../../shell/hooks.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { MiniGameProps } from '../../types.js';
import {
  CATCHER_HALF_WIDTH,
  CATCHER_Y,
  catcherStars,
  HEARTS,
  currentTarget,
  newCatcher,
  stepCatcher,
  type CatcherConfig,
  type CatcherEvent,
  type CatcherState,
} from './catcher.js';
import './word-catcher.css';

const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
const CATCH_POINTS = 100;
const COMBO_POINTS = 20;

export function WordCatcherGame(props: MiniGameProps<CatcherConfig>) {
  const [stats] = useWordStats();
  const [setup] = useState(() => {
    const rng = createRng((Date.now() ^ Math.imul(props.runId + 1, 2654435761)) >>> 0);
    return { rng, sim: newCatcher(props.level.config, rng, stats, todayKey()) };
  });
  return (
    <LearnFirst words={setup.sim.targets} theme={props.theme}>
      <CatcherPlay {...props} rng={setup.rng} sim={setup.sim} />
    </LearnFirst>
  );
}

function CatcherPlay({
  rng,
  sim,
  level,
  paused,
  hud,
  sfx,
  pokemonId,
  onFinish,
}: MiniGameProps<CatcherConfig> & { rng: Rng; sim: CatcherState }) {
  const { locale } = useI18n();
  const [, recordWords] = useWordStats();
  const cfg = level.config;
  const fieldRef = useRef<HTMLDivElement>(null);
  const goalRef = useRef<number | null>(null);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const [, setFrame] = useState(0);
  const [speakKey, setSpeakKey] = useState(0);

  const target = currentTarget(sim);

  function finish() {
    if (finished.current) return;
    finished.current = true;
    sim.over = true;
    hud.stopTimer();
    recordWords(sim.answers);
    onFinish({ stars: catcherStars(sim.catches, cfg), score: scoreRef.current, extra: { catches: sim.catches } });
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Round setup
  useEffect(() => {
    hud.setScore(0);
    hud.setHearts(sim.hearts, HEARTS);
    hud.startTimer(cfg.seconds, () => finishRef.current());
    return () => hud.stopTimer();
  }, [hud, sim, cfg.seconds]);

  // Say each new target word
  useEffect(() => {
    const id = window.setTimeout(() => sfx.word(target.en), 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.target]);

  function fieldPos(x: number, y: number) {
    const r = fieldRef.current?.getBoundingClientRect();
    return r ? { x: r.left + x * r.width, y: r.top + y * r.height } : undefined;
  }

  function onEvents(events: CatcherEvent[]) {
    for (const ev of events) {
      if (ev.kind === 'catch') {
        comboRef.current++;
        const points = CATCH_POINTS + (comboRef.current - 1) * COMBO_POINTS;
        scoreRef.current += points;
        hud.addScore(points, fieldPos(ev.bubble.x, CATCHER_Y));
        hud.setCombo(comboRef.current);
        sfx.correct(comboRef.current);
        window.setTimeout(() => sfx.word(ev.bubble.word.en), 250);
      } else if (ev.kind === 'wrong') {
        comboRef.current = 0;
        hud.setCombo(0);
        hud.setHearts(sim.hearts, HEARTS);
        sfx.wrong();
        hud.shake();
        hud.floatText(ev.bubble.word.en, { ...fieldPos(ev.bubble.x, CATCHER_Y), color: '#fecaca' });
      } else {
        finishRef.current();
      }
    }
  }

  // Game loop (stops while paused)
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!sim.over) {
        const left = anyKeyDown(LEFT_KEYS);
        const right = anyKeyDown(RIGHT_KEYS);
        const dir = left === right ? 0 : left ? -1 : 1;
        if (dir !== 0) goalRef.current = null;
        const events = stepCatcher(sim, cfg, rng, dt, { dir, goalX: goalRef.current });
        if (events.length) onEvents(events);
        setFrame((f) => (f + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  function pointerGoal(e: PointerEvent<HTMLDivElement>) {
    if (paused) return;
    const r = e.currentTarget.getBoundingClientRect();
    goalRef.current = (e.clientX - r.left) / Math.max(1, r.width);
  }

  useInputLayer({
    id: 'mg-word-catcher',
    name: 'Word Catcher',
    keyBindings: [{ code: 'Space', action: 'replay' }],
    active: !paused,
    onAction: () => speak(),
  });

  function speak() {
    if (paused) return;
    setSpeakKey((n) => n + 1);
    sfx.word(target.en);
  }

  const hebrew = showHebrewHelp(cfg.hebrewHelp, locale, sim.targetMissed ? 1 : 0);

  return (
    <div className="flex h-full flex-col">
      {/* Target: picture (+ Hebrew help) and 🔊 */}
      <div className="flex items-center justify-center gap-3 px-3 pt-2">
        <button
          type="button"
          tabIndex={-1}
          aria-label={EN_TEXT.replay[locale]}
          onMouseDown={(e) => e.preventDefault()}
          onClick={speak}
          key={speakKey}
          className={`mg-en-speaker ${speakKey ? 'is-playing' : ''}`}
        >
          🔊
        </button>
        <div key={sim.target} className="mg-pop-in mg-glass flex items-center gap-3 rounded-3xl px-4 py-2">
          <WordPic word={target} size="md" />
          {hebrew && (
            <span dir="rtl" className="text-xl font-black text-yellow-200">
              {target.he}
            </span>
          )}
        </div>
      </div>

      {/* The field */}
      <div
        ref={fieldRef}
        className="mg-word-catcher-sky relative min-h-0 flex-1 touch-none overflow-hidden"
        onPointerDown={pointerGoal}
        onPointerMove={(e) => (e.buttons > 0 || e.pointerType === 'mouse' ? pointerGoal(e) : undefined)}
      >
        {sim.bubbles.map((b) => (
          <span
            key={b.id}
            dir="ltr"
            className="mg-word-catcher-bubble"
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
          >
            {b.word.en}
          </span>
        ))}
        <div
          className="mg-word-catcher-player"
          style={{ left: `${sim.catcherX * 100}%`, top: `${CATCHER_Y * 100}%`, width: `${CATCHER_HALF_WIDTH * 200}%` }}
        >
          <PokemonSprite id={pokemonId} className="mg-bob h-16 w-16 object-contain drop-shadow-lg sm:h-20 sm:w-20" />
          <span className="mg-word-catcher-net" />
        </div>
      </div>
    </div>
  );
}
