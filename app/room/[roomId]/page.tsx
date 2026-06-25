'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Eye, Mic, MicOff, Flame, Coins, Heart, Plus } from 'lucide-react';
import {
  LiveKitRoom,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomOptions, VideoPresets } from 'livekit-client';
import { useT, LanguageSwitcher } from '../../i18n';
import { ReactionIcon, REACTIONS } from '../../components/ReactionIcon';

type Phase = 'waiting' | 'coinflip' | 'round' | 'rageRound' | 'finished';
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
  type: string;
}

interface ServerState {
  phase: Phase;
  currentRound: number;
  roundsTotal: number;
  activeSpeaker: 'A' | 'B' | null;
  rageRoundEndsAt: number | null;
  roundEndsAt: number | null;
  timeLeft: number;
  viewersCount: number;
  chatMessages: Message[];
  donations: { user: string; amount: number }[];
  topic?: string;
  labelA?: string;
  labelB?: string;
  matchId?: string | null;
  coinFlipResult?: 'A' | 'B' | null;
  coinFlipEndsAt?: number | null;
  voteWindowEndsAt?: number | null;
  voteShareA?: number;
  voteShareB?: number;
  voteVoters?: number;
  verdict?: {
    winnerSide: 'A' | 'B' | 'tie';
    finalShareA: number;
    finalShareB: number;
    swingWinner: 'A' | 'B' | 'none';
    swingPct: number;
    totalVoters: number;
  } | null;
}

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

