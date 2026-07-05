import { useI18n } from '../../../ui-react/context/i18n-context';

interface SearchHeaderProps {
  value: string;
  onChange: (value: string) => void;
  caughtCount: number;
  seenCount: number;
  totalCount: number;
}

export function SearchHeader({ value, onChange, caughtCount, seenCount, totalCount }: SearchHeaderProps) {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-red-800/50 bg-black/60 px-4 py-3 shadow-[0_0_25px_-6px_rgba(220,38,38,0.55)]">
        <svg
          className="h-5 w-5 shrink-0 text-red-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('pokedex.search.placeholder')}
          className="w-full bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="font-mono text-xs text-zinc-500 hover:text-zinc-300"
          >
            {t('pokedex.search.clear')}
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-red-800/40 bg-black/50 px-4 py-3 font-mono text-[11px] text-zinc-400 sm:justify-start">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" />
          {t('pokedex.caught')} <b className="text-amber-400">{caughtCount}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_theme(colors.red.400)]" />
          {t('pokedex.seen')} <b className="text-amber-400">{seenCount}</b>
        </span>
        <span>
          / <b className="text-zinc-300">{totalCount}</b>
        </span>
      </div>
    </div>
  );
}
