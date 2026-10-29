/**
 * Snack Attack — play area of every skin. All rules live in sim.ts; this component runs the rAF loop,
 * feeds it keys / pointer, renders the state with DOM elements and turns sim events into juice + HUD calls.
 * The skin (skins.ts) decides what falls, the scenery and the texts; `pokemonId` is the Pokémon playing.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { getCharacterFrame, getWildPokemonCharacterId, type SpriteFrame } from '../../../engine/character-sprites.js';
import { getPokemon, getPokemonDisplayName } from '../../../services/pokemon-data.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { anyKeyDown, useReducedMotion } from '../../shell/hooks.js';
import { PokemonSprite } from '../../shell/ui.js';
import type { MiniGameProps } from '../../types.js';
import type { SnackConfig, SnackOp } from './config.js';
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
import { STR, type ItemLook, type SceneryId, type SnackSkin, type SnackText } from './skins.js';
import './snack-attack.css';

const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
const RIGHT_KEYS = ['ArrowRight', 'KeyD'];
const HINT_SECONDS = 4.5;
/** The play field keeps a portrait-ish shape on wide screens so berries stay reachable. */
const FIELD_ASPECT = 0.85;
const FIELD_MAX_W = 640;
const HINT_OF: Record<SnackOp, keyof SnackText> = {
  add: 'hintAdd',
  sub: 'hintSub',
  times: 'hintTimes',
  div: 'hintDiv',
};

interface Juice {
  eat: number;
  burp: number;
  ache: number;
  target: number;
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

