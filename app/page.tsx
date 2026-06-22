'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Eye, Plus, Flame, LogOut, MessageCircle, Users } from 'lucide-react';
import { useAuth, apiUrl } from './providers';
import { useT, LanguageSwitcher } from './i18n';
import { CategoryIcon } from './components/CategoryIcon';

interface CategoryRow {
  slug: string;
  emoji: string;
  topicsCount: number;
  liveBattles: number;
  new24h: number;
}
interface HotTopic {
  slug: string;
  title: string;
  posts: number;
  participants: number;
  live: number;
}
interface LiveBattle {
  id: string;
  topic: string;
  labelA: string;
  labelB: string;
  viewers: number;
}
interface HomeData {
  categories: CategoryRow[];
  hotTopics: HotTopic[];
  liveBattles: LiveBattle[];
}

// 🐣 Easter egg: hover the logo for 3s and a tiny knight peeks out from behind it.
function BrandLogo() {
  const [out, setOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEnter = () => { timer.current = setTimeout(() => setOut(true), 3000); };
  const onLeave = () => { if (timer.current) clearTimeout(timer.current); setOut(false); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <div
          aria-hidden
          className={`pointer-events-none absolute top-1/2 left-full -translate-y-1/2 z-0 transition-all duration-500 ease-out ${
            out ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-7'
          }`}
          style={{ marginLeft: '-18px' }}
        >
          <div className={out ? 'animate-knight-bob' : ''}>
            <svg width="34" height="38" viewBox="0 0 38 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 2 C 24 4, 24 9, 19 12" stroke="#A06BFF" strokeWidth="3" strokeLinecap="round" />
              <rect x="29.5" y="3" width="2.4" height="17" rx="1.2" fill="#E8EAF0" transform="rotate(22 30.7 11.5)" />
              <rect x="26" y="15.5" width="8" height="2.6" rx="1.3" fill="#A06BFF" transform="rotate(22 30 16.8)" />
              <rect x="11" y="9" width="16" height="19" rx="7.5" fill="#C7CBD4" />
              <rect x="14.5" y="15" width="9" height="2.8" rx="1.4" fill="#2A2F3A" />
              <rect x="14.5" y="19.5" width="9" height="2.2" rx="1.1" fill="#2A2F3A" />
            </svg>
          </div>
        </div>
        <div className="relative z-10 w-8 h-8 bg-brand rounded-xl flex items-center justify-center glow-brand">
          <Zap className="text-brand-ink fill-brand-ink" size={18} />
        </div>
      </div>
      <span className="text-xl font-bold tracking-tight">Shoom</span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { t, locale } = useT();
  const [data, setData] = useState<HomeData>({ categories: [], hotTopics: [], liveBattles: [] });

  const goCreate = () => router.push(user ? '/create' : '/login');

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const res = await fetch(`${apiUrl()}/api/forum/home?lang=${locale}`, { cache: 'no-store' });
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error('Failed to load home:', e);
      }
    };
    fetchHome();
    const id = setInterval(fetchHome, 4000);
    return () => clearInterval(id);
  }, [locale]);

  return (
    <div className="min-h-screen bg-ink text-fg font-sans selection:bg-brand/30 overflow-x-hidden">
      {/* Navbar */}
      <div className="fixed top-0 w-full px-4 md:px-6 py-4 flex justify-between items-center bg-ink/70 backdrop-blur-xl z-50 border-b border-white/5">
        <BrandLogo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand/20 text-brand-light flex items-center justify-center text-xs font-semibold">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium max-w-[120px] truncate hidden sm:block">{user.display_name}</span>
              </div>
              <button onClick={logout} aria-label={t('nav.logout')} className="text-fg-muted hover:text-fg transition-colors">
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-medium text-fg border border-white/15 px-3.5 py-1.5 rounded-lg hover:border-white/30 transition-colors"
            >
              {t('nav.signIn')}
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="relative pt-28 pb-10 px-6 flex flex-col items-center text-center">
        <p className="text-[11px] text-brand-light uppercase tracking-[0.18em] mb-3 font-medium">{t('lobby.eyebrow')}</p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
          {t('lobby.titlePre')} <span className="text-brand-light text-glow-brand">{t('lobby.titleAccent')}</span>
        </h1>
        <button
          onClick={goCreate}
          className="inline-flex items-center gap-2 bg-brand text-brand-ink px-6 py-3 rounded-xl font-semibold text-sm md:text-base transition-all hover:scale-[1.03] glow-brand"
        >
          {t('lobby.createBattle')} <Plus size={18} />
        </button>
      </div>

      <div className="px-6 pb-20">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Live rail */}
          {data.liveBattles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-brand glow-brand" />
                <h2 className="text-lg font-semibold">{t('lobby.liveNow')}</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {data.liveBattles.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => router.push(`/room/${b.id}`)}
                    className="shrink-0 w-64 bg-panel border border-white/[0.07] hover:border-brand/50 rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex justify-end mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted"><Eye size={14} />{b.viewers}</span>
                    </div>
                    <h3 className="text-sm font-semibold leading-snug mb-3 line-clamp-2 min-h-[2.5rem]">{b.topic}</h3>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-center text-[11px] font-semibold text-sidea-light bg-sidea/10 border border-sidea/25 py-1.5 rounded-lg truncate px-1">{b.labelA}</span>
                      <span className="text-[10px] font-bold text-fg-faint">VS</span>
                      <span className="flex-1 text-center text-[11px] font-semibold text-sideb-light bg-sideb/10 border border-sideb/25 py-1.5 rounded-lg truncate px-1">{b.labelB}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hot rail */}
          {data.hotTopics.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="text-rage-light" size={18} />
                <h2 className="text-lg font-semibold">{t('forum.hot')}</h2>
              </div>
              <div className="space-y-2">
                {data.hotTopics.slice(0, 5).map((tp) => (
                  <div key={tp.slug} className="flex items-center gap-3 bg-panel border border-white/[0.07] rounded-xl px-3.5 py-2.5">
                    <span className="text-[11px] font-bold text-rage-light bg-rage/[0.14] px-2 py-1 rounded-md whitespace-nowrap">🔥 hot</span>
                    <span className="flex-1 text-sm font-medium truncate">{tp.title}</span>
                    <span className="hidden sm:inline-flex items-center gap-3 text-xs text-fg-muted whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><MessageCircle size={13} />{tp.posts}</span>
                      <span className="inline-flex items-center gap-1"><Users size={13} />{tp.participants}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          <section>
            <h2 className="text-lg font-semibold mb-4">{t('forum.categories')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.categories.map((c) => (
                <div
                  key={c.slug}
                  onClick={() => router.push(`/c/${c.slug}`)}
                  className="flex items-center gap-3 bg-panel border border-white/[0.07] hover:border-brand/40 rounded-2xl p-3 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-panel-2 border border-brand/20 text-brand-light flex items-center justify-center glow-brand">
                    <CategoryIcon slug={c.slug} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold mb-1.5">{t(`cat.${c.slug}.title`)}</div>
                    <div className="flex gap-3 text-[11px] text-fg-muted">
                      <span>{t('forum.topicsCount', { n: c.topicsCount })}</span>
                      {c.liveBattles > 0 && <span className="text-brand-light">{t('forum.liveCount', { n: c.liveBattles })}</span>}
                      {c.new24h > 0 && <span className="text-[#7FCf9f]">{t('forum.new24h', { n: c.new24h })}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="py-8 text-center text-fg-faint text-sm border-t border-white/5">{t('lobby.footer')}</div>
    </div>
  );
}
