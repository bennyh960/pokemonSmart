import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { MiniGameTheme } from '../types.js';
import { useMenuNav } from './hooks.js';
import { MgButton } from './ui.js';

interface Props {
  theme: MiniGameTheme;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseMenu({ theme, onResume, onRestart, onQuit }: Props) {
  const { t } = useI18n();
  const actions = [onResume, onRestart, onQuit];
  const [sel, setSel] = useMenuNav({
    id: 'mg-pause',
    count: actions.length,
    axis: 'y',
    onSelect: (i) => actions[i](),
    onBack: onResume,
  });

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="mg-pop-in flex w-full max-w-xs flex-col gap-3 rounded-3xl bg-white/15 p-6 text-center shadow-2xl ring-1 ring-white/30">
        <h2 className="mb-2 text-3xl font-black text-white">⏸ {t('minigames.paused')}</h2>
        {[t('minigames.resume'), t('minigames.restart'), t('minigames.quit')].map((label, i) => (
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