  const friend = skin.hazardFriend;
  const hazardFriendly = !!friend && !!getPokemon(pokemonId)?.types.includes(friend.type);
  const simRef = useRef<SimState | null>(null);
  if (!simRef.current) simRef.current = createSim(config, (Date.now() ^ (runId * 7919)) >>> 0, { hazardFriendly });
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
        const left = anyKeyDown(LEFT_KEYS);
        const right = anyKeyDown(RIGHT_KEYS);
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
          if (s.op === 'times') h.floatText(`×${v}`, { ...mouth(), color: '#fde68a' });
          else if (s.op === 'div') h.floatText(`÷${v}`, { ...mouth(), color: '#fde68a' });
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
        case 'hazard-snack':
          setJuice((j) => ({ ...j, eat: j.eat + 1 }));
          h.addScore(ev.points, screenPos(s.playerX, PLAYER_Y - 0.24));
          if (sk.hazardFriend) {
            const text = sk.hazardFriend.text[loc].replace('{name}', getPokemonDisplayName(mon));
            h.floatText(text, { ...mouth(), color: '#e9d5ff' });
          }
          fx.tap();
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
  const hintLine = skin.text[HINT_OF[sim.op]];
  const lookOf = (b: Berry): ItemLook =>
    b.kind === 'rotten' && hazardFriendly && friend
      ? { ...skin.items.rotten, decor: friend.decor }
      : skin.items[b.kind];

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
            <BerryView key={b.id} berry={b} look={lookOf(b)} fieldW={fieldW} h={size.h} />
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
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-2">
        <SumPanel sim={sim} fill={fill} fever={fever} juice={juice} reduced={reduced} />
        {fever && (
          <div className="mg-pop-in rounded-full bg-yellow-300 px-5 py-1.5 text-lg font-black text-amber-900 shadow-lg">
            {STR.fever[locale]}
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-amber-900/20">
              <div className="h-full rounded-full bg-amber-600" style={{ width: `${(sim.fever / 5) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

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
}

const WALK_CYCLE = ['walk-1', 'stand', 'walk-2', 'stand'] as const;
const WALK_FPS = 8;

/**
 * The Pokémon playing: its overworld walk animation when it has one (a 'wild-pokemon' character sprite, e.g.
 * Snorlax), else its battle sprite turned to the move direction.
 */
function PlayerSprite({ sim, pokemonId, width }: { sim: SimState; pokemonId: number; width: number }) {
  const characterId = useMemo(() => {
    const name = getPokemon(pokemonId)?.name.en;
    return name ? getWildPokemonCharacterId(name) : undefined;
  }, [pokemonId]);
  const frame = characterId
    ? sim.moving
      ? getCharacterFrame(
          characterId,
          sim.facing === 1 ? 'right' : 'left',
          WALK_CYCLE[Math.floor(sim.time * WALK_FPS) % WALK_CYCLE.length],
        )
      : getCharacterFrame(characterId, 'down', 'stand')
    : null;
  if (frame) return <OverworldFrame frame={frame} width={width} />;
  return (
    <div style={{ transform: `scaleX(${sim.facing === 1 ? -1 : 1})` }}>
      <PokemonSprite id={pokemonId} className="block w-full" />
    </div>
  );
}

/** One spritesheet frame drawn at `width` px wide (pixel-crisp). */
function OverworldFrame({ frame, width }: { frame: SpriteFrame; width: number }) {
  const scale = width / frame.w;
  return (
    <div style={{ width, height: frame.h * scale, transform: frame.flipX ? 'scaleX(-1)' : undefined }}>
      <div
        style={{
          width: frame.w,
          height: frame.h,
          backgroundImage: `url(${frame.image.src})`,
          backgroundPosition: `-${frame.sx}px -${frame.sy}px`,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

function PlayerView({ sim, pokemonId, fieldW, h, fill, fever, juice, reduced }: PlayerViewProps) {
  const w = PLAYER_HALF_W * 2 * fieldW * 1.6; // the sprite has transparent margins
  // Each wrapper is keyed by its juice counter: remounting it replays its CSS animation
  const wobble = !reduced && juice.ache > 0 ? 'mg-snack-wobble' : '';
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: sim.playerX * fieldW, top: PLAYER_Y * h, width: w, transform: 'translate(-50%, -50%)' }}
    >
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
              <PlayerSprite sim={sim} pokemonId={pokemonId} width={w} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The sum to solve, at the top of the field (never on the Pokémon):
 * add / sub "7 → 12" under an "Add up!" / "Take away!" arrow, times "4 × ? = 24", div "24 ÷ ? = 6".
 */
function SumPanel({
  sim,
  fill,
  fever,
  juice,
  reduced,
}: {
  sim: SimState;
  fill: number;
  fever: boolean;
  juice: Juice;
  reduced: boolean;
}) {
  const { locale } = useI18n();
  const bump = reduced ? '' : 'mg-bump';
  const now = (text: string) => (
    <span key={`b${juice.eat}-${juice.ache}`} className={`inline-block rounded-xl bg-slate-100 px-2 ${bump}`}>
      {text}
    </span>
  );
  const goal = <span className="rounded-xl bg-amber-300 px-2 text-amber-950">{sim.target}</span>;
  const q = <span className="text-slate-400">?</span>;

  let label: { text: string; color: string } | null = null;
  let sum: ReactNode;
  if (sim.op === 'times') {
    sum = (
      <>
        {sim.factors.length ? now(`${sim.factors[0]}`) : q} × {q} = {goal}
      </>
    );
  } else if (sim.op === 'div') {
    sum = (
      <>
        {now(`${sim.start}`)} ÷ {q} = {goal}
      </>
    );
  } else {
    const down = sim.op === 'sub';
    label = down
      ? { text: `${STR.takeAway[locale]} ⬇`, color: '#2563eb' }
      : { text: `${STR.addUp[locale]} ⬆`, color: '#16a34a' };
    sum = (
      <>
        {now(`${sim.belly}`)} → {goal}
      </>
    );
  }
  const barColor = fever ? '#facc15' : fill >= 1 ? '#22c55e' : '#f97316';
  return (
    <div
      key={`t${juice.target}`}
      className={`flex flex-col items-center rounded-3xl bg-white/90 px-4 py-1.5 shadow-xl ${reduced ? '' : 'mg-pop-in'}`}
    >
      {label && (
        <span className="rounded-full px-3 text-sm font-black text-white" style={{ background: label.color }}>
          {label.text}
        </span>
      )}
      <div className="flex items-center gap-2 text-3xl font-black text-slate-800" dir="ltr">
        {sum}
      </div>
      {label && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-300">
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${fill * 100}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
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
