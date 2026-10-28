/**
 * Snack Attack — play area of every skin. All rules live in sim.ts; this component runs the rAF loop,
 * feeds it keys / pointer, renders the state with DOM elements and turns sim events into juice + HUD calls.
 * The skin (skins.ts) decides what falls, the scenery and the texts; `pokemonId` is the Pokémon playing.
 */

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { getInput } from '../../../engine/input/index.js';
import { getPokemonDisplayName } from '../../../services/pokemon-data.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { useReducedMotion } from '../../shell/hooks.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { MiniGameProps } from '../../types.js';
import type { SnackConfig } from './config.js';
import {
  BERRY_R,
  PLAYER_HALF_W,
  PLAYER_Y,
  bellyFill,
  createSim,
  starsFor,
  stepSim,
  type Berry,
  type SimEvent,
  type SimState,
} from './sim.js';
import { STR, type ItemLook, type SceneryId, type SnackSkin } from './skins.js';
import './snack-attack.css';

const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
const HINT_SECONDS = 4.5;
/** The play field keeps a portrait-ish shape on wide screens so berries stay reachable. */
const FIELD_ASPECT = 0.85;
const FIELD_MAX_W = 640;

interface Juice {
  eat: number;
  burp: number;
  ache: number;
  target: number;
}

function keyDown(codes: string[]): boolean {
  try {
    const input = getInput();
    return codes.some((c) => input.isKeyDown(c));
  } catch {
    return false;
  }
}

