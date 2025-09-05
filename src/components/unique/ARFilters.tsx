import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Sparkles, 
  Star, 
  Heart,
  Smile,
  Eye,
  Zap,
  Crown,
  Flame,
  Snowflake
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ARFilters: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  const filters = [
    { id: 'none', name: 'No Filter', icon: '😊', color: 'bg-gray-500' },
    { id: 'sparkle', name: 'Sparkle Eyes', icon: '✨', color: 'bg-yellow-500' },
    { id: 'heart', name: 'Heart Eyes', icon: '😍', color: 'bg-pink-500' },
    { id: 'fire', name: 'Fire Crown', icon: '🔥', color: 'bg-orange-500' },
    { id: 'ice', name: 'Ice Queen', icon: '❄️', color: 'bg-blue-500' },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈', color: 'bg-purple-500' },
    { id: 'angel', name: 'Angel Halo', icon: '😇', color: 'bg-white' },
    { id: 'devil', name: 'Devil Horns', icon: '😈', color: 'bg-red-500' },
    { id: 'cat', name: 'Cat Ears', icon: '🐱', color: 'bg-orange-400' },
    { id: 'bunny', name: 'Bunny Ears', icon: '🐰', color: 'bg-pink-400' },
    { id: 'crown', name: 'Royal Crown', icon: '👑', color: 'bg-yellow-600' },
    { id: 'glasses', name: 'Cool Glasses', icon: '😎', color: 'bg-gray-700' },
  ];

  const handleTakePhoto = () => {
    toast({
      title: "Photo captured! 📸",
      description: `Photo taken with ${filters.find(f => f.id === selectedFilter)?.name} filter`
    });
  };

  const handleStartVideo = () => {
    setIsRecording(!isRecording);
    toast({
      title: isRecording ? "Video stopped" : "Video recording started",
      description: isRecording 
        ? "Video saved to your gallery" 
        : `Recording with ${filters.find(f => f.id === selectedFilter)?.name} filter`
    });
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Camera className="w-16 h-16 mx-auto mb-4 text-primary animate-bounce" />
          <h1 className="text-3xl font-bold mb-2">AR Filters & Effects</h1>
          <p className="text-muted-foreground">
            Transform yourself with amazing AR filters and create magical content
          </p>
        </div>

        {/* Camera Preview */}
        <Card className="glass border-white/20 mb-6">
          <CardContent className="p-0">
            <div className="relative w-full h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
              {/* Simulated camera view */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse"></div>
              
              {/* Filter preview overlay */}
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-2">
                  {filters.find(f => f.id === selectedFilter)?.icon || '😊'}
                </div>
                <p className="text-white font-medium">
                  {filters.find(f => f.id === selectedFilter)?.name} Active
                </p>
              </div>

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">REC</span>
                </div>
              )}

              {/* Camera controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={handleTakePhoto}
                >
                  <Camera className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  className={`
                    ${isRecording 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-primary hover:bg-primary/90'
                    }
                  `}
                  onClick={handleStartVideo}
                >
                  {isRecording ? '⏹️ Stop' : '🎥 Record'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Selection */}
        <Card className="glass border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>AR Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={selectedFilter === filter.id ? "default" : "outline"}
                  className={`
                    h-20 flex-col space-y-2 p-2
                    ${selectedFilter === filter.id 
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
                      : "glass border-white/20 hover:bg-white/10"
                    }
                  `}
                  onClick={() => setSelectedFilter(filter.id)}
                >
                  <span className="text-2xl">{filter.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">
                    {filter.name}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filter Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <span>Beauty Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline" className="glass">Smooth Skin</Badge>
                <Badge variant="outline" className="glass">Bright Eyes</Badge>
                <Badge variant="outline" className="glass">Lip Enhancement</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span>Fantasy Effects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline" className="glass">Magic Particles</Badge>
                <Badge variant="outline" className="glass">Fairy Wings</Badge>
                <Badge variant="outline" className="glass">Dragon Eyes</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-purple-500" />
                <span>Trending Now</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline" className="glass">Galaxy Eyes</Badge>
                <Badge variant="outline" className="glass">Neon Glow</Badge>
                <Badge variant="outline" className="glass">Time Warp</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};