import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Sparkles
} from 'lucide-react';

interface DreamRoomProps {
  isTimeRestricted?: boolean;
}

export const DreamRoom: React.FC<DreamRoomProps> = ({ isTimeRestricted = true }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAccessible, setIsAccessible] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      
      if (!isTimeRestricted) {
        setIsAccessible(true);
        return;
      }

      const hour = now.getHours();
      // Accessible from 12 AM (0) to 5 AM (5)
      setIsAccessible(hour >= 0 && hour < 5);
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
  ];

  const themes = [
    { name: 'Midnight Romance', colors: ['#1a1a2e', '#16213e', '#0f3460'], price: 100 },
    { name: 'Sunset Dreams', colors: ['#ff6b6b', '#feca57', '#ff9ff3'], price: 120 },
    { name: 'Ethereal Garden', colors: ['#a8e6cf', '#dcedc1', '#ffd3a5'], price: 110 },
  ];

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
          <div className="lg:col-span-2">
            <Card className="glass border-white/20 h-96">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Home className="w-6 h-6 text-lovers-primary" />
                  <span>Your Dream Space</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <div className="w-full h-64 bg-gradient-to-br from-lovers-accent/20 to-lovers-primary/10 rounded-2xl border border-lovers-primary/20 flex items-center justify-center relative overflow-hidden">
                  {/* Simulated 3D Room Preview */}
                  <div className="text-center z-10">
                    <Heart className="w-16 h-16 text-lovers-primary mx-auto mb-4 animate-heart-beat" />
                    <p className="text-lovers-primary font-medium">Your cozy space awaits...</p>
                    <p className="text-sm text-muted-foreground mt-2">Add decorations to personalize</p>
                  </div>
                  
                  {/* Floating hearts in the room */}
                  <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-2xl opacity-20"
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

            {/* Quick Actions */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full btn-lovers">
                  <Music className="w-4 h-4 mr-2" />
                  Play Romantic Music
                </Button>
                <Button variant="outline" className="w-full border-lovers-primary/50 text-lovers-primary">
                  <Lock className="w-4 h-4 mr-2" />
                  Private Mode
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};