export function SnackAttackGame({
  level,
  runId,
  paused,
  hud,
  sfx,
  onFinish,
  pokemonId,
  skin,
}: MiniGameProps<SnackConfig> & { skin: SnackSkin }) {
  const { locale } = useI18n();
  const reduced = useReducedMotion();
  const config = level.config;

  const simRef = useRef<SimState | null>(null);
  if (!simRef.current) simRef.current = createSim(config, (Date.now() ^ (runId * 7919)) >>> 0);
  const sim = simRef.current;

  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const goalRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const finishedRef = useRef(false);
  const [, setFrame] = useState(0);
  const [juice, setJuice] = useState<Juice>({ eat: 0, burp: 0, ache: 0, target: 0 });

  const fieldW = Math.min(size.w, size.h * FIELD_ASPECT, FIELD_MAX_W);
  const fieldLeft = (size.w - fieldW) / 2;

  // Everything the loop / timer callbacks read lives behind refs (stable loop, fresh values)
  const env = useRef({ hud, sfx, onFinish, locale, fieldW, fieldLeft, size, skin, pokemonId });
  env.current = { hud, sfx, onFinish, locale, fieldW, fieldLeft, size, skin, pokemonId };

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const s = simRef.current!;
    s.over = true;
    env.current.onFinish({
      stars: starsFor(s.score, config.starScores),
      score: s.score,
      extra: { burps: s.burps, bestCombo: s.bestCombo, aches: s.aches },
    });
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Measure the play area
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Round setup: HUD + timer
  useEffect(() => {
    hud.setScore(0);
    hud.setCombo(0);
    hud.setHearts(sim.hearts, sim.maxHearts);
    hud.startTimer(config.roundSeconds, () => finishRef.current());
    return () => hud.stopTimer();
  }, [hud, sim, config.roundSeconds]);

  // Game loop (stops while paused)
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = simRef.current!;
      if (!s.over) {
        const left = keyDown(LEFT_KEYS);
        const right = keyDown(RIGHT_KEYS);
        const dir = left === right ? 0 : left ? -1 : 1;
        if (dir !== 0) goalRef.current = null;
        const events = stepSim(s, dt, { dir, goalX: goalRef.current });
        if (events.length) handleEvents(events);
        setFrame((f) => (f + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  /** Viewport coords of a spot in the field (for float texts). */
  function screenPos(x: number, y: number): { x: number; y: number } {
    const r = rootRef.current?.getBoundingClientRect();
    const { fieldW: fw, fieldLeft: fl, size: sz } = env.current;
    if (!r) return { x: innerWidth / 2, y: innerHeight / 2 };
    return { x: r.left + fl + x * fw, y: r.top + y * sz.h };
  }

  function handleEvents(events: SimEvent[]) {
    const { hud: h, sfx: fx, locale: loc, skin: sk, pokemonId: mon } = env.current;
    const s = simRef.current!;
    const mouth = () => screenPos(s.playerX, PLAYER_Y - 0.14);
    for (const ev of events) {
      switch (ev.type) {
        case 'eat': {
          setJuice((j) => ({ ...j, eat: j.eat + 1 }));
          const v = ev.berry.value;
          if (s.config.math === 'times') h.floatText(`×${v}`, { ...mouth(), color: '#fde68a' });
          else h.floatText(v < 0 ? `−${-v}` : `+${v}`, { ...mouth(), color: v < 0 ? '#93c5fd' : '#fde68a' });
          fx.tap();
          break;
        }
        case 'burp':
          setJuice((j) => ({ ...j, burp: j.burp + 1 }));
          h.setCombo(ev.combo);
          h.addScore(ev.points, screenPos(s.playerX, PLAYER_Y - 0.24));
          h.floatText(sk.text.hit[loc], { ...screenPos(s.playerX, PLAYER_Y - 0.36), color: '#ffffff' });
          h.confetti();
          fx.correct(ev.combo);
          break;
        case 'ache':
          setJuice((j) => ({ ...j, ache: j.ache + 1 }));
          h.setCombo(0);
          h.floatText(sk.text.overshoot[loc], { ...mouth(), color: '#fecaca' });
          h.shake();
          fx.wrong();
          break;
        case 'rotten':
          setJuice((j) => ({ ...j, ache: j.ache + 1 }));
          h.setHearts(ev.hearts, s.maxHearts);
          h.floatText(sk.text.hazard[loc], { ...mouth(), color: '#d6d3d1' });
          h.shake();
          fx.wrong();
          break;
        case 'golden':
          h.floatText(sk.text.feverStart[loc], { ...screenPos(0.5, 0.35), color: '#fde047' });
          fx.cry(mon);
          break;
        case 'new-target':
          setJuice((j) => ({ ...j, target: j.target + 1 }));
          break;
        case 'game-over':
          finishRef.current();
          break;
        case 'fever-end':
          break;
      }
    }
  }

  // Touch / mouse: drag Snorlax, or tap where it should walk
  function pointerX(e: PointerEvent): number {
    const r = rootRef.current!.getBoundingClientRect();
    return (e.clientX - r.left - fieldLeft) / Math.max(1, fieldW);
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (paused) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    goalRef.current = pointerX(e);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (draggingRef.current && !paused) goalRef.current = pointerX(e);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }

  const fever = sim.fever > 0;
  const fill = bellyFill(sim);
  const showHint = sim.time < HINT_SECONDS;
  const hintLine =
    config.math === 'times' ? skin.text.hintTimes : config.math === 'add-sub' ? skin.text.hintSub : skin.text.hintAdd;
  const takeAway = sim.start > sim.target;

  return (
    <div
      ref={rootRef}
      className={`mg-snack-sky mg-snack-sky-${skin.scenery} relative h-full w-full touch-none overflow-hidden ${fever ? 'mg-snack-fever' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Scenery id={skin.scenery} />

      {size.w > 0 && (
        <div className="absolute inset-y-0" style={{ left: fieldLeft, width: fieldW }} dir="ltr">
          {sim.berries.map((b) => (
            <BerryView key={b.id} berry={b} look={skin.items[b.kind]} fieldW={fieldW} h={size.h} />
          ))}

          <PlayerView
            sim={sim}
            pokemonId={pokemonId}
            fieldW={fieldW}
            h={size.h}
            fill={fill}
            fever={fever}
            juice={juice}
            reduced={reduced}
            takeAwayLabel={takeAway ? STR.takeAway[locale] : null}
          />
        </div>
      )}

      {fever && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <div className="mg-pop-in rounded-full bg-yellow-300 px-5 py-1.5 text-lg font-black text-amber-900 shadow-lg">
            {STR.fever[locale]}
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-amber-900/20">
              <div className="h-full rounded-full bg-amber-600" style={{ width: `${(sim.fever / 5) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {showHint && (
        <div
          className="mg-snack-hint pointer-events-none absolute inset-x-0 top-[38%] flex flex-col items-center gap-2 px-4 text-center"
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          <div className="rounded-2xl bg-white/85 px-4 py-2 text-base font-black text-sky-900 shadow-lg sm:text-lg">
            {hintLine[locale]}
          </div>
          <div className="rounded-full bg-sky-900/70 px-4 py-1 text-sm font-bold text-white" dir="ltr">
            {skin.text.hintMove[locale].replace('{name}', getPokemonDisplayName(pokemonId))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function BerryView({ berry, look, fieldW, h }: { berry: Berry; look: ItemLook; fieldW: number; h: number }) {
  const d = BERRY_R * 2 * fieldW * (look.scale ?? 1);
  const label =
    berry.kind === 'golden'
      ? '★'
      : berry.kind === 'rotten'
        ? ''
        : berry.value < 0
          ? `−${-berry.value}`
          : `${berry.value}`;
  const style: CSSProperties = {
    left: berry.x * fieldW,
    top: berry.y * h,
    width: d,
    height: d,
    transform: `translate(-50%, -50%) rotate(${berry.tilt}deg)`,
  };
  return (
    <div className="absolute" style={style}>
      {look.leaf && (
        <span
          className="absolute left-1/2 rounded-full bg-green-500"
          style={{ width: d * 0.4, height: d * 0.2, top: -d * 0.1, transform: 'translateX(-10%) rotate(-25deg)' }}
        />
      )}
      <span
        className={`flex h-full w-full items-center justify-center font-black shadow-md ${berry.kind === 'golden' ? 'mg-snack-golden' : ''}`}
        style={{
          background: look.body,
          borderRadius: look.radius ?? '9999px',
          color: look.text,
          fontSize: d * (label.length > 2 ? 0.36 : 0.46),
          textShadow: berry.kind === 'golden' ? 'none' : '0 2px 0 rgba(0,0,0,0.35)',
          boxShadow: 'inset -3px -4px 0 rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.2)',
        }}
      >
        {berry.kind === 'rotten' && look.leaf ? <RottenSpots d={d} /> : label}
      </span>
      {look.decor && !(berry.kind === 'rotten' && look.leaf) && (
        <span
          className="pointer-events-none absolute -right-1 -top-1 leading-none"
          style={{ fontSize: d * (berry.kind === 'rotten' ? 0.5 : 0.34) }}
          aria-hidden
        >
          {look.decor}
        </span>
      )}
    </div>
  );
}

function RottenSpots({ d }: { d: number }) {
  const spot = (l: number, t: number, s: number) => (
    <span
      className="absolute rounded-full bg-stone-800/70"
      style={{ left: l * d, top: t * d, width: s * d, height: s * d }}
    />
  );
  return (
    <>
      {spot(0.25, 0.3, 0.18)}
      {spot(0.55, 0.5, 0.22)}
      {spot(0.35, 0.65, 0.12)}
      <span className="absolute -right-1 -top-1 text-xs" style={{ fontSize: d * 0.32 }} aria-hidden>
        ✕
      </span>
    </>
  );
}

interface PlayerViewProps {
  sim: SimState;
  pokemonId: number;
  fieldW: number;
  h: number;
  fill: number;
  fever: boolean;
  juice: Juice;
  reduced: boolean;
  takeAwayLabel: string | null;
}

function PlayerView({ sim, pokemonId, fieldW, h, fill, fever, juice, reduced, takeAwayLabel }: PlayerViewProps) {
  const w = PLAYER_HALF_W * 2 * fieldW * 1.6; // the sprite has transparent margins
  const belly = sim.config.math === 'times' ? timesBubble(sim) : `${sim.belly}`;
  const ringColor = fever ? '#facc15' : fill >= 1 ? '#22c55e' : '#f97316';
  // Each wrapper is keyed by its juice counter: remounting it replays its CSS animation
  const wobble = !reduced && juice.ache > 0 ? 'mg-snack-wobble' : '';
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: sim.playerX * fieldW, top: PLAYER_Y * h, width: w, transform: 'translate(-50%, -50%)' }}
    >
      {/* current belly count */}
      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: '92%' }}>
        <div className="flex flex-col items-center">
          {takeAwayLabel && (
            <span className="mb-0.5 rounded-full bg-blue-600 px-2 text-xs font-black text-white shadow">
              {takeAwayLabel}
            </span>
          )}
          <span
            key={`b${juice.eat}-${juice.ache}`}
            className={`rounded-2xl bg-white px-3 py-0.5 text-xl font-black text-slate-800 shadow-lg ${reduced ? '' : 'mg-bump'}`}
          >
            {belly}
          </span>
        </div>
      </div>

      <div key={`w${juice.ache}`} className={wobble}>
        <div key={`burp${juice.burp}`} className={!reduced && juice.burp > 0 ? 'mg-snack-bounce' : ''}>
          <div key={`eat${juice.eat}`} className={!reduced && juice.eat > 0 ? 'mg-snack-squash' : ''}>
            <div
              className="relative transition-transform duration-200"
              style={{
                transform: `scale(${1 + fill * 0.18}, ${1 + fill * 0.08})`,
                transformOrigin: '50% 90%',
                filter: fever
                  ? 'drop-shadow(0 0 14px #facc15) drop-shadow(0 0 6px #fde047)'
                  : 'drop-shadow(0 6px 6px rgba(0,0,0,0.25))',
              }}
            >
              <div style={{ transform: `scaleX(${sim.facing === 1 ? -1 : 1})` }}>
                <PokemonSprite id={pokemonId} className="block w-full" />
              </div>
              {/* target with a fill ring */}
              <div
                key={`t${juice.target}`}
                className={`absolute left-1/2 flex items-center justify-center rounded-full ${reduced ? '' : 'mg-pop-in'}`}
                style={{
                  top: '58%',
                  width: w * 0.42,
                  height: w * 0.42,
                  transform: 'translate(-50%, -50%)',
                  background: `conic-gradient(${ringColor} ${fill * 360}deg, rgba(255,255,255,0.35) 0deg)`,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full bg-amber-50 font-black text-slate-800"
                  style={{ width: '78%', height: '78%', fontSize: w * 0.17 }}
                >
                  {sim.target}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function timesBubble(sim: SimState): string {
  if (sim.factors.length === 0) return '? × ?';
  return `${sim.factors[0]} × ?`;
}

function Scenery({ id }: { id: SceneryId }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {id === 'orchard' && <Orchard />}
      {id === 'meadow' && <Meadow />}
      {id === 'volcano' && <Volcano />}
      {id === 'river' && <River />}
      {id === 'storm' && <Storm />}
    </div>
  );
}

function Clouds({ color = 'bg-white/80' }: { color?: string }) {
  return (
    <>
      <div className={`mg-snack-cloud absolute left-[8%] top-[18%] h-10 w-24 rounded-full blur-[1px] ${color}`} />
      <div
        className={`mg-snack-cloud absolute right-[10%] top-[30%] h-8 w-20 rounded-full blur-[1px] ${color}`}
        style={{ animationDelay: '-6s' }}
      />
    </>
  );
}

function Ground({ from, to, lip }: { from: string; to: string; lip: string }) {
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 h-[9%]" style={{ background: `linear-gradient(${from}, ${to})` }} />
      <div className="absolute inset-x-0 bottom-[8%] h-3 rounded-t-full" style={{ background: lip }} />
    </>
  );
}

/** Snorlax: berry tree canopy over a lawn. */
function Orchard() {
  return (
    <>
      <Clouds />
      <div className="absolute inset-x-0 -top-10 h-28">
        {[0, 12, 25, 38, 50, 62, 75, 88, 100].map((l, i) => (
          <span
            key={l}
            className="absolute rounded-full"
            style={{
              left: `${l}%`,
              top: i % 2 ? 8 : -6,
              width: 150,
              height: 110,
              transform: 'translateX(-50%)',
              background: i % 2 ? '#16a34a' : '#22c55e',
              boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.12)',
            }}
          />
        ))}
      </div>
      <Ground from="#a3e635" to="#16a34a" lip="rgba(190,242,100,0.8)" />
    </>
  );
}

/** Bulbasaur: big sun over a flower meadow. */
function Meadow() {
  return (
    <>
      <div className="mg-snack-sun absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-yellow-300 shadow-[0_0_80px_30px_rgba(253,224,71,0.7)]" />
      <Clouds />
      <Ground from="#86efac" to="#15803d" lip="rgba(134,239,172,0.85)" />
      {[6, 18, 31, 47, 63, 78, 92].map((l, i) => (
        <span key={l} className="absolute bottom-[6%] text-xl" style={{ left: `${l}%` }}>
          {i % 2 ? '🌼' : '🌷'}
        </span>
      ))}
    </>
  );
}

/** Charmander: glowing rocks and lava. */
function Volcano() {
  return (
    <>
      <div className="absolute inset-x-0 bottom-[8%] h-24">
        {[0, 20, 42, 64, 86, 100].map((l, i) => (
          <span
            key={l}
            className="absolute bottom-0"
            style={{
              left: `${l}%`,
              width: 0,
              height: 0,
              transform: 'translateX(-50%)',
              borderLeft: '70px solid transparent',
              borderRight: '70px solid transparent',
              borderBottom: `${i % 2 ? 70 : 96}px solid ${i % 2 ? '#44403c' : '#292524'}`,
            }}
          />
        ))}
      </div>
      <Ground from="#f97316" to="#991b1b" lip="rgba(253,186,116,0.85)" />
    </>
  );
}

/** Squirtle: a running river between two banks. */
function River() {
  return (
    <>
      <div className="mg-snack-flow absolute inset-0" />
      <div className="absolute inset-y-0 left-0 w-[4%] bg-gradient-to-r from-emerald-600 to-emerald-400" />
      <div className="absolute inset-y-0 right-0 w-[4%] bg-gradient-to-l from-emerald-600 to-emerald-400" />
    </>
  );
}

/** Pikachu: a stormy night with rain. */
function Storm() {
  return (
    <>
      <Clouds color="bg-slate-500/80" />
      <div className="mg-snack-rain absolute inset-0" />
      <Ground from="#4d7c0f" to="#1a2e05" lip="rgba(101,163,13,0.85)" />
    </>
  );
}
