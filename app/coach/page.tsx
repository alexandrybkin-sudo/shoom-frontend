'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Send, Timer, Trophy, Check, X, Lightbulb, Loader2 } from 'lucide-react';
import { useAuth, apiUrl } from '../providers';
import { useT, LanguageSwitcher } from '../i18n';

type Side = 'A' | 'B';
type Msg = { role: 'human' | 'ai'; text: string };
type Phase = 'setup' | 'debate' | 'reviewing' | 'review';
interface Review { score: number; summary: string; strengths: string[]; mistakes: string[]; tips: string[]; }
interface Setup { topic: string; sideA: string; sideB: string; humanSide: Side; aiSide: Side; rounds: number; seconds: number; }

export default function CoachPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useT();

  const [phase, setPhase] = useState<Phase>('setup');
  const [rounds, setRounds] = useState(3);
  const [seconds, setSeconds] = useState(90);
  const [starting, setStarting] = useState(false);
  const [cfg, setCfg] = useState<Setup | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [turn, setTurn] = useState<'human' | 'ai'>('human');
  const [timeLeft, setTimeLeft] = useState(0);
  const [round, setRound] = useState(1);
  const [review, setReview] = useState<Review | null>(null);

  // Refs for values read inside timers / async (avoid stale closures).
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const busyRef = useRef(false);
  const msgRef = useRef<Msg[]>([]);
  const roundRef = useRef(1);
  const cfgRef = useRef<Setup | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { msgRef.current = messages; }, [messages]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, turn]);

  // Countdown for the human's turn; auto-submits at 0.
  useEffect(() => {
    if (phase !== 'debate' || turn !== 'human') return;
    if (timeLeft <= 0) { submit(true); return; }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, turn, timeLeft]);

  const start = async () => {
    if (!user) { router.push('/login'); return; }
    setStarting(true);
    try {
      const r = await fetch(`${apiUrl()}/api/coach/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ rounds, lang: locale }),
      });
      if (!r.ok) { setStarting(false); if (r.status === 401) router.push('/login'); return; }
      const d = await r.json();
      const setup: Setup = { topic: d.topic, sideA: d.sideA, sideB: d.sideB, humanSide: d.humanSide, aiSide: d.aiSide, rounds, seconds };
      setCfg(setup); cfgRef.current = setup;
      setMessages([]); msgRef.current = [];
      setRound(1); roundRef.current = 1;
      setReview(null);
      setPhase('debate');
      setTurn('human');
      setTimeLeft(seconds);
    } catch { setStarting(false); }
  };

  const sideLabel = (s: Side) => (cfg ? (s === 'A' ? cfg.sideA : cfg.sideB) : '');

  const submit = async (auto = false) => {
    if (busyRef.current) return;
    const c = cfgRef.current;
    if (!c) return;
    busyRef.current = true;
    const text = (taRef.current?.value || '').trim();
    if (taRef.current) taRef.current.value = '';
    const human: Msg = { role: 'human', text: text || (auto ? t('coach.missed') : '—') };
    const hist = [...msgRef.current, human];
    setMessages(hist); msgRef.current = hist;
    setTurn('ai');
    try {
      const r = await fetch(`${apiUrl()}/api/coach/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          topic: c.topic, sideA: c.sideA, sideB: c.sideB, humanSide: c.humanSide, aiSide: c.aiSide,
          round: roundRef.current, rounds: c.rounds, lang: locale, history: hist,
        }),
      });
      const d = await r.json();
      const ai: Msg = { role: 'ai', text: d.reply || '…' };
      const hist2 = [...hist, ai];
      setMessages(hist2); msgRef.current = hist2;
      if (roundRef.current < c.rounds) {
        const next = roundRef.current + 1;
        setRound(next); roundRef.current = next;
        setTimeLeft(c.seconds);
        setTurn('human');
      } else {
        await doReview(hist2);
      }
    } catch {
      setTurn('human'); setTimeLeft(c.seconds);
    } finally {
      busyRef.current = false;
    }
  };

  const doReview = async (hist: Msg[]) => {
    const c = cfgRef.current; if (!c) return;
    setPhase('reviewing');
    try {
      const r = await fetch(`${apiUrl()}/api/coach/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ topic: c.topic, humanSide: c.humanSide, sideA: c.sideA, sideB: c.sideB, lang: locale, history: hist }),
      });
      const d = await r.json();
      setReview(d);
    } catch { setReview({ score: 5, summary: '', strengths: [], mistakes: [], tips: [] }); }
    setPhase('review');
  };

  const reset = () => { setPhase('setup'); setCfg(null); setMessages([]); setReview(null); };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-ink text-fg font-sans flex flex-col">
      <div className="w-full px-4 md:px-6 py-3.5 flex justify-between items-center border-b border-white/5 shrink-0">
        <button onClick={() => router.push('/')} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><GraduationCap size={16} className="text-brand-light" /> {t('coach.title')}</span>
        <LanguageSwitcher />
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col min-h-0">
        {/* ---------- SETUP ---------- */}
        {phase === 'setup' && (
          <div className="m-auto w-full max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand/15 text-brand-light flex items-center justify-center mx-auto mb-4 glow-brand">
              <GraduationCap size={28} />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('coach.title')}</h1>
            <p className="text-fg-muted text-sm mb-8">{t('coach.subtitle')}</p>

            <div className="text-left space-y-5 bg-panel border border-white/[0.07] rounded-2xl p-5">
              <div>
                <p className="text-xs text-fg-muted mb-2">{t('coach.rounds')}</p>
                <div className="flex gap-2">
                  {[2, 3, 5].map((n) => (
                    <button key={n} onClick={() => setRounds(n)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${rounds === n ? 'bg-brand text-brand-ink' : 'bg-panel-2 border border-white/10 text-fg-muted hover:text-fg'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-fg-muted mb-2">{t('coach.timePerAnswer')}</p>
                <div className="flex gap-2">
                  {[60, 90, 120].map((n) => (
                    <button key={n} onClick={() => setSeconds(n)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${seconds === n ? 'bg-brand text-brand-ink' : 'bg-panel-2 border border-white/10 text-fg-muted hover:text-fg'}`}>{mmss(n)}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={start} disabled={starting}
              className="w-full mt-6 bg-brand text-brand-ink font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 glow-brand inline-flex items-center justify-center gap-2">
              {starting ? <Loader2 size={18} className="animate-spin" /> : <GraduationCap size={18} />}
              {starting ? t('coach.preparing') : t('coach.start')}
            </button>
            {!user && <p className="text-xs text-fg-faint mt-3">{t('coach.signInHint')}</p>}
          </div>
        )}

        {/* ---------- DEBATE ---------- */}
        {(phase === 'debate' || phase === 'reviewing') && cfg && (
          <>
            <div className="shrink-0 bg-panel border border-white/[0.07] rounded-2xl p-4 mb-3">
              <p className="text-[11px] uppercase tracking-wider text-fg-faint mb-1">{t('coach.topicLabel')} · {t('coach.round')} {Math.min(round, cfg.rounds)}/{cfg.rounds}</p>
              <p className="font-semibold leading-snug mb-2.5">{cfg.topic}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-sidea/15 text-sidea-light font-semibold">{t('coach.you')}: {sideLabel(cfg.humanSide)}</span>
                <span className="text-fg-faint">vs</span>
                <span className="px-2 py-1 rounded-lg bg-sideb/15 text-sideb-light font-semibold">{t('coach.ai')}: {sideLabel(cfg.aiSide)}</span>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${m.role === 'human' ? 'bg-brand text-brand-ink rounded-br-md' : 'bg-panel border border-white/[0.07] rounded-bl-md'}`}>
                    {m.role === 'ai' && <p className="text-[10px] uppercase tracking-wider text-fg-faint mb-1 font-semibold">{t('coach.opponent')}</p>}
                    {m.text}
                  </div>
                </div>
              ))}
              {turn === 'ai' && phase === 'debate' && (
                <div className="flex justify-start"><div className="bg-panel border border-white/[0.07] rounded-2xl rounded-bl-md px-4 py-3 text-fg-muted text-sm inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {t('coach.thinking')}</div></div>
              )}
              {phase === 'reviewing' && (
                <div className="flex justify-center py-6"><div className="text-fg-muted text-sm inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> {t('coach.finishing')}</div></div>
              )}
            </div>

            {phase === 'debate' && (
              <div className="shrink-0 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Timer size={14} className={timeLeft <= 10 && turn === 'human' ? 'text-rage-light' : 'text-fg-muted'} />
                  <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-rage' : 'bg-brand'}`} style={{ width: `${turn === 'human' ? (timeLeft / cfg.seconds) * 100 : 0}%` }} />
                  </div>
                  <span className={`text-xs font-mono tabular-nums ${timeLeft <= 10 && turn === 'human' ? 'text-rage-light' : 'text-fg-muted'}`}>{turn === 'human' ? mmss(Math.max(0, timeLeft)) : '0:00'}</span>
                </div>
                <div className="flex items-end gap-2">
                  <textarea ref={taRef} rows={2} disabled={turn !== 'human'}
                    placeholder={turn === 'human' ? t('coach.yourTurn') : t('coach.waitTurn')}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(false); } }}
                    className="flex-1 bg-panel border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder-fg-faint focus:outline-none focus:border-brand transition-colors resize-none disabled:opacity-50" />
                  <button onClick={() => submit(false)} disabled={turn !== 'human'}
                    className="shrink-0 bg-brand text-brand-ink font-semibold rounded-xl px-4 py-2.5 transition-all hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100 inline-flex items-center gap-1.5">
                    <Send size={15} /> {t('coach.send')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------- REVIEW ---------- */}
        {phase === 'review' && review && cfg && (
          <div className="m-auto w-full py-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-brand/15 text-brand-light flex items-center justify-center mx-auto mb-3 glow-brand"><Trophy size={30} /></div>
              <h2 className="text-xl font-bold mb-1">{t('coach.reviewTitle')}</h2>
              <p className="text-4xl font-black text-brand-light mt-2">{review.score}<span className="text-lg text-fg-faint font-bold">/10</span></p>
              {review.summary && <p className="text-fg-muted text-sm mt-2 max-w-md mx-auto">{review.summary}</p>}
            </div>

            <div className="space-y-4">
              {review.strengths.length > 0 && (
                <Section icon={<Check size={15} className="text-sidea-light" />} title={t('coach.strengths')} items={review.strengths} />
              )}
              {review.mistakes.length > 0 && (
                <Section icon={<X size={15} className="text-rage-light" />} title={t('coach.mistakes')} items={review.mistakes} />
              )}
              {review.tips.length > 0 && (
                <Section icon={<Lightbulb size={15} className="text-brand-light" />} title={t('coach.tips')} items={review.tips} />
              )}
            </div>

            <button onClick={reset} className="w-full mt-6 bg-brand text-brand-ink font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.02] glow-brand">
              {t('coach.again')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="bg-panel border border-white/[0.07] rounded-2xl p-4">
      <p className="flex items-center gap-2 text-sm font-semibold mb-2.5">{icon} {title}</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-[13px] text-fg-muted leading-relaxed flex gap-2"><span className="text-fg-faint mt-0.5">•</span><span>{it}</span></li>
        ))}
      </ul>
    </div>
  );
}
