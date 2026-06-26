'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Eye, Plus, Flame, LogOut, MessageCircle, Users, Swords, Clock, Settings } from 'lucide-react';
import { useAuth, apiUrl, avatarSrc } from './providers';
import { useT, LanguageSwitcher } from './i18n';
import { CategoryIcon } from './components/CategoryIcon';

interface CategoryRow {
  id: string | number;
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
  isOpen: boolean;
  isLive: boolean;
}
interface ScheduledBattle {
  id: number;
  topic: string;
  labelA: string;
  labelB: string;
  scheduledAt: string;
  status: string;
  matchId?: string | null;
}
interface HomeData {
  categories: CategoryRow[];
  hotTopics: HotTopic[];
  liveBattles: LiveBattle[];
  scheduledBattles?: ScheduledBattle[];
}

function formatRelative(iso: string, locale: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(diff / 86400000), 'day');
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
  const [interests, setInterests] = useState<Set<number>>(new Set());
  const [roomTab, setRoomTab] = useState<'live' | 'open'>('live');
  const [roomTabTouched, setRoomTabTouched] = useState(false);

  const goCreate = () => router.push(user ? '/create' : '/login');

  // Personalization: pull the user's interests to float their categories to the top.
  useEffect(() => {
    if (!user) { setInterests(new Set()); return; }
    fetch(`${apiUrl()}/api/forum/interests`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { categoryIds: [] }))
      .then((d) => setInterests(new Set((d.categoryIds || []).map(Number))))
      .catch(() => {});
  }, [user]);

  const orderedCategories = [...data.categories].sort((a, b) => {
    const ai = interests.has(Number(a.id)) ? 0 : 1;
    const bi = interests.has(Number(b.id)) ? 0 : 1;
    return ai - bi;
  });

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

  // Default the debates tab to whatever has content: live first, else waiting.
  // Stops auto-switching once the user picks a tab manually.
  useEffect(() => {
    if (roomTabTouched) return;
    const hasLive = data.liveBattles.some((b) => b.isLive);
    const hasOpen = data.liveBattles.some((b) => b.isOpen);
    if (hasLive) setRoomTab('live');
    else if (hasOpen) setRoomTab('open');
  }, [data.liveBattles, roomTabTouched]);

  return (
    <div className="min-h-screen bg-ink text-fg font-sans selection:bg-brand/30 overflow-x-hidden">
      {/* Navbar */}
      <div className="fixed top-0 w-full px-4 md:px-6 py-4 flex justify-between items-center bg-ink/70 backdrop-blur-xl z-50 border-b border-white/5">
        <BrandLogo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => user.username && router.push(`/u/${user.username}`)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-label={t('nav.profile')}
              >
                {avatarSrc(user.avatar_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc(user.avatar_url)!} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand/20 text-brand-light flex items-center justify-center text-xs font-semibold">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:flex flex-col leading-tight text-left">
                  <span className="text-sm font-medium max-w-[140px] truncate">{user.display_name}</span>
                  {user.username && <span className="text-[11px] text-fg-faint max-w-[140px] truncate">@{user.username}</span>}
                </div>
              </button>
              <button onClick={() => router.push('/settings')} aria-label={t('nav.settings')} className="text-fg-muted hover:text-fg transition-colors">
                <Settings size={17} />
              </button>
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
          {/* Debates: Live / Waiting toggle — live first, waiting second (priority over scheduled) */}
          {data.liveBattles.length > 0 && (() => {
            const live = data.liveBattles.filter((b) => b.isLive);
            const open = data.liveBattles.filter((b) => b.isOpen);
            const shown = roomTab === 'live' ? live : open;
            return (
              <section>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold">{t('forum.debates')}</h2>
                  <div className="inline-flex items-center gap-0.5 bg-panel border border-white/10 rounded-lg p-0.5">
                    <button
                      onClick={() => { setRoomTabTouched(true); setRoomTab('live'); }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        roomTab === 'live' ? 'bg-brand text-brand-ink' : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${roomTab === 'live' ? 'bg-brand-ink' : 'bg-brand'}`} />
                      {t('forum.tabLive')} {live.length > 0 && `· ${live.length}`}
                    </button>
                    <button
                      onClick={() => { setRoomTabTouched(true); setRoomTab('open'); }}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        roomTab === 'open' ? 'bg-brand text-brand-ink' : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      {t('forum.tabWaiting')} {open.length > 0 && `· ${open.length}`}
                    </button>
                  </div>
                </div>

                {shown.length === 0 ? (
                  <p className="text-fg-faint text-sm py-4">{roomTab === 'live' ? t('forum.noLive') : t('forum.noWaiting')}</p>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                    {shown.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => router.push(`/room/${b.id}`)}
                        className="shrink-0 w-64 bg-panel border border-white/[0.07] hover:border-brand/50 rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {b.isOpen ? (
                            <span className="text-[11px] font-medium text-brand-light bg-brand/[0.12] px-2 py-0.5 rounded-md">{t('card.openChallenge')}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-light bg-brand/[0.14] px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand" /> {t('card.liveRound')}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted"><Eye size={14} />{b.viewers}</span>
                        </div>
                        <h3 className="text-sm font-semibold leading-snug mb-3 line-clamp-2 min-h-[2.5rem]">{b.topic}</h3>
                        {b.isOpen ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink bg-brand w-full justify-center py-1.5 rounded-lg glow-brand">
                            {t('card.accept')} <Swords size={14} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-center text-[11px] font-semibold text-sidea-light bg-sidea/10 border border-sidea/25 py-1.5 rounded-lg truncate px-1">{b.labelA}</span>
                            <span className="text-[10px] font-bold text-fg-faint">VS</span>
                            <span className="flex-1 text-center text-[11px] font-semibold text-sideb-light bg-sideb/10 border border-sideb/25 py-1.5 rounded-lg truncate px-1">{b.labelB}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })()}

          {/* Upcoming scheduled battles — only when no live AND no waiting battles right now */}
          {(() => {
            const live = data.liveBattles.filter((b) => b.isLive);
            const open = data.liveBattles.filter((b) => b.isOpen);
            const scheduled = data.scheduledBattles || [];
            if (live.length > 0 || open.length > 0 || scheduled.length === 0) return null;
            return (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-brand-light" size={18} />
                  <h2 className="text-lg font-semibold">{t('sched.upcoming')}</h2>
                </div>
                <div className="space-y-2">
                  {scheduled.map((s) => {
                    const isLive = s.status === 'live' && !!s.matchId;
                    return (
                      <div
                        key={s.id}
                        onClick={isLive ? () => router.push(`/room/${s.matchId}`) : undefined}
                        className={`flex items-center gap-3 bg-panel border border-white/[0.07] rounded-xl px-3.5 py-3 ${isLive ? 'cursor-pointer hover:border-brand/50 transition-all hover:-translate-y-0.5' : ''}`}
                      >
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${isLive ? 'text-brand-ink bg-brand glow-brand' : 'text-brand-light bg-brand/[0.12]'}`}>
                          {isLive ? (
                            <><span className="w-1.5 h-1.5 rounded-full bg-brand-ink" /> {t('lobby.liveNow')}</>
                          ) : (
                            <><Clock size={12} /> {t('sched.label')} {formatRelative(s.scheduledAt, locale)}</>
                          )}
                        </span>
                        <span className="flex-1 text-sm font-medium truncate">{s.topic}</span>
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap">
                          <span className="text-sidea-light font-semibold">{s.labelA}</span>
                          <span className="text-fg-faint font-bold">VS</span>
                          <span className="text-sideb-light font-semibold">{s.labelB}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Hot rail */}
          {data.hotTopics.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="text-rage-light" size={18} />
                <h2 className="text-lg font-semibold">{t('forum.hot')}</h2>
              </div>
              <div className="space-y-2">
                {data.hotTopics.slice(0, 5).map((tp) => (
                  <div
                    key={tp.slug}
                    onClick={() => router.push(`/t/${tp.slug}`)}
                    className="flex items-center gap-3 bg-panel border border-white/[0.07] hover:border-brand/40 rounded-xl px-3.5 py-2.5 cursor-pointer transition-all hover:-translate-y-0.5"
                  >
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
              {orderedCategories.map((c) => (
                <div
                  key={c.slug}
                  onClick={() => router.push(`/c/${c.slug}`)}
                  className={`flex items-center gap-3 bg-panel border rounded-2xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 ${
                    interests.has(Number(c.id)) ? 'border-brand/40' : 'border-white/[0.07] hover:border-brand/40'
                  }`}
                >
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-panel-2 border border-brand/20 text-brand-light flex items-center justify-center glow-brand">
                    <CategoryIcon slug={c.slug} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                      {t(`cat.${c.slug}.title`)}
                      {interests.has(Number(c.id)) && <span className="text-[9px] text-brand-light uppercase tracking-wider font-medium bg-brand/15 px-1.5 py-0.5 rounded">{t('forum.forYou')}</span>}
                    </div>
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
