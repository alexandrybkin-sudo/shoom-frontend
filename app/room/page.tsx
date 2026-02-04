'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Users, Zap, Plus, ArrowRight, Github, Twitter } from 'lucide-react';

export default function Lobby() {
  const router = useRouter();
  const [topic, setTopic] = useState('');

  const createRoom = () => {
    if (!topic.trim()) return;
    // Генерируем ID: "Elon Musk vs Mark" -> "elon-musk-vs-mark"
    const roomId = topic.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .slice(0, 50);

    if (roomId) {
      router.push(`/room/${roomId}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') createRoom();
  };

  // Mock Data (в будущем заменим на fetch('/api/rooms'))
  const activeDebates = [
    { id: 'ai-art', title: 'AI Art: Theft or Progress?', viewers: 1205, status: 'RAGE' },
    { id: 'vim-vscode', title: 'Vim vs VS Code', viewers: 892, status: 'ROUND 2' },
    { id: 'crypto', title: 'Crypto is a Scam', viewers: 450, status: 'VOTING' },
    { id: 'pineapple', title: 'Pineapple on Pizza', viewers: 120, status: 'WAITING' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-red-500/30 overflow-x-hidden">
      {/* Navbar */}
      <div className="fixed top-0 w-full p-4 md:p-6 flex justify-between items-center bg-black/50 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(220,38,38,0.5)]" onClick={() => window.location.reload()}>
          <Flame className="text-white fill-white" size={20} />
        </div>
        <span className="text-xl md:text-2xl font-black tracking-tighter">SHOOM</span>
        <div className="flex gap-4">
          <a href="#" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Login</a>
          <a href="#" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">About</a>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative pt-32 pb-16 px-6 flex flex-col items-center text-center">
        <p className="text-xs md:text-sm text-slate-500 uppercase tracking-widest mb-4 font-bold">The Arena is Open</p>
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight mb-6">
          Make Some <br/>
          <span className="text-red-500 relative inline-block">
            NOISE.
          </span>
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mb-12 leading-relaxed">
          Create a topic, invite an opponent, and let the crowd decide who wins. Real-time video debates with cash prizes.
        </p>

        {/* Create Input */}
        <div className="w-full max-w-3xl bg-slate-900/50 border border-white/10 rounded-full p-2 flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter debate topic (e.g. Earth is Flat)..."
            className="flex-1 bg-transparent px-4 py-3 md:py-4 text-white placeholder:text-slate-600 focus:outline-none font-bold text-base md:text-lg"
          />
          <button
            onClick={createRoom}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-black text-sm md:text-base uppercase tracking-wide transition-all hover:scale-105 flex items-center gap-2"
          >
            CREATE BATTLE
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Live List */}
      <div className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black">Live Now</h2>
            <span className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Zap className="text-red-500 fill-red-500" size={16} />
              4 BATTLES ONLINE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeDebates.map((room) => (
              <div
                key={room.id}
                onClick={() => router.push(`/room/${room.id}`)}
                className="group relative bg-slate-900/40 border border-white/5 hover:border-red-500/50 rounded-3xl p-6 cursor-pointer hover:bg-slate-900/80 transition-all hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-red-600/20 text-red-400 text-xs font-bold rounded-full uppercase tracking-wide">
                    {room.status}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 text-sm">
                    <Users size={14} />
                    {room.viewers}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-4 group-hover:text-red-400 transition-colors">
                  {room.title}
                </h3>

                <div className="flex items-center gap-2 text-slate-500 text-sm font-bold group-hover:text-white transition-colors">
                  WATCH LIVE
                  <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center text-slate-600 text-sm border-t border-white/5">
        Built for glory • Shoom © 2026
      </div>
    </div>
  );
}
