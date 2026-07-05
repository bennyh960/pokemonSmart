import type { WildLocation } from '../../utils/locationHelper';
import { useI18n } from '../../../../ui-react/context/i18n-context';

interface LocationsTabProps {
  locations: WildLocation[];
  onViewOnMap: (locations: WildLocation[]) => void;
}

export function LocationsTab({ locations, onViewOnMap }: LocationsTabProps) {
  const { t } = useI18n();

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 text-start">
        <div className="flex items-center gap-2 text-zinc-300 font-semibold text-sm">
          <span className="text-amber-500 animate-pulse">📡</span>
          <h4>{t('pokedex.location.none.title')}</h4>
        </div>

        <p className="mt-2 text-xs font-medium text-zinc-400">{t('pokedex.location.none.desc')}</p>

        <ul className="mt-3 space-y-2 text-xs text-zinc-500 list-none">
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-0.5 flex-shrink-0">🔄</span>
            <span>{t('pokedex.location.none.reason.cache')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-zinc-600 mt-0.5 flex-shrink-0">⭐</span>
            <span>{t('pokedex.location.none.reason.wild')}</span>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
      <div className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500 flex justify-between">
        <div>{t('pokedex.tab.location')}</div>

        <button
          onClick={() => onViewOnMap(locations)}
          className="cursor-pointer flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 font-mono text-[11px] font-medium text-zinc-300 transition-all hover:border-amber-900/60 hover:bg-amber-950/20 hover:text-amber-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <span>{t('pokedex.locations.viewOnMap')}</span>
        </button>
      </div>
      <div className="space-y-4">
        {locations.map((loc) => {
          const averageLevel = Math.round((loc.minLevel + loc.maxLevel) / 2);

          return (
            <div
              key={loc.mapId}
              className="flex items-start justify-between gap-4 border-b border-zinc-900 pb-4 last:border-none last:pb-0"
            >
              <div className="flex items-start gap-3">
                <span className="text-amber-400 flex-shrink-0 mt-0.5">📍</span>
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{loc.mapLabel}</div>

                  <div className="mt-0.5 text-xs text-zinc-500">
                    {loc.methods.map((method) => t(`encounter.method.${method}`)).join(', ')}
                  </div>

                  <div className="mt-1 font-mono text-[11px] text-zinc-400 flex items-center gap-1">
                    <span className="text-zinc-600">📊</span>
                    <span>{t('pokedex.encounter.avgLevel', { level: averageLevel })}</span>
                    <span className="text-zinc-600 text-[10px]">
                      ({loc.minLevel === loc.maxLevel ? loc.minLevel : `${loc.minLevel}-${loc.maxLevel}`})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
