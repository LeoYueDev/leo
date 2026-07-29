import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { getContent, config } from '@/portfolio.config';
import type { LocaleContent } from '@/portfolio.config';

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
  content: LocaleContent;
}

const FALLBACK_LOCALE = config.defaultLanguage ?? 'en';

function detectInitialLocale(): string {
  try {
    const stored = localStorage.getItem('locale');
    if (stored && config.languages.some((l) => l.code === stored)) return stored;
  } catch {}

  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && config.languages.some((l) => l.code === browserLang)) return browserLang;
  }

  return FALLBACK_LOCALE;
}

const fallbackContent = getContent(FALLBACK_LOCALE);

function resolveNested(obj: Record<string, any>, path: string): string {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return '';
    current = current[key];
  }
  return typeof current === 'string' ? current : '';
}

export const I18nContext = createContext<I18nContextType>({
  locale: FALLBACK_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  content: fallbackContent,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(detectInitialLocale);

  const content = useMemo(() => getContent(locale), [locale]);

  const setLocale = useCallback((newLocale: string) => {
    try { localStorage.setItem('locale', newLocale); } catch {}
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const val = resolveNested(content as unknown as Record<string, any>, key);
      if (val) return val;
      return resolveNested(fallbackContent as unknown as Record<string, any>, key) || key;
    },
    [content]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, content }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useI18n().t;
}
