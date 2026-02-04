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
function DualSpeakerView({ activePlayer }: { activePlayer: 'A' | 'B' | null }) {
  const tracks = useTracks([Track.Source.Camera]);
  const trackA = tracks[0];
  const trackB = tracks[1];

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-black p-1 gap-1 min-h-[50vh]">
      {/* ИГРОК A (RED) */}
      <div className={`flex-1 relative rounded-lg overflow-hidden border-4 ${activePlayer === 'A' ? 'border-red-500 ring-4 ring-red-500/50' : 'border-transparent opacity-60'} transition-all`}>
        {trackA ? (
          <ParticipantTile trackRef={trackA} className="h-full w-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <span className="text-slate-500 text-lg font-mono">🔴 &nbsp; Waiting Red...</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">Red</div>
      </div>

      {/* ИГРОК B (BLUE) */}
      <div className={`flex-1 relative rounded-lg overflow-hidden border-4 ${activePlayer === 'B' ? 'border-blue-500 ring-4 ring-blue-500/50' : 'border-transparent opacity-60'} transition-all`}>
        {trackB ? (
          <ParticipantTile trackRef={trackB} className="h-full w-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <span className="text-slate-500 text-lg font-mono">🔵 &nbsp; Waiting Blue...</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">Blue</div>
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
        // Используем roomId из URL, если он есть, иначе дефолт 'debate-room'
        // Тут берем pathname, так как нет params в client component напрямую без хуков
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
    <div className="max-h-[100dvh] overflow-hidden flex flex-col bg-black text-white">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <LiveKitRoom
            key={token} // Пересоздаем комнату при смене токена (роли)
            video={role === 'debater'}
            audio={role === 'debater'}
            token={token}
            // ХАРДКОД URL ДЛЯ СТАБИЛЬНОСТИ
            serverUrl="wss://shoom-1bcua3f5.livekit.cloud"
            data-lk-theme="default"
            className="h-full"
            onConnected={() => console.log("✅ LiveKit Connected")}
            onDisconnected={() => console.log("❌ LiveKit Disconnected")}
            onError={(err) => console.error("🚨 LiveKit Error:", err)}
          >
            <DualSpeakerView activePlayer={serverState.activePlayer} />
            <RoomAudioRenderer />
          </LiveKitRoom>

          <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm font-mono font-bold">
            {formatTime(serverState.timeLeft)}
          </div>
          <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase">
            {serverState.phase}
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm font-mono">
            👁️ {serverState.viewersCount}
          </div>

          {floatingEmojis.map((emoji) => (
            <div key={emoji.id} className="absolute text-4xl pointer-events-none animate-float-up" style={{ left: `${emoji.x}%`, bottom: '10%' }}>
              {emoji.emoji}
            </div>
          ))}

          {role === 'admin' && (
            <div className="absolute bottom-2 left-2 flex gap-1 bg-black/80 p-1 rounded-lg">
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

          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex gap-1">
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

          <VictoryOverlay phase={serverState.phase} isVisible={showVoteModal} onClose={() => setShowVoteModal(false)} onVote={handleVote} />
        </div>

        <div className="w-full md:w-80 flex flex-col overflow-hidden bg-slate-900">
          <div className="p-3 border-b border-slate-800 font-bold text-sm">Live Chat</div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {messages.map((msg, idx) => (
              <div key={idx} className="text-xs bg-slate-800 p-2 rounded animate-fade-in">
                <span className="font-bold text-blue-400">{msg.user}:</span> &nbsp;
                <span className="text-white">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {role === 'viewer' && (
            <div className="p-2 flex gap-2 border-t border-slate-800">
              <button onClick={() => sendReaction('heart')} className="text-xl p-2 bg-slate-800 rounded-full active:scale-90 transition-transform">
                ❤️
              </button>
              <button onClick={() => sendReaction('poop')} className="text-xl p-2 bg-slate-800 rounded-full active:scale-90 transition-transform">
                💩
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className="p-3 flex gap-2 border-t border-slate-800">
            <input
              className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Chat..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="button" onClick={sendDonation} className="text-2xl hover:scale-110 transition-transform">
              💰
            </button>
          </form>
        </div>
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
      `}</style>
    </div>
  );
}
