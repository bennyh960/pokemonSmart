/** 3-2-1-GO! — giant popping numbers with beeps, then onDone. */

import { useEffect, useState } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { MiniGameTheme } from '../types.js';
import { miniGameSfx } from './sfx.js';

const STEP_MS = 700;
const STEPS = [3, 2, 1, 0]; // 0 = GO

export function Countdown({ theme, onDone }: { theme: MiniGameTheme; onDone: () => void }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= STEPS.length) {
      onDone();
      return;
    }
    const n = STEPS[i];
    if (n > 0) miniGameSfx.cue('mg-count', { step: n });
    else miniGameSfx.cue('mg-go');
    const id = window.setTimeout(() => setI(i + 1), n > 0 ? STEP_MS : STEP_MS * 0.8);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const n = STEPS[Math.min(i, STEPS.length - 1)];
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/25">
      <span
        key={i}
        className="mg-count select-none text-[9rem] font-black leading-none sm:text-[12rem]"
        style={{
          color: n === 0 ? theme.accent : '#fff',
          WebkitTextStroke: '6px rgba(0,0,0,0.25)',
          textShadow: '0 10px 0 rgba(0,0,0,0.25), 0 0 40px rgba(255,255,255,0.5)',
        }}
      >
        {n === 0 ? t('minigames.go') : n}
      </span>
    </div>
  );
}
