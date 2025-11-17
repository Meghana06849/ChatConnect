import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DreamRoomWelcome } from './DreamRoomWelcome';
import { CoupleCalendar } from './CoupleCalendar';
import { LoveVault } from './LoveVault';
import { 
  Home, 
  Clock, 
  Moon, 
  Sun, 
  Palette, 
  Sofa, 
  Music,
  Heart,
  Lock,
  Sparkles,
  Star,
  Calendar,
  StickyNote,
  Camera,
  Gamepad2,
  Smile,
  TreePine,
  Play,
  Pin,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

interface DreamRoomProps {
  isTimeRestricted?: boolean;
}

export const DreamRoom: React.FC<DreamRoomProps> = ({ isTimeRestricted = true }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAccessible, setIsAccessible] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(true); // Auto-unlock since PIN is verified at entry
  const [petMood, setPetMood] = useState('happy');
  const [currentMusic, setCurrentMusic] = useState('None');
  const [nightModeStars, setNightModeStars] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'calendar' | 'vault'>('main');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      
      if (!isTimeRestricted) {
        setIsAccessible(true);
        return;
      }

      const hour = now.getHours();
      // Accessible from 12 AM (0) to 5 AM (5) - 00:00 to 04:59
      setIsAccessible(hour >= 0 && hour <= 4);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isTimeRestricted]);

  const decorationItems = [
    { name: 'Romantic Candles', icon: '🕯️', price: 50 },
    { name: 'Rose Petals', icon: '🌹', price: 30 },
    { name: 'Fairy Lights', icon: '✨', price: 40 },
    { name: 'Cozy Couch', icon: '🛋️', price: 200 },
    { name: 'Love Mirror', icon: '🪞', price: 150 },
    { name: 'Heart Balloons', icon: '🎈', price: 25 },
    { name: 'Dream Jar', icon: '🏺', price: 75 },
    { name: 'Virtual Plant', icon: '🌱', price: 100 },
  ];

  const themes = [
    { name: 'Midnight Romance', colors: ['#1a1a2e', '#16213e', '#0f3460'], price: 100 },
    { name: 'Sunset Dreams', colors: ['#ff6b6b', '#feca57', '#ff9ff3'], price: 120 },
    { name: 'Ethereal Garden', colors: ['#a8e6cf', '#dcedc1', '#ffd3a5'], price: 110 },
    { name: 'Starlit Night', colors: ['#0c0c0c', '#1a1a2e', '#16213e'], price: 130 },
  ];

  const dreamFeatures = [
    { name: 'Dream Jar', description: 'Drop wishes that open later', icon: '🏺' },
    { name: 'Love Vault', description: 'Encrypted private storage', icon: '🔒' },
    { name: 'Shared Playlist', description: 'Auto-sync music with Spotify', icon: '🎵' },
    { name: 'Virtual Pet', description: 'Grows as you chat together', icon: '🐱' },
    { name: 'Couple Calendar', description: 'Never miss special moments', icon: '📅' },
    { name: 'Night Mode', description: 'Stars change based on moods', icon: '🌟' },
    { name: 'Dream Board', description: 'Upload memories & quotes', icon: '📌' },
    { name: 'Mini-Games', description: 'Play together in your space', icon: '🎮' },
  ];

  // Dream Room is accessible since PIN was verified at entry

  if (showWelcome) {
    return <DreamRoomWelcome onEnter={() => setShowWelcome(false)} />;
  }

  if (currentView === 'calendar') {
    return (
      <div className="relative">
        <Button
          onClick={() => setCurrentView('main')}
          className="absolute top-6 left-6 z-10 bg-lovers-primary text-white"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to Dream Room
        </Button>
        <CoupleCalendar />
      </div>
    );
  }

  if (currentView === 'vault') {
    return (
      <div className="relative">
        <Button
          onClick={() => setCurrentView('main')}
          className="absolute top-6 left-6 z-10 bg-lovers-primary text-white"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to Dream Room
        </Button>
        <LoveVault />
      </div>
    );
  }

  if (!isAccessible && isTimeRestricted) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass p-12 rounded-3xl border-white/20">
            <Moon className="w-24 h-24 mx-auto mb-6 text-lovers-primary animate-float" />
            <h1 className="text-4xl font-bold mb-4 text-lovers-primary">Dream Room</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Your private virtual space opens at midnight 🌙
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Clock className="w-6 h-6 text-lovers-secondary" />
              <span className="text-lg font-medium">
                Current time: {currentTime.toLocaleTimeString()}
              </span>
            </div>
            
            <Badge variant="outline" className="text-lovers-primary border-lovers-primary/50">
              Available: 12:00 AM - 5:00 AM
            </Badge>
            
            <p className="text-sm text-muted-foreground mt-4">
              Come back during the magical hours to design your dream space together 💕
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Home className="w-12 h-12 text-lovers-primary animate-heart-beat" />
            <Sparkles className="w-8 h-8 text-lovers-secondary animate-float" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent">
            Dream Room
          </h1>
          <p className="text-xl text-muted-foreground">
            Your private 3D virtual space - Design it together 💕
          </p>
          
          {isTimeRestricted && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Moon className="w-5 h-5 text-lovers-primary" />
              <span className="text-sm text-lovers-primary font-medium">
                Night Mode Active (12 AM - 5 AM)
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Room View */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Home className="w-6 h-6 text-lovers-primary" />
                    <span>Your Dream Space</span>
                  </div>
                  <Badge className="bg-lovers-primary/20 text-lovers-primary">
                    🔒 Private Mode
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-80 bg-gradient-to-br from-lovers-accent/20 to-lovers-primary/10 rounded-2xl border border-lovers-primary/20 flex items-center justify-center relative overflow-hidden">
                  {/* Night Mode Stars */}
                  {nightModeStars && (
                    <div className="absolute inset-0">
                      {[...Array(20)].map((_, i) => (
                        <Star
                          key={i}
                          className="absolute text-yellow-400 w-4 h-4 blink-star"
                          style={{
                            left: `${Math.random() * 90 + 5}%`,
                            top: `${Math.random() * 90 + 5}%`,
                            animationDelay: `${Math.random() * 2}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Virtual Pet */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-white/10 rounded-full p-3">
                      <TreePine className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-xs text-center mt-1 text-lovers-primary">Growing!</p>
                  </div>
                  
                  {/* Magical Connection Center */}
                  <div className="text-center z-10">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 animate-pulse">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-lovers-primary/30 to-lovers-secondary/30 blur-xl"></div>
                      </div>
                      <div className="relative flex items-center justify-center space-x-4">
                        <Heart className="w-16 h-16 text-lovers-primary animate-heart-beat" />
                        <div className="text-4xl animate-float">
                          💞
                        </div>
                        <Heart className="w-16 h-16 text-lovers-secondary animate-heart-beat" style={{ animationDelay: '0.5s' }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lovers-primary font-medium text-lg">Connected Hearts</p>
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-lovers-primary rounded-full animate-pulse"></div>
                        <p className="text-sm text-muted-foreground">Your souls are synchronized</p>
                        <div className="w-2 h-2 bg-lovers-secondary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {currentMusic !== 'None' ? `🎵 Playing: ${currentMusic}` : 'Add music to enhance your connection'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Floating hearts */}
                  <div className="absolute inset-0">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-2xl opacity-20 animate-float"
                        style={{
                          left: `${Math.random() * 80 + 10}%`,
                          top: `${Math.random() * 80 + 10}%`,
                          animationDelay: `${Math.random() * 3}s`,
                        }}
                      >
                        💕
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Dream Features */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-lovers-primary" />
                  <span>Dream Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {dreamFeatures.map((feature, idx) => (
                    <div 
                      key={idx} 
                      className="text-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer"
                      onClick={() => {
                        if (feature.name === 'Couple Calendar') {
                          setCurrentView('calendar');
                        } else if (feature.name === 'Love Vault') {
                          setCurrentView('vault');
                        }
                      }}
                    >
                      <div className="text-3xl mb-2">{feature.icon}</div>
                      <h4 className="font-medium text-sm">{feature.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customization Panel */}
          <div className="space-y-6">
            {/* Themes */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-lovers-primary" />
                  <span>Room Themes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {themes.map((theme, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-white/20 hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{theme.name}</p>
                        <div className="flex space-x-1 mt-1">
                          {theme.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full border border-white/20"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-lovers-primary border-lovers-primary/50">
                        {theme.price} 💕
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Decorations */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-lovers-primary" />
                  <span>Decorations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {decorationItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-lovers-primary/50 text-lovers-primary hover:bg-lovers-primary/10"
                    >
                      {item.price} 💕
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Dream Tools */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle>Dream Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full btn-lovers"
                  onClick={() => setCurrentMusic('Romantic Vibes')}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Shared Playlist
                </Button>
                <Button variant="outline" className="w-full border-lovers-primary/50 text-lovers-primary">
                  <StickyNote className="w-4 h-4 mr-2" />
                  Shared Notes
                </Button>
                <Button variant="outline" className="w-full border-lovers-primary/50 text-lovers-primary">
                  <Calendar className="w-4 h-4 mr-2" />
                  Dream Dates
                </Button>
                <Button variant="outline" className="w-full border-lovers-primary/50 text-lovers-primary">
                  <Camera className="w-4 h-4 mr-2" />
                  Memory Board
                </Button>
                <Button variant="outline" className="w-full border-lovers-primary/50 text-lovers-primary">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Mini-Games
                </Button>
              </CardContent>
            </Card>
            
            {/* Mood & Settings */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle>Room Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Night Mode Stars</h4>
                    <p className="text-sm text-muted-foreground">Constellation ambiance</p>
                  </div>
                  <Switch 
                    checked={nightModeStars}
                    onCheckedChange={setNightModeStars}
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Pet Mood</Label>
                  <div className="flex space-x-2 mt-2">
                    {['happy', 'love', 'excited'].map((mood) => (
                      <Button
                        key={mood}
                        size="sm"
                        variant={petMood === mood ? "default" : "outline"}
                        onClick={() => setPetMood(mood)}
                        className={petMood === mood ? "btn-lovers" : "border-lovers-primary/50 text-lovers-primary"}
                      >
                        <Smile className="w-4 h-4 mr-1" />
                        {mood}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button variant="outline" className="w-full border-lovers-primary/50 text-lovers-primary">
                  <Pin className="w-4 h-4 mr-2" />
                  Change PIN
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};