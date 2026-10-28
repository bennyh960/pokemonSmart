import { useMemo, useRef, useState, useEffect } from 'react';
import { useInputLayer } from '../../engine/input';
import { useI18n } from '../../ui-react/context/i18n-context';
import { buildClockQuestion, formatClock, parseClock, sameClock, type ClockTime } from '../../math/clock-question';
import { getGatePass, refillGatePass } from '../../systems/gate-lights';
import { gradeFromBirthYear, getPlayerBirthYear } from '../../data/story/global-gate-config';
import { getGlobalAudio } from '../../audio/audio-manager';

interface IGateClockProps {
  gateId: string;
  onClose: () => void;
}

type Phase = 'ask' | 'right' | 'wrong';

const CHOICE_KEYS = [
  { code: 'ArrowUp', action: 'up' },
  { code: 'ArrowDown', action: 'down' },
  { code: 'ArrowLeft', action: 'left' },
  { code: 'ArrowRight', action: 'right' },
  { code: 'Digit1', action: 'pick-0' },
  { code: 'Digit2', action: 'pick-1' },
  { code: 'Digit3', action: 'pick-2' },
  { code: 'Digit4', action: 'pick-3' },
  { code: 'Enter', action: 'confirm' },
  { code: 'Space', action: 'confirm' },
  { code: 'Escape', action: 'close' },
] as const;

const TYPE_KEYS = [
  { code: 'Enter', action: 'confirm' },
  { code: 'NumpadEnter', action: 'confirm' },
  { code: 'Escape', action: 'close' },
] as const;

const DONE_KEYS = [
  { code: 'Enter', action: 'close' },
  { code: 'Space', action: 'close' },
  { code: 'Escape', action: 'close' },
] as const;

