'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '../providers';
import { useT } from '../i18n';

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
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function CreateRoom() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useT();
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
      setError(t('create.errEmptyTopic'));
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
      if (!createRes.ok) throw new Error(`create failed: ${createRes.status}`);
      const { roomId } = await createRes.json();
      if (!roomId) throw new Error('no roomId returned');

      // Join to claim a debater slot. Best-effort — even if it hiccups we can still enter.
      const identity = getOrCreateSessionIdentity(roomId);
      let role = 'debater';
      let slot = '';
      try {
        const joinRes = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ identity }),
        });
        if (joinRes.ok) {
          const data = await joinRes.json();
          role = data.role;
          slot = data.slot || '';
        }
      } catch {}

      sessionStorage.setItem(`shoom-role-${roomId}`, role);
      sessionStorage.setItem(`shoom-slot-${roomId}`, slot);

      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(t('create.errGeneric'));
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
        <ArrowLeft size={16} /> {t('common.back')}
      </button>

      <div className="w-full max-w-lg">
        <p className="text-[11px] text-brand-light uppercase tracking-[0.18em] text-center mb-3 font-medium">
          {t('create.eyebrow')}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-2 tracking-tight">
          {t('create.titlePre')} <span className="text-brand-light text-glow-brand">{t('create.titleAccent')}</span>
        </h1>
        <p className="text-fg-muted text-center mb-9 text-sm">
          {t('create.subtitle')}
        </p>

        <div className="space-y-5">
          <div>
            <label className={labelCls}>{t('create.topic')}</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('create.topicPlaceholder')}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-sidea-light mb-2">
                {t('create.redSide')}
              </label>
              <input
                type="text"
                value={labelA}
                onChange={(e) => setLabelA(e.target.value)}
                placeholder={t('create.redPlaceholder')}
                className="w-full bg-panel border border-white/10 rounded-xl px-4 py-3 text-fg placeholder-fg-faint focus:outline-none focus:border-sidea transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-sideb-light mb-2">
                {t('create.blueSide')}
              </label>
              <input
                type="text"
                value={labelB}
                onChange={(e) => setLabelB(e.target.value)}
                placeholder={t('create.bluePlaceholder')}
                className="w-full bg-panel border border-white/10 rounded-xl px-4 py-3 text-fg placeholder-fg-faint focus:outline-none focus:border-sideb transition-colors"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('create.rounds')}</label>
            <div className="flex items-center gap-3 bg-panel border border-white/10 rounded-xl px-3 py-2">
              <button
                type="button"
                onClick={() => setRoundsCount((n) => Math.max(2, n - 2))}
                disabled={roundsCount <= 2}
                aria-label="Fewer rounds"
                className="w-9 h-9 rounded-lg bg-panel-2 border border-white/10 text-fg text-lg leading-none hover:border-brand/50 disabled:opacity-40 disabled:hover:border-white/10 transition-colors flex items-center justify-center"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-xl font-semibold tabular-nums">{roundsCount}</span>
                <span className="text-fg-muted text-sm ml-1.5">{t('create.roundsWord')}</span>
              </div>
              <button
                type="button"
                onClick={() => setRoundsCount((n) => Math.min(12, n + 2))}
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
              <span className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">{t('create.roundTime')}</span>
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
              <span>45s</span>
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
            {loading ? t('create.creating') : (<>{t('create.createRoom')} <Plus size={18} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
