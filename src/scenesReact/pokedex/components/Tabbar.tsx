import React from 'react';
import type { TabKey } from '../types';
import { useI18n } from '../../../ui-react/context/i18n-context';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'pokedex.tab.info' },
  { key: 'evolution', label: 'pokedex.tab.evolution' },
  { key: 'battle', label: 'pokedex.tab.type' },
  { key: 'moves', label: 'pokedex.tab.moves' },
  { key: 'locations', label: 'pokedex.tab.location' },
];

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  const { t } = useI18n();
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-red-900/40">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition
            ${active === tab.key ? 'border-red-500 text-red-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          {t(tab.label)}
        </button>
      ))}
    </div>
  );
}
