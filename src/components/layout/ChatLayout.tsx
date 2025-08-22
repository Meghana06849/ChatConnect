import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Navigation } from './Navigation';
import { ContactsList } from '@/components/chat/ContactsList';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ModeSwitch } from '@/components/settings/ModeSwitch';
import { DreamRoom } from '@/components/dreamroom/DreamRoom';
import { FloatingBackground } from '@/components/background/FloatingBackground';
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
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-muted-foreground">Customize your ChatConnect experience</p>
              </div>
              <ModeSwitch />
            </div>
          </div>
        );

      case 'games':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <Gamepad2 className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                <h1 className="text-3xl font-bold mb-2">
                  {isLoversMode ? 'Love Games' : 'Mini Games'}
                </h1>
                <p className="text-muted-foreground">
                  {isLoversMode ? 'Fun activities for couples' : 'Play games with friends'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(isLoversMode ? [
                  { name: 'Truth or Dare', desc: 'Get to know each other better', icon: '💕' },
                  { name: 'Love Quiz', desc: 'Test how well you know your partner', icon: '🧠' },
                  { name: 'Would You Rather', desc: 'Fun relationship questions', icon: '🤔' }
                ] : [
                  { name: 'Tic Tac Toe', desc: 'Classic game for two', icon: '⭕' },
                  { name: 'Word Guess', desc: 'Guess the hidden word', icon: '🔤' },
                  { name: 'Quick Math', desc: 'Fast calculation challenge', icon: '🧮' }
                ]).map((game, idx) => (
                  <Card key={idx} className="glass border-white/20 hover:shadow-lg transition-all duration-200 cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <span className="text-2xl">{game.icon}</span>
                        <span>{game.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{game.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 'dreamroom':
        return <DreamRoom />;

      case 'stories':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center">
              <Star className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'} animate-blink-star`} />
              <h1 className="text-3xl font-bold mb-2">
                {isLoversMode ? 'Love Stories' : 'Stories'}
              </h1>
              <p className="text-muted-foreground mb-8">
                {isLoversMode ? 'Share your romantic moments' : 'Share your daily moments'}
              </p>
              <div className="glass p-8 rounded-2xl border-white/20">
                <p className="text-muted-foreground">No stories yet. Be the first to share!</p>
              </div>
            </div>
          </div>
        );

      case 'calls':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <Phone className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                <h1 className="text-3xl font-bold mb-2">Call History</h1>
                <p className="text-muted-foreground mb-8">Your recent voice and video calls</p>
              </div>
              
              {/* Quick Call Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="glass border-white/20 hover:shadow-lg transition-all cursor-pointer">
                  <CardHeader className="text-center">
                    <Video className={`w-12 h-12 mx-auto mb-2 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                    <CardTitle>Video Call</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">High-quality video calls</p>
                    <button className={`${isLoversMode ? 'btn-lovers' : 'btn-general'} w-full`}>
                      Start Video Call
                    </button>
                  </CardContent>
                </Card>
                
                <Card className="glass border-white/20 hover:shadow-lg transition-all cursor-pointer">
                  <CardHeader className="text-center">
                    <Mic className={`w-12 h-12 mx-auto mb-2 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                    <CardTitle>Voice Call</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">Crystal clear voice calls</p>
                    <button className={`${isLoversMode ? 'btn-lovers' : 'btn-general'} w-full`}>
                      Start Voice Call
                    </button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="glass p-8 rounded-2xl border-white/20">
                <p className="text-muted-foreground text-center">No calls yet. Start your first call!</p>
              </div>
            </div>
          </div>
        );

      case 'friends':
      case 'vault':
        return (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto text-center">
              {activeSection === 'vault' ? (
                <Heart className="w-16 h-16 mx-auto mb-4 text-lovers-primary animate-heart-beat" />
              ) : (
                <Users className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
              )}
              <h1 className="text-3xl font-bold mb-2">
                {activeSection === 'vault' ? 'Secret Vault' : 'Friends'}
              </h1>
              <p className="text-muted-foreground mb-8">
                {activeSection === 'vault' 
                  ? 'Extra secure conversations for your most private moments'
                  : 'Manage your contacts and friendships'
                }
              </p>
              <div className="glass p-8 rounded-2xl border-white/20">
                <p className="text-muted-foreground">
                  {activeSection === 'vault' 
                    ? 'Vault is empty. Start a secret conversation!'
                    : 'Add friends to start chatting!'
                  }
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
                    icon: BookOpen, 
                    title: 'Stories', 
                    desc: isLoversMode ? 'Share moments' : 'Daily updates',
                    action: 'stories'
                  },
                  { 
                    icon: Phone, 
                    title: 'Voice Calls', 
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
      <FloatingBackground />
      <Navigation 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="relative z-10 flex-1">
        {renderContent()}
      </div>
    </div>
  );
};