const GateClock = ({ gateId, onClose }: IGateClockProps) => {
  const { t, isRTL } = useI18n();
  const pass = getGatePass(gateId);
  const question = useMemo(
    () =>
      pass.kind === 'timed'
        ? buildClockQuestion(new Date(), pass.remainingMs, gradeFromBirthYear(getPlayerBirthYear()))
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gateId],
  );
  const fullMinutes = pass.kind === 'timed' ? Math.round(pass.fullMs / 60_000) : 0;

  const [phase, setPhase] = useState<Phase>('ask');
  const [selected, setSelected] = useState(0);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (question && !question.choices) setTimeout(() => inputRef.current?.focus(), 50);
  }, [question]);

  function check(guess: ClockTime): void {
    if (!question) return;
    if (sameClock(guess, question.answer)) {
      refillGatePass(gateId);
      getGlobalAudio()?.playGateSuccess();
      setPhase('right');
    } else {
      setPhase('wrong');
    }
  }

  function submitTyped(): void {
    const guess = parseClock(typed);
    if (!guess) {
      setTypedError(true);
      return;
    }
    check(guess);
  }

  const choices = question?.choices ?? null;
  // Arrow keys move on the 2×2 grid; left/right follow the reading direction
  const move = (dx: number, dy: number) =>
    setSelected((i) => {
      const col = (i % 2) + (isRTL ? -dx : dx);
      const row = Math.floor(i / 2) + dy;
      if (col < 0 || col > 1 || row < 0 || row > 1) return i;
      return row * 2 + col;
    });

  useInputLayer({
    id: 'gateClock-choices',
    name: 'Gate clock (choices)',
    keyBindings: CHOICE_KEYS,
    blocksLowerLayers: true,
    active: phase === 'ask' && !!choices,
    onAction: (action) => {
      if (!choices) return;
      if (action === 'close') return onClose();
      if (action === 'up') return move(0, -1);
      if (action === 'down') return move(0, 1);
      if (action === 'left') return move(-1, 0);
      if (action === 'right') return move(1, 0);
      if (action === 'confirm') return check(choices[selected]);
      if (action.startsWith('pick-')) check(choices[Number(action.slice(5))]);
    },
  });

  useInputLayer({
    id: 'gateClock-type',
    name: 'Gate clock (typed)',
    keyBindings: TYPE_KEYS,
    blocksLowerLayers: true,
    active: phase === 'ask' && !!question && !choices,
    onAction: (action) => (action === 'close' ? onClose() : submitTyped()),
  });

  useInputLayer({
    id: 'gateClock-done',
    name: 'Gate clock (result)',
    keyBindings: DONE_KEYS,
    blocksLowerLayers: true,
    active: phase !== 'ask' || !question,
    onAction: () => onClose(),
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 select-none">
      <div className="w-full max-w-md rounded-2xl border-2 border-emerald-400 bg-slate-900 p-4 text-white shadow-2xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          <h2 className="text-lg font-bold text-emerald-300">{t('gateLight.clock.title')}</h2>
        </div>

        {!question ? (
          <p className="mb-4">{t('gateLight.forever')}</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-center gap-5">
              <AnalogClock time={question.now} />
              <div
                dir="ltr"
                className="rounded-lg border border-slate-600 bg-black px-3 py-1 font-mono text-3xl text-emerald-300"
              >
                {formatClock(question.now)}
              </div>
            </div>

            <p className="mb-1 text-center">{t('gateLight.clock.left', { minutes: question.minutesLeft })}</p>
            {phase === 'ask' && (
              <p className="mb-3 text-center font-bold text-yellow-300">{t('gateLight.clock.ask')}</p>
            )}

            {phase === 'ask' && choices && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {choices.map((c, i) => (
                  <button
                    key={formatClock(c)}
                    type="button"
                    dir="ltr"
                    onClick={() => check(c)}
                    onMouseEnter={() => setSelected(i)}
                    className={`rounded-lg border-2 py-2 font-mono text-2xl transition-colors ${
                      i === selected
                        ? 'border-yellow-300 bg-slate-700 text-yellow-200'
                        : 'border-slate-600 bg-slate-800 text-white'
                    }`}
                  >
                    {formatClock(c)}
                  </button>
                ))}
              </div>
            )}

            {phase === 'ask' && !choices && (
              <div className="mb-3 flex gap-2" dir="ltr">
                <input
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setTypedError(false);
                  }}
                  placeholder="HH:MM"
                  maxLength={5}
                  inputMode="numeric"
                  className={`min-w-0 flex-1 rounded-lg border-2 bg-black px-3 py-2 text-center font-mono text-2xl outline-none ${
                    typedError ? 'border-red-400' : 'border-slate-500 focus:border-yellow-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={submitTyped}
                  className="rounded-lg bg-emerald-500 px-4 font-bold text-black hover:bg-emerald-400"
                >
                  {t('gateLight.clock.check')}
                </button>
              </div>
            )}
            {phase === 'ask' && typedError && (
              <p className="mb-2 text-center text-sm text-red-300">{t('gateLight.clock.badFormat')}</p>
            )}

            {phase === 'right' && (
              <p className="mb-3 text-center text-lg font-bold text-emerald-300">
                {t('gateLight.clock.right', { minutes: fullMinutes })}
              </p>
            )}
            {phase === 'wrong' && (
              <p className="mb-3 text-center text-lg text-orange-300">
                {t('gateLight.clock.wrong', { time: formatClock(question.answer) })}
              </p>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-slate-500 bg-slate-800 py-2 text-slate-200 hover:bg-slate-700"
        >
          {phase === 'ask' && question ? t('gateLight.clock.leave') : t('gateLight.clock.ok')}
          <span className="ms-2 text-xs text-slate-400">{phase === 'ask' && question ? '(Esc)' : '(Enter)'}</span>
        </button>
      </div>
    </div>
  );
};

/** A simple 12-hour face — the digital display next to it shows the 24h time. */
const AnalogClock = ({ time }: { time: ClockTime }) => {
  const hourDeg = ((time.h % 12) + time.m / 60) * 30;
  const minDeg = time.m * 6;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" aria-hidden>
      <circle cx="50" cy="50" r="47" fill="#f8fafc" stroke="#34d399" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1={i % 5 === 0 ? 7 : 8}
          x2="50"
          y2={i % 5 === 0 ? 13 : 10}
          stroke="#1e293b"
          strokeWidth={i % 5 === 0 ? 2 : 0.8}
          transform={`rotate(${i * 6} 50 50)`}
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const a = (n * 30 * Math.PI) / 180;
        return (
          <text
            key={n}
            x={50 + 30 * Math.sin(a)}
            y={50 - 30 * Math.cos(a) + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#0f172a"
          >
            {n}
          </text>
        );
      })}
      <line x1="50" y1="50" x2="50" y2="27" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" transform={`rotate(${hourDeg} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="12" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} />
      <circle cx="50" cy="50" r="3.5" fill="#ef4444" />
    </svg>
  );
};

export default GateClock;
