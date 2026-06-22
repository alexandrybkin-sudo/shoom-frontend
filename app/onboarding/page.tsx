'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { useAuth, apiUrl } from '../providers';
import { useT } from '../i18n';
import { CategoryIcon } from '../components/CategoryIcon';

interface Cat {
  id: number;
  slug: string;
}

export default function Onboarding() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, locale } = useT();
  const [cats, setCats] = useState<Cat[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    fetch(`${apiUrl()}/api/forum/home?lang=${locale}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCats(d.categories || []))
      .catch(() => {});
  }, [locale]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${apiUrl()}/api/forum/interests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categoryIds: [...selected] }),
      });
    } catch {}
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-ink text-fg font-sans flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <p className="text-[11px] text-brand-light uppercase tracking-[0.18em] text-center mb-3 font-medium">Shoom</p>
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 tracking-tight">{t('onboarding.title')}</h1>
        <p className="text-fg-muted text-center mb-8 text-sm">{t('onboarding.subtitle')}</p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {cats.map((c) => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`relative flex items-center gap-3 rounded-2xl p-3 border transition-all text-left ${
                  on ? 'border-brand bg-brand/10' : 'border-white/[0.07] bg-panel hover:border-white/20'
                }`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${on ? 'text-brand-light' : 'text-fg-muted'} bg-panel-2 border border-white/10`}>
                  <CategoryIcon slug={c.slug} size={22} />
                </div>
                <span className="text-sm font-medium flex-1">{t(`cat.${c.slug}.title`)}</span>
                {on && <Check size={16} className="text-brand-light" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-brand text-brand-ink font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 glow-brand"
        >
          {t('onboarding.continue')}
        </button>
        <button onClick={() => router.push('/')} className="w-full text-fg-muted hover:text-fg text-sm mt-3 transition-colors">
          {t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
}
