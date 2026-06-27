'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users, Settings, Share2, UserPlus, UserMinus, Clock,
  BarChart3, Award, Map as MapIcon, Lock, MessageCircle, ArrowLeft, Swords, Eye,
} from 'lucide-react';
import { useAuth, apiUrl, avatarSrc } from '../../providers';
import { useT } from '../../i18n';
import { CategoryIcon } from '../../components/CategoryIcon';

interface Camp { slug: string; title: string; side: 'A' | 'B'; category: string; }
interface DebaterStats { battles: number; wins: number; losses: number; ties: number; winRate: number; }
interface ViewerStats { votedMatches: number; predictions: number; correct: number; accuracy: number; }
interface MatchRow {
  matchId: string;
  topic: string;
  labelA: string;
  labelB: string;
  winnerSide: 'A' | 'B' | 'tie';
  finalShareA: number;
  finalShareB: number;
  totalVoters: number;
  endedAt: string;
  mySide: 'A' | 'B';
  result: 'win' | 'loss' | 'tie';
  opponent: string | null;
  opponentHandle: string | null;
}
interface OpinionTopic { slug: string; title: string; category: string; side: 'A' | 'B'; strength: number; conviction: number; }
interface OpinionMap { topics?: OpinionTopic[]; forPct?: number; total: number; hidden?: boolean; }
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
  debaterStats: DebaterStats;
  viewerStats: ViewerStats;
  matchHistory: MatchRow[];
  opinionMap: OpinionMap;
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="text-[10px] text-fg-faint mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

