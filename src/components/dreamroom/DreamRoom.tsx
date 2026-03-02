import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
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
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
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
  const [dreamConversationId, setDreamConversationId] = useState<string | null>(null);

  const { profile } = useProfile();
  const { partnerOnline, partnerName: presencePartnerName } = useDreamRoomPresence();
  const { conversations, createConversation } = useRealTimeChat(true);

  // WebRTC call integration
  const {
    localStream,
    remoteStream,
    isCallActive,
    isIncomingCall,
    incomingCallData,
    isMuted,
    isVideoEnabled,
    callDuration,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTCCall(currentUserId);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  // Find or create the lovers conversation
  useEffect(() => {
    if (!profile?.user_id || !profile?.lovers_partner_id) return;
    const existingConv = conversations.find(c => {
      if (!c.is_lovers_conversation) return false;
      const participantIds = c.conversation_participants.map(p => p.user_id);
      return participantIds.includes(profile.lovers_partner_id!);
    });
    if (existingConv) {
      setDreamConversationId(existingConv.id);
    } else if (conversations.length === 0) {
      const create = async () => {
        try {
          const conv = await createConversation([profile.lovers_partner_id!], true);
          if (conv) setDreamConversationId(conv.id);
        } catch (e) {
          console.error('Failed to create dream conversation:', e);
        }
      };
      create();
    }
  }, [profile, conversations, createConversation]);

  const {
    messages,
    typingUsers,
    loading: chatLoading,
    sendMessage,
    setTyping,
  } = useEnhancedRealTimeChat(dreamConversationId);

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

  const daysTogether = useMemo(() => {
    if (!togetherSince) return 0;
    return Math.floor((Date.now() - new Date(togetherSince).getTime()) / 86400000);
  }, [togetherSince]);

  const handleSendChat = useCallback(() => {
    if (!chatMessage.trim()) return;
    sendMessage(chatMessage.trim());
    setChatMessage('');
  }, [chatMessage, sendMessage]);

  const handleTyping = useCallback(() => {
    setTyping(true);
  }, [setTyping]);

  const handleStartVideoCall = useCallback(async () => {
    if (!profile?.lovers_partner_id) return;
    await startCall(profile.lovers_partner_id, partnerName, true);
  }, [profile, partnerName, startCall]);

  const handleStartVoiceCall = useCallback(async () => {
    if (!profile?.lovers_partner_id) return;
    await startCall(profile.lovers_partner_id, partnerName, false);
  }, [profile, partnerName, startCall]);

  // Show incoming call overlay
  if (isIncomingCall && incomingCallData) {
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
    return <DreamRoomWelcome onEnter={() => setShowWelcome(false)} />;
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

        {/* Last message bubble */}
        {messages.length > 0 && !isCallActive && (
          <div className="relative z-10 -mt-2 mb-2 max-w-xs mx-auto">
            <div className="px-4 py-2 rounded-2xl text-sm text-white/90 dream-bubble-appear" style={{
              background: 'linear-gradient(135deg, hsla(270 50% 30% / 0.85), hsla(280 40% 25% / 0.85))',
              border: '1px solid hsla(320 60% 50% / 0.2)',
              backdropFilter: 'blur(12px)',
            }}>
              {messages[messages.length - 1].content.slice(0, 60)}
              {messages[messages.length - 1].content.length > 60 ? '…' : ''}
              {' '}
              <span className="text-[10px] text-white/40">
                {messages[messages.length - 1].sender_id === currentUserId ? '💜' : '💕'}
              </span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45" style={{
              background: 'hsla(275 45% 28% / 0.85)',
            }} />
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.filter(u => u.user_id !== currentUserId).length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--lovers-primary))] dream-typing-heart"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <span className="text-[11px] text-[hsl(var(--lovers-primary))] italic">typing…</span>
          </div>
        )}

        {/* Bottom chat bar */}
        <DreamRoomChatBar
          chatMessage={chatMessage}
          onChatMessageChange={setChatMessage}
          onSend={handleSendChat}
          onTyping={handleTyping}
          partnerName={partnerName}
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
