'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RoomShort {
  id: string;
  phase: string;
  viewers: number;
  title: string;
}

export default function HomePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomShort[]>([]);
  const [loading, setLoading] = useState(false);

  const getApiUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3001';
    return window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://shoom.fun';
  };

  // грузим список комнат
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/rooms`);
        const data = await res.json();
        if (Array.isArray(data)) setRooms(data);
      } catch (e) {
        console.error('Failed to load rooms', e);
      }
    };
    load();
    const id = setInterval(load, 5000); // лёгкий поллинг
    return () => clearInterval(id);
  }, []);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      
      const data = await res.json();
      router.push(`/room/${data.id}`); 
    } catch (e) {
      console.error(e);
      alert('Error creating room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-10">
      <h1 className="text-5xl md:text-7xl font-black mb-6 italic tracking-tight">
        MAKE SOME NOISE
      </h1>
      <p className="text-slate-400 mb-8 text-sm md:text-base">
        Live 1x1 rage debates. Pick a room and drop into chaos.
      </p>

      <button
        onClick={createRoom}
        disabled={loading}
        className="mb-10 px-8 py-3 rounded-full bg-white text-black font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create Debate'}
      </button>

      <div className="w-full max-w-2xl">
        <h2 className="text-xs font-semibold uppercase text-slate-500 mb-3">
          Live rooms
        </h2>
        {rooms.length === 0 && (
          <div className="text-slate-600 text-sm">No rooms yet. Be the first.</div>
        )}
        <div className="space-y-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => router.push(`/room/${room.id}`)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-300 transition-colors text-left"
            >
              <div>
                <div className="font-mono text-sm text-slate-200">{room.title}</div>
                <div className="text-[10px] uppercase text-slate-500">
                  {room.phase} • {room.viewers} viewers
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-slate-300">Join</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
