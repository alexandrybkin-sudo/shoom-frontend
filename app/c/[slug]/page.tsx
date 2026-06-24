'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Users, Swords, Eye, Plus, Bell, Check, X } from 'lucide-react';
import { apiUrl, useAuth } from '../../providers';
import { useT, LanguageSwitcher } from '../../i18n';
import { CategoryIcon } from '../../components/CategoryIcon';

interface Topic {
  slug: string;
  title: string;
  sideA: string;
  sideB: string;
  posts: number;
  participants: number;
  battles: number;
  live: number;
}

type Sort = 'hot' | 'new' | 'active';

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug || '');
  const { user } = useAuth();
  const { t, locale } = useT();

  const [sort, setSort] = useState<Sort>('hot');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [catId, setCatId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [following, setFollowing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [sideA, setSideA] = useState('');
  const [sideB, setSideB] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoaded(false);
    fetch(`${apiUrl()}/api/forum/categories/${slug}?sort=${sort}&lang=${locale}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { topics: [], category: null }))
      .then((d) => {
        setTopics(d.topics || []);
        if (d.category) setCatId(Number(d.category.id));
      })
      .catch(() => setTopics([]))
      .finally(() => setLoaded(true));
  }, [slug, sort, locale]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user || !catId) { setFollowing(false); return; }
    fetch(`${apiUrl()}/api/forum/follow?targetType=category&targetId=${catId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setFollowing(!!d.following))
      .catch(() => {});
  }, [user, catId]);

  const toggleFollow = async () => {
    if (!user) { router.push('/login'); return; }
    if (!catId) return;
    setFollowing((f) => !f); // optimistic
    try {
      const r = await fetch(`${apiUrl()}/api/forum/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetType: 'category', targetId: catId }),
      });
      const d = await r.json();
      setFollowing(!!d.following);
    } catch {}
  };

  const createThread = async () => {
    if (!user) { router.push('/login'); return; }
    if (!catId || !title.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`${apiUrl()}/api/forum/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categoryId: catId, title: title.trim(), sideA: sideA.trim(), sideB: sideB.trim(), lang: locale }),
      });
      if (r.ok) {
        setTitle(''); setSideA(''); setSideB(''); setFormOpen(false);
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  const sorts: Sort[] = ['hot', 'new', 'active'];
  const inputCls = 'w-full bg-panel-2 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder-fg-faint focus:outline-none focus:border-brand transition-colors';

  return (
    <div className="min-h-screen bg-ink text-fg font-sans">
      <div className="fixed top-0 w-full px-4 md:px-6 py-3.5 flex justify-between items-center bg-ink/70 backdrop-blur-xl z-50 border-b border-white/5">
        <button onClick={() => router.push('/')} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <LanguageSwitcher />
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-panel-2 border border-brand/20 text-brand-light flex items-center justify-center glow-brand">
            <CategoryIcon slug={slug} size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex-1">{t(`cat.${slug}.title`)}</h1>
          <button
            onClick={toggleFollow}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${
              following ? 'bg-brand/15 text-brand-light border border-brand/30' : 'bg-brand text-brand-ink glow-brand hover:scale-[1.03]'
            }`}
          >
            {following ? <><Check size={14} /> {t('forum.subscribed')}</> : <><Bell size={14} /> {t('forum.subscribe')}</>}
          </button>
        </div>

        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {sorts.map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sort === s ? 'bg-brand text-brand-ink' : 'bg-panel text-fg-muted hover:text-fg border border-white/10'
                }`}
              >
                {t(`forum.sort${s.charAt(0).toUpperCase() + s.slice(1)}`)}
              </button>
            ))}
          </div>
          <button
            onClick={() => (user ? setFormOpen((o) => !o) : router.push('/login'))}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-panel border border-white/10 hover:border-brand/40 transition-colors"
          >
            {formOpen ? <X size={14} /> : <Plus size={14} />} {t('forum.newThread')}
          </button>
        </div>

        {formOpen && (
          <div className="bg-panel border border-white/10 rounded-2xl p-4 mb-5 space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('forum.threadPlaceholder')} className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <input value={sideA} onChange={(e) => setSideA(e.target.value)} placeholder={t('create.redPlaceholder')} className={inputCls + ' focus:border-sidea'} />
              <input value={sideB} onChange={(e) => setSideB(e.target.value)} placeholder={t('create.bluePlaceholder')} className={inputCls + ' focus:border-sideb'} />
            </div>
            <button
              onClick={createThread}
              disabled={creating || !title.trim()}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand text-brand-ink font-semibold py-2.5 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 glow-brand"
            >
              {creating ? '…' : (<>{t('forum.createThread')} <Plus size={16} /></>)}
            </button>
          </div>
        )}

        {loaded && topics.length === 0 ? (
          <p className="text-fg-muted text-center py-16">{t('forum.emptyTopics')}</p>
        ) : (
          <div className="space-y-3">
            {topics.map((tp) => (
              <div
                key={tp.slug}
                onClick={() => router.push(`/t/${tp.slug}`)}
                className="bg-panel border border-white/[0.07] hover:border-brand/40 rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-0.5"
              >
                <h3 className="text-base font-semibold leading-snug mb-3">{tp.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-sidea-light bg-sidea/10 border border-sidea/25 px-2.5 py-1 rounded-lg">{tp.sideA}</span>
                  <span className="text-[10px] font-bold text-fg-faint">VS</span>
                  <span className="text-[11px] font-semibold text-sideb-light bg-sideb/10 border border-sideb/25 px-2.5 py-1 rounded-lg">{tp.sideB}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
                  <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} />{t('forum.replies', { n: tp.posts })}</span>
                  <span className="inline-flex items-center gap-1.5"><Users size={14} />{t('forum.participants', { n: tp.participants })}</span>
                  <span className="inline-flex items-center gap-1.5"><Swords size={14} />{t('forum.battles', { n: tp.battles })}</span>
                  {tp.live > 0 && <span className="inline-flex items-center gap-1.5 text-brand-light"><Eye size={14} />{t('forum.liveCount', { n: tp.live })}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
