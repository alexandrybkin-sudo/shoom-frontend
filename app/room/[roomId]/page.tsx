'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { LiveKitRoom, VideoConference, GridLayout, ParticipantTile, RoomAudioRenderer, useParticipants } from '@livekit/components-react';
import '@livekit/components-styles';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

interface ServerState {
  phase: string;
  timer: number;
  redReady: boolean;
  blueReady: boolean;
  votes: { red: number; blue: number };
}

export default function DebateRoom() {
  const router = useRouter();
  const [role, setRole] = useState<'viewer' | 'debater'>('viewer');
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [serverState, setServerState] = useState<ServerState>({
    phase: 'waiting',
    timer: 0,
    redReady: false,
    blueReady: false,
    votes: { red: 0, blue: 0 }
  });
  const socketRef = useRef<any>(null);

  const getApiUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:4000';
    return window.location.hostname === 'localhost'
      ? 'http://localhost:4000'
      : 'https://shoom.fun';
  };

  const fetchToken = async () => {
    try {
      setToken('');
      const API_URL = getApiUrl();
      const participantName = `${role}-${Math.random().toString(36).substring(7)}`;
      const lkRole = role === 'debater' ? 'debater' : 'viewer';
      const res = await fetch(`${API_URL}/api/token?roomName=debate-room&participantName=${participantName}&role=${lkRole}`);
      
      if (!res.ok) throw new Error('Failed to fetch token');
      const data = await res.json();
      setToken(data.token);
    } catch (err) {
      console.error('Error fetching token:', err);
    }
  };

  useEffect(() => {
    fetchToken();
  }, [role]);

  useEffect(() => {
    if (socketRef.current) return;
    
    const API_URL = getApiUrl();
    console.log('Connecting to socket:', API_URL);
    
    const socket = io(API_URL, { 
      transports: ['websocket', 'polling'],
      query: { roomId: 'debate-room' },
      withCredentials: true,
      reconnection: true
    });
    
    socketRef.current = socket;

    socket.on('connect', () => console.log('✅ SOCKET CONNECTED:', socket.id));
    socket.on('connect_error', (err) => console.error('❌ SOCKET ERROR:', err));
    socket.on('disconnect', (reason) => console.log('⚠️ SOCKET DISCONNECTED:', reason));

    socket.on('state_update', setServerState);
    
    socket.on('chat_update', (newMsg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!inputMsg.trim() || !socketRef.current) return;
    socketRef.current.emit('chat_message', { text: inputMsg });
    setInputMsg('');
  };

  const handleVote = (side: 'red' | 'blue') => {
    if (socketRef.current) {
      socketRef.current.emit('vote', { side });
    }
  };

  const handleReady = () => {
    if (socketRef.current) {
      socketRef.current.emit('ready');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Connecting to debate room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white transition"
          >
            ← Back to Lobby
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Phase: <span className="text-white font-bold">{serverState.phase}</span>
            </span>
            <span className="text-sm text-slate-400">
              Timer: <span className="text-white font-bold">{serverState.timer}s</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRole('viewer')}
              className={`px-4 py-2 rounded ${role === 'viewer' ? 'bg-blue-600' : 'bg-slate-800'}`}
            >
              Viewer
            </button>
            <button
              onClick={() => setRole('debater')}
              className={`px-4 py-2 rounded ${role === 'debater' ? 'bg-red-600' : 'bg-slate-800'}`}
            >
              Debater
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Video Area */}
        <div className="lg:col-span-2">
          <LiveKitRoom
            video={role === 'debater'}
            audio={role === 'debater'}
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://shoom-x62b0zzp.livekit.cloud'}
            data-lk-theme="default"
            className="h-[600px] rounded-lg overflow-hidden"
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>

          {/* Voting (only in voting phase) */}
          {serverState.phase === 'voting' && (
            <div className="mt-4 bg-slate-900 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Vote for the Winner</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => handleVote('red')}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-lg font-bold transition"
                >
                  RED ({serverState.votes.red})
                </button>
                <button
                  onClick={() => handleVote('blue')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-4 rounded-lg font-bold transition"
                >
                  BLUE ({serverState.votes.blue})
                </button>
              </div>
            </div>
          )}

          {/* Ready Button (waiting phase) */}
          {serverState.phase === 'waiting' && role === 'debater' && (
            <div className="mt-4">
              <button
                onClick={handleReady}
                className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-lg font-bold transition"
              >
                I'M READY
              </button>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="bg-slate-900 rounded-lg p-4 flex flex-col h-[600px]">
          <h3 className="text-lg font-bold mb-4">Chat</h3>
          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-slate-800 p-2 rounded">
                <div className="text-xs text-slate-400">{msg.user}</div>
                <div className="text-sm">{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-slate-800 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={sendMessage}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
