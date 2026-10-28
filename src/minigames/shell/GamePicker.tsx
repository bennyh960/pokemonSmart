/** "Mini Games" picker — one big card per registered game. */

import { useI18n } from '../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import { totalStars } from '../progress.js';
import type { AnyMiniGameDef, MiniGameId, MiniGameTheme } from '../types.js';
import { useMenuNav } from './hooks.js';
import { MgButton, PokemonSprite, themeBackground } from './ui.js';
import { miniGameSfx } from './sfx.js';

const PICKER_THEME: MiniGameTheme = { from: '#4f46e5', to: '#db2777', accent: '#fde047', accentText: '#1e1b4b' };

interface Props {
  games: readonly AnyMiniGameDef[];
  initialId?: MiniGameId;
  onPick: (id: MiniGameId) => void;
  onClose: () => void;
  /** Shown when the picker offers English games: opens the Word Dex. */
  onWordDex?: () => void;
}

export function GamePicker({ games, initialId, onPick, onClose, onWordDex }: Props) {
  const { t, locale } = useI18n();
  const [pd] = usePlayerData();
  const save = pd.miniGames ?? {};
  const pick = (id: MiniGameId) => {
    miniGameSfx.tap();
    onPick(id);
  };
  const initial = Math.max(
    0,
    games.findIndex((g) => g.id === initialId),
  );
  // index 0..N-1 = games, N = close button
  const [sel, setSel] = useMenuNav({
    id: 'mg-picker',
    count: games.length + 1,
    initial,
    axis: 'both',
    onSelect: (i) => (i < games.length ? pick(games[i].id) : onClose()),
    onBack: onClose,
  });

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={themeBackground(PICKER_THEME)}>
      <div className="shrink-0 px-4 pt-5 pb-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="mg-pop-in">
            <h1 className="text-3xl font-black text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:text-4xl">
              🎮 {t('minigames.title')}
            </h1>
            <p className="mt-1 font-bold text-white/85">{t('minigames.pickerSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {onWordDex && (
              <MgButton theme={PICKER_THEME} variant="primary" onClick={onWordDex}>
                📖 {t('minigames.wordDex')}
              </MgButton>
            )}
            <MgButton
              theme={PICKER_THEME}
              variant="dark"
              onClick={onClose}
              selected={sel === games.length}
              onHover={() => setSel(games.length)}
              ariaLabel={t('minigames.close')}
            >
              ✕
            </MgButton>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <div className="mx-auto grid max-w-5xl gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game, i) => {
            const { stars, max } = totalStars(save, game);
            const selected = sel === i;
            return (
              <button
                key={game.id}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setSel(i)}
                onClick={() => pick(game.id)}
                className={`mg-pop-in group relative flex min-h-[220px] flex-col overflow-hidden rounded-[1.75rem] p-5 text-start shadow-2xl transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.02] ${selected ? 'mg-selected scale-[1.02]' : ''}`}
                style={{ ...themeBackground(game.theme), animationDelay: `${i * 90}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black leading-tight text-white drop-shadow">{game.name[locale]}</h2>
                    <p className="mt-1 text-sm font-semibold text-white/85">{game.tagline[locale]}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                  <span
                    className="rounded-full px-3 py-1 text-sm font-black shadow"
                    style={{ background: game.theme.accent, color: game.theme.accentText }}
                    dir="ltr"
                  >
                    ★ {stars}/{max}
                  </span>
                  <PokemonSprite
                    id={game.mascotPokemonId}
                    className={`h-28 w-28 object-contain drop-shadow-[0_6px_6px_rgba(0,0,0,0.3)] ${selected ? 'mg-bob' : ''}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
