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
    const id = setInterval(load, 5000);
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-16">
      {/* HEADER: MAKE SOME NOISE */}
      <h1 className="text-5xl md:text-8xl font-black mb-6 italic tracking-tight text-center">
        MAKE SOME NOISE
      </h1>
      <p className="text-slate-400 mb-12 text-sm md:text-lg text-center font-mono">
        Live 1x1 rage debates. Pick a room and drop into chaos.
      </p>

      {/* CREATE BUTTON - С ИЗМЕНЕННЫМ ТЕКСТОМ ДЛЯ ПРОВЕРКИ */}
      <button
        onClick={createRoom}
        disabled={loading}
        className="mb-16 px-10 py-4 rounded-full bg-white text-black font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
      >
        {loading ? 'INITIALIZING...' : 'CREATE DEBATE NOW!!!'}
      </button>

      {/* ROOMS LIST */}
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-end mb-4 border-b border-slate-800 pb-2">
           <h2 className="text-sm font-bold uppercase text-slate-500 tracking-widest">
             Live Battles
           </h2>
           <span className="text-xs text-slate-600 font-mono animate-pulse">● LIVE</span>
        </div>

        {rooms.length === 0 && (
          <div className="text-slate-600 text-center py-8 border border-dashed border-slate-800 rounded-xl">
            No active wars right now. Start one.
          </div>
        )}

        <div className="space-y-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => router.push(`/room/${room.id}`)}
              className="w-full flex items-center justify-between px-6 py-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-slate-900/80 transition-all text-left group"
            >
              <div>
                <div className="font-mono text-lg text-slate-200 group-hover:text-white font-bold">
                  #{room.title}
                </div>
                <div className="text-xs uppercase text-slate-500 mt-1 font-bold">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 mr-2">{room.phase}</span>
                  {room.viewers} watching
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 group-hover:text-red-500 transition-colors uppercase tracking-widest">
                  Watch
                </span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
