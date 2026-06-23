'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Swords, MessageCircle, Users, Send } from 'lucide-react';
import { useAuth, apiUrl } from '../../providers';
import { useT, LanguageSwitcher } from '../../i18n';

interface Topic {
  id: number;
  slug: string;
  title: string;
  sideA: string;
  sideB: string;
  categorySlug: string;
  posts: number;
  participants: number;
  battles: number;
  live: number;
}
interface Post {
  side: 'A' | 'B';
  body: string;
  createdAt: string;
  author: string;
  avatar: string | null;
}

function sessionIdentity(roomId: string): string {
  const key = `shoom-identity-${roomId}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `user-${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function TopicPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug || '');
  const { user } = useAuth();
  const { t } = useT();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [side, setSide] = useState<'A' | 'B'>('A');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${apiUrl()}/api/forum/topics/${slug}`, { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        setTopic(d.topic);
        setPosts(d.posts || []);
      }
    } catch {}
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (!topic || !body.trim()) return;
    setPosting(true);
    try {
      const r = await fetch(`${apiUrl()}/api/forum/topics/${topic.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ side, body: body.trim() }),
      });
      if (r.ok) {
        setBody('');
        await load();
      }
    } finally {
      setPosting(false);
    }
  };

  const startBattle = async () => {
    if (!user) { router.push('/login'); return; }
    if (!topic) return;
    setStarting(true);
    try {
      const createRes = await fetch(`${apiUrl()}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic: topic.title,
          labelA: topic.sideA,
          labelB: topic.sideB,
          roundsCount: 2,
          roundDuration: 90,
          topicId: topic.id,
        }),
      });
      const { roomId } = await createRes.json();
      const identity = sessionIdentity(roomId);
      const joinRes = await fetch(`${apiUrl()}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identity }),
      });
      const { role, slot } = await joinRes.json();
      sessionStorage.setItem(`shoom-role-${roomId}`, role);
      sessionStorage.setItem(`shoom-slot-${roomId}`, slot || '');
      router.push(`/room/${roomId}`);
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-fg font-sans">
      <div className="fixed top-0 w-full px-4 md:px-6 py-3.5 flex justify-between items-center bg-ink/70 backdrop-blur-xl z-50 border-b border-white/5">
        <button
          onClick={() => router.push(topic ? `/c/${topic.categorySlug}` : '/')}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <LanguageSwitcher />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-24 pb-28">
        {topic && (
          <>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug mb-4">{topic.title}</h1>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-sidea-light bg-sidea/10 border border-sidea/25 px-3 py-1.5 rounded-lg">{topic.sideA}</span>
              <span className="text-[11px] font-bold text-fg-faint">VS</span>
              <span className="text-xs font-semibold text-sideb-light bg-sideb/10 border border-sideb/25 px-3 py-1.5 rounded-lg">{topic.sideB}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-fg-muted mb-5">
              <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} />{t('forum.replies', { n: topic.posts })}</span>
              <span className="inline-flex items-center gap-1.5"><Users size={14} />{t('forum.participants', { n: topic.participants })}</span>
              <span className="inline-flex items-center gap-1.5"><Swords size={14} />{t('forum.battles', { n: topic.battles })}</span>
            </div>

            <button
              onClick={startBattle}
              disabled={starting}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand text-brand-ink font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 glow-brand mb-8"
            >
              <Swords size={18} /> {t('topic.startBattle')}
            </button>

            {/* Posts */}
            {posts.length === 0 ? (
              <p className="text-fg-muted text-center py-10 text-sm">{t('topic.noPosts')}</p>
            ) : (
              <div className="space-y-3 mb-8">
                {posts.map((p, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-3.5 border ${
                      p.side === 'A' ? 'border-sidea/25 bg-sidea/[0.06]' : 'border-sideb/25 bg-sideb/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[11px] font-semibold ${p.side === 'A' ? 'text-sidea-light' : 'text-sideb-light'}`}>
                        {p.author}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.side === 'A' ? 'bg-sidea/15 text-sidea-light' : 'bg-sideb/15 text-sideb-light'}`}>
                        {p.side === 'A' ? topic.sideA : topic.sideB}
                      </span>
                    </div>
                    <p className="text-sm text-fg/90 leading-relaxed break-words">{p.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Composer */}
            {user ? (
              <form onSubmit={submitReply} className="sticky bottom-4 bg-panel border border-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-fg-muted">{t('topic.yourSide')}:</span>
                  <button
                    type="button"
                    onClick={() => setSide('A')}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${side === 'A' ? 'bg-sidea text-brand-ink' : 'bg-sidea/15 text-sidea-light'}`}
                  >
                    {topic.sideA}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('B')}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${side === 'B' ? 'bg-sideb text-brand-ink' : 'bg-sideb/15 text-sideb-light'}`}
                  >
                    {topic.sideB}
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('topic.replyPlaceholder')}
                    rows={1}
                    className="flex-1 bg-panel-2 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder-fg-faint focus:outline-none focus:border-brand resize-none"
                  />
                  <button
                    type="submit"
                    disabled={posting || !body.trim()}
                    aria-label={t('topic.reply')}
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-brand-ink glow-brand disabled:opacity-50 hover:scale-105 transition-transform"
                  >
                    <Send size={17} />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="w-full text-center text-sm text-fg-muted hover:text-fg border border-white/10 rounded-xl py-3 transition-colors"
              >
                {t('topic.signInToReply')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
