'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '../i18n';

const CONSENT_KEY = 'shoom_analytics_consent';
type Consent = 'unknown' | 'granted' | 'denied';

/**
 * Yandex Metrica, gated behind cookie consent.
 *
 * The tag is only injected after the visitor accepts, so no analytics cookie is
 * set for anyone who declines or ignores the banner. Also re-reports page views
 * on client-side navigation, which a SPA would otherwise never send.
 */
export function Analytics() {
  const { t } = useT();
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>('unknown');
  const loaded = useRef(false);
  const lastPath = useRef<string | null>(null);

  const ymId = Number(process.env.NEXT_PUBLIC_YM_ID) || 0;

  // Restore the earlier choice. Runs after mount so SSR markup stays stable.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === 'granted' || stored === 'denied') setConsent(stored);
    } catch { /* private mode: just show the banner */ }
  }, []);

  // Inject the tag once, and only with consent.
  useEffect(() => {
    if (consent !== 'granted' || !ymId || loaded.current) return;
    loaded.current = true;

    const w = window as any;
    w.ym = w.ym || function (...args: unknown[]) { (w.ym.a = w.ym.a || []).push(args); };
    w.ym.l = Date.now();

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(s);

    w.ym(ymId, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    });
    lastPath.current = pathname; // init already counts the first view
  }, [consent, ymId, pathname]);

  // Client-side route changes.
  useEffect(() => {
    if (consent !== 'granted' || !ymId || !loaded.current) return;
    if (lastPath.current === null) { lastPath.current = pathname; return; }
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    (window as any).ym?.(ymId, 'hit', window.location.href);
  }, [pathname, consent, ymId]);

  const choose = (value: Exclude<Consent, 'unknown'>) => {
    try { localStorage.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
    setConsent(value);
  };

  // Nothing to ask when no counter is configured.
  if (consent !== 'unknown' || !ymId) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] w-[min(94%,560px)] animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-panel/95 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 shadow-2xl">
        <p className="flex-1 text-[12px] leading-snug text-fg-muted">{t('cookie.text')}</p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => choose('denied')}
            className="text-[12px] font-medium text-fg-muted hover:text-fg px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-colors"
          >
            {t('cookie.decline')}
          </button>
          <button
            onClick={() => choose('granted')}
            className="text-[12px] font-semibold bg-brand text-brand-ink px-3.5 py-1.5 rounded-lg glow-brand hover:scale-[1.03] transition-transform"
          >
            {t('cookie.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