function SpeakerTile({
  trackRef,
  side,
  label,
  active,
}: {
  trackRef: any;
  side: 'A' | 'B';
  label: string;
  active: boolean;
}) {
  const { t } = useT();
  const isA = side === 'A';
  const ring = active
    ? isA
      ? 'border-sidea glow-sidea'
      : 'border-sideb glow-sideb'
    : 'border-transparent';
  const tagBg = isA ? 'bg-sidea text-brand-ink' : 'bg-sideb text-brand-ink';
  const dotColor = isA ? 'text-sidea' : 'text-sideb';

  return (
    <div
      className={`flex-1 relative rounded-2xl overflow-hidden border-2 ${ring} transition-all min-h-0 ${
        active ? '' : 'opacity-75'
      }`}
    >
      {trackRef ? (
        <ParticipantTile trackRef={trackRef} className="h-full w-full" />
      ) : (
        <div className="flex flex-col items-center justify-center h-full bg-panel-2 text-center p-4">
          <div className={`animate-pulse ${dotColor} mb-2 text-lg`}>●</div>
          <span className="text-fg-faint text-sm font-medium">
            {t('room.waitingSide', { label })}
          </span>
        </div>
      )}

      {/* Speaking / muted state */}
      {trackRef && (
        <div className="absolute top-2.5 left-2.5">
          {active ? (
            <span className={`inline-flex items-center gap-1.5 ${tagBg} text-[10px] font-bold px-2 py-1 rounded-md`}>
              <Mic size={12} /> {t('room.speaking')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-black/55 text-fg-muted text-[10px] font-medium px-2 py-1 rounded-md">
              <MicOff size={12} /> {t('room.muted')}
            </span>
          )}
        </div>
      )}

      {/* Name + side */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-fg bg-black/55 px-2 py-1 rounded-md">
          {trackRef ? trackRef.participant.identity : label}
        </span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${tagBg}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

function DualSpeakerView({
  activeSpeaker,
  labelA,
  labelB,
}: {
  activeSpeaker: 'A' | 'B' | null;
  labelA: string;
  labelB: string;
}) {
  const tracks = useTracks([Track.Source.Camera]);

  const cameraTracks = tracks
    .filter((t: any) => t.participant && t.participant.identity)
    .sort((a: any, b: any) =>
      a.participant.identity.localeCompare(b.participant.identity)
    );

  const trackA = cameraTracks[0];
  const trackB = cameraTracks[1];

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-ink gap-2 p-2">
      <SpeakerTile trackRef={trackA} side="A" label={labelA} active={activeSpeaker === 'A'} />
      <SpeakerTile trackRef={trackB} side="B" label={labelB} active={activeSpeaker === 'B'} />
    </div>
  );
}

function VerdictOverlay({
  phase,
  isVisible,
  verdict,
  labelA,
  labelB,
}: {
  phase: Phase;
  isVisible: boolean;
  verdict: ServerState['verdict'];
  labelA: string;
  labelB: string;
}) {
  const { t } = useT();
  if (!isVisible || phase !== 'finished') return null;

  const pa = Math.round((verdict?.finalShareA ?? 0.5) * 100);
  const pb = 100 - pa;
  const tie = !verdict || verdict.winnerSide === 'tie';
  const winnerLabel = tie ? t('room.tie') : verdict!.winnerSide === 'A' ? labelA : labelB;
  const winnerColor = tie ? 'text-fg' : verdict!.winnerSide === 'A' ? 'text-sidea-light' : 'text-sideb-light';
  const swingLabel =
    verdict && verdict.swingWinner !== 'none'
      ? verdict.swingWinner === 'A' ? labelA : labelB
      : null;

  return (
    <div className="absolute inset-0 bg-ink/92 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in px-4">
      <div className="text-center w-full max-w-sm">
        <p className="text-[11px] text-brand-light uppercase tracking-[0.18em] mb-3 font-medium">
          {t('room.verdictEyebrow')}
        </p>
        <h2 className={`text-3xl md:text-5xl font-bold tracking-tight mb-1 ${winnerColor}`}>
          {winnerLabel}
        </h2>
        <p className="text-fg-muted text-sm mb-6">{tie ? t('room.roomSplit') : t('room.winsByVolume')}</p>

        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <span className="text-sidea-light">{labelA} {pa}%</span>
          <span className="text-sideb-light">{labelB} {pb}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-sideb">
          <div className="h-full bg-sidea" style={{ width: `${pa}%` }} />
        </div>

        {swingLabel && (
          <div className="mt-6 inline-flex items-center gap-2 bg-rage/[0.12] border border-rage/30 text-rage-light text-sm font-medium px-4 py-2 rounded-xl">
            🔥 {t('room.swingAward')}: <span className="font-semibold">{swingLabel}</span> +{Math.round(verdict!.swingPct * 100)}%
          </div>
        )}

        <p className="mt-6 text-fg-faint text-xs">
          {t('room.votersNote', { n: verdict?.totalVoters ?? 0 })}
        </p>
      </div>
    </div>
  );
}

// Reliably mutes/unmutes the local debater's microphone by turn (server also gates it via permissions).
function MicController({ enabled }: { enabled: boolean }) {
  const { localParticipant } = useLocalParticipant();
  useEffect(() => {
    if (!localParticipant) return;
    localParticipant.setMicrophoneEnabled(enabled).catch(() => {});
  }, [enabled, localParticipant]);
  return null;
}

function CoinFlipOverlay({ result, labelA, labelB }: { result: 'A' | 'B' | null | undefined; labelA: string; labelB: string }) {
  const { t } = useT();
  const [rot, setRot] = useState(0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const blue = result === 'B';
    const target = 360 * 5 + (blue ? 180 : 0);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setRot(target)));
    const tid = setTimeout(() => setLanded(true), 2700);
    return () => { cancelAnimationFrame(raf); clearTimeout(tid); };
  }, [result]);

  const blue = result === 'B';
  const faceBase: React.CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: '9999px',
    WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', padding: '0 10px', textAlign: 'center',
  };

  return (
    <div className="absolute inset-0 bg-ink/92 flex flex-col items-center justify-center z-50 backdrop-blur-sm animate-fade-in px-4">
      <p className="text-[11px] text-brand-light uppercase tracking-[0.18em] mb-6 font-medium">{t('coin.title')}</p>
      <div className="flex items-center gap-4 mb-7">
        <span className={`text-sm font-semibold transition-all ${landed && !blue ? 'text-sidea-light scale-125' : 'text-sidea-light/70'}`}>{labelA}</span>
        <span className="text-[11px] font-bold text-fg-faint">VS</span>
        <span className={`text-sm font-semibold transition-all ${landed && blue ? 'text-sideb-light scale-125' : 'text-sideb-light/70'}`}>{labelB}</span>
      </div>
      <div style={{ perspective: 900, WebkitPerspective: 900, width: 150, height: 150 }}>
        <div
          style={{
            position: 'relative', width: '100%', height: '100%',
            WebkitTransformStyle: 'preserve-3d', transformStyle: 'preserve-3d',
            transition: 'transform 2.6s cubic-bezier(.2,.7,.2,1)',
            WebkitTransform: `rotateY(${rot}deg)`, transform: `rotateY(${rot}deg)`,
          }}
        >
          <div style={{ ...faceBase, background: '#FF4D4D', color: '#2A0808', boxShadow: 'inset 0 0 0 5px rgba(255,255,255,.18), 0 0 32px rgba(255,77,77,.55)' }}>{labelA}</div>
          <div style={{ ...faceBase, background: '#4F8DFF', color: '#0A1A3A', WebkitTransform: 'rotateY(180deg)', transform: 'rotateY(180deg)', boxShadow: 'inset 0 0 0 5px rgba(255,255,255,.18), 0 0 32px rgba(79,141,255,.55)' }}>{labelB}</div>
        </div>
      </div>
      <p className="h-7 mt-7 text-base font-semibold" style={{ color: landed ? (blue ? '#9DC0FF' : '#FF8A8A') : '#9AA0AB' }}>
        {landed ? t('coin.goesFirst', { label: blue ? labelB : labelA }) : '…'}
      </p>
    </div>
  );
}

