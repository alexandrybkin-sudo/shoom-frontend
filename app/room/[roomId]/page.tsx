'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Play, SkipForward, RotateCcw } from 'lucide-react';
import {
  LiveKitRoom,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';

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

function getApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shoom.fun';
}

// --- Custom Smart View ---
// --- Custom Smart View ---
function DualSpeakerView({ activePlayer }: { activePlayer: 'A' | 'B' | null }) {
  const tracks = useTracks([Track.Source.Camera]);
  // Логируем треки для отладки
  console.log("🎥 Tracks:", tracks);

  const trackA = tracks[0];
  const trackB = tracks[1];

  return (
    // FIX: Убрали min-h-[50vh], добавили h-full w-full и flex-grow
    <div className="flex flex-col md:flex-row w-full h-full bg-black gap-1 p-1">
      
      {/* ИГРОК A (RED) */}
      <div className={`flex-1 relative rounded-lg overflow-hidden border-4 ${activePlayer === 'A' ? 'border-red-500 ring-4 ring-red-500/50' : 'border-transparent'} transition-all min-h-0`}>
        {trackA ? (
          <ParticipantTile trackRef={trackA} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-center p-4">
            <div className="animate-pulse text-red-500 mb-2">●</div>
            <span className="text-slate-500 text-sm md:text-lg font-mono">Waiting Red...</span>
          </div>
        )}
        {trackA && (
           <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-xs rounded truncate max-w-[80%]">
             {trackA.participant.identity}
           </div>
        )}
        <div className="absolute bottom-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase">Red</div>
      </div>

      {/* ИГРОК B (BLUE) */}
      <div className={`flex-1 relative rounded-lg overflow-hidden border-4 ${activePlayer === 'B' ? 'border-blue-500 ring-4 ring-blue-500/50' : 'border-transparent'} transition-all min-h-0`}>
        {trackB ? (
          <ParticipantTile trackRef={trackB} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-center p-4">
            <div className="animate-pulse text-blue-500 mb-2">●</div>
            <span className="text-slate-500 text-sm md:text-lg font-mono">Waiting Blue...</span>
          </div>
        )}
        {trackB && (
           <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-xs rounded truncate max-w-[80%]">
             {trackB.participant.identity}
           </div>
        )}
        <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase">Blue</div>
      </div>

    </div>
  );
}



