'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users, Settings, Share2, UserPlus, UserMinus, Clock,
  BarChart3, Award, Map as MapIcon, Lock, MessageCircle, ArrowLeft,
} from 'lucide-react';
import { useAuth, apiUrl, avatarSrc } from '../../providers';
import { useT } from '../../i18n';
import { CategoryIcon } from '../../components/CategoryIcon';

interface Camp { slug: string; title: string; side: 'A' | 'B'; category: string; }
interface ProfileData {
  id: string;
  handle: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  joinedAt: string;
  opinionMapPublic: boolean;
  followers: number;
  following: number;
  isFollowedByMe: boolean;
  isSelf: boolean;
  interests: string[];
  camps: Camp[];
}

// A section placeholder for stats/maps/badges that light up in later blocks.
function SoonSection({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  const { t } = useT();
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-panel/60 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-brand-light">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-[9px] font-bold uppercase tracking-wide text-brand-light bg-brand/15 px-1.5 py-0.5 rounded">
          {t('profile.soon')}
        </span>
      </div>
      <p className="text-xs text-fg-faint leading-relaxed">{desc}</p>
    </section>
  );
}

export default function ProfilePage() {
  const { t, locale } = useT();
  const router = useRouter();
  const params = useParams();
  const handle = String(params.handle || '').toLowerCase();
  const { user } = useAuth();

  const [data, setData] = useState<ProfileData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setState('loading');
      try {
        const r = await fetch(`${apiUrl()}/api/users/${handle}/profile`, { credentials: 'include', cache: 'no-store' });
        if (!alive) return;
        if (r.status === 404) { setState('notfound'); return; }
        const d = await r.json();
        if (d.redirectTo) { router.replace(`/u/${d.redirectTo}`); return; }
        setData(d);
        setState('ready');
      } catch {
        if (alive) setState('notfound');
      }
    })();
    return () => { alive = false; };
  }, [handle, router]);

  const toggleFollow = async () => {
    if (!data) return;
    if (!user) { router.push('/login'); return; }
    setBusy(true);
    const method = data.isFollowedByMe ? 'DELETE' : 'POST';
    try {
      const r = await fetch(`${apiUrl()}/api/users/${data.handle}/follow`, { method, credentials: 'include' });
      if (r.ok) {
        setData({
          ...data,
          isFollowedByMe: !data.isFollowedByMe,
          followers: data.followers + (data.isFollowedByMe ? -1 : 1),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${handle}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  const joined = data?.joinedAt
    ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(data.joinedAt))
    : '';

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-ink text-fg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
      </div>
    );
  }

  if (state === 'notfound' || !data) {
    return (
      <div className="min-h-screen bg-ink text-fg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-fg-muted">{t('profile.notFound')}</p>
        <button onClick={() => router.push('/')} className="text-sm font-medium text-brand-light hover:underline">
          {t('profile.backHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-fg font-sans selection:bg-brand/30">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={16} /> {t('profile.back')}
        </button>

        {/* Header */}
        <section className="rounded-2xl border border-white/[0.07] bg-panel p-5">
          <div className="flex items-start gap-4">
            {avatarSrc(data.avatarUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc(data.avatarUrl)!} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-brand/20 text-brand-light flex items-center justify-center text-3xl font-bold shrink-0">
                {data.nickname.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight truncate">{data.nickname}</h1>
              <div className="text-sm text-fg-faint">@{data.handle}</div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span><span className="font-semibold">{data.followers}</span> <span className="text-fg-muted">{t('profile.followers')}</span></span>
                <span><span className="font-semibold">{data.following}</span> <span className="text-fg-muted">{t('profile.following')}</span></span>
              </div>
            </div>
          </div>

          {data.bio && <p className="text-sm text-fg/90 leading-relaxed mt-3">{data.bio}</p>}

          <div className="flex items-center gap-2 mt-2 text-xs text-fg-faint">
            <Clock size={13} /> {t('profile.joined', { date: joined })}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {data.isSelf ? (
              <button
                onClick={() => router.push('/settings')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-panel-2 border border-white/15 hover:border-white/30 px-4 py-2 rounded-xl transition-colors"
              >
                <Settings size={15} /> {t('profile.editProfile')}
              </button>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={busy}
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60 ${
                  data.isFollowedByMe
                    ? 'bg-panel-2 border border-white/15 hover:border-white/30 text-fg'
                    : 'bg-brand text-brand-ink glow-brand hover:scale-[1.02]'
                }`}
              >
                {data.isFollowedByMe ? <><UserMinus size={15} /> {t('profile.unfollow')}</> : <><UserPlus size={15} /> {t('profile.follow')}</>}
              </button>
            )}
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-panel-2 border border-white/15 hover:border-white/30 px-3.5 py-2 rounded-xl transition-colors"
            >
              <Share2 size={15} /> {copied ? t('profile.shareCopied') : t('profile.share')}
            </button>
          </div>
        </section>

        {/* Interests */}
        {data.interests.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-2">{t('profile.interests')}</h2>
            <div className="flex flex-wrap gap-2">
              {data.interests.map((slug) => (
                <button
                  key={slug}
                  onClick={() => router.push(`/c/${slug}`)}
                  className="inline-flex items-center gap-1.5 bg-panel border border-white/[0.07] hover:border-brand/40 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  <span className="w-5 h-5 text-brand-light"><CategoryIcon slug={slug} /></span>
                  {slug}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Camps & threads */}
        <section>
          <h2 className="text-sm font-semibold mb-2">{t('profile.camps')}</h2>
          {data.camps.length === 0 ? (
            <p className="text-xs text-fg-faint">{t('profile.noCamps')}</p>
          ) : (
            <div className="space-y-2">
              {data.camps.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => router.push(`/t/${c.slug}`)}
                  className="w-full flex items-center gap-2.5 bg-panel border border-white/[0.07] hover:border-brand/40 rounded-xl px-3 py-2.5 text-left transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.side === 'A' ? 'bg-sidea' : 'bg-sideb'}`} />
                  <span className="flex-1 text-sm font-medium truncate">{c.title}</span>
                  <MessageCircle size={14} className="text-fg-faint shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Skeleton sections — light up in later blocks */}
        <SoonSection icon={<MapIcon size={15} />} title={t('profile.opinionMap')} desc={t('profile.opinionMapDesc')} />
        <SoonSection icon={<BarChart3 size={15} />} title={t('profile.stats')} desc={t('profile.statsDesc')} />
        <SoonSection icon={<Users size={15} />} title={t('profile.matchHistory')} desc={t('profile.matchHistoryDesc')} />
        <SoonSection icon={<Award size={15} />} title={t('profile.badges')} desc={t('profile.badgesDesc')} />
        {data.isSelf && (
          <SoonSection icon={<Lock size={15} />} title={t('profile.privatePanel')} desc={t('profile.privatePanelDesc')} />
        )}
      </div>
    </div>
  );
}