export default function DebateRoom() {
  const { t } = useT();
  const [uiRole, setUiRole] = useState<Role>('viewer');
  const [lkRole, setLkRole] = useState<'viewer' | 'debater'>('viewer');
  const [mySlot, setMySlot] = useState<'A' | 'B' | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [token, setToken] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [myVote, setMyVote] = useState<'A' | 'B' | null>(null);
  const [voteError, setVoteError] = useState('');
  const [serverState, setServerState] = useState<ServerState>({
    phase: 'waiting',
    currentRound: 0,
    roundsTotal: 0,
    activeSpeaker: null,
    rageRoundEndsAt: null,
    roundEndsAt: null,
    timeLeft: 0,
    viewersCount: 0,
    chatMessages: [],
    donations: [],
    topic: '',
    labelA: 'Red',
    labelB: 'Blue',
  });

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const roomOptions = React.useMemo<RoomOptions>(() => {
    return {
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h720],
      },
    };
  }, []);

  const handleRoleChange = (newRole: Role) => {
    setUiRole(newRole);
    const newLkRole = newRole === 'debater' ? 'debater' : 'viewer';
    if (newLkRole !== lkRole) {
      setLkRole(newLkRole);
    }
  };

  useEffect(() => {
    const initRoom = async () => {
      try {
        const API_URL = getApiUrl();
        const pathSegments = window.location.pathname.split('/');
        const roomIdFromUrl = pathSegments[pathSegments.length - 1] || 'debate-room';
        const identity = getOrCreateSessionIdentity(roomIdFromUrl);

        let role = sessionStorage.getItem(`shoom-role-${roomIdFromUrl}`);
        let slot = sessionStorage.getItem(`shoom-slot-${roomIdFromUrl}`);

        if (!role) {
          const joinRes = await fetch(`${API_URL}/api/rooms/${roomIdFromUrl}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ identity }),
          });
          const data = await joinRes.json();
          role = data.role;
          slot = data.slot;
          sessionStorage.setItem(`shoom-role-${roomIdFromUrl}`, role || 'viewer');
          sessionStorage.setItem(`shoom-slot-${roomIdFromUrl}`, slot || '');
        }

        const lkRoleValue = role === 'debater' ? 'debater' : 'viewer';
        setUiRole(role === 'debater' ? 'debater' : 'viewer');
        setLkRole(lkRoleValue);
        setMySlot((slot as 'A' | 'B') || null);

        const tokenRes = await fetch(
          `${API_URL}/api/token?roomName=${encodeURIComponent(roomIdFromUrl)}&participantName=${encodeURIComponent(identity)}&role=${encodeURIComponent(lkRoleValue)}`
        );
        const tokenData = await tokenRes.json();
        setToken(tokenData.token);
      } catch (error) {
        console.error('initRoom error:', error);
      }
    };
    initRoom();
  }, []);

  useEffect(() => {
    setShowVoteModal(serverState.phase === 'finished');
  }, [serverState.phase]);

  useEffect(() => {
    if (socketRef.current) return;

    const API_URL = getApiUrl();
    const pathSegments = window.location.pathname.split('/');
    const roomIdFromUrl = pathSegments[pathSegments.length - 1] || 'debate-room';
    const identity = getOrCreateSessionIdentity(roomIdFromUrl);

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      query: { roomId: roomIdFromUrl, identity },
      withCredentials: true,
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('state_update', setServerState);
    socket.on('debate-state-updated', setServerState);

    socket.on('chat_update', (newMsg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('reaction_received', (data) => {
      const id = Date.now() + Math.random();
      setFloatingEmojis((prev) => [...prev, { id, x: Math.random() * 80 + 10, type: data.type }]);
      setTimeout(() => setFloatingEmojis((prev) => prev.filter((e) => e.id !== id)), 2000);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendChatMessage = (text: string, isDonation = false, amount = 0) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send_message', {
      user: uiRole === 'admin' ? 'Admin' : 'Me',
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

  // Per-window vote: POST to the match; backend builds the live persuasion bar.
  const castVote = async (side: 'A' | 'B') => {
    const matchId = serverState.matchId;
    if (!matchId) return;
    setMyVote(side); // optimistic
    try {
      const res = await fetch(`${getApiUrl()}/api/matches/${matchId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ side }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMyVote(null);
        if (res.status === 401) setVoteError(t('room.signInToVote'));
        else setVoteError(data.error || t('room.couldNotVote'));
        return;
      }
      setVoteError('');
    } catch {
      setMyVote(null);
    }
  };

  // Reset my pick when a new voting window opens.
  useEffect(() => {
    setMyVote(null);
    setVoteError('');
  }, [serverState.voteWindowEndsAt]);

  const sendReaction = (type: string) =>
    socketRef.current?.emit('send_reaction', { type });

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

  const labelA = serverState.labelA || 'Red';
  const labelB = serverState.labelB || 'Blue';

  if (!token)
    return (
      <div className="flex items-center justify-center h-screen bg-ink text-fg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4" />
          <p className="text-fg-muted">{t('room.loading')}</p>
        </div>
      </div>
    );

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-ink text-fg overflow-hidden">
      <div className="flex-1 relative flex flex-col min-h-0">
        {/* Top bar: topic + sides + viewers */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/5 bg-ink/80 backdrop-blur z-10">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{serverState.topic || t('room.debate')}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-semibold text-sidea-light">{labelA}</span>
              <span className="text-[10px] font-bold text-fg-faint">VS</span>
              <span className="text-[11px] font-semibold text-sideb-light">{labelB}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-fg-muted">
              <Eye size={15} />
              {serverState.viewersCount}
            </span>
            <LanguageSwitcher />
          </div>
        </div>

        <LiveKitRoom
          key={token}
          video={lkRole === 'debater'}
          audio={lkRole === 'debater'}
          token={token}
          connect={!!token}
          options={roomOptions}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
          data-lk-theme="default"
          className="flex-1 min-h-0 w-full flex flex-col"
          onConnected={() => console.log('✅ LiveKit Connected')}
          onDisconnected={() => console.log('❌ LiveKit Disconnected')}
          onError={(err) => console.error('🚨 LiveKit Error:', err)}
        >
          <div className="flex-1 min-h-0 w-full relative">
            <DualSpeakerView activeSpeaker={serverState.activeSpeaker} labelA={labelA} labelB={labelB} />
            <RoomAudioRenderer />
            {lkRole === 'debater' && (
              <MicController
                enabled={
                  serverState.phase === 'rageRound' ||
                  (serverState.phase === 'round' && serverState.activeSpeaker === mySlot)
                }
              />
            )}

            {/* Phase + timer HUD */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2.5 bg-brand/15 border border-brand/40 text-brand-light text-xs font-semibold px-3.5 py-1.5 rounded-xl backdrop-blur glow-brand">
              {serverState.phase === 'rageRound' ? (
                <><Flame size={14} /> {t('room.rageRound')}</>
              ) : serverState.phase === 'round' ? (
                <><Mic size={14} /> {t('room.round', { n: serverState.currentRound, m: serverState.roundsTotal })}</>
              ) : (
                <span className="uppercase">{serverState.phase}</span>
              )}
              <span className="w-px h-3 bg-white/20" />
              <span className="text-fg font-mono tabular-nums">{formatTime(serverState.timeLeft)}</span>
            </div>

            {/* Rage round banner */}
            {serverState.phase === 'rageRound' && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 animate-pulse">
                <div className="text-4xl md:text-5xl font-bold text-rage uppercase tracking-wide drop-shadow-[0_0_18px_rgba(239,159,39,0.7)]">
                  {t('room.rageRound')}
                </div>
              </div>
            )}

            {/* Role switcher (local dev only) */}
            <div className="absolute top-3 left-3 flex gap-1 z-20">
              {typeof window !== 'undefined' &&
                window.location.hostname === 'localhost' &&
                (['viewer', 'admin', 'debater'] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded ${
                      uiRole === r ? 'bg-brand text-brand-ink' : 'bg-black/50 text-fg-muted'
                    }`}
                  >
                    {r}
                  </button>
                ))}
            </div>

            {/* Extra rounds (debater) */}
            {uiRole === 'debater' && (
              <div className="absolute bottom-3 left-3 z-20">
                <button
                  onClick={() => socketRef.current?.emit('request_extra_rounds')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/70 border border-white/15 hover:border-white/30 text-fg text-xs font-medium rounded-lg transition-all"
                >
                  <Plus size={14} /> {t('room.extraRounds')}
                </button>
              </div>
            )}

            {/* Floating reactions */}
            {floatingEmojis.map((emoji) => (
              <div
                key={emoji.id}
                className="absolute pointer-events-none animate-float-up z-30"
                style={{ left: `${emoji.x}%`, bottom: '10%' }}
              >
                <ReactionIcon type={emoji.type} size={42} />
              </div>
            ))}

            {/* Live persuasion bar + per-window voting */}
            {(serverState.phase === 'round' || serverState.phase === 'rageRound') && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(92%,440px)] z-20">
                <div className="bg-black/55 backdrop-blur rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                    <span className="text-sidea-light">{labelA} {Math.round((serverState.voteShareA ?? 0.5) * 100)}%</span>
                    <span className="text-fg-faint text-[10px]">{t('room.persuasion')}</span>
                    <span className="text-sideb-light">{Math.round((serverState.voteShareB ?? 0.5) * 100)}% {labelB}</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden bg-sideb">
                    <div
                      className="h-full bg-sidea transition-all duration-700 ease-out"
                      style={{ width: `${Math.round((serverState.voteShareA ?? 0.5) * 100)}%` }}
                    />
                  </div>

                  {uiRole === 'viewer' && (
                    <>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => castVote('A')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            myVote === 'A'
                              ? 'bg-sidea text-brand-ink glow-sidea'
                              : 'bg-sidea/15 text-sidea-light border border-sidea/30 hover:bg-sidea/25'
                          }`}
                        >
                          {labelA}
                        </button>
                        <button
                          onClick={() => castVote('B')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            myVote === 'B'
                              ? 'bg-sideb text-brand-ink glow-sideb'
                              : 'bg-sideb/15 text-sideb-light border border-sideb/30 hover:bg-sideb/25'
                          }`}
                        >
                          {labelB}
                        </button>
                      </div>
                      <div className="text-center text-[10px] mt-1 h-3.5">
                        {voteError ? (
                          <span className="text-rage-light">{voteError}</span>
                        ) : serverState.voteWindowEndsAt ? (
                          <span className="text-fg-faint">
                            {t('room.nextWindow', { n: Math.max(0, Math.ceil((serverState.voteWindowEndsAt - Date.now()) / 1000)) })}
                          </span>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {serverState.phase === 'coinflip' && (
              <CoinFlipOverlay result={serverState.coinFlipResult} labelA={labelA} labelB={labelB} />
            )}

            <VerdictOverlay
              phase={serverState.phase}
              isVisible={showVoteModal}
              verdict={serverState.verdict}
              labelA={labelA}
              labelB={labelB}
            />
          </div>
        </LiveKitRoom>
      </div>

      {/* Chat */}
      <div className="h-[35vh] md:h-full w-full md:w-80 flex flex-col bg-panel border-t md:border-t-0 md:border-l border-white/5 z-40">
        <div className="px-3.5 py-3 border-b border-white/5 flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{t('room.liveChat')}</span>
          <span className="text-[10px] text-fg-faint">v1.0</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 scrollbar-thin">
          {messages.map((msg) =>
            msg.isDonation ? (
              <div
                key={msg.id}
                className="flex items-center gap-2 bg-brand/10 border border-brand/30 rounded-lg px-2.5 py-2 animate-fade-in"
              >
                <Coins size={16} className="text-brand-light shrink-0" />
                <span className="text-[13px] break-words">
                  <span className="text-brand-light font-semibold">{msg.user}</span>{' '}
                  <span className="text-fg-muted">{t('room.donated')}</span>{' '}
                  <span className="text-fg font-semibold">{msg.amount} ₽</span>
                </span>
              </div>
            ) : (
              <div key={msg.id} className="text-[13px] break-words animate-fade-in leading-snug">
                <span className="font-semibold text-sideb-light">{msg.user}</span>{' '}
                <span className="text-fg/90">{msg.text}</span>
              </div>
            )
          )}
          <div ref={chatEndRef} />
        </div>

        {uiRole === 'viewer' && (
          <div className="px-3 py-2 flex justify-center gap-3 border-t border-white/5">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => sendReaction(r)}
                aria-label={r}
                className="w-9 h-9 rounded-xl bg-panel-2 border border-white/10 hover:border-white/25 flex items-center justify-center hover:scale-110 transition-all"
              >
                <ReactionIcon type={r} size={22} />
              </button>
            ))}
          </div>
        )}

        <form onSubmit={sendMessage} className="p-3 flex items-center gap-2 border-t border-white/5">
          <input
            className="flex-1 bg-panel-2 border border-white/10 rounded-xl px-3.5 py-2 text-[13px] text-fg focus:outline-none focus:border-brand placeholder-fg-faint"
            placeholder={t('room.chatPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="button"
            onClick={sendDonation}
            aria-label="Send donation"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand text-brand-ink glow-brand hover:scale-105 transition-transform shrink-0"
          >
            <Coins size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
