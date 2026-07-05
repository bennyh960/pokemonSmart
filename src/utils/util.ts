import { getLocale } from '../i18n/i18n';
import { getNature, getNatureDisplayName } from '../services/pokemon-data';
import type { Pokemon } from '../types';
import type { MajorStatusId } from '../types/battle-metadata';

export const getPokemonSpriteUrl = (pokemonId: number, side: 'front' | 'back' = 'front'): string => {
  return `/sprites/pokemon/${side}/${pokemonId}.png`;
};

export const STATUS_LABEL: Record<MajorStatusId, { en: string; he: string; color: string }> = {
  poison: { en: 'PSN', he: 'רעל', color: '#a040a0' },
  //   tox:  { en: 'TOX',  he: 'רעל+',  color: '#6a006a' },
  paralysis: { en: 'PAR', he: 'שיתוק', color: '#f8d030' },
  paralyze: { en: 'PAR', he: 'שיתוק', color: '#f8d030' },
  sleep: { en: 'SLP', he: 'ישן', color: '#7038f8' },
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

// ─── move category/damage class icons (unicode stand-ins) ─────────────────────────────────
export const DAMAGE_CLASS_ICON: Record<string, { icon: string; label: { en: string; he: string } }> = {
  physical: { icon: '⚔️', label: { en: 'Physical', he: 'פיזי' } },
  special: { icon: '✨', label: { en: 'Special', he: 'מיוחד' } },
  status: { icon: '○', label: { en: 'Status', he: 'סטטוס' } },
};

// ─── Glow CSS vars derived from the primary type colour ───────────────────────
export function glowStyle(hex: string): React.CSSProperties {
  return {
    '--glow': hex,
    '--glow-dim': hex + '60',
    '--glow-inner': hex + '22',
    '--glow-blob': hex + '55',
  } as React.CSSProperties;
}

export const getStatConfig = (pokemon: Pokemon) => {
  // Dummy stats for rendering if pokemon object doesn't have them yet
  const stats = {
    hp: pokemon.maxHp,
    atk: pokemon.attack,
    def: pokemon.defense,
    spa: pokemon.specialAttack,
    spd: pokemon.specialDefense,
    spe: pokemon.speed,
  };

  return [
    { key: 'party.stats.hp', label: 'HP', val: stats.hp, color: 'bg-green-500' },
    { key: 'party.stats.attack', label: 'Attack', val: stats.atk, color: 'bg-orange-500' },
    { key: 'party.stats.defense', label: 'Defense', val: stats.def, color: 'bg-slate-400' },
    { key: 'party.stats.spAtk', label: 'Sp. Atk', val: stats.spa, color: 'bg-teal-400' },
    { key: 'party.stats.spDef', label: 'Sp. Def', val: stats.spd, color: 'bg-emerald-400' },
    { key: 'party.stats.speed', label: 'Speed', val: stats.spe, color: 'bg-lime-400' },
  ];
};

export const getNatureStrings = (pokemon: Pokemon) => {
  const locale = getLocale();
  if (!pokemon.natureId) return { natureHint: '', localName: '' };

  const localName = getNatureDisplayName(pokemon.natureId);

  const natureDef = getNature(pokemon.natureId);
  if (natureDef?.increasedStat && natureDef?.decreasedStat) {
    const statShort: Record<string, { he: string; en: string }> = {
      attack: { en: 'Atk', he: 'התקפה' },
      defense: { en: 'Def', he: 'הגנה' },
      specialAttack: { en: 'SpA', he: 'התקפה מיוחדת' },
      specialDefense: { en: 'SpD', he: 'הגנה מיוחדת' },
      speed: { en: 'Spe', he: 'מהירות' },
    };
    const natureHint = ` (+${statShort[natureDef.increasedStat][locale] ?? '?'} -${
      statShort[natureDef.decreasedStat][locale] ?? '?'
    })`;
    return { natureHint, localName };
  }
  return { natureHint: '', localName };
};

export function getContrastTextColor(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived luminance (WCAG-ish weighting — eyes are most sensitive to green).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1c1c1c' : '#ffffff';
}
