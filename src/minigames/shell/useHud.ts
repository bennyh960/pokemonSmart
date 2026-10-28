/**
 * HUD controller — builds the stable `hud` object a game receives and the state the HUD bar renders.
 * The timer runs here (pauses with the game, ticks in the last seconds).
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { FloatTextOptions, MiniGameHud, MiniGameTheme } from '../types.js';
import { miniGameSfx } from './sfx.js';

export interface FloatItem {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface HudState {
  score: number;
  combo: number;
  hearts: { current: number; max: number } | null;
  timer: { left: number; total: number } | null;
  floats: FloatItem[];
  confettiKey: number;
  /** Bumps on every score change — used to replay the score "bump" animation. */
  scoreBump: number;
}

const INITIAL: HudState = {
  score: 0,
  combo: 0,
  hearts: null,
  timer: null,
  floats: [],
  confettiKey: 0,
  scoreBump: 0,
};

const COMBO_MILESTONE = 5;
const TICK_FROM_SECONDS = 5;
const URGENT_SECONDS = 2;
const FLOAT_MS = 900;

export function useHud(
  playAreaRef: RefObject<HTMLElement | null>,
  theme: MiniGameTheme,
  paused: boolean,
  reducedMotion: boolean,
): { hud: MiniGameHud; state: HudState; reset: () => void } {
  const [state, setState] = useState<HudState>(INITIAL);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const floatId = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const { t } = useI18n();
  const env = useRef({ theme, reducedMotion, t });
  env.current = { theme, reducedMotion, t };

  // Timer lives in refs; the HUD state copy is refreshed ~10×/s.
  const timer = useRef<{ left: number; total: number; onDone: () => void; lastWhole: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPush = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const tm = timer.current;
      if (tm && !pausedRef.current) {
        tm.left = Math.max(0, tm.left - dt);
        const whole = Math.ceil(tm.left);
        if (whole !== tm.lastWhole) {
          tm.lastWhole = whole;
          if (whole > 0 && whole <= TICK_FROM_SECONDS) {
            miniGameSfx.cue('mg-tick', { urgent: whole <= URGENT_SECONDS });
          }
        }
        if (now - lastPush > 100 || tm.left === 0) {
          lastPush = now;
          setState((s) => ({ ...s, timer: { left: tm.left, total: tm.total } }));
        }
        if (tm.left === 0) {
          timer.current = null;
          tm.onDone();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hud = useMemo<MiniGameHud>(() => {
    function centre(): { x: number; y: number } {
      const r = playAreaRef.current?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
    }

    function floatText(text: string, opts: FloatTextOptions = {}) {
      const c = centre();
      const item: FloatItem = {
        id: ++floatId.current,
        text,
        x: opts.x ?? c.x,
        y: opts.y ?? c.y,
        color: opts.color ?? env.current.theme.accent,
      };
      setState((s) => ({ ...s, floats: [...s.floats, item] }));
      window.setTimeout(() => setState((s) => ({ ...s, floats: s.floats.filter((f) => f.id !== item.id) })), FLOAT_MS);
    }

    function setScore(score: number) {
      scoreRef.current = score;
      setState((s) => ({ ...s, score, scoreBump: s.scoreBump + 1 }));
    }

    return {
      setScore,
      addScore(delta, float) {
        setScore(scoreRef.current + delta);
        if (float) floatText(`${delta >= 0 ? '+' : ''}${delta}`, float);
      },
      setCombo(combo) {
        const prev = comboRef.current;
        comboRef.current = combo;
        if (combo > prev && combo > 0 && combo % COMBO_MILESTONE === 0) {
          miniGameSfx.cue('mg-combo-5');
          floatText(env.current.t('minigames.comboFloat', { n: combo }), { color: '#fde047' });
        }
        setState((s) => ({ ...s, combo }));
      },
      setHearts(current, max) {
        setState((s) => ({ ...s, hearts: { current: Math.max(0, current), max } }));
      },
      startTimer(seconds, onDone) {
        timer.current = { left: seconds, total: seconds, onDone, lastWhole: Math.ceil(seconds) };
        setState((s) => ({ ...s, timer: { left: seconds, total: seconds } }));
      },
      stopTimer() {
        timer.current = null;
      },
      addTime(seconds) {
        const tm = timer.current;
        if (!tm) return;
        tm.left = Math.max(0, tm.left + seconds);
        tm.total = Math.max(tm.total, tm.left);
      },
      getTimeLeft: () => timer.current?.left ?? 0,
      floatText,
      confetti() {
        if (!env.current.reducedMotion) setState((s) => ({ ...s, confettiKey: s.confettiKey + 1 }));
      },
      shake() {
        if (env.current.reducedMotion) return;
        playAreaRef.current?.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px) rotate(-1deg)' },
            { transform: 'translateX(9px) rotate(1deg)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 380, easing: 'ease-out' },
        );
      },
    };
  }, [playAreaRef]);

  function reset() {
    timer.current = null;
    scoreRef.current = 0;
    comboRef.current = 0;
    setState(INITIAL);
  }

  return { hud, state, reset };
}