// Debater record + viewer prediction accuracy — both from existing data.
function StatsSection({ d }: { d: ProfileData }) {
  const { t } = useT();
  const ds = d.debaterStats;
  const vs = d.viewerStats;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-brand-light" />
        <h2 className="text-sm font-semibold">{t('profile.stats')}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.07] bg-panel p-4">
          <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-3"><Swords size={13} /> {t('profile.asDebater')}</div>
          {ds.battles > 0 ? (
            <div className="flex items-center justify-around">
              <Stat value={`${Math.round(ds.winRate * 100)}%`} label={t('profile.winRate')} />
              <Stat value={String(ds.battles)} label={t('profile.battles')} />
              <Stat value={`${ds.wins}–${ds.losses}${ds.ties ? `–${ds.ties}` : ''}`} label={t('profile.record')} />
            </div>
          ) : (
            <p className="text-xs text-fg-faint">{t('profile.noBattlesYet')}</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-panel p-4">
          <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-3"><Eye size={13} /> {t('profile.asViewer')}</div>
          {vs.predictions > 0 ? (
            <div className="flex items-center justify-around">
              <Stat value={`${Math.round(vs.accuracy * 100)}%`} label={t('profile.accuracy')} />
              <Stat value={`${vs.correct}/${vs.predictions}`} label={t('profile.guessed')} />
              <Stat value={String(vs.votedMatches)} label={t('profile.voted')} />
            </div>
          ) : (
            <p className="text-xs text-fg-faint">{t('profile.noVotesYet')}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function MatchHistorySection({ d, locale, onOpen }: { d: ProfileData; locale: string; onOpen: (h: string) => void }) {
  const { t } = useT();
  const fmt = (s: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(s));
  const badge = (r: MatchRow['result']) =>
    r === 'win'
      ? 'text-brand-ink bg-brand'
      : r === 'tie'
        ? 'text-fg-muted bg-white/10'
        : 'text-fg-muted bg-white/5 border border-white/10';
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Swords size={16} className="text-brand-light" />
        <h2 className="text-sm font-semibold">{t('profile.matchHistory')}</h2>
      </div>
      {d.matchHistory.length === 0 ? (
        <p className="text-xs text-fg-faint">{t('profile.noHistory')}</p>
      ) : (
        <div className="space-y-2">
          {d.matchHistory.map((m) => {
            const myShare = Math.round((m.mySide === 'A' ? m.finalShareA : m.finalShareB) * 100);
            const myLabel = m.mySide === 'A' ? m.labelA : m.labelB;
            return (
              <div key={m.matchId} className="rounded-xl border border-white/[0.07] bg-panel px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badge(m.result)}`}>
                    {t(`profile.result.${m.result}`)}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{m.topic}</span>
                  <span className="text-[11px] text-fg-faint whitespace-nowrap">{fmt(m.endedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-fg-muted">
                  <span className={m.mySide === 'A' ? 'text-sidea-light' : 'text-sideb-light'}>{myLabel} {myShare}%</span>
                  {m.opponent && (
                    <span className="text-fg-faint">
                      {t('profile.vs')}{' '}
                      {m.opponentHandle ? (
                        <button onClick={() => onOpen(m.opponentHandle!)} className="hover:underline">@{m.opponentHandle}</button>
                      ) : (
                        m.opponent
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// "Force field" opinion map: two neon poles (For / Against), threads pulled toward
// their pole by conviction, bubble size = activity. Rendered as JSX SVG so nodes click.
const OM_RED = '#FF4D4D', OM_BLUE = '#4F8DFF', OM_PUR = '#A06BFF';
function ForceField({ topics, forPct, onPick }: { topics: OpinionTopic[]; forPct: number; onPick: (slug: string) => void }) {
  const { t } = useT();
  const W = 560, H = 380, leftX = 66, rightX = W - 66, midY = 170;
  const maxW = Math.max(1, ...topics.map((x) => x.strength));
  const col = (s: 'A' | 'B') => (s === 'A' ? OM_RED : OM_BLUE);
  const ys = (n: number) => Array.from({ length: n }, (_, i) => 56 + 250 * (n <= 1 ? 0.5 : i / (n - 1)));
  const place = (arr: OpinionTopic[], side: 'A' | 'B') => {
    const slots = ys(arr.length);
    const dy = side === 'B' ? 28 : 0; // stagger the two sides so labels never collide
    return arr.map((top, i) => {
      const dist = 110 + (1 - top.conviction) * 150;
      return { top, x: side === 'A' ? leftX + dist : rightX - dist, y: slots[i] + dy, r: 9 + (top.strength / maxW) * 15 };
    });
  };
  const nodes = [...place(topics.filter((x) => x.side === 'A').slice(0, 6), 'A'),
                 ...place(topics.filter((x) => x.side === 'B').slice(0, 6), 'B')];
  const comX = leftX + (1 - forPct / 100) * (rightX - leftX);
  const short = (s: string) => (s.length > 22 ? s.slice(0, 21) + '…' : s);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={t('profile.opinionMap')}>
      <defs>
        <filter id="omglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="omRed"><stop offset="0%" stopColor={OM_RED} stopOpacity="0.85" /><stop offset="100%" stopColor={OM_RED} stopOpacity="0" /></radialGradient>
        <radialGradient id="omBlue"><stop offset="0%" stopColor={OM_BLUE} stopOpacity="0.85" /><stop offset="100%" stopColor={OM_BLUE} stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx={leftX} cy={midY} r="92" fill="url(#omRed)" className="om-glow" />
      <circle cx={rightX} cy={midY} r="92" fill="url(#omBlue)" className="om-glow" />
      {nodes.map((n, i) => (
        <line key={'l' + i} x1={n.top.side === 'A' ? leftX : rightX} y1={midY} x2={n.x} y2={n.y} stroke={col(n.top.side)} strokeOpacity="0.28" strokeWidth="1.2" />
      ))}
      <circle cx={leftX} cy={midY} r="26" fill={OM_RED} filter="url(#omglow)" className="om-breathe" />
      <circle cx={rightX} cy={midY} r="26" fill={OM_BLUE} filter="url(#omglow)" className="om-breathe" />
      <text x={leftX} y={midY} dy="5" textAnchor="middle" fontSize="14" fill="#fff">{t('opinion.for')}</text>
      <text x={rightX} y={midY} dy="5" textAnchor="middle" fontSize="13" fill="#fff">{t('opinion.against')}</text>
      {nodes.map((n, i) => (
        <g key={i} className="om-float" style={{ animationDelay: `${i * 0.35}s`, cursor: 'pointer' }} onClick={() => onPick(n.top.slug)}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={col(n.top.side) + '22'} stroke={col(n.top.side)} strokeWidth="1.5" filter="url(#omglow)" />
          <circle cx={n.x} cy={n.y} r={n.r * 0.3} fill={col(n.top.side)} />
          <text x={n.x} y={n.y - n.r - 5} textAnchor="middle" fontSize="9.5" fill="#cfd3e0">{short(n.top.title)}</text>
        </g>
      ))}
      <rect x={leftX} y={H - 34} width={rightX - leftX} height="5" rx="2.5" fill="rgba(255,255,255,0.1)" />
      <circle cx={comX} cy={H - 31.5} r="6" fill={OM_PUR} filter="url(#omglow)" />
      <text x={W / 2} y={H - 12} textAnchor="middle" fontSize="10" fill="#8a8fa3">{t('opinion.centerOfMass')}</text>
    </svg>
  );
}

function OpinionMapModal({ d, onClose, onPick }: { d: ProfileData; onClose: () => void; onPick: (slug: string) => void }) {
  const { t } = useT();
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const om = d.opinionMap;
  const topics = om.topics || [];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl rounded-2xl bg-[#12141d] border border-brand/40 p-4 animate-om-pop"
        style={{ boxShadow: '0 24px 70px rgba(0,0,0,.6), 0 0 40px rgba(160,107,255,.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold">{t('profile.opinionMap')}</h2>
          <span className="text-[11px] text-fg-faint">@{d.handle} · {t('opinion.leanFor', { pct: om.forPct ?? 50 })}</span>
          <button onClick={onClose} aria-label="close" className="ml-auto text-fg-muted hover:text-fg text-lg leading-none">✕</button>
        </div>
        {topics.length === 0 ? (
          <p className="text-xs text-fg-faint py-10 text-center">{t('opinion.empty')}</p>
        ) : (
          <ForceField topics={topics} forPct={om.forPct ?? 50} onPick={onPick} />
        )}
        <div className="flex items-center justify-center gap-4 text-[11px] text-fg-faint mt-1">
          <span><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: OM_RED }} />{t('opinion.for')}</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: OM_BLUE }} />{t('opinion.against')}</span>
        </div>
      </div>
    </div>
  );
}

function OpinionMapSection({ d, onOpen }: { d: ProfileData; onOpen: () => void }) {
  const { t } = useT();
  const om = d.opinionMap;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <MapIcon size={16} className="text-brand-light" />
        <h2 className="text-sm font-semibold">{t('profile.opinionMap')}</h2>
      </div>
      {om.hidden ? (
        <p className="text-xs text-fg-faint">{t('opinion.hiddenByUser')}</p>
      ) : om.total === 0 ? (
        <p className="text-xs text-fg-faint">{t('opinion.empty')}</p>
      ) : (
        <button
          onClick={onOpen}
          className="w-full flex items-center gap-3 rounded-2xl border border-brand/30 bg-panel hover:border-brand/60 hover:-translate-y-0.5 transition-all p-4 text-left"
        >
          <span className="relative flex items-center">
            <span className="w-3 h-3 rounded-full" style={{ background: OM_RED, boxShadow: `0 0 10px ${OM_RED}` }} />
            <span className="w-3 h-3 rounded-full -ml-1" style={{ background: OM_BLUE, boxShadow: `0 0 10px ${OM_BLUE}` }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium">{t('opinion.openCta')}</span>
            <span className="block text-[11px] text-fg-faint">{t('opinion.summary', { pct: om.forPct ?? 50, n: om.total })}</span>
          </span>
          <span className="text-brand-light">→</span>
        </button>
      )}
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
  const [mapOpen, setMapOpen] = useState(false);

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

        {/* Live stats from real data */}
        <StatsSection d={data} />
        <MatchHistorySection d={data} locale={locale} onOpen={(h) => router.push(`/u/${h}`)} />

        {/* Opinion map — live "force field" popup */}
        <OpinionMapSection d={data} onOpen={() => setMapOpen(true)} />

        {/* Skeleton sections — light up in later blocks */}
        <SoonSection icon={<Award size={15} />} title={t('profile.badges')} desc={t('profile.badgesDesc')} />
        {data.isSelf && (
          <SoonSection icon={<Lock size={15} />} title={t('profile.privatePanel')} desc={t('profile.privatePanelDesc')} />
        )}
      </div>

      {mapOpen && (
        <OpinionMapModal
          d={data}
          onClose={() => setMapOpen(false)}
          onPick={(slug) => { setMapOpen(false); router.push(`/t/${slug}`); }}
        />
      )}
    </div>
  );
}
