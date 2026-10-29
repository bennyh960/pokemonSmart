/** "Leave class?" — asked when the child backs out of a Word Board round before it finished (board.ts, leave). */

import { useI18n } from '../../ui-react/context/i18n-context.js';
import { useMenuNav } from '../shell/hooks.js';
import { MgButton } from '../shell/ui.js';
import type { Bilingual, MiniGameTheme } from '../types.js';
import { BOARD_LEAVE_LOCK_MS } from './board.js';

const TEXT = {
  title: { en: 'Leave class?', he: 'לצאת מהשיעור?' },
  body: {
    en: 'If you leave before the game ends, the Word Board closes for {n} minutes.',
    he: 'אם יוצאים לפני שהמשחק נגמר, לוח המילים ייסגר ל-{n} דקות.',
  },
  stay: { en: 'Keep playing', he: 'ממשיכים לשחק' },
  leave: { en: 'Leave', he: 'יוצאים' },
} satisfies Record<string, Bilingual>;

interface Props {
  theme: MiniGameTheme;
  onStay: () => void;
  onLeave: () => void;
}

export function LeaveRoundDialog({ theme, onStay, onLeave }: Props) {
  const { locale } = useI18n();
  const actions = [onStay, onLeave];
  const [sel, setSel] = useMenuNav({
    id: 'mg-leave-round',
    count: actions.length,
    axis: 'y',
    onSelect: (i) => actions[i](),
    onBack: onStay,
  });

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="mg-pop-in flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-white/15 p-6 text-center shadow-2xl ring-1 ring-white/30">
        <h2 className="text-3xl font-black text-white">🚪 {TEXT.title[locale]}</h2>
        <p className="mb-2 text-lg font-bold text-white/90">
          {TEXT.body[locale].replace('{n}', String(BOARD_LEAVE_LOCK_MS / 60000))}
        </p>
        {[TEXT.stay[locale], TEXT.leave[locale]].map((label, i) => (
          <MgButton
            key={label}
            theme={theme}
            variant={i === 0 ? 'primary' : 'soft'}
            selected={sel === i}
            onHover={() => setSel(i)}
            onClick={actions[i]}
          >
            {label}
          </MgButton>
        ))}
      </div>
    </div>
  );
}
