'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '../providers';

function getApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shoom.fun';
}

function getOrCreateSessionIdentity(roomId: string): string {
  const key = `shoom-identity-${roomId}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `user-${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

function formatDuration(s: number): string {
  return s < 60 ? `${s} sec` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function CreateRoom() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState('');
  const [labelA, setLabelA] = useState('');
  const [labelB, setLabelB] = useState('');
  const [roundsCount, setRoundsCount] = useState(2);
  const [roundDuration, setRoundDuration] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const handleCreate = async () => {
    if (!topic.trim()) {
      setError('Enter a debate topic');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const API_URL = getApiUrl();

      const createRes = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic: topic.trim(),
          labelA: labelA.trim() || 'Red',
          labelB: labelB.trim() || 'Blue',
          roundsCount,
          roundDuration,
        }),
      });
      const { roomId } = await createRes.json();

      const identity = getOrCreateSessionIdentity(roomId);
      const joinRes = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identity }),
      });
      const { role, slot } = await joinRes.json();

      sessionStorage.setItem(`shoom-role-${roomId}`, role);
      sessionStorage.setItem(`shoom-slot-${roomId}`, slot || '');

      router.push(`/room/${roomId}`);
    } catch (err) {
      setError('Something went wrong, try again');
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-panel border border-white/10 rounded-xl px-4 py-3 text-fg placeholder-fg-faint focus:outline-none focus:border-brand transition-colors';
  const labelCls = 'block text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-2';

  return (
    <div className="min-h-screen bg-ink text-fg font-sans flex flex-col items-center justify-center px-4 py-12">
      <button
        onClick={() => router.push('/')}
        className="self-start md:self-auto md:absolute md:top-6 md:left-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="w-full max-w-lg">
        <p className="text-[11px] text-brand-light uppercase tracking-[0.18em] text-center mb-3 font-medium">
          New battle
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-2 tracking-tight">
          Create <span className="text-brand-light text-glow-brand">battle</span>
        </h1>
        <p className="text-fg-muted text-center mb-9 text-sm">
          Set the topic and the rules of the arena
        </p>

        <div className="space-y-5">
          <div>
            <label className={labelCls}>Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. AI vs Humanity"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-sidea-light mb-2">
                Red side
              </label>
              <input
                type="text"
                value={labelA}
                onChange={(e) => setLabelA(e.target.value)}
                placeholder="Red team"
                className="w-full bg-panel border border-white/10 rounded-xl px-4 py-3 text-fg placeholder-fg-faint focus:outline-none focus:border-sidea transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-sideb-light mb-2">
                Blue side
              </label>
              <input
                type="text"
                value={labelB}
                onChange={(e) => setLabelB(e.target.value)}
                placeholder="Blue team"
                className="w-full bg-panel border border-white/10 rounded-xl px-4 py-3 text-fg placeholder-fg-faint focus:outline-none focus:border-sideb transition-colors"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Rounds</label>
            <div className="flex items-center gap-3 bg-panel border border-white/10 rounded-xl px-3 py-2">
              <button
                type="button"
                onClick={() => setRoundsCount((n) => Math.max(1, n - 1))}
                disabled={roundsCount <= 1}
                aria-label="Fewer rounds"
                className="w-9 h-9 rounded-lg bg-panel-2 border border-white/10 text-fg text-lg leading-none hover:border-brand/50 disabled:opacity-40 disabled:hover:border-white/10 transition-colors flex items-center justify-center"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-xl font-semibold tabular-nums">{roundsCount}</span>
                <span className="text-fg-muted text-sm ml-1.5">{roundsCount === 1 ? 'round' : 'rounds'}</span>
              </div>
              <button
                type="button"
                onClick={() => setRoundsCount((n) => Math.min(12, n + 1))}
                disabled={roundsCount >= 12}
                aria-label="More rounds"
                className="w-9 h-9 rounded-lg bg-panel-2 border border-white/10 text-fg text-lg leading-none hover:border-brand/50 disabled:opacity-40 disabled:hover:border-white/10 transition-colors flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">Round time</span>
              <span className="text-sm font-semibold text-brand-light tabular-nums">{formatDuration(roundDuration)}</span>
            </div>
            <input
              type="range"
              min={45}
              max={180}
              step={15}
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-fg-faint mt-1.5">
              <span>45 sec</span>
              <span>3:00</span>
            </div>
          </div>

          {error && (
            <div className="text-sidea-light text-sm text-center font-medium bg-sidea/10 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:scale-[1.02] active:scale-[0.99] disabled:bg-panel disabled:text-fg-faint disabled:scale-100 text-brand-ink font-semibold py-3.5 rounded-xl transition-all glow-brand disabled:shadow-none"
          >
            {loading ? 'Creating…' : (<>Create room <Plus size={18} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
