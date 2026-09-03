import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  publicI18n,
  setPublicLocale,
  tPublic,
  tpPublic,
  type PublicLocale,
} from '../../lib/i18n/store.svelte';
import { parsePublicPath } from '../../lib/i18n/public-routes';

type PublicI18nValue = {
  locale: PublicLocale;
  setLocale(locale: PublicLocale): void;
  t(key: string): string;
  tp(key: string, params?: Record<string, string | number>): string;
};

const PublicI18nContext = createContext<PublicI18nValue | null>(null);

/** React invalidation boundary around the existing translation dictionaries. */
export function PublicI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<PublicLocale>(() => {
    // The URL is authoritative for public pages. Set the underlying dictionary
    // before children render so a direct visit to /es or /pt/blog never paints
    // a frame in a previously stored language.
    const routeLocale = parsePublicPath(window.location.pathname).locale;
    if (routeLocale) setPublicLocale(routeLocale);
    return routeLocale ?? publicI18n.locale;
  });

  const setLocale = useCallback((next: PublicLocale) => {
    setPublicLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<PublicI18nValue>(() => ({
    locale,
    setLocale,
    t: tPublic,
    tp: tpPublic,
  }), [locale, setLocale]);

  return <PublicI18nContext.Provider value={value}>{children}</PublicI18nContext.Provider>;
}

export function usePublicI18n(): PublicI18nValue {
  const value = useContext(PublicI18nContext);
  if (!value) throw new Error('usePublicI18n must be used inside PublicI18nProvider');
  return value;
}
