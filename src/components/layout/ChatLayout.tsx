import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Navigation } from './Navigation';
import { ContactsList } from '@/components/chat/ContactsList';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Gamepad2, Phone, Users, Heart, Calendar, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const DreamRoom = lazy(() => import('@/components/dreamroom/DreamRoom').then((module) => ({ default: module.DreamRoom })));
const DreamRoomHome = lazy(() => import('@/components/dreamroom/DreamRoomHome').then((module) => ({ default: module.DreamRoomHome })));
const LoversUnlock = lazy(() => import('@/components/lovers/LoversUnlock').then((module) => ({ default: module.LoversUnlock })));
const CallHistory = lazy(() => import('@/components/features/CallHistory').then((module) => ({ default: module.CallHistory })));
const GamesHub = lazy(() => import('@/components/features/GamesHub').then((module) => ({ default: module.GamesHub })));
const MoodSync = lazy(() => import('@/components/unique/MoodSync').then((module) => ({ default: module.MoodSync })));
const CoupleChallenge = lazy(() => import('@/components/unique/CoupleChallenge').then((module) => ({ default: module.CoupleChallenge })));
const DisappearingMessages = lazy(() => import('@/components/unique/DisappearingMessages').then((module) => ({ default: module.DisappearingMessages })));
const ScreenshotDetection = lazy(() => import('@/components/unique/ScreenshotDetection').then((module) => ({ default: module.ScreenshotDetection })));
const HeartbeatSync = lazy(() => import('@/components/unique/HeartbeatSync').then((module) => ({ default: module.HeartbeatSync })));
const VoiceChangeChat = lazy(() => import('@/components/unique/VoiceChangeChat').then((module) => ({ default: module.VoiceChangeChat })));
const ARFilters = lazy(() => import('@/components/unique/ARFilters').then((module) => ({ default: module.ARFilters })));
const SecretVault = lazy(() => import('@/components/unique/SecretVault').then((module) => ({ default: module.SecretVault })));
const DreamRoomInvite = lazy(() => import('@/components/unique/DreamRoomInvite').then((module) => ({ default: module.DreamRoomInvite })));
const VirtualPet = lazy(() => import('@/components/unique/VirtualPet').then((module) => ({ default: module.VirtualPet })));
const MusicNotes = lazy(() => import('@/components/media/MusicNotes').then((module) => ({ default: module.MusicNotes })));
const Moments = lazy(() => import('@/components/stories/Moments').then((module) => ({ default: module.Moments })));
const FriendsManager = lazy(() => import('@/components/friends/FriendsManager').then((module) => ({ default: module.FriendsManager })));
const AdvancedSettings = lazy(() => import('@/components/settings/AdvancedSettings').then((module) => ({ default: module.AdvancedSettings })));
const LoveVault = lazy(() => import('@/components/dreamroom/LoveVault').then((module) => ({ default: module.LoveVault })));

const SectionLoading = () => (
  <div className="flex-1 p-6 flex items-center justify-center">
    <div className="flex items-center gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Loading section...</span>
    </div>
  </div>
);

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  isOnline: boolean;
  unreadCount: number;
  avatar?: string;
  conversationId?: string;
  lastSeen?: string | null;
}

