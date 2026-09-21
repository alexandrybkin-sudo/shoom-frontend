'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Check, Bell, BellOff, Loader2, Unlink } from 'lucide-react';
import { apiUrl } from '../providers';
import { useT } from '../i18n';

interface LinkState {
  enabled: boolean;
  connected: boolean;
  notify: boolean;
  url: string | null;
}

// Connect / manage Telegram notifications. Renders nothing when the bot isn't
// configured server-side (enabled:false), so it's safe to drop anywhere.
export function TelegramConnect({ className = '' }: { className?: string }) {
  const { t } = useT();
  const [s, setS] = useState<LinkState | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (): Promise<LinkState | null> => {
    try {
      const r = await fetch(`${apiUrl()}/api/telegram/link`, { credentials: 'include' });
      const d = (await r.json()) as LinkState;
      setS(d);
      return d;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const connect = () => {
    if (!s?.url) return;
    window.open(s.url, '_blank', 'noopener,noreferrer');
    // Poll until the user presses Start in the bot (or we give up after ~2 min).
    setWaiting(true);
    if (pollRef.current) clearInterval(pollRef.current);
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      const d = await load();
      if (d?.connected || tries > 40) {
        if (pollRef.current) clearInterval(pollRef.current);
        setWaiting(false);
      }
    }, 3000);
  };

  const toggleNotify = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiUrl()}/api/telegram/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ on: !s.notify }),
      });
      const d = await r.json();
      setS({ ...s, notify: d.notify });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch(`${apiUrl()}/api/telegram/disconnect`, { method: 'POST', credentials: 'include' });
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  if (!s || !s.enabled) return null;

  const card = `rounded-2xl border border-white/[0.07] bg-panel p-5 ${className}`;

  if (!s.connected) {
    return (
      <section className={card}>
        <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
          <Send size={15} className="text-brand-light" /> {t('tg.title')}
        </div>
        <p className="text-[13px] text-fg-muted mb-4">{t('tg.desc')}</p>
        <button
          onClick={connect}
          className="inline-flex items-center gap-2 bg-[#28a8e9] hover:bg-[#2ab0f4] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Send size={15} /> {t('tg.connect')}
        </button>
        {waiting && (
          <p className="flex items-center gap-1.5 text-[12px] text-fg-faint mt-3">
            <Loader2 size={13} className="animate-spin" /> {t('tg.waiting')}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className={card}>
      <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
        <Check size={15} className="text-sidea-light" /> {t('tg.connected')}
      </div>
      <p className="text-[13px] text-fg-muted mb-4">
        {s.notify ? t('tg.on') : t('tg.off')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={toggleNotify}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-panel-2 border border-white/10 hover:border-white/25 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {s.notify ? <BellOff size={14} /> : <Bell size={14} />}
          {s.notify ? t('tg.disable') : t('tg.enable')}
        </button>
        <button
          onClick={disconnect}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-rage-light px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <Unlink size={14} /> {t('tg.disconnect')}
        </button>
      </div>
    </section>
  );
}
