/**
 * Shared type constants — single source of truth for Pokemon type display data.
 *
 * TYPE_BADGE is the canonical data for each type: color, bilingual name,
 * and badge styling (transparent bg/border for dark UIs).
 * All consumers should import from here.
 */

import type { PokemonType } from '../types/index.js';
import { getLocale } from '../i18n/i18n.js';

// ─── Type badge — single source of truth ───────────────────────────

export interface TypeBadgeStyle {
  /** English name (e.g. 'Fire') */
  en: string;
  /** Hebrew name (e.g. 'אש') */
  he: string;
  /** Solid hex color (e.g. '#f08030') — use for fills, dots, solid badges */
  color: string;
  /** Translucent RGBA background — use for dark-UI badge fills */
  bg: string;
  /** Translucent RGBA border — use for dark-UI badge strokes */
  border: string;
}

export const TYPE_BADGE: Record<PokemonType, TypeBadgeStyle> = {
  normal: {
    en: 'Normal',
    he: 'רגיל',
    color: '#a8a878',
    bg: 'rgba(168,168,120,0.15)',
    border: 'rgba(168,168,120,0.25)',
  },
  fire: { en: 'Fire', he: 'אש', color: '#f08030', bg: 'rgba(240,128,48,0.12)', border: 'rgba(240,128,48,0.2)' },
  water: { en: 'Water', he: 'מים', color: '#6890f0', bg: 'rgba(104,144,240,0.12)', border: 'rgba(104,144,240,0.2)' },
  grass: { en: 'Grass', he: 'דשא', color: '#78c850', bg: 'rgba(120,200,80,0.12)', border: 'rgba(120,200,80,0.2)' },
  electric: {
    en: 'Electric',
    he: 'חשמל',
    color: '#f8d030',
    bg: 'rgba(248,208,48,0.12)',
    border: 'rgba(248,208,48,0.2)',
  },
  ice: { en: 'Ice', he: 'קרח', color: '#98d8d8', bg: 'rgba(152,216,216,0.12)', border: 'rgba(152,216,216,0.2)' },
  fighting: {
    en: 'Fighting',
    he: 'לחימה',
    color: '#c03028',
    bg: 'rgba(192,48,40,0.12)',
    border: 'rgba(192,48,40,0.2)',
  },
  poison: { en: 'Poison', he: 'רעל', color: '#a040a0', bg: 'rgba(160,64,160,0.12)', border: 'rgba(160,64,160,0.2)' },
  ground: { en: 'Ground', he: 'אדמה', color: '#e0c068', bg: 'rgba(224,192,104,0.12)', border: 'rgba(224,192,104,0.2)' },
  flying: {
    en: 'Flying',
    he: 'תעופה',
    color: '#a890f0',
    bg: 'rgba(168,144,240,0.12)',
    border: 'rgba(168,144,240,0.2)',
  },
  psychic: {
    en: 'Psychic',
    he: 'על חושי',
    color: '#f85888',
    bg: 'rgba(248,88,136,0.12)',
    border: 'rgba(248,88,136,0.2)',
  },
  bug: { en: 'Bug', he: 'חרק', color: '#a8b820', bg: 'rgba(168,184,32,0.12)', border: 'rgba(168,184,32,0.2)' },
  rock: { en: 'Rock', he: 'סלע', color: '#b8a038', bg: 'rgba(184,160,56,0.12)', border: 'rgba(184,160,56,0.2)' },
  ghost: { en: 'Ghost', he: 'רוח', color: '#705898', bg: 'rgba(112,88,152,0.12)', border: 'rgba(112,88,152,0.2)' },
  dragon: { en: 'Dragon', he: 'דרקון', color: '#7038f8', bg: 'rgba(112,56,248,0.12)', border: 'rgba(112,56,248,0.2)' },
  dark: { en: 'Dark', he: 'חושך', color: '#705848', bg: 'rgba(112,88,72,0.12)', border: 'rgba(112,88,72,0.2)' },
  steel: { en: 'Steel', he: 'פלדה', color: '#b8b8d0', bg: 'rgba(184,184,208,0.12)', border: 'rgba(184,184,208,0.2)' },
  glitch: { en: 'Glitch', he: "גליץ'", color: '#00ff88', bg: 'rgba(0,255,136,0.12)', border: 'rgba(0,255,136,0.2)' },
};

// ─── Convenience helpers (derived from TYPE_BADGE) ─────────────────

/** Returns the localized display name for a Pokemon type. */
export function getTypeName(type: PokemonType): string {
  const entry = TYPE_BADGE[type];
  if (!entry) return type;
  return entry[getLocale()];
}

/** Returns the solid hex color for a Pokemon type. */
export function getTypeColor(type: PokemonType): string {
  return TYPE_BADGE[type]?.color ?? '#a8a878';
}

// ─── Damage class labels (unrelated to types, kept here for convenience) ──

/** Labels and symbols for move damage classes. */
export const DAMAGE_CLASS_LABELS: Record<string, { en: string; he: string; symbol: string; color: string }> = {
  physical: { en: 'Physical', he: 'פיזי', symbol: '⚔', color: '#f08030' },
  special: { en: 'Special', he: 'מיוחד', symbol: '◆', color: '#6890f0' },
  status: { en: 'Status', he: 'סטטוס', symbol: '☆', color: '#a040a0' },
};

/** Returns the localized label, symbol, and color for a move damage class. */
export function getDamageClassLabel(damageClass: string): { label: string; symbol: string; color: string } {
  const entry = DAMAGE_CLASS_LABELS[damageClass];
  if (!entry) return { label: damageClass, symbol: '', color: '#888888' };
  return { label: entry[getLocale()], symbol: entry.symbol, color: entry.color };
}
