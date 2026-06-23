'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Users, Swords, Eye } from 'lucide-react';
import { apiUrl } from '../../providers';
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
  const { t, locale } = useT();
  const [sort, setSort] = useState<Sort>('hot');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    fetch(`${apiUrl()}/api/forum/categories/${slug}?sort=${sort}&lang=${locale}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { topics: [] }))
      .then((d) => setTopics(d.topics || []))
      .catch(() => setTopics([]))
      .finally(() => setLoaded(true));
  }, [slug, sort, locale]);

  const sorts: Sort[] = ['hot', 'new', 'active'];

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
          <h1 className="text-2xl font-bold tracking-tight">{t(`cat.${slug}.title`)}</h1>
        </div>

        <div className="flex gap-1.5 mb-5">
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
