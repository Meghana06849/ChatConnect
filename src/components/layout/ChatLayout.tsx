import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Navigation } from './Navigation';
import { ContactsList } from '@/components/chat/ContactsList';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ModeSwitch } from '@/components/settings/ModeSwitch';
import { DreamRoom } from '@/components/dreamroom/DreamRoom';
import { LoversUnlock } from '@/components/lovers/LoversUnlock';
import { CallInterface } from '@/components/features/CallInterface';
import { CallHistory } from '@/components/features/CallHistory';
import { GamesHub } from '@/components/features/GamesHub';
import { Stories } from '@/components/stories/Stories';
import { FriendsManager } from '@/components/friends/FriendsManager';
import { GroupManager } from '@/components/groups/GroupManager';
import { AdvancedSettings } from '@/components/settings/AdvancedSettings';
import { FloatingBackground } from '@/components/background/FloatingBackground';
import { AnimatedBackground } from '@/components/background/AnimatedBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, BookOpen, Phone, Users, Heart, Calendar, Trophy, Video, Mic, Star } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  isOnline: boolean;
  unreadCount: number;
  avatar?: string;
}

export const ChatLayout = () => {
  const { mode } = useChat();
  const [activeSection, setActiveSection] = useState('home');
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>();
  
  const isLoversMode = mode === 'lovers';

  const renderContent = () => {
    switch (activeSection) {
      case 'chats':
        return (
          <div className="flex-1 flex h-full">
            <ContactsList
              selectedContact={selectedContact}
              onContactSelect={setSelectedContact}
            />
            <ChatInterface selectedContact={selectedContact} />
          </div>
        );
      
      case 'settings':
        return <AdvancedSettings />;

      case 'games':
        return <GamesHub />;

      case 'dreamroom':
        return <DreamRoom isTimeRestricted={true} />;

      case 'stories':
        return <Stories />;

      case 'calls':
        return <CallHistory />;

        case 'friends':
          return <FriendsManager />;
      case 'lovers-unlock':
        return <LoversUnlock onSectionChange={setActiveSection} />;
      
      case 'vault':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-lovers-primary animate-heart-beat" />
              <h1 className="text-3xl font-bold mb-2">Secret Vault</h1>
              <p className="text-muted-foreground mb-8">
                Extra secure conversations for your most private moments
              </p>
              <div className="glass p-8 rounded-2xl border-white/20">
                <p className="text-muted-foreground">
                  Vault is empty. Start a secret conversation!
                </p>
              </div>
            </div>
          </div>
        );

      default: // home
        return (
          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              {/* Welcome Header */}
              <div className="text-center mb-12">
                <div className={`
                  inline-flex items-center justify-center w-24 h-24 rounded-full mb-6
                  ${isLoversMode 
                    ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
                    : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
                  }
                `}>
                  {isLoversMode ? (
                    <Heart className="w-12 h-12 text-lovers-primary animate-heart-beat" />
                  ) : (
                    <Gamepad2 className="w-12 h-12 text-general-primary" />
                  )}
                </div>
                <h1 className={`
                  text-4xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent
                  ${isLoversMode 
                    ? 'from-lovers-primary to-lovers-secondary' 
                    : 'from-general-primary to-general-secondary'
                  }
                `}>
                  Welcome to {isLoversMode ? 'Lovers Mode' : 'ChatConnect'}
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {isLoversMode 
                    ? 'Your private space for intimate conversations and special moments together'
                    : 'Connect, chat, and play with friends in a beautiful, modern interface'
                  }
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                 {[
                   { 
                     icon: isLoversMode ? Heart : Users, 
                     title: isLoversMode ? 'Start Love Chat' : 'Message Friends', 
                     desc: isLoversMode ? 'Send love messages' : 'Connect with friends',
                     action: 'chats'
                   },
                   { 
                     icon: Gamepad2, 
                     title: isLoversMode ? 'Love Games' : 'Mini Games', 
                     desc: isLoversMode ? 'Play together' : 'Fun with friends',
                     action: 'games'
                   },
                   { 
                     icon: Calendar, 
                     title: 'Daily Moments', 
                     desc: isLoversMode ? 'Share moments' : 'Daily updates',
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
                        <Icon className={`
                          w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform
                          ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}
                          ${item.icon === Heart ? 'animate-heart-beat' : ''}
                        `} />
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center pt-0">
                        <p className="text-muted-foreground text-sm">{item.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Stats/Features for Lovers Mode */}
              {isLoversMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass border-white/20 text-center">
                    <CardHeader>
                      <Calendar className="w-8 h-8 text-lovers-primary mx-auto mb-2" />
                      <CardTitle className="text-lg">Shared Calendar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">Plan dates and special moments together</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass border-white/20 text-center">
                    <CardHeader>
                      <Trophy className="w-8 h-8 text-lovers-primary mx-auto mb-2" />
                      <CardTitle className="text-lg">Love Streak</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-lovers-primary mb-1">0 days</p>
                      <p className="text-muted-foreground text-sm">Keep chatting daily!</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass border-white/20 text-center">
                    <CardHeader>
                      <Heart className="w-8 h-8 text-lovers-primary mx-auto mb-2 animate-heart-beat" />
                      <CardTitle className="text-lg">Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-lovers-primary mb-1">💕</p>
                      <p className="text-muted-foreground text-sm">Spread the love</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`h-screen flex ${isLoversMode ? 'mode-lovers' : 'mode-general'} relative`}>
      <AnimatedBackground />
      <Navigation 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="relative z-10 flex-1">
        <FloatingBackground />
        {renderContent()}
      </div>
    </div>
  );
};