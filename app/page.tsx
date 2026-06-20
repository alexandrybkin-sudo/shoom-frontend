'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Eye, Plus, Swords, Mic, Flame } from 'lucide-react';

interface Room {
  id: string;
  phase: string;
  viewers: number;
  topic: string;
  labelA: string;
  labelB: string;
  hasDebaterA: boolean;
  hasDebaterB: boolean;
  isOpen: boolean;
  isLive: boolean;
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'rageRound':
      return { text: 'Rage round', icon: Flame, rage: true };
    case 'round':
      return { text: 'Live round', icon: Mic, rage: false };
    case 'finished':
      return { text: 'Voting', icon: Mic, rage: false };
    default:
      return { text: 'Starting', icon: Mic, rage: false };
  }
}

function BattleCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const status = phaseLabel(room.phase);
  const StatusIcon = status.icon;

  return (
    <div
      onClick={onClick}
      className="group relative bg-panel border border-white/[0.07] hover:border-brand/50 rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between mb-3.5">
        {room.isOpen ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-light bg-brand/[0.12] px-2.5 py-1 rounded-md">
            Open challenge
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md ${
              status.rage
                ? 'text-rage-light bg-rage/[0.14]'
                : 'text-brand-light bg-brand/[0.14]'
            }`}
          >
            <StatusIcon size={13} />
            {status.text}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <Eye size={15} />
          {room.viewers}
        </span>
      </div>

      <h3 className="text-base font-semibold leading-snug mb-4 group-hover:text-brand-light transition-colors">
        {room.topic}
      </h3>

      {room.isOpen ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-fg-faint">Waiting for an opponent</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-brand-ink bg-brand px-3.5 py-2 rounded-lg glow-brand">
            Accept <Swords size={15} />
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="flex-1 text-center text-xs font-semibold text-sidea-light bg-sidea/10 border border-sidea/25 py-2 rounded-lg truncate px-2">
            {room.labelA}
          </span>
          <span className="text-[11px] font-bold text-fg-faint">VS</span>
          <span className="flex-1 text-center text-xs font-semibold text-sideb-light bg-sideb/10 border border-sideb/25 py-2 rounded-lg truncate px-2">
            {room.labelB}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Lobby() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const API_URL =
          typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? 'https://shoom.fun'
            : 'http://localhost:3001';

        const res = await fetch(`${API_URL}/api/rooms`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (res.ok) {
          const data = await res.json();
          setRooms(data);
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };

    fetchRooms();
    const intervalId = setInterval(fetchRooms, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const openRooms = rooms.filter((r) => r.isOpen);
  const liveRooms = rooms.filter((r) => r.isLive);

  return (
    <div className="min-h-screen bg-ink text-fg font-sans selection:bg-brand/30 overflow-x-hidden">
      {/* Navbar */}
      <div className="fixed top-0 w-full px-4 md:px-6 py-4 flex justify-between items-center bg-ink/70 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center glow-brand">
            <Zap className="text-brand-ink fill-brand-ink" size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight">Shoom</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="text-sm text-fg-muted hover:text-fg transition-colors">How it works</a>
          <a href="#" className="text-sm font-medium text-fg border border-white/15 px-3.5 py-1.5 rounded-lg hover:border-white/30 transition-colors">Sign in</a>
        </div>
      </div>

      {/* Hero */}
      <div className="relative pt-32 pb-14 px-6 flex flex-col items-center text-center">
        <p className="text-[11px] text-brand-light uppercase tracking-[0.18em] mb-3.5 font-medium">
          The arena is open
        </p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-4">
          Settle it <span className="text-brand-light text-glow-brand">live.</span>
        </h1>
        <p className="text-fg-muted text-base md:text-lg max-w-xl mb-9 leading-relaxed">
          Pick a topic, call out an opponent, and let the crowd decide who wins. Real-time video debates, one round at a time.
        </p>

        <div className="w-full max-w-lg bg-panel border border-white/10 rounded-2xl p-1.5 pl-5 flex items-center gap-2">
          <span className="flex-1 text-left text-sm md:text-base text-fg-faint">
            What&apos;s the debate?
          </span>
          <button
            onClick={() => router.push('/create')}
            className="inline-flex items-center gap-2 bg-brand text-brand-ink px-5 py-3 rounded-xl font-semibold text-sm md:text-base transition-all hover:scale-[1.03] glow-brand"
          >
            Create battle
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Lists */}
      <div className="px-6 pb-20">
        <div className="max-w-5xl mx-auto space-y-12">
          {liveRooms.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl md:text-2xl font-semibold">Live now</h2>
                <span className="text-[11px] uppercase tracking-wider text-fg-muted flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand glow-brand" />
                  {liveRooms.length} battles online
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveRooms.map((room) => (
                  <BattleCard key={room.id} room={room} onClick={() => router.push(`/room/${room.id}`)} />
                ))}
              </div>
            </section>
          )}

          {openRooms.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl md:text-2xl font-semibold">Open challenges</h2>
                <span className="text-[11px] uppercase tracking-wider text-fg-muted">
                  {openRooms.length} waiting
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openRooms.map((room) => (
                  <BattleCard key={room.id} room={room} onClick={() => router.push(`/room/${room.id}`)} />
                ))}
              </div>
            </section>
          )}

          {rooms.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-panel border border-white/[0.07] mb-4">
                <Swords className="text-fg-faint" size={24} />
              </div>
              <p className="text-fg-muted">No battles yet. Be the first to start one.</p>
              <button
                onClick={() => router.push('/create')}
                className="mt-5 inline-flex items-center gap-2 bg-brand text-brand-ink px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.03] glow-brand"
              >
                Create battle <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="py-8 text-center text-fg-faint text-sm border-t border-white/5">
        Built for glory · Shoom © 2026
      </div>
    </div>
  );
}
