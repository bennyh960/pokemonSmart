/**
 * Placeholder play area used by a game until its real component exists.
 * Shows "coming soon" and lets you finish the round to test the shell (results + prizes).
 */

import { useEffect, type MouseEvent } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { MiniGameProps, Stars } from '../types.js';

export function StubGame({ level, hud, sfx, theme, paused, onFinish, onQuit }: MiniGameProps) {
  const { t, locale } = useI18n();

  useEffect(() => {
    hud.setScore(0);
  }, [hud]);

  function finish(stars: Stars) {
    if (paused) return;
    sfx.correct(stars);
    onFinish({ stars, score: 100 * stars + level.number * 10 });
  }

  function tapScore(e: MouseEvent<HTMLButtonElement>) {
    sfx.tap();
    hud.addScore(10, { x: e.clientX, y: e.clientY });
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="mg-pop-in text-5xl" aria-hidden>
        🚧
      </div>
      <h2 className="text-2xl font-black text-white drop-shadow">{t('minigames.stub.comingSoon')}</h2>
      <p className="text-white/80">{level.name?.[locale]}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={tapScore} className="mg-btn bg-white/20 text-white" dir="ltr">
          +10
        </button>
        <button
          type="button"
          onClick={() => finish(3)}
          className="mg-btn"
          style={{ background: theme.accent, color: theme.accentText }}
        >
          {t('minigames.stub.finish3')}
        </button>
        <button type="button" onClick={() => finish(1)} className="mg-btn bg-white/20 text-white">
          {t('minigames.stub.finish1')}
        </button>
        <button type="button" onClick={onQuit} className="mg-btn bg-black/25 text-white">
          {t('minigames.quit')}
        </button>
      </div>
    </div>
  );
}