function VictoryOverlay({ phase, onVote, onClose, isVisible }: { phase: Phase; onVote: (team: 'A' | 'B') => void; onClose: () => void; isVisible: boolean }) {
  if (!isVisible || (phase !== 'voting' && phase !== 'finished')) return null;

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="text-center px-4">
        <h2 className="text-3xl md:text-6xl font-black uppercase tracking-wider mb-8 md:mb-12 text-white">
          {phase === 'voting' ? 'WHO WON?' : 'WINNER IS...'}
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl md:text-8xl">🔴</div>
            <button onClick={() => onVote('A')} className="px-6 py-2 md:px-10 md:py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-sm md:text-2xl uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-900/50">
              Vote Red
            </button>
          </div>
          <div className="text-2xl md:text-5xl font-black text-slate-600 uppercase">VS</div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl md:text-8xl">🔵</div>
            <button onClick={() => onVote('B')} className="px-6 py-2 md:px-10 md:py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-sm md:text-2xl uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/50">
              Vote Blue
            </button>
          </div>
        </div>
        <div className="mt-8 text-slate-400 text-sm md:text-base">
          <span className="text-red-400">50%</span> &nbsp;|&nbsp; <span className="text-blue-400">50%</span>
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
    donations: [],
  });

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setToken('');
        const API_URL = getApiUrl();
        const pathSegments = window.location.pathname.split('/');
        const roomIdFromUrl = pathSegments[pathSegments.length - 1] || 'debate-room';
        
        const participantName = `${role}-${Math.random().toString(36).substring(7)}`;
        const lkRole = role === 'debater' ? 'debater' : 'viewer';
        const res = await fetch(`${API_URL}/api/token?roomName=${roomIdFromUrl}&participantName=${participantName}&role=${lkRole}`);
        const data = await res.json();
        setToken(data.token);
      } catch (error) {
        console.error("Token fetch error:", error);
      }
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

    const API_URL = getApiUrl();
    const pathSegments = window.location.pathname.split('/');
    const roomIdFromUrl = pathSegments[pathSegments.length - 1] || 'debate-room';

    console.log('Connecting to socket:', API_URL);
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      query: { roomId: roomIdFromUrl },
      withCredentials: true,
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => console.log('✅ SOCKET CONNECTED:', socket.id));
    socket.on('connect_error', (err) => console.error('❌ SOCKET ERROR:', err));
    socket.on('disconnect', (reason) => console.log('⚠️ SOCKET DISCONNECTED:', reason));

    socket.on('state_update', setServerState);

    socket.on('chat_update', (newMsg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('reaction_received', (data) => {
      const emoji = data.type === 'heart' ? '❤️' : '💩';
      const id = Date.now() + Math.random();
      setFloatingEmojis((prev) => [...prev, { id, x: Math.random() * 80 + 10, emoji }]);
      setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 2000);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendAdminAction = (action: string) => socketRef.current?.emit('admin_action', { action });

  const sendChatMessage = (text: string, isDonation = false, amount = 0) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send_message', {
      user: role === 'admin' ? 'Admin' : 'Me',
      text,
      isDonation,
      amount,
    });
  };

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    sendChatMessage(input);
    setInput('');
  };

  const handleVote = (team: 'A' | 'B') => {
    sendChatMessage(`/vote ${team}`);
    setShowVoteModal(false);
  };

  const sendReaction = (type: 'heart' | 'poop') => socketRef.current?.emit('send_reaction', { type });

  const sendDonation = () =>
    socketRef.current?.emit('send_message', {
      user: 'Rich Guy',
      text: '$$$',
      isDonation: true,
      amount: 500,
    });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!token)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Loading Room...</p>
        </div>
      </div>
    );

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-black text-white overflow-hidden">
      
      {/* ЛЕВАЯ ЧАСТЬ: ВИДЕО (Занимает все свободное место) */}
      <div className="flex-1 relative flex flex-col min-h-0">
        <LiveKitRoom
          key={token}
          video={role === 'debater'}
          audio={role === 'debater'}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://shoom-1bcua3f5.livekit.cloud'}
          data-lk-theme="default"
          className="h-full w-full flex flex-col"
          onConnected={() => console.log("✅ LiveKit Connected")}
          onDisconnected={() => console.log("❌ LiveKit Disconnected")}
          onError={(err) => console.error("🚨 LiveKit Error:", err)}
        >
          <div className="flex-1 min-h-0 w-full relative">
             <DualSpeakerView activePlayer={serverState.activePlayer} />
             <RoomAudioRenderer />
             
             <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm font-mono font-bold z-10">
                {formatTime(serverState.timeLeft)}
             </div>
             <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase z-10">
                {serverState.phase}
             </div>
             <div className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm font-mono z-10">
                👁️ {serverState.viewersCount}
             </div>

             <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20">
              {(['viewer', 'admin', 'debater'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-2 py-0.5 text-[8px] md:text-[10px] uppercase font-bold rounded ${role === r ? 'bg-blue-600 text-white' : 'bg-black/50 text-slate-400'}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {role === 'admin' && (
              <div className="absolute bottom-2 left-2 flex gap-1 bg-black/80 p-1 rounded-lg z-20">
                <button onClick={() => sendAdminAction('start')} className="p-2 hover:bg-green-600 rounded-lg text-white">
                  <Play size={14} />
                </button>
                <button onClick={() => sendAdminAction('next_round')} className="p-2 hover:bg-blue-600 rounded-lg text-white">
                  <SkipForward size={14} />
                </button>
                <button onClick={() => sendAdminAction('reset')} className="p-2 hover:bg-red-600 rounded-lg text-white">
                  <RotateCcw size={14} />
                </button>
              </div>
            )}
            
            {floatingEmojis.map((emoji) => (
              <div key={emoji.id} className="absolute text-4xl pointer-events-none animate-float-up z-30" style={{ left: `${emoji.x}%`, bottom: '10%' }}>
                {emoji.emoji}
              </div>
            ))}
            <VictoryOverlay phase={serverState.phase} isVisible={showVoteModal} onClose={() => setShowVoteModal(false)} onVote={handleVote} />
          </div>
        </LiveKitRoom>
      </div>

      {/* ПРАВАЯ ЧАСТЬ (или НИЖНЯЯ на мобилках): ЧАТ */}
      <div className="h-[35vh] md:h-full w-full md:w-80 flex flex-col bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 shadow-xl z-40">
        <div className="p-2 md:p-3 border-b border-slate-800 font-bold text-xs md:text-sm flex justify-between items-center bg-slate-900/90 backdrop-blur">
          <span>Live Chat</span>
          <span className="text-[10px] text-slate-500">v1.0</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-700">
          {messages.map((msg, idx) => (
            <div key={idx} className="text-xs bg-slate-800/50 p-1.5 md:p-2 rounded animate-fade-in break-words">
              <span className="font-bold text-blue-400">{msg.user}:</span> &nbsp;
              <span className="text-slate-200">{msg.text}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {role === 'viewer' && (
          <div className="p-2 flex justify-center gap-4 border-t border-slate-800 bg-slate-900">
            <button onClick={() => sendReaction('heart')} className="text-xl hover:scale-125 transition-transform">
              ❤️
            </button>
            <button onClick={() => sendReaction('poop')} className="text-xl hover:scale-125 transition-transform">
              💩
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="p-2 md:p-3 flex gap-2 border-t border-slate-800 bg-slate-900">
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
            placeholder="Send a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="button" onClick={sendDonation} className="text-xl hover:scale-110 transition-transform">
            💰
          </button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}