export const ChatLayout = () => {
  const { mode } = useChat();
  const { profile } = useProfile();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('home');
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>();
  const [loveStreak, setLoveStreak] = useState(0);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  
  const isLoversMode = mode === 'lovers';
    // Dream Room is no longer time-restricted in UI — open anytime in Lovers Mode
    const isDreamRoomTime = true;

  // Update hour every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Deep-link support for ?section=dreamroom
  useEffect(() => {
    const section = searchParams.get('section');
      if (section && isLoversMode) {
      if (section === 'dreamroom') {
        setActiveSection('dreamroom');
      }
    }
  }, [searchParams, isLoversMode, isDreamRoomTime]);

  useEffect(() => {
    const loversOnlySections = new Set(['games', 'dreamroom', 'dreamroom-call', 'dreamroom-video-call', 'dream-invite', 'virtual-pet', 'mood-sync', 'couple-challenge', 'vault', 'secret-vault']);
    if (!isLoversMode && loversOnlySections.has(activeSection)) {
      setActiveSection('home');
      setSelectedContact(undefined);
    }
  }, [isLoversMode, activeSection]);

  // Reset selected contact when switching modes so chats don't bleed across modes.
  useEffect(() => {
    setSelectedContact(undefined);
  }, [mode]);
  
  // Load love streak data
  useEffect(() => {
    const loadLoveStreak = async () => {
      if (!profile?.user_id) return;
      
      const { data, error } = await supabase
        .from('love_streaks')
        .select('current_streak')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      
      if (!error && data) {
        setLoveStreak(data.current_streak);
      }
    };
    
    if (isLoversMode && profile) {
      loadLoveStreak();
    }
  }, [profile, isLoversMode]);
  
  // Check if it's after 6 PM for night theme (for other sections)
  const isNightTime = currentHour >= 18;

  const backgroundStyle: React.CSSProperties = isLoversMode
    ? {
        background:
          'radial-gradient(1200px 600px at 10% -10%, hsl(var(--lovers-primary) / 0.14), transparent 55%), radial-gradient(1000px 650px at 90% 10%, hsl(var(--lovers-secondary) / 0.12), transparent 60%), hsl(var(--background))',
      }
    : {
        background:
          'radial-gradient(1200px 600px at 10% -10%, hsl(var(--general-primary) / 0.14), transparent 55%), radial-gradient(1000px 650px at 90% 10%, hsl(var(--general-secondary) / 0.12), transparent 60%), hsl(var(--background))',
      };

  const renderContent = () => {
    switch (activeSection) {
      case 'chats':
        return (
          <div className="flex-1 flex h-full">
            <ContactsList
              selectedContact={selectedContact}
              onContactSelect={setSelectedContact}
            />
            <div className={cn(
              "flex-1 h-full",
              !selectedContact ? "hidden md:flex" : "flex"
            )}>
              <ChatInterface 
                selectedContact={selectedContact ? {
                  id: selectedContact.id,
                  name: selectedContact.name,
                  avatar: selectedContact.avatar,
                  isOnline: selectedContact.isOnline,
                  lastSeen: selectedContact.lastSeen,
                } : undefined}
                conversationId={selectedContact?.conversationId || selectedContact?.id}
                onBack={() => setSelectedContact(undefined)}
                onDreamRoom={isLoversMode ? () => setActiveSection('dreamroom') : undefined}
              />
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <Suspense fallback={<SectionLoading />}>
            <AdvancedSettings />
          </Suspense>
        );
      
      case 'wallpapers':
        return (
          <Suspense fallback={<SectionLoading />}>
            <AdvancedSettings />
          </Suspense>
        );

      case 'games':
        if (!isLoversMode) {
          return (
            <div className="flex-1 p-6">
              <div className="max-w-2xl mx-auto text-center py-16">
                <h2 className="text-2xl font-bold mb-3">Games are available in Lovers Mode</h2>
                <p className="text-muted-foreground">Switch to Lovers Mode to access couple games.</p>
              </div>
            </div>
          );
        }
        return (
          <Suspense fallback={<SectionLoading />}>
            <GamesHub />
          </Suspense>
        );

      case 'dreamroom':
      case 'dreamroom-call':
      case 'dreamroom-video-call':
        return (
          <Suspense fallback={<SectionLoading />}>
            <DreamRoom
                isTimeRestricted={false}
              autoStartVoiceCall={activeSection === 'dreamroom-call'}
              autoStartVideoCall={activeSection === 'dreamroom-video-call'}
            />
          </Suspense>
        );

      case 'stories':
        return (
          <Suspense fallback={<SectionLoading />}>
            <Moments />
          </Suspense>
        );

      case 'calls':
        return (
          <Suspense fallback={<SectionLoading />}>
            <CallHistory />
          </Suspense>
        );

        case 'friends':
          return (
            <Suspense fallback={<SectionLoading />}>
              <FriendsManager />
            </Suspense>
          );
          
        case 'dream-invite':
          return (
            <Suspense fallback={<SectionLoading />}>
              <DreamRoomInvite />
            </Suspense>
          );
          
        case 'virtual-pet':
          return (
            <Suspense fallback={<SectionLoading />}>
              <VirtualPet />
            </Suspense>
          );
          
      case 'lovers-unlock':
        return (
          <Suspense fallback={<SectionLoading />}>
            <LoversUnlock onSectionChange={setActiveSection} />
          </Suspense>
        );
        
      case 'mood-sync':
        return (
          <Suspense fallback={<SectionLoading />}>
            <div className="flex-1 p-6">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent">
                    Mood Sync
                  </h1>
                  <p className="text-muted-foreground">Share your feelings and connect emotionally</p>
                </div>
                <MoodSync />
              </div>
            </div>
          </Suspense>
        );
        
      case 'couple-challenge':
        return (
          <Suspense fallback={<SectionLoading />}>
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent">
                    Couple Challenges
                  </h1>
                  <p className="text-muted-foreground">Complete fun challenges together to strengthen your bond</p>
                </div>
                <CoupleChallenge />
              </div>
            </div>
          </Suspense>
        );
      
      case 'vault':
        return (
          <Suspense fallback={<SectionLoading />}>
            <div className="flex-1">
              <LoveVault />
            </div>
          </Suspense>
        );

      case 'disappearing-messages':
        return (
          <Suspense fallback={<SectionLoading />}>
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <DisappearingMessages />
              </div>
            </div>
          </Suspense>
        );

      case 'screenshot-detection':
        return (
          <Suspense fallback={<SectionLoading />}>
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <ScreenshotDetection />
              </div>
            </div>
          </Suspense>
        );

      case 'heartbeat-sync':
        return (
          <Suspense fallback={<SectionLoading />}>
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <HeartbeatSync />
              </div>
            </div>
          </Suspense>
        );

        case 'voice-change':
          return (
            <Suspense fallback={<SectionLoading />}>
              <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  <VoiceChangeChat />
                </div>
              </div>
            </Suspense>
          );

        case 'ar-filters':
          return (
            <Suspense fallback={<SectionLoading />}>
              <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  <ARFilters />
                </div>
              </div>
            </Suspense>
          );

        case 'secret-vault':
          return (
            <Suspense fallback={<SectionLoading />}>
              <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  <SecretVault />
                </div>
              </div>
            </Suspense>
          );

        case 'music-notes':
        return (
          <Suspense fallback={<SectionLoading />}>
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                <MusicNotes />
              </div>
            </div>
          </Suspense>
        );

      default: // home
        // Show romantic Dream Room home for lovers mode
        if (isLoversMode) {
          return (
            <Suspense fallback={<SectionLoading />}>
              <DreamRoomHome onNavigate={setActiveSection} />
            </Suspense>
          );
        }
        
        // General mode home
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              {/* Welcome Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 bg-gradient-to-br from-general-primary/20 to-general-secondary/20">
                  <Users className="w-12 h-12 text-general-primary" />
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent from-general-primary to-general-secondary">
                  Welcome to ChatConnect
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Connect, chat, and play with friends in a beautiful, modern interface
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    icon: Users, 
                    title: 'Message Friends', 
                    desc: 'Connect with friends',
                    action: 'chats'
                  },

                  { 
                    icon: Calendar, 
                    title: 'Daily Moments', 
                    desc: 'Daily updates',
                    action: 'stories'
                  },
                  { 
                    icon: Phone, 
                    title: 'Voice & Video', 
                    desc: 'High quality calls',
                    action: 'calls'
                  }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Card 
                      key={idx} 
                      className="glass border-white/20 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                      onClick={() => setActiveSection(item.action)}
                    >
                      <CardHeader className="text-center pb-2">
                        <Icon className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform text-general-primary" />
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center pt-0">
                        <p className="text-muted-foreground text-sm">{item.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "h-screen flex relative",
      isLoversMode ? 'mode-lovers' : 'mode-general'
    )}>
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10" style={backgroundStyle} />
      
      {/* Navigation - hide on mobile when in chat */}
      <div className={cn(
        "shrink-0",
        selectedContact && activeSection === 'chats' ? "hidden md:block" : ""
      )}>
        <Navigation 
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            if (section !== 'chats') setSelectedContact(undefined);
          }}
        />
      </div>
      <div className="relative z-10 flex-1 min-w-0">
        {renderContent()}
      </div>
    </div>
  );
};