/**
 * Poké-Doku play area. Logic lives in `sudoku.ts`; this file is input, feedback and layout.
 *
 * Tap a cell → tap a Pokémon in the tray (or arrows + keys 1–6, Backspace clears, C checks, H hints).
 * "Check" marks wrong cells red (each wrong placement counts once as a mistake). Hints: Psyduck points
 * at a cell that can be deduced and says why (max 3). Stars = mistakes + hints (0 → 3★, ≤2 → 2★, else 1★).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useInputLayer } from '../../../engine/input/index.js';
import { useI18n } from '../../../ui-react/context/i18n-context.js';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge.js';
import { TYPE_BADGE } from '../../../data/type-constants.js';
import { MgButton, PokemonSprite } from '../../shell/ui.js';
import { useReducedMotion } from '../../shell/hooks.js';
import type { FloatTextOptions, MiniGameProps } from '../../types.js';
import { levelSymbols, PSYDUCK_ID, TYPE_GLYPH, type DokuSymbol, type PokeDokuConfig } from './config.js';
import {
  EMPTY,
  boxOf,
  completedUnits,
  findHint,
  generatePuzzle,
  isSolved,
  starsFor,
  unitKey,
  unitsOf,
  wrongCells,
  type Grid,
  type Hint,
} from './sudoku.js';
import { STRINGS, say } from './strings.js';
import './poke-doku.css';

const MAX_HINTS = 3;
const LINE_POINTS = 25;
const SOLVE_POINTS = 200;
const STAR_POINTS = 100;
const FLASH_MS = 800;
const FINISH_DELAY_MS = 1900;

const KEY_BINDINGS = [
  { code: 'ArrowLeft', action: 'left' },
  { code: 'ArrowRight', action: 'right' },
  { code: 'ArrowUp', action: 'up' },
  { code: 'ArrowDown', action: 'down' },
  { code: 'Backspace', action: 'clear' },
  { code: 'Delete', action: 'clear' },
  { code: 'Digit0', action: 'clear' },
  { code: 'KeyC', action: 'check' },
  { code: 'KeyH', action: 'hint' },
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [
    { code: `Digit${n}`, action: `n${n}` },
    { code: `Numpad${n}`, action: `n${n}` },
  ]),
] as const;

type Message = { text: string; tone: 'idle' | 'hint' | 'good' | 'bad' };

/** Per-mount random seed (runId alone repeats across sessions). */
function newSeed(runId: number): number {
  return (Math.floor(Math.random() * 0x7fffffff) ^ Math.imul(runId + 1, 0x9e3779b1)) >>> 0;
}

