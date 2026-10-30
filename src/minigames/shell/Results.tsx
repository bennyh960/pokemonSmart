/** Results: stars fly in with chimes, score counts up, NEW RECORD banner, then prizes or end buttons. */

import { useEffect, useState } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { RecordOutcome } from '../progress.js';
import type { MiniGameResult, MiniGameTheme } from '../types.js';
import { useMenuNav, useReducedMotion } from './hooks.js';
import { miniGameSfx } from './sfx.js';
import { Confetti, MgButton } from './ui.js';

const STAR_START_MS = 450;
const STAR_GAP_MS = 380;
const COUNT_MS = 900;

interface Props {
  theme: MiniGameTheme;
  levelLabel: string;
  result: MiniGameResult;
  outcome: RecordOutcome;
  canNext: boolean;
  onOpenPrizes: () => void;
  onPlayAgain?: () => void;
  onNext: () => void;
  onExit: () => void;
}

export function Results({
  theme,
  levelLabel,
  result,
  outcome,
  canNext,
  onOpenPrizes,
  onPlayAgain,
  onNext,
  onExit,
}: Props) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const [record, setRecord] = useState(false);
  const score = useCountUp(result.score, STAR_START_MS, COUNT_MS);
  const stars = outcome.stars;

  useEffect(() => {
    const timers: number[] = [];
    if (outcome.cleared) miniGameSfx.cue('mg-clear');
    for (let i = 0; i < stars; i++) {
      timers.push(
        window.setTimeout(
          () => {
            setShown(i + 1);
            miniGameSfx.cue('mg-star', { step: i });
          },
          STAR_START_MS + 500 + i * STAR_GAP_MS,
        ),
      );
    }
    if (outcome.newRecord) {
      timers.push(
        window.setTimeout(
          () => {
            setRecord(true);
            miniGameSfx.cue('mg-record');
          },
          STAR_START_MS + 600 + stars * STAR_GAP_MS + COUNT_MS * 0.4,
        ),
      );
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [outcome, stars]);

  return (
    <>
      {/* outside the blurred container: backdrop-filter would trap the fixed confetti layer */}
      {outcome.cleared && !reduced && <Confetti />}
      <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-[2px]">
        <div className="mg-pop-in relative w-full max-w-md rounded-[2rem] bg-white/15 p-6 text-center text-white shadow-2xl ring-1 ring-white/30">
          <p className="text-sm font-bold text-white/80">{levelLabel}</p>
          <h2 className="mt-1 text-3xl font-black drop-shadow sm:text-4xl">
            {outcome.cleared ? t('minigames.results.clear') : t('minigames.results.tryAgain')}
          </h2>

          <div className="my-5 flex items-end justify-center gap-3" dir="ltr">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`text-6xl leading-none sm:text-7xl ${i < shown ? 'mg-star-fly text-yellow-300' : 'text-white/20'}`}
                style={{
                  transform: i === 1 ? 'translateY(-14px)' : undefined,
                  textShadow: i < shown ? '0 4px 0 #b45309, 0 0 24px rgba(253,224,71,0.8)' : undefined,
                }}
              >
                ★
              </span>
            ))}
          </div>

          <div className="relative">
            <p className="text-xs font-bold tracking-widest text-white/75 uppercase">{t('minigames.score')}</p>
            <p className="text-5xl font-black tabular-nums drop-shadow" dir="ltr">
              {score.toLocaleString()}
            </p>
            {record && (
              <span
                className="mg-banner absolute -top-4 end-0 rounded-xl px-3 py-1 text-sm font-black shadow-lg"
                style={{ background: theme.accent, color: theme.accentText }}
              >
                {t('minigames.results.newRecord')}
              </span>
            )}
          </div>

          {outcome.unlockedLevel !== undefined && (
            <p
              className="mg-slide-up mt-4 rounded-2xl bg-black/20 px-4 py-2 font-black"
              style={{ animationDelay: '1.6s' }}
            >
              🔓 {t('minigames.results.unlocked', { n: outcome.unlockedLevel })}
            </p>
          )}

          {outcome.ladder && (
            <p
              className="mg-slide-up mt-4 rounded-2xl bg-black/20 px-4 py-2 font-black"
              style={{ animationDelay: '1.6s' }}
            >
              {outcome.ladder.newLevel !== undefined
                ? `🎉 ${t('minigames.results.ladderUp', { n: outcome.ladder.newLevel })}`
                : outcome.ladder.gained > 0
                  ? `🪜 ${t('minigames.results.ladderPoints', { n: outcome.ladder.gained })}`
                  : `🪜 ${t('minigames.results.ladderNoPoints')}`}
            </p>
          )}

          {outcome.dex && (outcome.dex.newCards > 0 || outcome.dex.prizeWaiting) && (
            <p
              className="mg-slide-up mt-3 rounded-2xl bg-black/20 px-4 py-2 font-black"
              style={{ animationDelay: '1.9s' }}
            >
              {[
                outcome.dex.newCards > 0 && `📖 ${t('minigames.results.dexCards', { n: outcome.dex.newCards })}`,
                outcome.dex.prizeWaiting && `🎁 ${t('minigames.results.dexPrize')}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          <div className="mg-slide-up mt-6" style={{ animationDelay: '0.8s' }}>
            {outcome.prizes.length > 0 ? (
              <OpenPrizeButton theme={theme} onOpen={onOpenPrizes} />
            ) : (
              <EndButtons theme={theme} canNext={canNext} onPlayAgain={onPlayAgain} onNext={onNext} onExit={onExit} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function OpenPrizeButton({ theme, onOpen }: { theme: MiniGameTheme; onOpen: () => void }) {
  const { t } = useI18n();
  useMenuNav({ id: 'mg-results-prize', count: 1, onSelect: onOpen, onBack: onOpen });
  return (
    <MgButton theme={theme} variant="primary" glow selected onClick={onOpen} className="w-full !py-4 !text-xl">
      🎁 {t('minigames.results.openPrize')}
    </MgButton>
  );
}

interface EndButtonsProps {
  theme: MiniGameTheme;
  canNext: boolean;
  /** Omitted → no "Play again" (a care round that already healed its Pokémon). */
  onPlayAgain?: () => void;
  onNext: () => void;
  onExit: () => void;
}

/** Play again / Next level / Exit — shared by Results and the prize reveal. */
export function EndButtons({ theme, canNext, onPlayAgain, onNext, onExit }: EndButtonsProps) {
  const { t, isRTL } = useI18n();
  const items = [
    ...(canNext ? [{ label: `${t('minigames.nextLevel')} ${isRTL ? '◀' : '▶'}`, run: onNext, primary: true }] : []),
    ...(onPlayAgain ? [{ label: `↻ ${t('minigames.playAgain')}`, run: onPlayAgain, primary: !canNext }] : []),
    { label: t('minigames.exit'), run: onExit, primary: !canNext && !onPlayAgain },
  ];
  const [sel, setSel] = useMenuNav({
    id: 'mg-end-buttons',
    count: items.length,
    axis: 'both',
    onSelect: (i) => items[i].run(),
    onBack: onExit,
  });
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {items.map((it, i) => (
        <MgButton
          key={it.label}
          theme={theme}
          variant={it.primary ? 'primary' : i === items.length - 1 ? 'dark' : 'soft'}
          glow={it.primary}
          selected={sel === i}
          onHover={() => setSel(i)}
          onClick={it.run}
        >
          {it.label}
        </MgButton>
      ))}
    </div>
  );
}

/** Animated 0 → target count after a delay. */
function useCountUp(target: number, delayMs: number, durationMs: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delayMs;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / durationMs));
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs, durationMs]);
  return value;
}
