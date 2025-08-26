import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChat } from '@/contexts/ChatContext';
import { useLoveCoins } from '@/contexts/LoveCoinsContext';
import { 
  Gamepad2, 
  Trophy, 
  Users, 
  Play, 
  Star,
  Heart,
  Zap,
  Target,
  Crown,
  Gift,
  Coins
} from 'lucide-react';

interface Game {
  id: string;
  name: string;
  description: string;
  category: 'puzzle' | 'arcade' | 'strategy' | 'romance';
  players: '1' | '2' | 'multi';
  difficulty: 'easy' | 'medium' | 'hard';
  rewards: number;
  icon: string;
  isPopular?: boolean;
  isNew?: boolean;
}

export const GamesHub: React.FC = () => {
  const { mode } = useChat();
  const { coins, earnCoins } = useLoveCoins();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const isLoversMode = mode === 'lovers';

  const generalGames: Game[] = [
    {
      id: '1',
      name: 'Word Match',
      description: 'Find matching words with friends',
      category: 'puzzle',
      players: 'multi',
      difficulty: 'medium',
      rewards: 30,
      icon: '🔤',
      isNew: true,
    },
    {
      id: '2',
      name: 'Memory Cards',
      description: 'Classic memory matching game',
      category: 'puzzle',
      players: '1',
      difficulty: 'easy',
      rewards: 20,
      icon: '🃏',
    },
    {
      id: '3',
      name: 'Tic Tac Toe',
      description: 'Classic strategy game',
      category: 'strategy',
      players: '2',
      difficulty: 'easy',
      rewards: 25,
      icon: '⭕',
    },
    {
      id: '4',
      name: 'Emoji Puzzle',
      description: 'Guess the movie from emojis',
      category: 'puzzle',
      players: 'multi',
      difficulty: 'medium',
      rewards: 35,
      icon: '😊',
      isPopular: true,
    },
    {
      id: '5',
      name: 'Quick Draw',
      description: 'Draw and guess in real-time',
      category: 'arcade',
      players: '2',
      difficulty: 'medium',
      rewards: 45,
      icon: '🎨',
    },
  ];

  const loversGames: Game[] = [
    {
      id: '1',
      name: 'Love Quiz',
      description: 'Test how well you know your partner',
      category: 'romance',
      players: '2',
      difficulty: 'easy',
      rewards: 50,
      icon: '❤️',
      isPopular: true,
    },
    {
      id: '2',
      name: 'Dream Room Chat',
      description: 'Private space for intimate conversations',
      category: 'romance',
      players: '2',
      difficulty: 'easy',
      rewards: 100,
      icon: '🌙',
      isNew: true,
    },
    {
      id: '3',
      name: 'Truth or Dare',
      description: 'Romantic questions and dares',
      category: 'romance',
      players: '2',
      difficulty: 'medium',
      rewards: 40,
      icon: '🎭',
      isPopular: true,
    },
    {
      id: '4',
      name: 'Love Story Builder',
      description: 'Create your romantic story together',
      category: 'romance',
      players: '2',
      difficulty: 'easy',
      rewards: 60,
      icon: '📖',
    },
    {
      id: '5',
      name: 'Virtual Pet',
      description: 'Take care of your love pet together',
      category: 'romance',
      players: '2',
      difficulty: 'easy',
      rewards: 75,
      icon: '🐾',
    },
  ];

  const games = isLoversMode ? loversGames : generalGames;

  const filteredGames = selectedCategory === 'all' 
    ? games 
    : games.filter(game => {
        if (selectedCategory === 'dreamroom') {
          return game.category === 'romance' || game.name.includes('Dream');
        }
        return game.category === selectedCategory;
      });

  const handlePlayGame = (game: Game) => {
    earnCoins(game.rewards, `Playing ${game.name}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getPlayersIcon = (players: string) => {
    switch (players) {
      case '1': return <Target className="w-4 h-4" />;
      case '2': return <Users className="w-4 h-4" />;
      case 'multi': return <Crown className="w-4 h-4" />;
      default: return <Gamepad2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Gamepad2 className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <h1 className="text-3xl font-bold mb-2">Games Hub</h1>
          <p className="text-muted-foreground">
            {isLoversMode ? 'Play romantic games together' : 'Fun games to enjoy with friends'}
          </p>
          
          {/* Coins Display */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${isLoversMode ? 'bg-lovers-primary/20 text-lovers-primary' : 'bg-general-primary/20 text-general-primary'}`}>
              <Coins className="w-5 h-5" />
              <span className="font-bold">{coins} Coins</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
          <TabsList className={`grid w-full glass border-white/20 ${
            isLoversMode ? 'grid-cols-3' : 'grid-cols-4'
          }`}>
            <TabsTrigger value="all">All Games</TabsTrigger>
            {isLoversMode ? (
              <>
                <TabsTrigger value="romance">Romance</TabsTrigger>
                <TabsTrigger value="dreamroom">Dream Room</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="puzzle">Puzzle</TabsTrigger>
                <TabsTrigger value="arcade">Arcade</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-6">
            {/* Featured Games */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                  <span>Featured Games</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGames.slice(0, 3).map((game) => (
                    <div
                      key={game.id}
                      className="relative p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer border border-white/10"
                    >
                      {game.isPopular && (
                        <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white">
                          🔥 Popular
                        </Badge>
                      )}
                      {game.isNew && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500 text-white">
                          ✨ New
                        </Badge>
                      )}
                      
                      <div className="text-center">
                        <div className="text-4xl mb-4">{game.icon}</div>
                        <h3 className="text-lg font-bold mb-2">{game.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            {getPlayersIcon(game.players)}
                            <span className="text-sm">{game.players} Player{game.players !== '1' ? 's' : ''}</span>
                          </div>
                          <div className={`flex items-center space-x-1 ${getDifficultyColor(game.difficulty)}`}>
                            <Zap className="w-4 h-4" />
                            <span className="text-sm capitalize">{game.difficulty}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className={`flex items-center space-x-1 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`}>
                            <Gift className="w-4 h-4" />
                            <span className="text-sm font-medium">+{game.rewards} coins</span>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => handlePlayGame(game)}
                          className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Play Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* All Games Grid */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>All Games</span>
                  <Badge variant="outline" className={`${isLoversMode ? 'text-lovers-primary border-lovers-primary/50' : 'text-general-primary border-general-primary/50'}`}>
                    {filteredGames.length} games
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredGames.map((game) => (
                    <div
                      key={game.id}
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-3">{game.icon}</div>
                        <h4 className="font-medium mb-2">{game.name}</h4>
                        <p className="text-xs text-muted-foreground mb-3">{game.description}</p>
                        
                        <div className="flex items-center justify-between text-xs mb-3">
                          <span className={getDifficultyColor(game.difficulty)}>{game.difficulty}</span>
                          <span className={isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}>
                            +{game.rewards}
                          </span>
                        </div>
                        
                        <Button 
                          size="sm"
                          onClick={() => handlePlayGame(game)}
                          className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stats Card */}
        {isLoversMode && (
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
                <span>Love Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-lovers-primary/10">
                  <p className="text-2xl font-bold text-lovers-primary">0</p>
                  <p className="text-sm text-muted-foreground">Games Played</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-lovers-primary/10">
                  <p className="text-2xl font-bold text-lovers-primary">0</p>
                  <p className="text-sm text-muted-foreground">Love Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};