export function PokeDokuGame({ level, runId, paused, hud, sfx, theme, onFinish }: MiniGameProps<PokeDokuConfig>) {
  const { locale } = useI18n();
  const reduced = useReducedMotion();
  const config = level.config;
  const { size, boxRows, boxCols } = config;
  const symbols = useMemo(() => levelSymbols(config), [config]);

  const [seed] = useState(() => newSeed(runId));
  const { puzzle, solution } = useMemo(() => generatePuzzle(config, config.givens, seed), [config, seed]);

  const [grid, setGrid] = useState<Grid>(() => [...puzzle]);
  const [cursor, setCursor] = useState(() => Math.max(0, puzzle.indexOf(EMPTY)));
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());
  const [flash, setFlash] = useState<{ cells: Set<number>; id: number }>({ cells: new Set(), id: 0 });
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const idleText = say(config.symbols === 'types' ? STRINGS.idleTypes : STRINGS.idle, locale);
  const [message, setMessage] = useState<Message>({ text: idleText, tone: 'idle' });

  // Refs for logic that must not wait for a re-render.
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const doneUnits = useRef(new Set<string>());
  const countedWrong = useRef(new Set<string>());
  const timeBonusLost = useRef(false);
  const cellEls = useRef<(HTMLButtonElement | null)[]>([]);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // Units already complete in the givens don't count as the player's lines.
  useEffect(() => {
    for (let cell = 0; cell < puzzle.length; cell++) {
      for (const u of completedUnits(config, puzzle, solution, cell)) doneUnits.current.add(unitKey(u));
    }
  }, [config, puzzle, solution]);

  // HUD setup + optional speed-bonus timer.
  useEffect(() => {
    hud.setScore(0);
    hud.setCombo(0);
    const bonus = config.timerBonus;
    if (bonus) {
      hud.startTimer(bonus.seconds, () => {
        timeBonusLost.current = true;
        hud.floatText(say(STRINGS.timeUp, locale));
      });
    }
    return () => hud.stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud, config]);

  const cellPoint = (cell: number): FloatTextOptions => {
    const r = cellEls.current[cell]?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : {};
  };

  const addScore = (n: number, at?: FloatTextOptions) => {
    scoreRef.current += n;
    hud.addScore(n, at);
  };

  const symbolName = (v: number) => symbols[v].name[locale];

  function finishRound() {
    setSolved(true);
    setHintCell(null);
    setMessage({ text: say(STRINGS.solved, locale), tone: 'good' });
    hud.stopTimer();
    const bonus = config.timerBonus;
    let timeBonus = 0;
    if (bonus && !timeBonusLost.current) {
      timeBonus = Math.round(hud.getTimeLeft()) * bonus.pointsPerSecond;
      if (timeBonus > 0) later(() => hud.floatText(say(STRINGS.timeBonus, locale, { n: timeBonus })), 500);
    }
    const stars = starsFor(mistakes, hintsUsed);
    addScore(SOLVE_POINTS + STAR_POINTS * stars + timeBonus);
    if (!reduced) hud.confetti();
    later(
      () => onFinish({ stars, score: scoreRef.current, extra: { mistakes, hints: hintsUsed, timeBonus } }),
      FINISH_DELAY_MS,
    );
  }

  function place(value: number, at?: FloatTextOptions) {
    if (paused || solved) return;
    const cell = cursor;
    if (puzzle[cell] !== EMPTY) {
      sfx.wrong();
      return;
    }
    const current = gridRef.current;
    if (current[cell] === value) return;
    sfx.tap();
    const next = [...current];
    next[cell] = value;
    gridRef.current = next;
    setGrid(next);
    if (wrong.has(cell)) {
      const w = new Set(wrong);
      w.delete(cell);
      setWrong(w);
    }
    if (hintCell === cell) setHintCell(null);

    // Lines that were complete through this cell and no longer are.
    const nowDone = new Set(completedUnits(config, next, solution, cell).map(unitKey));
    for (const u of unitsOf(config, cell)) if (!nowDone.has(unitKey(u))) doneUnits.current.delete(unitKey(u));
    if (value === EMPTY) return;

    const fresh = completedUnits(config, next, solution, cell).filter((u) => !doneUnits.current.has(unitKey(u)));
    if (fresh.length > 0) {
      for (const u of fresh) doneUnits.current.add(unitKey(u));
      comboRef.current += fresh.length;
      hud.setCombo(comboRef.current);
      sfx.correct(comboRef.current);
      sfx.cry(symbols[value].pokemonId);
      addScore(LINE_POINTS * fresh.length * Math.max(1, comboRef.current), at ?? cellPoint(cell));
      setFlash((f) => ({ cells: new Set(fresh.flatMap((u) => u.cells)), id: f.id + 1 }));
      later(() => setFlash((f) => ({ cells: new Set(), id: f.id })), FLASH_MS);
    }

    if (isSolved(next, solution)) finishRound();
    else if (next.every((v) => v !== EMPTY)) setMessage({ text: say(STRINGS.boardFull, locale), tone: 'bad' });
  }

  function check() {
    if (paused || solved) return;
    const bad = wrongCells(gridRef.current, solution, puzzle);
    if (bad.length === 0) {
      setWrong(new Set());
      sfx.correct(comboRef.current);
      setMessage({ text: say(STRINGS.checkGood, locale), tone: 'good' });
      return;
    }
    let fresh = 0;
    for (const k of bad) {
      const key = `${k}:${gridRef.current[k]}`;
      if (!countedWrong.current.has(key)) {
        countedWrong.current.add(key);
        fresh++;
      }
    }
    if (fresh > 0) setMistakes((m) => m + fresh);
    setWrong(new Set(bad));
    comboRef.current = 0;
    hud.setCombo(0);
    sfx.wrong();
    if (!reduced) hud.shake();
    setMessage({ text: say(STRINGS.checkBad, locale, { n: bad.length }), tone: 'bad' });
  }

  function hint() {
    if (paused || solved) return;
    if (hintsUsed >= MAX_HINTS) {
      sfx.wrong();
      setMessage({ text: say(STRINGS.noHints, locale), tone: 'idle' });
      return;
    }
    const h = findHint(config, gridRef.current, solution);
    if (!h) return;
    setHintsUsed((n) => n + 1);
    setHintCell(h.cell);
    setCursor(h.cell);
    sfx.tap();
    setMessage({ text: hintText(h), tone: 'hint' });
  }

  function hintText(h: Hint): string {
    const text = {
      single: STRINGS.hintSingle,
      row: STRINGS.hintRow,
      col: STRINGS.hintCol,
      box: STRINGS.hintBox,
      reveal: STRINGS.hintReveal,
      fix: STRINGS.hintFix,
    }[h.kind];
    return say(text, locale, { name: symbolName(h.value) });
  }

  function move(dr: number, dc: number) {
    const r = (Math.floor(cursor / size) + dr + size) % size;
    const c = ((cursor % size) + dc + size) % size;
    setCursor(r * size + c);
  }

  useInputLayer({
    id: 'mg-poke-doku',
    name: 'Poké-Doku',
    keyBindings: KEY_BINDINGS,
    active: !paused && !solved,
    onAction: (action) => {
      // The grid is direction-neutral (always laid out LTR), so arrows map to screen directions.
      if (action === 'left') move(0, -1);
      else if (action === 'right') move(0, 1);
      else if (action === 'up') move(-1, 0);
      else if (action === 'down') move(1, 0);
      else if (action === 'clear') place(EMPTY);
      else if (action === 'check') check();
      else if (action === 'hint') hint();
      else if (action.startsWith('n')) {
        const v = Number(action.slice(1)) - 1;
        if (v < size) place(v);
      }
    },
  });

  // ── Layout: measure the play area, fit the grid ─────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 360, h: 560 });
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const landscape = area.w > area.h * 1.15;
  const boxGap = size === 4 ? 10 : 8;
  const cellGap = size === 4 ? 6 : 4;
  const boxesAcross = size / boxCols;
  const boxesDown = size / boxRows;
  // Room for the grid: landscape → beside a ~320px side panel; portrait → above tray + buttons.
  const gridW = landscape ? area.w - 360 : area.w - 24;
  const gridH = landscape ? area.h - 24 : area.h - 270;
  // Fixed px around the cells: outer padding (16) + box padding (6 each) + gaps.
  const fixedW = 16 + boxesAcross * 6 + boxGap * (boxesAcross - 1) + cellGap * (boxCols - 1) * boxesAcross;
  const fixedH = 16 + boxesDown * 6 + boxGap * (boxesDown - 1) + cellGap * (boxRows - 1) * boxesDown;
  const cellPx = Math.max(36, Math.min(112, Math.floor(Math.min((gridW - fixedW) / size, (gridH - fixedH) / size))));

  const counts = useMemo(() => {
    const n = new Array(size).fill(0);
    for (const v of grid) if (v !== EMPTY) n[v]++;
    return n;
  }, [grid, size]);

  const cr = Math.floor(cursor / size);
  const cc = cursor % size;
  const cb = boxOf(config, cursor);
  const cursorValue = grid[cursor];

  function renderCell(cell: number) {
    const r = Math.floor(cell / size);
    const c = cell % size;
    const v = grid[cell];
    const given = puzzle[cell] !== EMPTY;
    const isCursor = cell === cursor && !solved;
    const peer = !solved && (r === cr || c === cc || boxOf(config, cell) === cb);
    const sameSymbol = !solved && v !== EMPTY && v === cursorValue;
    const isWrong = wrong.has(cell);
    const bg = isWrong
      ? 'rgba(248,113,113,0.95)'
      : isCursor
        ? '#fef9c3'
        : sameSymbol
          ? '#cffafe'
          : given
            ? 'rgba(255,255,255,0.95)'
            : peer
              ? 'rgba(255,255,255,0.62)'
              : 'rgba(255,255,255,0.42)';
    const classes = [
      'mg-poke-doku-cell flex items-center justify-center',
      flash.cells.has(cell) ? 'mg-poke-doku-flash' : '',
      isWrong ? 'mg-poke-doku-wrong' : '',
      hintCell === cell ? 'mg-poke-doku-hint' : '',
    ].join(' ');
    const style: CSSProperties = {
      width: cellPx,
      height: cellPx,
      background: bg,
      boxShadow: isCursor
        ? `0 0 0 4px ${theme.accent}, 0 4px 10px rgba(0,0,0,0.25)`
        : given
          ? '0 3px 0 rgba(15,23,42,0.18)'
          : 'inset 0 2px 4px rgba(15,23,42,0.12)',
    };
    return (
      <button
        key={`${cell}-${flash.cells.has(cell) ? flash.id : 0}`}
        ref={(el) => {
          cellEls.current[cell] = el;
        }}
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (paused || solved) return;
          sfx.tap();
          setCursor(cell);
        }}
        className={classes}
        style={style}
        aria-label={`${r + 1},${c + 1}${v !== EMPTY ? ` ${symbolName(v)}` : ''}`}
      >
        {v !== EMPTY && (
          <span
            key={`v${v}`}
            className={solved ? 'mg-poke-doku-jump block' : given ? 'block' : 'mg-poke-doku-place block'}
            style={{
              width: '88%',
              height: '88%',
              animationDelay: solved ? `${(r + c) * 70}ms` : undefined,
            }}
          >
            <SymbolView symbol={symbols[v]} px={cellPx * 0.88} />
          </span>
        )}
      </button>
    );
  }

  const grids = (
    <div
      dir="ltr"
      className="mg-pop-in mg-glass shrink-0 rounded-3xl p-2"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${boxesAcross}, auto)`,
        gap: boxGap,
        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
      }}
    >
      {Array.from({ length: boxesAcross * boxesDown }, (_, b) => {
        const br = Math.floor(b / boxesAcross) * boxRows;
        const bc = (b % boxesAcross) * boxCols;
        const cells: number[] = [];
        for (let r = 0; r < boxRows; r++) for (let c = 0; c < boxCols; c++) cells.push((br + r) * size + bc + c);
        return (
          <div
            key={b}
            className="rounded-2xl"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${boxCols}, ${cellPx}px)`,
              gap: cellGap,
              padding: 3,
              background: 'rgba(15,23,42,0.14)',
            }}
          >
            {cells.map(renderCell)}
          </div>
        );
      })}
    </div>
  );

  const trayCols = landscape ? (size === 4 ? 2 : 3) : size;
  const trayRows = Math.ceil(size / trayCols);
  const trayPx = Math.floor(
    Math.max(52, Math.min(92, landscape ? (area.h - 260) / trayRows - 12 : (area.w - 32) / size - 8)),
  );
  const tray = (
    <div
      dir="ltr"
      className="flex flex-wrap justify-center gap-2"
      style={{ maxWidth: (trayPx + 10) * trayCols }}
    >
      {symbols.map((s) => {
        const full = counts[s.index] >= size;
        return (
          <button
            key={s.index}
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => place(s.index, { x: e.clientX, y: e.clientY })}
            className="mg-btn relative flex flex-col items-center justify-center"
            style={{
              width: trayPx,
              height: trayPx + (s.type ? 16 : 0),
              padding: 4,
              background: cursorValue === s.index ? '#fef9c3' : 'rgba(255,255,255,0.85)',
              opacity: full ? 0.45 : 1,
            }}
            aria-label={s.name[locale]}
          >
            <span className="block" style={{ width: trayPx - 14, height: trayPx - 14 }}>
              <SymbolView symbol={s} px={trayPx - 14} />
            </span>
            {s.type && <TypeBadge type={s.type} locale="en" />}
            <span
              className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black"
              style={{ background: theme.accent, color: theme.accentText }}
            >
              {s.index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );

  const hintsLeft = MAX_HINTS - hintsUsed;
  const buttons = (
    <div className="flex flex-wrap justify-center gap-2">
      <MgButton theme={theme} variant="dark" onClick={() => place(EMPTY)} disabled={solved} ariaLabel={say(STRINGS.erase, locale)}>
        ⌫ {say(STRINGS.erase, locale)}
      </MgButton>
      <MgButton theme={theme} variant="primary" onClick={check} disabled={solved}>
        ✔ {say(STRINGS.check, locale)}
      </MgButton>
      <MgButton theme={theme} variant="soft" onClick={hint} disabled={solved || hintsLeft <= 0}>
        💡 {say(STRINGS.hint, locale)}{' '}
        <span
          className="ms-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm"
          style={{ background: theme.accent, color: theme.accentText }}
          aria-label={say(STRINGS.hintsLeft, locale, { n: hintsLeft })}
        >
          {hintsLeft}
        </span>
      </MgButton>
    </div>
  );

  const bubbleColor =
    message.tone === 'hint' ? '#ffedd5' : message.tone === 'bad' ? '#fee2e2' : message.tone === 'good' ? '#dcfce7' : '#ffffff';
  const psyduck = (
    <div className="flex w-full max-w-md items-center gap-2">
      <div className="relative shrink-0">
        <PokemonSprite id={PSYDUCK_ID} className={`h-20 w-20 ${message.tone === 'hint' ? '' : 'mg-bob'}`} />
        {message.tone === 'hint' && (
          <span className="mg-poke-doku-think absolute -top-2 end-0 text-xl" aria-hidden>
            💭
          </span>
        )}
      </div>
      <div
        key={message.text}
        className="mg-pop-in min-h-[3rem] flex-1 rounded-2xl px-3 py-2 text-sm font-bold leading-snug text-slate-800 shadow-lg"
        style={{ background: bubbleColor }}
        role="status"
      >
        {message.text}
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`flex h-full w-full items-center justify-center gap-4 p-3 ${landscape ? 'flex-row' : 'flex-col'}`}
    >
      {landscape ? (
        <>
          {grids}
          <div className="flex min-w-0 flex-col items-center gap-3" style={{ width: 320 }}>
            {psyduck}
            {tray}
            {buttons}
          </div>
        </>
      ) : (
        <>
          {psyduck}
          {grids}
          {tray}
          {buttons}
        </>
      )}
    </div>
  );
}

/** One symbol: a Pokémon sprite, or (Type-Doku) a round type icon in the type's colour. */
function SymbolView({ symbol, px }: { symbol: DokuSymbol; px: number }) {
  if (!symbol.type) return <PokemonSprite id={symbol.pokemonId} className="mg-poke-doku-sprite h-full w-full object-contain" />;
  const color = TYPE_BADGE[symbol.type].color;
  return (
    <span
      className="flex h-full w-full items-center justify-center rounded-full"
      style={{
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), transparent 55%), ${color}`,
        boxShadow: `inset 0 -3px 0 rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.25)`,
        fontSize: Math.max(14, px * 0.5),
        lineHeight: 1,
      }}
      aria-hidden
    >
      {TYPE_GLYPH[symbol.type] ?? symbol.name.en[0]}
    </span>
  );
}
