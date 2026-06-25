// src/ui/i18n-context.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getLocale, setLocale, isRTL, type Locale, t } from '../../i18n/i18n';

interface I18nContextValue {
  locale: Locale;
  isRTL: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  function handleSetLocale(l: Locale) {
    setLocale(l); // persists to localStorage
    setLocaleState(l); // triggers re-render of all consumers
  }

  return (
    <I18nContext.Provider
      value={{
        locale,
        isRTL: isRTL(),
        t,
        setLocale: handleSetLocale,
      }}
    >
      <div dir={isRTL() ? 'rtl' : 'ltr'} style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
