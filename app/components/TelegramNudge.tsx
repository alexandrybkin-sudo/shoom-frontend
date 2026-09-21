'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, X, Loader2, Check } from 'lucide-react';
import { apiUrl } from '../providers';
import { useT } from '../i18n';

const DISMISS_KEY = 'tg_nudge_off';

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

// A dismissible bottom popup that offers to connect Telegram notifications — shown
// in a thread right after the user posts (peak intent). No-ops if the bot isn't
// configured, the user already connected, or they previously dismissed it.
// `trigger` is a counter the parent bumps on each successful post.
export function TelegramNudge({ trigger }: { trigger: number }) {
  const { t } = useT();
  const [state, setState] = useState<'hidden' | 'offer' | 'waiting' | 'done'>('hidden');
  const [url, setUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (trigger <= 0 || dismissed()) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${apiUrl()}/api/telegram/link`, { credentials: 'include' });
        const d = await r.json();
        if (!cancelled && d?.enabled && !d.connected && d.url) {
          setUrl(d.url);
          setState('offer');
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trigger]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const connect = () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    setState('waiting');
    if (pollRef.current) clearInterval(pollRef.current);
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      try {
        const r = await fetch(`${apiUrl()}/api/telegram/link`, { credentials: 'include' });
        const d = await r.json();
        if (d?.connected) {
          if (pollRef.current) clearInterval(pollRef.current);
          setState('done');
          setTimeout(() => setState('hidden'), 3500);
          return;
        }
      } catch {
        /* ignore */
      }
      if (tries > 40 && pollRef.current) clearInterval(pollRef.current);
    }, 3000);
  };

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    if (pollRef.current) clearInterval(pollRef.current);
    setState('hidden');
  };

  if (state === 'hidden') return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-brand/30 bg-panel/95 backdrop-blur-md shadow-2xl shadow-black/40 p-4 animate-[fadeUp_.25s_ease-out]">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-[#28a8e9]/15 text-[#28a8e9] flex items-center justify-center">
            {state === 'done' ? <Check size={18} /> : <Send size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            {state === 'done' ? (
              <p className="text-sm font-semibold">{t('tg.connected')}</p>
            ) : (
              <>
                <p className="text-sm font-semibold leading-tight">{t('tg.nudgeTitle')}</p>
                <p className="text-[12px] text-fg-muted mt-0.5">{t('tg.nudgeDesc')}</p>
              </>
            )}

            {state === 'offer' && (
              <button
                onClick={connect}
                className="mt-3 inline-flex items-center gap-2 bg-[#28a8e9] hover:bg-[#2ab0f4] text-white text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-colors"
              >
                <Send size={14} /> {t('tg.connect')}
              </button>
            )}
            {state === 'waiting' && (
              <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-fg-faint">
                <Loader2 size={13} className="animate-spin" /> {t('tg.waiting')}
              </p>
            )}
          </div>
          {state !== 'done' && (
            <button
              onClick={close}
              aria-label="close"
              className="shrink-0 text-fg-faint hover:text-fg transition-colors -mt-1 -mr-1 p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
