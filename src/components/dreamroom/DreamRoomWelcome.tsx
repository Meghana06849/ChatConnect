import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Moon, 
  Sparkles, 
  Lock, 
  Video, 
  Calendar,
  Music,
  Gamepad2,
  Shield,
  Camera,
  Star,
  MessageCircle
} from 'lucide-react';

interface DreamRoomWelcomeProps {
  onEnter: () => void;
}

export const DreamRoomWelcome: React.FC<DreamRoomWelcomeProps> = ({ onEnter }) => {
  const features = [
    {
      icon: Lock,
      title: "Secret Love-Code Access",
      description: "Your private space, guarded by a PIN only you two know 🔐✨",
      gradient: "from-lovers-primary/20 to-lovers-secondary/20"
    },
    {
      icon: MessageCircle,
      title: "Glowing Dream Chat",
      description: "Messages that shimmer with love, disappear on command, and reveal at midnight 💬💫",
      gradient: "from-pink-500/20 to-purple-500/20"
    },
    {
      icon: Video,
      title: "Moonlit Calls",
      description: "Voice & video calls under a starry night sky that changes with your moods 🌙📞",
      gradient: "from-indigo-500/20 to-purple-600/20"
    },
    {
      icon: Sparkles,
      title: "Auto Day→Night Sky",
      description: "Your room transforms from sunrise pastels to cosmic night automatically ☀️→🌌",
      gradient: "from-amber-400/20 to-indigo-900/20"
    },
    {
      icon: Heart,
      title: "Mood-Synced Colors",
      description: "Room vibes shift based on your shared emotional wavelength 💕🎨",
      gradient: "from-rose-400/20 to-pink-600/20"
    },
    {
      icon: Calendar,
      title: "Couple Calendar",
      description: "Never miss date night, anniversaries, or those little 'just because' moments 📅💝",
      gradient: "from-blue-400/20 to-cyan-500/20"
    },
    {
      icon: Star,
      title: "Synced Mood Rings",
      description: "See each other's energy in real-time with animated soul indicators 🔮💫",
      gradient: "from-violet-500/20 to-fuchsia-500/20"
    },
    {
      icon: Camera,
      title: "Private Memories Timeline",
      description: "Upload pics, voice notes, & videos that only you two can access 📸🎞️",
      gradient: "from-emerald-400/20 to-teal-500/20"
    },
    {
      icon: Shield,
      title: "Encrypted Love Vault",
      description: "Ultra-secure storage for your most precious moments & secrets 🔒💎",
      gradient: "from-slate-600/20 to-zinc-700/20"
    },
    {
      icon: Heart,
      title: "Heart-Pulse Indicators",
      description: "Animated hearts pulse when your partner is thinking of you 💓✨",
      gradient: "from-red-400/20 to-pink-500/20"
    },
    {
      icon: Star,
      title: "Animated Soul-Pets",
      description: "Grow a virtual pet together that reflects your relationship health 🐱💕",
      gradient: "from-yellow-400/20 to-orange-500/20"
    },
    {
      icon: Gamepad2,
      title: "Mini Love-Games",
      description: "Play truth or dare, couple quizzes, & more to level up your bond 🎮❤️",
      gradient: "from-green-400/20 to-emerald-600/20"
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-floating-hearts"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          >
            {i % 2 === 0 ? '💕' : '✨'}
          </div>
        ))}
      </div>

      <div className="max-w-6xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Moon className="w-12 h-12 text-lovers-primary animate-float" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-lovers-primary via-lovers-secondary to-lovers-primary bg-clip-text text-transparent">
              Dream Room
            </h1>
            <Heart className="w-12 h-12 text-lovers-primary animate-heart-beat" />
          </div>
          
          <p className="text-2xl text-muted-foreground font-medium mb-3">
            Your Secret Love Universe 🌙✨
          </p>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Where late-night talks turn into forever memories. A premium, encrypted space 
            that's <span className="text-lovers-primary font-semibold">just for you two</span>. 
            No screenshots, no drama, pure vibes only.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Badge className="bg-gradient-to-r from-lovers-primary to-lovers-secondary text-white border-0 px-4 py-2">
              💎 Premium Feature
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-4 py-2">
              🔐 E2E Encrypted
            </Badge>
            <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 px-4 py-2">
              🌙 12AM-5AM Open
            </Badge>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="glass border-white/20 hover:scale-105 hover:shadow-2xl transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-6">
                <div className={`bg-gradient-to-br ${feature.gradient} rounded-2xl p-4 mb-4 inline-flex`}>
                  <feature.icon className="w-8 h-8 text-lovers-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Love Level Meter Preview */}
        <Card className="glass border-white/20 mb-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-foreground">Love Level Meter 💕</h3>
              <Badge className="bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0 px-4 py-2">
                Level 42
              </Badge>
            </div>
            <p className="text-muted-foreground mb-4">
              Play games, send messages, and share moments to level up your love! 
              Unlock special themes, pets, and features as you grow together.
            </p>
            <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-lovers-primary via-pink-500 to-lovers-secondary animate-pulse"
                style={{ width: '73%' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  73% to Next Level
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Button */}
        <div className="text-center animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <Button
            onClick={onEnter}
            size="lg"
            className="bg-gradient-to-r from-lovers-primary via-pink-500 to-lovers-secondary text-white border-0 px-12 py-6 text-xl font-bold rounded-2xl hover:scale-105 hover:shadow-2xl transition-all duration-300 animate-heart-beat"
          >
            <Lock className="w-6 h-6 mr-3" />
            Enter Dream Room
            <Sparkles className="w-6 h-6 ml-3" />
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            ✨ Requires PIN verification · Opens 12AM-5AM · Premium Lovers Mode only
          </p>
        </div>
      </div>
    </div>
  );
};
