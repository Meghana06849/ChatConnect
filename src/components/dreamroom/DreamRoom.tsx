import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { DreamRoomWelcome } from './DreamRoomWelcome';
import { DreamRoomBackground } from './DreamRoomBackground';
import { DreamNightWindow } from './DreamNightWindow';
import { DreamChatPanel } from './DreamChatPanel';
import { DreamEngagementBar } from './DreamEngagementBar';
import { DreamFeatureTiles } from './DreamFeatureTiles';
import { CoupleCalendar } from './CoupleCalendar';
import { LoveVault } from './LoveVault';
import { GamesHub } from '@/components/features/GamesHub';
import { useProfile } from '@/hooks/useProfile';
import { useDreamRoomPresence } from '@/hooks/useDreamRoomPresence';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
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
  const [inCall, setInCall] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dreamConversationId, setDreamConversationId] = useState<string | null>(null);

  const { profile } = useProfile();
  const { partnerOnline, partnerName: presencePartnerName } = useDreamRoomPresence();
  const { conversations, createConversation } = useRealTimeChat(true); // lovers mode

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  // Find or create the lovers conversation for Dream Room chat
  useEffect(() => {
    if (!profile?.user_id || !profile?.lovers_partner_id) return;

    // Look for existing lovers conversation with partner
    const existingConv = conversations.find(c => {
      if (!c.is_lovers_conversation) return false;
      const participantIds = c.conversation_participants.map(p => p.user_id);
      return participantIds.includes(profile.lovers_partner_id!);
    });

    if (existingConv) {
      setDreamConversationId(existingConv.id);
    } else if (conversations.length === 0) {
      // Create lovers conversation if none exists
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

  // Use enhanced real-time chat for the dream conversation
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
      <div className="relative min-h-screen">
        <DreamRoomBackground bothOnline={false} />
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
    <div className="relative min-h-screen overflow-hidden">
      <DreamRoomBackground bothOnline={partnerOnline} />

      <div className="relative z-10 flex flex-col items-center min-h-screen p-3 md:p-4">
        <div className="w-full max-w-lg mx-auto">
          {/* Interactive Night Window */}
          <DreamNightWindow
            partnerOnline={partnerOnline}
            inCall={inCall}
            onToggleCall={() => setInCall(!inCall)}
            loveStreak={loveStreak}
          />

          {/* Engagement Strip */}
          <DreamEngagementBar
            togetherSince={togetherSince}
            daysTogether={daysTogether}
            loveStreak={loveStreak}
            loveLevel={loveLevel}
          />

          {/* Chat Panel - primary focus */}
          <DreamChatPanel
            messages={messages}
            currentUserId={currentUserId}
            chatMessage={chatMessage}
            onChatMessageChange={setChatMessage}
            onSend={handleSendChat}
            partnerName={partnerName}
            typingUsers={typingUsers}
            onTyping={handleTyping}
            loading={chatLoading}
          />

          {/* Feature Tiles */}
          <DreamFeatureTiles onNavigate={setCurrentView} />
        </div>
      </div>
    </div>
  );
};
