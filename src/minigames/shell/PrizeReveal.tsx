/** Prize reveal: a Poké Ball shakes 3× and pops open → rarity-coloured item card. One prize at a time. */

import { useEffect, useState } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { AwardedPrize } from '../progress.js';
import type { MiniGameTheme } from '../types.js';
import { useMenuNav, useReducedMotion } from './hooks.js';
import { describeReward } from './prize-display.js';
import { EndButtons } from './Results.js';
import { RARITY_TIER, miniGameSfx } from './sfx.js';
import { Confetti, MgButton, RARITY_STYLE } from './ui.js';

// Matches .mg-ball-shaking in minigames.css: 0.25s delay + 3 × 0.5s wobbles
const SHAKE_DELAY_MS = 250;
const SHAKE_MS = 500;
const SHAKES = 3;
const OPEN_AT_MS = SHAKE_DELAY_MS + SHAKES * SHAKE_MS + 150;

interface Props {
  theme: MiniGameTheme;
  prizes: AwardedPrize[];
  canNext: boolean;
  onPlayAgain?: () => void;
  onNext: () => void;
  onExit: () => void;
}

export function PrizeReveal({ theme, prizes, canNext, onPlayAgain, onNext, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const last = index >= prizes.length - 1;
  const [opened, setOpened] = useState(false);
  const reduced = useReducedMotion();

  return (
    <>
      {/* outside the blurred container: backdrop-filter would trap the fixed confetti layer */}
      {opened && prizes[index].rarity === 'epic' && !reduced && <Confetti key={index} pieces={80} />}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
        <PrizeBall key={index} prize={prizes[index]} onOpened={() => setOpened(true)} />
        <div
          className={`min-h-[56px] transition-opacity duration-300 ${opened ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          {opened &&
            (last ? (
              <EndButtons theme={theme} canNext={canNext} onPlayAgain={onPlayAgain} onNext={onNext} onExit={onExit} />
            ) : (
              <NextPrizeButton
                theme={theme}
                onNext={() => {
                  setOpened(false);
                  setIndex(index + 1);
                }}
              />
            ))}
        </div>
      </div>
    </>
  );
}

function NextPrizeButton({ theme, onNext }: { theme: MiniGameTheme; onNext: () => void }) {
  const { t } = useI18n();
  useMenuNav({ id: 'mg-next-prize', count: 1, onSelect: onNext });
  return (
    <MgButton theme={theme} variant="primary" glow selected onClick={onNext}>
      🎁 {t('minigames.prize.next')}
    </MgButton>
  );
}

function PrizeBall({ prize, onOpened }: { prize: AwardedPrize; onOpened: () => void }) {
  const { t, locale } = useI18n();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const style = RARITY_STYLE[prize.rarity];
  const lines = describeReward(prize.reward, locale);

  function doOpen() {
    if (open) return;
    setOpen(true);
    miniGameSfx.cue('mg-prize', { step: RARITY_TIER[prize.rarity] });
    onOpened();
  }

  // Shake rattles in sync with the CSS wobble, then pop
  useEffect(() => {
    if (reduced) {
      const id = window.setTimeout(doOpen, 300);
      return () => window.clearTimeout(id);
    }
    const timers = Array.from({ length: SHAKES }, (_, i) =>
      window.setTimeout(() => miniGameSfx.cue('mg-ball-shake'), SHAKE_DELAY_MS + i * SHAKE_MS + 60),
    );
    timers.push(window.setTimeout(doOpen, OPEN_AT_MS));
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter / Space / tap skips the suspense
  useMenuNav({ id: 'mg-prize-ball', count: 1, active: !open, onSelect: doOpen });

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="mg-pop-in rounded-full bg-black/30 px-4 py-1 text-lg font-black text-white">
        {t(`minigames.prize.${prize.kind}`)}
      </p>

      <div className="relative flex h-[260px] w-[260px] items-center justify-center">
        {!open ? (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={doOpen}
            className="mg-pop-in"
            aria-label={t('minigames.prize.tapToOpen')}
          >
            <div className="mg-ball mg-ball-shaking">
              <div className="mg-ball-half mg-ball-top" />
              <div className="mg-ball-half mg-ball-bottom" />
              <div className="mg-ball-button" />
            </div>
          </button>
        ) : (
          <>
            <div className="mg-flash" />
            <div
              className="mg-pop-in relative flex w-[230px] flex-col items-center gap-2 overflow-hidden rounded-[1.75rem] p-5 text-center shadow-2xl"
              style={{
                background: style.bg,
                color: style.text,
                border: `4px solid ${style.border}`,
                boxShadow: `0 0 40px ${style.glow}, 0 12px 30px rgba(0,0,0,0.35)`,
              }}
            >
              {(prize.rarity === 'rare' || prize.rarity === 'epic') && <div className="mg-rays" />}
              <span
                className="relative rounded-full px-3 py-0.5 text-xs font-black tracking-wider uppercase"
                style={{ background: style.border, color: '#fff' }}
              >
                {t(`minigames.rarity.${prize.rarity}`)}
              </span>
              {lines.map((line, i) => (
                <div key={i} className="relative flex flex-col items-center">
                  <div className="flex h-24 w-24 items-center justify-center">
                    {line.icon ? (
                      <img
                        src={line.icon}
                        alt=""
                        className="h-24 w-24 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <span className="text-6xl">{line.emoji}</span>
                    )}
                  </div>
                  <p className="text-xl leading-tight font-black">{line.label}</p>
                  {line.qty && (
                    <p className="text-lg font-black" dir="ltr">
                      {line.qty}
                    </p>
                  )}
                </div>
              ))}
              <div className="mg-shine" />
              {prize.rarity === 'epic' &&
                ['8% 12%', '82% 18%', '14% 78%', '88% 70%', '50% 4%'].map((pos, i) => (
                  <span
                    key={pos}
                    className="mg-twinkle text-xl"
                    style={{ left: pos.split(' ')[0], top: pos.split(' ')[1], animationDelay: `${i * 0.23}s` }}
                  >
                    ✦
                  </span>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
