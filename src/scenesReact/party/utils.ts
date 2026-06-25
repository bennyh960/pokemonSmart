import type { MajorStatusId } from '../../types/battle-metadata';

export const STATUS_LABEL: Record<MajorStatusId, { en: string; he: string; color: string }> = {
  poison: { en: 'PSN', he: 'רעל', color: '#a040a0' },
  //   tox:  { en: 'TOX',  he: 'רעל+',  color: '#6a006a' },
  paralyze: { en: 'PAR', he: 'שיתוק', color: '#f8d030' },
  sleep: { en: 'SLP', he: 'שינה', color: '#7038f8' },
  burn: { en: 'BRN', he: 'כוויה', color: '#f08030' },
  freeze: { en: 'FRZ', he: 'קפוא', color: '#98d8d8' },
  //   faint:  { en: 'FNT',  he: 'עלפון', color: '#e83030' },
};

export function hpColor(hp: number, maxHp: number): string {
  const pct = hp / maxHp;
  if (pct > 0.5) return '#5ded6e';
  if (pct > 0.2) return '#facc15';
  return '#f87171';
}

// ─── move category icons (unicode stand-ins) ─────────────────────────────────
export const CATEGORY_ICON: Record<string, string> = {
  physical: '⚔️',
  special: '✨',
  status: '○',
};
