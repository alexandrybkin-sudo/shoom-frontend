'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function CreateRoom() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [labelA, setLabelA] = useState('');
  const [labelB, setLabelB] = useState('');
  const [roundsCount, setRoundsCount] = useState(2);
  const [roundDuration, setRoundDuration] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!topic.trim()) {
      setError('Введи тему дебата');
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
      setError('Что-то пошло не так, попробуй ещё раз');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl md:text-5xl font-black uppercase text-center mb-2">
          Create Battle
        </h1>
        <p className="text-slate-500 text-center mb-10 text-sm">
          Задай тему и параметры для новой комнаты
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Тема</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: AI vs Humanity"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-red-500 mb-2">Красная сторона</label>
              <input
                type="text"
                value={labelA}
                onChange={(e) => setLabelA(e.target.value)}
                placeholder="Red Team"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-blue-500 mb-2">Синяя сторона</label>
              <input
                type="text"
                value={labelB}
                onChange={(e) => setLabelB(e.target.value)}
                placeholder="Blue Team"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Раундов</label>
              <select
                value={roundsCount}
                onChange={(e) => setRoundsCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors appearance-none"
              >
                <option value={2}>2 Раунда</option>
                <option value={4}>4 Раунда</option>
                <option value={6}>6 Раундов</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Время раунда (сек)</label>
              <select
                value={roundDuration}
                onChange={(e) => setRoundDuration(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors appearance-none"
              >
                <option value={30}>30 сек</option>
                <option value={45}>45 сек</option>
                <option value={60}>60 сек</option>
                <option value={90}>90 сек</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-bold bg-red-500/10 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/20"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
