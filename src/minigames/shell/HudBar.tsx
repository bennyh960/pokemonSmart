/** Glass HUD bar: pause · level · score · combo flame · timer or hearts. Plus floating texts. */

import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { MiniGameTheme } from '../types.js';
import type { HudState } from './useHud.js';
import { MgButton } from './ui.js';

interface Props {
  state: HudState;
  theme: MiniGameTheme;
  levelLabel: string;
  onPause: () => void;
}

export function HudBar({ state, theme, levelLabel, onPause }: Props) {
  const { t } = useI18n();
  const { score, combo, hearts, timer } = state;
  const secondsLeft = timer ? Math.ceil(timer.left) : 0;
  const urgent = timer !== null && secondsLeft <= 5;

  return (
    <div className="shrink-0 px-3 pt-3">
      <div className="mg-glass mx-auto flex max-w-5xl items-center gap-2 rounded-2xl px-2 py-2 text-white shadow-lg sm:gap-4 sm:px-3">
        <MgButton theme={theme} variant="dark" onClick={onPause} ariaLabel={t('minigames.pause')} className="!px-3">
          ⏸
        </MgButton>

        <span className="hidden truncate text-sm font-bold text-white/85 sm:block">{levelLabel}</span>

        <div className="ms-auto flex items-center gap-2 sm:gap-4" dir="ltr">
          {combo >= 2 && (
            <span
              key={combo}
              className="mg-bump flex items-center gap-1 rounded-full px-3 py-1 text-lg font-black shadow"
              style={{ background: theme.accent, color: theme.accentText }}
              aria-label={t('minigames.combo')}
            >
              <span className="mg-flame">🔥</span>×{combo}
            </span>
          )}

          {hearts && (
            <span className="flex gap-0.5 text-xl" aria-label={t('minigames.hearts')}>
              {Array.from({ length: hearts.max }, (_, i) => (
                <span key={i} className={i < hearts.current ? '' : 'opacity-25 grayscale'}>
                  ❤️
                </span>
              ))}
            </span>
          )}

          {timer && (
            <span
              className="flex min-w-[88px] items-center gap-1.5 rounded-full bg-black/25 px-3 py-1"
              aria-label={t('minigames.time')}
            >
              <span>⏱</span>
              <span className={`text-xl font-black tabular-nums ${urgent ? 'mg-urgent' : ''}`}>{secondsLeft}</span>
              <span className="h-2 w-10 overflow-hidden rounded-full bg-white/25">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(timer.left / Math.max(1, timer.total)) * 100}%`,
                    background: urgent ? '#f87171' : theme.accent,
                    transition: 'width 0.1s linear',
                  }}
                />
              </span>
            </span>
          )}

          <span className="flex flex-col items-end leading-none">
            <span className="text-[10px] font-bold tracking-wider text-white/70 uppercase">{t('minigames.score')}</span>
            <span key={state.scoreBump} className="mg-bump text-2xl font-black tabular-nums">
              {score.toLocaleString()}
            </span>
          </span>
        </div>
      </div>

      {state.floats.map((f) => (
        <span key={f.id} className="mg-float" style={{ left: f.x, top: f.y, color: f.color }}>
          {f.text}
        </span>
      ))}
    </div>
  );
}
