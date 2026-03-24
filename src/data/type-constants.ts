/**
 * Shared type constants — colors, display names, and damage class labels.
 * Import from here instead of duplicating in individual scenes.
 */

import type { PokemonType } from '../types/index.js';
import { getLocale } from '../i18n/i18n.js';

/** Canonical color for each Pokemon type (used in type badges, bars, etc.). */
export const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  glitch: '#00ff88',
};

/** Display names for each type in both supported locales. */
export const TYPE_NAMES: Record<PokemonType, { en: string; he: string }> = {
  normal: { en: 'Normal', he: 'רגיל' },
  fire: { en: 'Fire', he: 'אש' },
  water: { en: 'Water', he: 'מים' },
  grass: { en: 'Grass', he: 'דשא' },
  electric: { en: 'Electric', he: 'חשמל' },
  ice: { en: 'Ice', he: 'קרח' },
  fighting: { en: 'Fighting', he: 'קרב' },
  poison: { en: 'Poison', he: 'רעל' },
  ground: { en: 'Ground', he: 'אדמה' },
  flying: { en: 'Flying', he: 'מעופף' },
  psychic: { en: 'Psychic', he: 'פסיכי' },
  bug: { en: 'Bug', he: 'חרק' },
  rock: { en: 'Rock', he: 'סלע' },
  ghost: { en: 'Ghost', he: 'רוח' },
  dragon: { en: 'Dragon', he: 'דרקון' },
  dark: { en: 'Dark', he: 'חושך' },
  steel: { en: 'Steel', he: 'פלדה' },
  glitch: { en: 'Glitch', he: 'גליץ\'' },
};

/** Labels and symbols for move damage classes. */
export const DAMAGE_CLASS_LABELS: Record<string, { en: string; he: string; symbol: string }> = {
  physical: { en: 'Physical', he: 'פיזי', symbol: '⚔' },
  special: { en: 'Special', he: 'מיוחד', symbol: '◆' },
  status: { en: 'Status', he: 'סטטוס', symbol: '☆' },
};

/** Returns the localized display name for a Pokemon type. */
export function getTypeName(type: PokemonType): string {
  const entry = TYPE_NAMES[type];
  if (!entry) return type;
  return entry[getLocale()];
}

/** Returns the localized label and symbol for a move damage class. */
export function getDamageClassLabel(damageClass: string): { label: string; symbol: string } {
  const entry = DAMAGE_CLASS_LABELS[damageClass];
  if (!entry) return { label: damageClass, symbol: '' };
  return { label: entry[getLocale()], symbol: entry.symbol };
}
