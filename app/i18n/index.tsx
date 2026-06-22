'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { messages, LOCALES, LOCALE_LABELS, Locale } from './messages';

function apiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://shoom.fun';
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('shoom_locale');
  if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;
  const nav = (navigator.language || 'en').slice(0, 2);
  return (LOCALES as readonly string[]).includes(nav) ? (nav as Locale) : 'en';
}

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
});

export const useT = () => useContext(Ctx);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Deterministic first render ('en') to avoid hydration mismatch; real locale applied after mount.
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('shoom_locale', l);
      document.cookie = `shoom_locale=${l}; path=/; max-age=31536000`;
    } catch {}
    // Persist to the account if signed in (best-effort).
    fetch(`${apiUrl()}/api/auth/locale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ locale: l }),
    }).catch(() => {});
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = messages[locale]?.[key] ?? messages.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [locale]
  );

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useT();
  return (
    <div className={`inline-flex items-center gap-0.5 bg-panel border border-white/10 rounded-lg p-0.5 ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
            locale === l ? 'bg-brand text-brand-ink' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
