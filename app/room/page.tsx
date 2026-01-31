'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Play, SkipForward, RotateCcw, PlayCircle, X } from 'lucide-react';
import {
  LiveKitRoom,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';

// --- Types ---
type Phase = 'waiting' | 'intro' | 'roundA' | 'roundB' | 'ad' | 'voting' | 'rage' | 'finished';
type Role = 'viewer' | 'admin' | 'debater';

interface Message {
  id: string;
  user: string;
  text: string;
  isDonation: boolean;
  amount?: number;
}

interface FloatingEmoji {
  id: number;
  x: number;
  emoji: string;
}

interface ServerState {
  phase: Phase;
  timeLeft: number;
  activePlayer: 'A' | 'B' | null;
  viewersCount: number;
  chatMessages: Message[];
  donations: { user: string; amount: number }[];
}

// --- Custom Smart View ---
function DualSpeakerView({ activePlayer }: { activePlayer: 'A' | 'B' | null }) {
  const tracks = useTracks([Track.Source.Camera]);
  const trackA = tracks[0];
  const trackB = tracks[1];

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-black p-1 gap-1">
      {/* Speaker A */}
      <div className={`
        relative flex flex-col justify-center bg-slate-900 rounded-xl overflow-hidden border-2 border-red-900/50 transition-all duration-500 ease-in-out
        ${activePlayer === 'A' ? 'flex-[1.5] border-red-500 shadow-red-900/20 z-10' : 'flex-1'}
      `}>
        {trackA ? (
          <ParticipantTile trackRef={trackA} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-700">
            <span className="text-2xl md:text-4xl animate-pulse">🔴</span>
            <span className="text-[10px] font-bold uppercase mt-2">Waiting Red...</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-white uppercase">Red</div>
      </div>

      {/* Speaker B */}
      <div className={`
        relative flex flex-col justify-center bg-slate-900 rounded-xl overflow-hidden border-2 border-blue-900/50 transition-all duration-500 ease-in-out
        ${activePlayer === 'B' ? 'flex-[1.5] border-blue-500 shadow-blue-900/20 z-10' : 'flex-1'}
      `}>
        {trackB ? (
          <ParticipantTile trackRef={trackB} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-700">
            <span className="text-2xl md:text-4xl animate-pulse">🔵</span>
            <span className="text-[10px] font-bold uppercase mt-2">Waiting Blue...</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-blue-600 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-white uppercase">Blue</div>
      </div>
    </div>
  );
}

function VictoryOverlay({ phase, onVote, onClose, isVisible }: { phase: Phase, onVote: (team: 'A' | 'B') => void, onClose: () => void, isVisible: boolean }) {
  if (!isVisible || (phase !== 'voting' && phase !== 'finished')) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
       <button 
         onClick={onClose}
         className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-50 cursor-pointer"
       >
         <X size={32} />
       </button>

       <div className="flex flex-col items-center w-full max-w-4xl">
          <h1 className="text-5xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] mb-8 text-center transform -skew-x-6">
             {phase === 'voting' ? 'WHO WON?' : 'WINNER IS...'}
          </h1>

          <div className="flex flex-row items-center justify-center gap-4 md:gap-16 w-full mb-8">
             <div className="flex flex-col items-center gap-4 group">
               <div className="w-24 h-24 md:w-56 md:h-56 bg-black rounded-2xl md:rounded-3xl shadow-[0_0_30px_rgba(220,38,38,0.5)] border-2 md:border-4 border-red-500 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-600/20 group-hover:bg-red-600/30 transition-colors"/>
                  <span className="text-4xl md:text-8xl relative z-10">🔴</span>
               </div>
               <button onClick={() => onVote('A')} className="px-6 py-2 md:px-10 md:py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-sm md:text-2xl uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-900/50">
                 Vote Red
               </button>
             </div>
             <div className="text-4xl md:text-8xl font-black text-white/20 italic select-none">VS</div>
             <div className="flex flex-col items-center gap-4 group">
               <div className="w-24 h-24 md:w-56 md:h-56 bg-black rounded-2xl md:rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.5)] border-2 md:border-4 border-blue-500 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-600/20 group-hover:bg-blue-600/30 transition-colors"/>
                  <span className="text-4xl md:text-8xl relative z-10">🔵</span>
               </div>
               <button onClick={() => onVote('B')} className="px-6 py-2 md:px-10 md:py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-sm md:text-2xl uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/50">
                 Vote Blue
               </button>
             </div>
          </div>

          <div className="w-full max-w-lg h-4 md:h-6 bg-slate-900/80 rounded-full overflow-hidden flex border border-white/10 relative">
             <div className="absolute inset-0 flex items-center justify-center z-10 gap-12 md:gap-20">
                <span className="text-[10px] md:text-xs font-bold text-white shadow-black drop-shadow-md">50%</span>
                <span className="text-[10px] md:text-xs font-bold text-white shadow-black drop-shadow-md">50%</span>
             </div>
             <div className="h-full bg-red-600/80" style={{ width: '50%' }} />
             <div className="h-full bg-blue-600/80" style={{ width: '50%' }} />
          </div>
       </div>
    </div>
  );
}

export default function DebateRoom() {
  const [role, setRole] = useState<Role>('viewer');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [token, setToken] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  
  const [serverState, setServerState] = useState<ServerState>({
    phase: 'waiting',
    timeLeft: 0,
    activePlayer: null,
    viewersCount: 0,
    chatMessages: [],
    donations: []
  });

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setToken('');
        const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
        const participantName = `${role}-${Math.random().toString(36).substring(7)}`;
        const lkRole = role === 'debater' ? 'debater' : 'viewer';
        const res = await fetch(`${API_URL}/api/token?roomName=debate-room&participantName=${participantName}&role=${lkRole}`);
        const data = await res.json();
        setToken(data.token);
      } catch (error) { console.error(error); }
    };
    fetchToken();
  }, [role]);

  useEffect(() => {
    if (serverState.phase === 'voting' || serverState.phase === 'finished') {
      setShowVoteModal(true);
    } else {
      setShowVoteModal(false);
    }
  }, [serverState.phase]);

  useEffect(() => {
    if (socketRef.current) return;
    const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const socket = io(API_URL, { 
      transports: ['websocket', 'polling'],
      query: { roomId: 'debate-room' }
    });
    socketRef.current = socket;

    socket.on('state_update', setServerState);
    socket.on('chat_update', (newMsg: Message) => {
      setMessages(prev => { if (prev.some(m => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    socket.on('reaction_received', (data) => {
      const emoji = data.type === 'heart' ? '❤️' : '💩';
      const id = Date.now() + Math.random();
      setFloatingEmojis(prev => [...prev, { id, x: Math.random() * 80 + 10, emoji }]);
      setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2000);
    });
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, []);

  const sendAdminAction = (action: string) => socketRef.current?.emit('admin_action', { action });
  const sendChatMessage = (text: string, isDonation = false, amount = 0) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send_message', { user: role === 'admin' ? 'Admin' : 'Me', text, isDonation, amount });
  };
  const sendMessage = (e?: React.FormEvent) => { e?.preventDefault(); if (!input.trim()) return; sendChatMessage(input); setInput(''); };
  const handleVote = (team: 'A' | 'B') => { sendChatMessage(`/vote ${team}`); setShowVoteModal(false); };
  const sendReaction = (type: 'heart' | 'poop') => socketRef.current?.emit('send_reaction', { type });
  const sendDonation = () => socketRef.current?.emit('send_message', { user: 'Rich Guy', text: '$$$', isDonation: true, amount: 500 });
  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s < 10 ? '0' : ''}${s}`; };

  if (!token) return <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white animate-pulse">Loading Room...</div>;

  return (
    // FIX: max-h-[100dvh] and overflow-hidden prevent body scroll
    <div className="h-[100dvh] max-h-[100dvh] w-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_350px]">
      <LiveKitRoom
        key={role}
        video={role === 'debater'}
        audio={role === 'debater'}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://shoom-1bcua3f5.livekit.cloud"}
        connect={true}
        options={{ publishDefaults: { simulcast: true }, adaptiveStream: true }}
        data-lk-theme="default"
        className="contents" 
      >
        
        {/* === AREA 1: VIDEO === */}
        <div className="relative h-[60%] md:h-full w-full bg-black flex flex-col overflow-hidden">
          <DualSpeakerView activePlayer={serverState.activePlayer} />

          {/* Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
              <div className={`text-4xl md:text-6xl font-black font-mono tabular-nums tracking-tighter drop-shadow-lg ${serverState.timeLeft <= 10 && serverState.phase !== 'waiting' ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatTime(serverState.timeLeft)}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 bg-black/50 px-2 rounded backdrop-blur-sm border border-white/5">
                {serverState.phase}
              </div>
            </div>
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/30 backdrop-blur px-2 py-1 rounded-full border border-white/5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
              <span className="text-[10px] font-bold text-slate-200">{serverState.viewersCount}</span>
            </div>
            {floatingEmojis.map(emoji => (
              <div key={emoji.id} className="absolute text-4xl animate-float-up opacity-0" style={{ left: `${emoji.x}%`, bottom: '20%' }}>{emoji.emoji}</div>
            ))}
          </div>

          {/* Admin Controls */}
          {role === 'admin' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 bg-black/80 p-1.5 rounded-xl border border-white/10 pointer-events-auto">
              <button onClick={() => sendAdminAction('start')} className="p-2 hover:bg-green-600 rounded-lg text-white"><PlayCircle size={20}/></button>
              <button onClick={() => sendAdminAction('next_round')} className="p-2 hover:bg-blue-600 rounded-lg text-white"><SkipForward size={20}/></button>
              <button onClick={() => sendAdminAction('reset')} className="p-2 hover:bg-red-600 rounded-lg text-white"><RotateCcw size={20}/></button>
            </div>
          )}

           {/* Role Switcher */}
           <div className="absolute top-4 right-4 z-50 pointer-events-auto flex gap-1">
            {(['viewer', 'admin', 'debater'] as Role[]).map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`px-2 py-0.5 text-[8px] md:text-[10px] uppercase font-bold rounded ${role === r ? 'bg-blue-600 text-white' : 'bg-black/50 text-slate-400'}`}>
                {r}
              </button>
            ))}
          </div>
          <VictoryOverlay phase={serverState.phase} isVisible={showVoteModal} onClose={() => setShowVoteModal(false)} onVote={handleVote} />
        </div>

        {/* === AREA 2: CHAT === */}
        {/* FIX: overflow-hidden on parent column ensures children don't push size */}
        <div className="flex-1 h-[40%] md:h-full w-full bg-slate-950 flex flex-col border-t md:border-t-0 md:border-l border-slate-800 z-10 overflow-hidden">
          <div className="hidden md:flex p-3 border-b border-slate-800 justify-between items-center bg-slate-900 shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase">Live Chat</span>
          </div>

          {/* FIX: min-h-0 allows flex child to shrink and scroll */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-800 w-full min-h-0">
             {messages.map((msg, idx) => (
               <div key={idx} className={`flex items-start gap-2 text-xs md:text-sm animate-fade-in w-full ${msg.isDonation ? 'bg-yellow-500/10 p-2 rounded border border-yellow-500/20' : ''}`}>
                 <span className={`font-bold shrink-0 ${msg.user === 'Admin' ? 'text-red-400' : 'text-blue-400'}`}>{msg.user}:</span>
                 <span className={`text-slate-300 min-w-0 break-all whitespace-pre-wrap w-full ${msg.isDonation ? 'text-yellow-100 font-medium' : ''}`}>
                    {msg.text}
                 </span>
               </div>
             ))}
             <div ref={chatEndRef} />
          </div>

          <div className="p-2 md:p-4 bg-slate-900 border-t border-slate-800 shrink-0">
            {role === 'viewer' && (
              <div className="flex justify-center gap-6 mb-2 md:hidden">
                 <button onClick={() => sendReaction('heart')} className="text-xl p-2 bg-slate-800 rounded-full active:scale-90 transition-transform">❤️</button>
                 <button onClick={() => sendReaction('poop')} className="text-xl p-2 bg-slate-800 rounded-full active:scale-90 transition-transform">💩</button>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex gap-2">
              <input 
                className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Chat..."
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button type="button" onClick={sendDonation} className="p-2 bg-yellow-600/20 text-yellow-500 rounded-full border border-yellow-600/50">💰</button>
            </form>
          </div>
        </div>

        <RoomAudioRenderer />
        <style jsx global>{`
          @keyframes float-up { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-100px); opacity: 0; } }
          @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
          .animate-float-up { animation: float-up 1.5s ease-out forwards; }
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        `}</style>
      </LiveKitRoom>
    </div>
  );
}
