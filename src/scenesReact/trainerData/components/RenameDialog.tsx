import { useState, type KeyboardEvent } from 'react';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { usePlayerData } from '../../../ui-react/hooks/usePlayerData';
import { ADMIN_NAME } from '../../../engine/config';
import { checkPlayerRename, PLAYER_NAME_MAX_LENGTH } from '../../../systems/player-onboarding';
import { syncToCloud } from '../../../systems/save';

interface IRenameDialogProps {
  onClose: () => void;
}

/** Trainer Card → ✏️: fix a typo in the player's name. */
const RenameDialog = ({ onClose }: IRenameDialogProps) => {
  const { t, isRTL } = useI18n();
  const [pd, mutate] = usePlayerData();
  const [draft, setDraft] = useState(pd.name);
  const [error, setError] = useState<'empty' | 'reserved' | null>(null);

  const save = () => {
    const result = checkPlayerRename(draft, pd.name, ADMIN_NAME);
    if (!result.ok) {
      if (result.reason === 'same') onClose();
      else setError(result.reason);
      return;
    }
    mutate((d) => {
      d.name = result.name;
    });
    syncToCloud(true); // explicit change — don't wait for the 10-minute sync
    onClose();
  };

  // Typing stays in the field: the game's key handler would swallow Enter / Space / L
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full max-w-sm bg-slate-950 border-2 border-slate-700 rounded-2xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-cyan-400 text-base mb-3">✏️ {t('trainerData.rename.title')}</h3>
        <input
          autoFocus
          value={draft}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          aria-label={t('trainerData.rename.title')}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={onKey}
          className="w-full h-12 rounded-xl border border-cyan-500/50 bg-slate-900 px-3 text-lg text-white outline-none focus:border-cyan-400"
        />
        <p className={`text-xs mt-1.5 min-h-[1rem] ${error ? 'text-rose-400' : 'text-slate-500'}`} role="status">
          {error ? t(`trainerData.rename.${error}`) : t('trainerData.rename.hint', { max: PLAYER_NAME_MAX_LENGTH })}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={save}
            className="flex-1 h-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors"
          >
            {t('trainerData.rename.save')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            {t('trainerData.rename.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameDialog;
