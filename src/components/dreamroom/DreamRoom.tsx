import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Volume2, VolumeX } from 'lucide-react';
import { DreamRoomWelcome } from './DreamRoomWelcome';
import { DreamRoomScene } from './DreamRoomScene';
import { DreamRoomChatBar } from './DreamRoomChatBar';
import { CoupleCalendar } from './CoupleCalendar';
import { LoveVault } from './LoveVault';
import { GamesHub } from '@/components/features/GamesHub';
import { DreamCallUI } from '@/components/dreamcall/DreamCallUI';
import { DreamIncomingCall } from '@/components/dreamcall/DreamIncomingCall';
import { useProfile } from '@/hooks/useProfile';
import { useDreamRoomPresence } from '@/hooks/useDreamRoomPresence';
import { useDreamChat } from '@/hooks/useDreamChat';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { useAmbientSounds } from '@/hooks/useAmbientSounds';
import { supabase } from '@/integrations/supabase/client';

interface DreamRoomProps {
  isTimeRestricted?: boolean;
}

export const DreamRoom: React.FC<DreamRoomProps> = ({ isTimeRestricted = false }) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'calendar' | 'vault' | 'games'>('main');
  const [loveLevel, setLoveLevel] = useState(42);
  const [loveStreak, setLoveStreak] = useState(0);
  const [togetherSince, setTogetherSince] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Your Love');
  const [chatMessage, setChatMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [isMutuallyLinked, setIsMutuallyLinked] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { profile } = useProfile();
  const { partnerOnline, partnerName: presencePartnerName } = useDreamRoomPresence();
  const { muted: ambientMuted, toggleMute: toggleAmbient, activate: activateAmbient, currentType: ambientType } = useAmbientSounds(partnerOnline);

  // WebRTC call integration
  const {
    localStream, remoteStream, isCallActive, isIncomingCall, incomingCallData,
    isMuted, isVideoEnabled, callDuration,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleVideo,
  } = useWebRTCCall(currentUserId);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  const isPartnerLinked = Boolean(profile?.lovers_partner_id && isMutuallyLinked);
  const chatLockMessage = !profile?.lovers_partner_id
    ? 'No Dream partner linked yet. Link a Lovers Mode friend first to unlock chat and calls.'
    : !isMutuallyLinked
      ? `Partner linking is pending. Ask ${partnerName} to complete Lovers Mode linking from Friends.`
      : null;

  // Dream chat — uses dedicated dream_messages table, isolated from General Mode
  const {
    messages, typingUsers, sendMessage, setTyping,
  } = useDreamChat(isPartnerLinked ? profile?.lovers_partner_id || null : null);

  useEffect(() => {
    const verifyMutualLink = async () => {
      if (!currentUserId || !profile?.lovers_partner_id) {
        setIsMutuallyLinked(false);
        return;
      }

      const { data, error } = await supabase.rpc('are_linked_lovers', {
        _user_a: currentUserId,
        _user_b: profile.lovers_partner_id,
      });

      if (error) {
        setIsMutuallyLinked(false);
        return;
      }

      setIsMutuallyLinked(Boolean(data));
    };

    verifyMutualLink();
  }, [currentUserId, profile?.lovers_partner_id]);

  useEffect(() => {
    if (presencePartnerName) setPartnerName(presencePartnerName);
  }, [presencePartnerName]);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.user_id) return;
      const { data: streakData } = await supabase
        .from('love_streaks')
        .select('current_streak, created_at')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      if (streakData) {
        setLoveStreak(streakData.current_streak || 0);
        setTogetherSince(streakData.created_at);
      }
      if (profile.lovers_partner_id && !presencePartnerName) {
        const { data: partnerData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', profile.lovers_partner_id)
          .maybeSingle();
        if (partnerData?.display_name) setPartnerName(partnerData.display_name);
      }
    };
    loadData();
  }, [profile, presencePartnerName]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, showChat]);

  const daysTogether = useMemo(() => {
    if (!togetherSince) return 0;
    return Math.floor((Date.now() - new Date(togetherSince).getTime()) / 86400000);
  }, [togetherSince]);

  const handleSendChat = useCallback(async () => {
    if (!isPartnerLinked || !chatMessage.trim()) return;
    const sent = await sendMessage(chatMessage.trim());
    if (sent) setChatMessage('');
  }, [isPartnerLinked, chatMessage, sendMessage]);

  const handleTyping = useCallback(() => {
    if (!isPartnerLinked) return;
    setTyping(true);
  }, [isPartnerLinked, setTyping]);

  const handleStartVideoCall = useCallback(async () => {
    if (!profile?.lovers_partner_id) return;
    await startCall(profile.lovers_partner_id, partnerName, true);
  }, [profile, partnerName, startCall]);

  const handleStartVoiceCall = useCallback(async () => {
    if (!profile?.lovers_partner_id) return;
    await startCall(profile.lovers_partner_id, partnerName, false);
  }, [profile, partnerName, startCall]);

  const handleEnterRoom = useCallback(() => {
    setShowWelcome(false);
    activateAmbient();
  }, [activateAmbient]);

  // Reject/ignore calls from users other than linked lover in Dream Room
  useEffect(() => {
    if (!isIncomingCall || !incomingCallData) return;
    if (!profile?.lovers_partner_id || incomingCallData.from !== profile.lovers_partner_id) {
      rejectCall();
    }
  }, [isIncomingCall, incomingCallData, profile?.lovers_partner_id, rejectCall]);

  // Show incoming call overlay (linked lover only)
  if (isIncomingCall && incomingCallData && incomingCallData.from === profile?.lovers_partner_id) {
    return (
      <DreamIncomingCall
        callerName={incomingCallData.callerName || 'Your Love'}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
    );
  }

  // Show full-screen voice call UI (no video)
  if (isCallActive && !isVideoEnabled && !remoteStream?.getVideoTracks().length) {
    return (
      <DreamCallUI
        contactName={partnerName}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        callDuration={callDuration}
        onToggleMute={toggleMute}
        onEndCall={endCall}
      />
    );
  }

  if (showWelcome) {
    return <DreamRoomWelcome onEnter={handleEnterRoom} />;
  }

  if (currentView !== 'main') {
    const viewMap: Record<string, React.ReactNode> = {
      calendar: <CoupleCalendar />,
      vault: <LoveVault />,
      games: <div className="pt-16 px-4 md:px-6"><GamesHub /></div>,
    };
    return (
      <div className="relative min-h-screen" style={{
        background: 'linear-gradient(180deg, hsl(270 50% 8%) 0%, hsl(300 40% 12%) 50%, hsl(0 0% 5%) 100%)',
      }}>
        <Button
          onClick={() => setCurrentView('main')}
          className="absolute top-4 left-4 z-20 bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] text-white shadow-lg"
          size="sm"
        >
          <Home className="w-4 h-4 mr-2" />
          Dream Room
        </Button>
        <div className="relative z-10">{viewMap[currentView]}</div>
      </div>
    );
  }

  const ambientLabels: Record<string, string> = {
    rain: '🌧️', birds: '🐦', fireplace: '🔥', night: '🌙',
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{
      background: partnerOnline
        ? 'linear-gradient(180deg, hsl(270 55% 10%) 0%, hsl(300 45% 14%) 30%, hsl(330 40% 18%) 60%, hsl(280 35% 12%) 85%, hsl(260 40% 6%) 100%)'
        : 'linear-gradient(180deg, hsl(270 50% 7%) 0%, hsl(290 38% 10%) 30%, hsl(320 32% 13%) 60%, hsl(280 30% 9%) 85%, hsl(260 35% 5%) 100%)',
    }}>
      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, hsla(270 40% 3% / 0.7) 100%)',
      }} />

      {/* Floating hearts background */}
      <DreamRoomFloatingHearts partnerOnline={partnerOnline} />

      {/* Ambient sound toggle */}
      <button onClick={() => { activateAmbient(); toggleAmbient(); }}
        className="fixed top-4 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{
          background: 'hsla(280 40% 18% / 0.8)',
          border: '1px solid hsla(320 60% 50% / 0.2)',
          backdropFilter: 'blur(12px)',
        }}>
        <span className="text-xs mr-0.5">{ambientLabels[ambientType]}</span>
        {ambientMuted ? (
          <VolumeX className="w-3 h-3 text-white/50" />
        ) : (
          <Volume2 className="w-3 h-3 text-white/70" />
        )}
      </button>

      {/* Main scene */}
      <div className="relative z-10 flex flex-col items-center min-h-screen">
        {/* DreamRoom title */}
        <div className="flex items-center gap-2 pt-3 pb-1">
          <span className="text-lg">💜</span>
          <h1 className="text-lg font-semibold tracking-wide text-white/90">DreamRoom</h1>
        </div>

        {/* Main interactive scene */}
        <DreamRoomScene
          partnerOnline={partnerOnline}
          loveStreak={loveStreak}
          isCallActive={isCallActive}
          remoteStream={remoteStream}
          localStream={localStream}
          onStartVideoCall={handleStartVideoCall}
          onStartVoiceCall={handleStartVoiceCall}
          onEndCall={endCall}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          callDuration={callDuration}
          onNavigate={setCurrentView}
          profile={profile}
        />

        {/* Chat panel - expandable */}
        <div className="w-full max-w-lg mx-auto px-3 flex-1 flex flex-col" style={{ minHeight: 0 }}>
          {/* Toggle chat */}
          <button onClick={() => setShowChat(!showChat)}
            className="mx-auto mb-1 px-4 py-1 rounded-full text-[11px] text-white/70 transition-all hover:text-white/90"
            style={{
              background: 'hsla(280 35% 18% / 0.7)',
              border: '1px solid hsla(320 60% 50% / 0.15)',
              backdropFilter: 'blur(8px)',
            }}>
            {showChat ? '▼ Hide Chat' : `▲ Chat ${messages.length > 0 ? `(${messages.length})` : ''}`}
          </button>

          {/* Scrollable messages */}
          {showChat && (
            <div ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-2 px-1 pb-2 max-h-[35vh] scrollbar-thin"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
              }}>
              {messages.length === 0 && (
                <div className="text-center text-white/30 text-xs py-6">
                  {isPartnerLinked
                    ? `Send your first message to ${partnerName} 💕`
                    : 'Connect to your partner with the love-code to unlock Dream Room chat'}
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] px-3 py-2 rounded-2xl text-sm dream-bubble-appear" style={{
                      background: isMe
                        ? 'linear-gradient(135deg, hsla(320 60% 40% / 0.85), hsla(280 50% 35% / 0.85))'
                        : 'linear-gradient(135deg, hsla(270 40% 25% / 0.85), hsla(260 35% 20% / 0.85))',
                      border: isMe
                        ? '1px solid hsla(320 80% 60% / 0.25)'
                        : '1px solid hsla(270 50% 40% / 0.2)',
                      color: 'hsla(0 0% 100% / 0.9)',
                      backdropFilter: 'blur(8px)',
                    }}>
                      {msg.content}
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[9px] text-white/30">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className="text-[8px]">
                            {msg.read_at ? '💜' : '🤍'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Typing indicator */}
          {typingUsers.filter(u => u.user_id !== currentUserId).length > 0 && (
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--lovers-primary))] dream-typing-heart"
                    style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <span className="text-[11px] text-[hsl(var(--lovers-primary))] italic">typing…</span>
            </div>
          )}

          {/* Last message preview when chat is collapsed */}
          {!showChat && messages.length > 0 && !isCallActive && (
            <div className="mx-auto mb-1 max-w-xs">
              <div className="px-3 py-1.5 rounded-2xl text-xs text-white/70 text-center truncate"
                style={{
                  background: 'hsla(270 40% 22% / 0.7)',
                  border: '1px solid hsla(320 50% 45% / 0.15)',
                  backdropFilter: 'blur(8px)',
                }}>
                {messages[messages.length - 1].content.slice(0, 50)}
                {messages[messages.length - 1].content.length > 50 ? '…' : ''}
              </div>
            </div>
          )}
        </div>

        {!isPartnerLinked && (
          <div className="mb-2 text-[11px] text-center text-white/60 px-3">
            Dream Room chat and calls are locked until both accounts are linked with the same love-code.
          </div>
        )}

        {/* Bottom chat bar */}
        <DreamRoomChatBar
          chatMessage={chatMessage}
          onChatMessageChange={setChatMessage}
          onSend={() => {
            if (!isPartnerLinked) return;
            handleSendChat();
            if (!showChat) setShowChat(true);
          }}
          onTyping={() => {
            if (!isPartnerLinked) return;
            handleTyping();
          }}
          partnerName={isPartnerLinked ? partnerName : 'Linked Partner'}
          onNavigate={setCurrentView}
        />
      </div>
    </div>
  );
};

/* Floating hearts background particles */
const DreamRoomFloatingHearts: React.FC<{ partnerOnline: boolean }> = ({ partnerOnline }) => {
  const hearts = useMemo(() =>
    Array.from({ length: partnerOnline ? 14 : 7 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 14 + Math.random() * 10,
      size: 8 + Math.random() * 10,
      opacity: 0.06 + Math.random() * 0.08,
    })), [partnerOnline]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {hearts.map(h => (
        <div key={h.id} className="absolute dream-floating-heart text-[hsl(var(--lovers-primary))]"
          style={{
            left: `${h.x}%`,
            bottom: '-5%',
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            fontSize: `${h.size}px`,
            opacity: h.opacity,
          }}>
          ❤
        </div>
      ))}
    </div>
  );
};
