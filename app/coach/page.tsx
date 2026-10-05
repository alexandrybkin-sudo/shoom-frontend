'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Send, Timer, Trophy, Check, X, Lightbulb, Loader2, Play, Mic, Square, Keyboard } from 'lucide-react';
import { useAuth, apiUrl } from '../providers';
import { useT, LanguageSwitcher } from '../i18n';

type Side = 'A' | 'B';
type Msg = { role: 'human' | 'ai'; text: string };
type Phase = 'setup' | 'debate' | 'reviewing' | 'review';
interface Review { score: number; summary: string; strengths: string[]; mistakes: string[]; tips: string[]; }
type Mode = 'text' | 'voice';
interface Setup { topic: string; sideA: string; sideB: string; humanSide: Side; aiSide: Side; rounds: number; seconds: number; mode: Mode; }

export default function CoachPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useT();

  const [phase, setPhase] = useState<Phase>('setup');
  const [rounds, setRounds] = useState(3);
  const [seconds, setSeconds] = useState(90);
  const [mode, setMode] = useState<Mode>('voice');
  const [draft, setDraft] = useState('');
  const [starting, setStarting] = useState(false);
  const [cfg, setCfg] = useState<Setup | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [turn, setTurn] = useState<'reading' | 'human' | 'ai'>('reading');
  const [timeLeft, setTimeLeft] = useState(0);
  const [round, setRound] = useState(1);
  const [review, setReview] = useState<Review | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);
  const speechSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Refs for values read inside timers / async (avoid stale closures).
  const draftRef = useRef('');
  const busyRef = useRef(false);
  const msgRef = useRef<Msg[]>([]);
  const roundRef = useRef(1);
  const cfgRef = useRef<Setup | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { draftRef.current = draft; }, [draft]);
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
      const setup: Setup = { topic: d.topic, sideA: d.sideA, sideB: d.sideB, humanSide: d.humanSide, aiSide: d.aiSide, rounds, seconds, mode: speechSupported ? mode : 'text' };
      setCfg(setup); cfgRef.current = setup;
      setDraft(''); draftRef.current = '';
      setMessages([]); msgRef.current = [];
      setRound(1); roundRef.current = 1;
      setReview(null);
      setPhase('debate');
      setTurn('reading'); // let them read the topic + sides before the clock starts
      setTimeLeft(seconds);
    } catch { setStarting(false); }
  };

  // Human presses this when done reading — only now does their answer clock start.
  const startTurn = () => {
    if (!cfgRef.current) return;
    setDraft(''); draftRef.current = '';
    setTimeLeft(cfgRef.current.seconds);
    setTurn('human');
  };

  const sideLabel = (s: Side) => (cfg ? (s === 'A' ? cfg.sideA : cfg.sideB) : '');

  const submit = async (auto = false) => {
    if (busyRef.current) return;
    const c = cfgRef.current;
    if (!c) return;
    try { recRef.current?.stop(); } catch {}
    setRecording(false);
    busyRef.current = true;
    const text = draftRef.current.trim();
    setDraft(''); draftRef.current = '';
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
        setTurn('reading'); // read the opponent's reply before the next clock starts
      } else {
        await doReview(hist2);
      }
    } catch {
      setTurn('reading');
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

  // Voice input (browser Web Speech API). Transcribes into the answer box; the AI
  // still replies in text. Hidden where unsupported (falls back to typing).
  const recLang = locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'ru-RU';
  const toggleRec = () => {
    if (recording) { try { recRef.current?.stop(); } catch {} return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = recLang;
    rec.interimResults = true;
    rec.continuous = true;
    let base = draftRef.current ? draftRef.current.trim() + ' ' : '';
    rec.onresult = (e: any) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tr; else interim += tr;
      }
      if (final) base += final;
      setDraft((base + interim).replace(/\s+/g, ' ').trimStart());
    };
    rec.onend = () => { setRecording(false); recRef.current = null; };
    rec.onerror = () => { setRecording(false); };
    recRef.current = rec;
    setRecording(true);
    try { rec.start(); } catch { setRecording(false); }
  };

  // Stop listening whenever it's not the human's turn, and on unmount.
  useEffect(() => { if (turn !== 'human') { try { recRef.current?.stop(); } catch {} } }, [turn]);
  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

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
              <div>
                <p className="text-xs text-fg-muted mb-2">{t('coach.answerMode')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode('voice')} disabled={!speechSupported}
                    className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border transition-colors disabled:opacity-40 ${mode === 'voice' && speechSupported ? 'bg-brand/15 border-brand' : 'bg-panel-2 border-white/10 text-fg-muted hover:text-fg'}`}>
                    <Mic size={20} className={mode === 'voice' && speechSupported ? 'text-brand-light' : ''} />
                    <span className="text-sm font-semibold">{t('coach.modeVoice')}</span>
                  </button>
                  <button onClick={() => setMode('text')}
                    className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border transition-colors ${mode === 'text' ? 'bg-brand/15 border-brand' : 'bg-panel-2 border-white/10 text-fg-muted hover:text-fg'}`}>
                    <Keyboard size={20} className={mode === 'text' ? 'text-brand-light' : ''} />
                    <span className="text-sm font-semibold">{t('coach.modeText')}</span>
                  </button>
                </div>
                {!speechSupported && <p className="text-[11px] text-fg-faint mt-1.5">{t('coach.voiceUnsupported')}</p>}
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
                <div key={i} className={`flex items-end gap-2 ${m.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'ai' && <KnightAvatar />}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${m.role === 'human' ? 'bg-brand text-brand-ink rounded-br-md' : 'bg-panel border border-white/[0.07] rounded-bl-md'}`}>
                    {m.role === 'ai' && <p className="text-[10px] uppercase tracking-wider text-fg-faint mb-1 font-semibold">{t('coach.opponent')}</p>}
                    {m.text}
                  </div>
                </div>
              ))}
              {turn === 'ai' && phase === 'debate' && (
                <div className="flex items-end gap-2 justify-start">
                  <KnightAvatar />
                  <div className="bg-panel border border-white/[0.07] rounded-2xl rounded-bl-md px-4 py-3 text-fg-muted text-sm inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {t('coach.thinking')}</div>
                </div>
              )}
              {phase === 'reviewing' && (
                <div className="flex justify-center py-6"><div className="text-fg-muted text-sm inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> {t('coach.finishing')}</div></div>
              )}
            </div>

            {phase === 'debate' && (
              <div className="shrink-0 mt-3">
                {turn === 'reading' ? (
                  <div className="flex flex-col items-center gap-2.5 py-2">
                    <p className="text-xs text-fg-muted text-center">{t('coach.readHint')}</p>
                    <button onClick={startTurn}
                      className="inline-flex items-center gap-2 bg-brand text-brand-ink font-semibold px-6 py-3 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.99] glow-brand">
                      <Play size={16} /> {t('coach.myTurn')} · {mmss(cfg.seconds)}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Timer size={14} className={timeLeft <= 10 && turn === 'human' ? 'text-rage-light' : 'text-fg-muted'} />
                      <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-rage' : 'bg-brand'}`} style={{ width: `${turn === 'human' ? (timeLeft / cfg.seconds) * 100 : 0}%` }} />
                      </div>
                      <span className={`text-xs font-mono tabular-nums ${timeLeft <= 10 && turn === 'human' ? 'text-rage-light' : 'text-fg-muted'}`}>{turn === 'human' ? mmss(Math.max(0, timeLeft)) : '0:00'}</span>
                    </div>

                    {cfg.mode === 'text' ? (
                      /* TEXT MODE — typing */
                      <div className="flex items-end gap-2">
                        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} disabled={turn !== 'human'}
                          placeholder={turn === 'human' ? t('coach.yourTurn') : t('coach.waitTurn')}
                          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(false); } }}
                          className="flex-1 bg-panel border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder-fg-faint focus:outline-none focus:border-brand transition-colors resize-none disabled:opacity-50" />
                        <button onClick={() => submit(false)} disabled={turn !== 'human'}
                          className="shrink-0 bg-brand text-brand-ink font-semibold rounded-xl px-4 py-2.5 transition-all hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100 inline-flex items-center gap-1.5">
                          <Send size={15} /> {t('coach.send')}
                        </button>
                      </div>
                    ) : (
                      /* VOICE MODE — speak */
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-full min-h-[52px] rounded-xl bg-panel border border-white/10 px-3.5 py-2.5 text-sm leading-relaxed">
                          {draft ? draft : <span className="text-fg-faint">{recording ? t('coach.listening') : t('coach.tapToSpeak')}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={toggleRec} disabled={turn !== 'human'} aria-label={t('coach.mic')}
                            className={`relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${recording ? 'bg-rage text-white scale-105' : 'bg-brand text-brand-ink glow-brand hover:scale-105'}`}>
                            {recording && <span className="absolute inset-0 rounded-full bg-rage/40 animate-ping" />}
                            <span className="relative">{recording ? <Square size={24} /> : <Mic size={26} />}</span>
                          </button>
                          <button onClick={() => submit(false)} disabled={turn !== 'human' || !draft.trim()}
                            className="shrink-0 bg-panel-2 border border-white/15 text-fg font-semibold rounded-xl px-5 py-3 transition-all hover:border-white/30 disabled:opacity-40 inline-flex items-center gap-1.5">
                            <Send size={16} /> {t('coach.send')}
                          </button>
                        </div>
                        <p className="text-[11px] text-fg-faint">{recording ? t('coach.tapToStop') : t('coach.tapToSpeak')}</p>
                      </div>
                    )}
                  </>
                )}
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

// The Shoom knight (same mark as the logo easter egg) — the AI opponent's avatar.
function KnightAvatar() {
  return (
    <div className="shrink-0 w-8 h-8 rounded-xl bg-panel-2 border border-white/10 flex items-center justify-center mb-0.5" aria-hidden>
      <svg width="18" height="20" viewBox="0 0 38 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 2 C 24 4, 24 9, 19 12" stroke="#A06BFF" strokeWidth="3" strokeLinecap="round" />
        <rect x="29.5" y="3" width="2.4" height="17" rx="1.2" fill="#E8EAF0" transform="rotate(22 30.7 11.5)" />
        <rect x="26" y="15.5" width="8" height="2.6" rx="1.3" fill="#A06BFF" transform="rotate(22 30 16.8)" />
        <rect x="11" y="9" width="16" height="19" rx="7.5" fill="#C7CBD4" />
        <rect x="14.5" y="15" width="9" height="2.8" rx="1.4" fill="#2A2F3A" />
        <rect x="14.5" y="19.5" width="9" height="2.2" rx="1.1" fill="#2A2F3A" />
      </svg>
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
