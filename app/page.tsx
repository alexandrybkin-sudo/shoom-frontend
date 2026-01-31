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
      <header className="fixed top-0 w-full p-4 md:p-6 flex justify-between items-center bg-black/50 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            <Zap className="text-white fill-white" size={20} />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter">SHOOM</span>
        </div>
        <div className="flex gap-4">
           <a href="#" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Login</a>
           <a href="#" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">About</a>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4 md:px-0 max-w-6xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-24 space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            The Arena is Open
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9]">
            Make Some <br className="md:hidden"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">NOISE.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed">
            Create a topic, invite an opponent, and let the crowd decide who wins. 
            Real-time video debates with cash prizes.
          </p>
          
          {/* Create Input */}
          <div className="max-w-xl mx-auto relative group mt-10">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-orange-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative flex bg-slate-950 rounded-xl p-2 border border-white/10 shadow-2xl">
              <input 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter debate topic (e.g. Earth is Flat)..." 
                className="flex-1 bg-transparent px-4 py-3 md:py-4 text-white placeholder:text-slate-600 focus:outline-none font-bold text-base md:text-lg"
              />
              <button 
                onClick={createRoom}
                className="bg-white text-black px-6 md:px-8 py-2 rounded-lg font-black hover:bg-slate-200 transition-colors flex items-center gap-2 active:scale-95 whitespace-nowrap"
              >
                <Plus size={20} strokeWidth={3} />
                <span className="hidden md:inline">CREATE BATTLE</span>
                <span className="md:hidden">GO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live List */}
        <div>
          <div className="flex items-center justify-between mb-8 px-2 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Flame className="text-red-500 animate-pulse fill-red-500/20" size={28} />
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Live Now</h2>
            </div>
            <span className="flex items-center gap-2 text-[10px] font-bold bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20 animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full"/> 4 BATTLES ONLINE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeDebates.map((room) => (
              <div 
                key={room.id}
                onClick={() => router.push(`/room/${room.id}`)}
                className="group relative bg-slate-900/40 border border-white/5 hover:border-red-500/50 rounded-3xl p-6 cursor-pointer hover:bg-slate-900/80 transition-all hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-red-500/0 to-red-500/0 group-hover:to-red-500/10 transition-all duration-500"/>

                <div className="flex justify-between items-start mb-12 relative z-10">
                  <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border ${
                    room.status === 'RAGE' ? 'bg-red-500 text-white border-red-500 shadow-[0_0_10px_red]' : 
                    room.status === 'VOTING' ? 'bg-yellow-500 text-black border-yellow-500' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {room.status}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold bg-black/30 px-2 py-1 rounded-full border border-white/5">
                    <Users size={12} />
                    {room.viewers}
                  </div>
                </div>
                
                <h3 className="font-black text-3xl leading-none mb-2 group-hover:text-red-500 transition-colors relative z-10 line-clamp-2">
                  {room.title}
                </h3>
                
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0 duration-300">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <ArrowRight className="text-black" size={20} />
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center">
         <div className="flex justify-center gap-6 mb-8 opacity-50">
            <Github className="hover:text-white cursor-pointer transition-colors" />
            <Twitter className="hover:text-white cursor-pointer transition-colors" />
         </div>
         <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
            Built for glory • Shoom © 2026
         </p>
      </footer>
    </div>
  );
}
