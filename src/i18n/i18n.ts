/**
 * i18n - Simple internationalization system.
 *
 * Supports English (en) and Hebrew (he).
 * Hebrew text is automatically rendered RTL by the existing font system.
 */

import en from './locales/en.json';
import he from './locales/he.json';

export type Locale = 'en' | 'he';

const LOCALES: Record<Locale, Record<string, string>> = { en, he };

const STORAGE_KEY = 'pokemon-math-locale';

let currentLocale: Locale = 'he'; // Default to Hebrew

/** Initialize locale from localStorage. */
export function initLocale(): void {
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved && LOCALES[saved]) {
    currentLocale = saved;
  }
}

/** Get the current locale. */
export function getLocale(): Locale {
  return currentLocale;
}

/** Set the locale and persist to localStorage. */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
}

/** Check if current locale is RTL. */
export function isRTL(): boolean {
  return currentLocale === 'he';
}

/**
 * Translate a key with optional interpolation.
 * Usage: t('battle.usedMove', { name: 'Pikachu', move: 'Thunderbolt' })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = LOCALES[currentLocale]?.[key] ?? LOCALES['en']?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
