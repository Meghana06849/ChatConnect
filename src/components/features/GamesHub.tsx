import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Gamepad2, 
  Play, 
  Trophy, 
  Users, 
  Star,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'puzzle' | 'arcade' | 'strategy' | 'romance' | 'couples';
  players: 'single' | 'multiplayer';
  difficulty: 'easy' | 'medium' | 'hard';
  isOnline?: boolean;
}

const gameCategories = {
  general: [
    {
      id: 'puzzle1',
      title: 'Word Chain',
      description: 'Create words from the last letter',
      icon: '🔤',
      category: 'puzzle' as const,
      players: 'multiplayer' as const,
      difficulty: 'easy' as const
    },
    {
      id: 'arcade1', 
      title: 'Quick Math',
      description: 'Fast calculation challenges',
      icon: '🧮',
      category: 'arcade' as const,
      players: 'single' as const,
      difficulty: 'medium' as const
    },
    {
      id: 'strategy1',
      title: 'Tic Tac Toe',
      description: 'Classic strategy game',
      icon: '⭕',
      category: 'strategy' as const,
      players: 'multiplayer' as const,
      difficulty: 'easy' as const
    }
  ],
  lovers: [
    {
      id: 'romance1',
      title: 'Love Quiz',
      description: 'How well do you know each other?',
      icon: '💕',
      category: 'romance' as const,
      players: 'multiplayer' as const,
      difficulty: 'medium' as const
    },
    {
      id: 'couples1',
      title: 'Truth or Dare',
      description: 'Romantic edition for couples',
      icon: '💋',
      category: 'couples' as const,
      players: 'multiplayer' as const,
      difficulty: 'easy' as const
    },
    {
      id: 'romance2',
      title: 'Memory Lane',
      description: 'Remember your special moments',
      icon: '📸',
      category: 'romance' as const,
      players: 'multiplayer' as const,
      difficulty: 'medium' as const
    }
  ]
};

export const GamesHub: React.FC = () => {
  const { mode } = useChat();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const isLoversMode = mode === 'lovers';
  const games = gameCategories[isLoversMode ? 'lovers' : 'general'];

  const filteredGames = games.filter(game => {
    if (selectedCategory === 'all') return true;
    return game.category === selectedCategory;
  });

  const sendGameInvite = (game: Game, friendId?: string) => {
    const gameLink = `${window.location.origin}/game/${game.id}?mode=lovers&invite=${Math.random().toString(36).substr(2, 9)}`;
    navigator.clipboard.writeText(gameLink);
    
    toast({
      title: `Game Invite Link Created!`,
      description: `Link copied to clipboard. Share with your partner to play ${game.title}`,
    });
  };

  const playGame = (game: Game) => {
    if (game.players === 'multiplayer') {
      // For multiplayer games, send invite instead of playing directly
      sendGameInvite(game);
    } else {
      toast({
        title: `Starting ${game.title}`,
        description: 'Game will load in a moment...',
      });
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-500/20 text-green-500',
      medium: 'bg-yellow-500/20 text-yellow-500', 
      hard: 'bg-red-500/20 text-red-500'
    };
    return colors[difficulty as keyof typeof colors] || colors.easy;
  };

  const categories = isLoversMode 
    ? [
        { id: 'all', label: 'All', icon: '💕' },
        { id: 'romance', label: 'Romance', icon: '💝' },
        { id: 'couples', label: 'Couples', icon: '👫' }
      ]
    : [
        { id: 'all', label: 'All', icon: '🎮' },
        { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
        { id: 'arcade', label: 'Arcade', icon: '🕹️' },
        { id: 'strategy', label: 'Strategy', icon: '♟️' }
      ];

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`
            inline-flex items-center justify-center w-24 h-24 rounded-full mb-6
            ${isLoversMode 
              ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
              : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
            }
          `}>
            <Gamepad2 className={`w-12 h-12 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isLoversMode ? 'Love Games' : 'Games Hub'}
          </h1>
          <p className="text-muted-foreground">
            {isLoversMode ? 'Play romantic games together' : 'Send game invites to friends'}
          </p>
        </div>

        {/* Category Filters */}
        <Card className="glass border-white/20">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    ${selectedCategory === category.id 
                      ? (isLoversMode ? 'bg-lovers-primary hover:bg-lovers-primary/90' : 'bg-general-primary hover:bg-general-primary/90')
                      : 'glass border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Games Grid - Unique Aurora Design */}
        <div className="space-y-6">
          {/* Featured Games */}
          <div className="relative">
            <div className={`
              absolute inset-0 rounded-3xl blur-xl opacity-30
              ${isLoversMode 
                ? 'bg-gradient-to-r from-lovers-primary via-lovers-secondary to-lovers-primary' 
                : 'bg-gradient-to-r from-general-primary via-general-secondary to-general-primary'
              }
            `}></div>
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.slice(0, 3).map((game, index) => (
                <Card key={game.id} className={`
                  glass border-white/20 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden
                  transform hover:-translate-y-2 hover:scale-105
                `}>
                  {/* Game glow effect */}
                  <div className={`
                    absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500
                    ${isLoversMode 
                      ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' 
                      : 'bg-gradient-to-br from-general-primary to-general-secondary'
                    }
                  `}></div>
                  
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`
                        text-6xl group-hover:scale-110 transition-transform duration-300
                        ${index === 0 ? 'animate-bounce' : index === 1 ? 'animate-pulse' : 'animate-float'}
                      `}>
                        {game.icon}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getDifficultyBadge(game.difficulty)}>
                          {game.difficulty}
                        </Badge>
                        <Badge variant="outline" className={`
                          ${isLoversMode ? 'border-lovers-primary/50 text-lovers-primary' : 'border-general-primary/50 text-general-primary'}
                          group-hover:bg-white/10
                        `}>
                          {game.players === 'multiplayer' ? '👥 Multi' : '👤 Solo'}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-xl mb-2 group-hover:text-white transition-colors">
                      {game.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground group-hover:text-white/80 transition-colors">
                      {game.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="relative z-10">
                    <Button 
                      onClick={() => playGame(game)}
                      className={`
                        w-full relative overflow-hidden group/btn
                        ${isLoversMode ? 'btn-lovers' : 'btn-general'}
                        transform transition-all duration-300 hover:scale-105
                      `}
                    >
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                      {game.players === 'multiplayer' ? (
                        <>
                          <Send className="w-4 h-4 mr-2 group-hover/btn:animate-bounce" />
                          Send Invite
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2 group-hover/btn:animate-spin" />
                          Play Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Regular Games Grid */}
          {filteredGames.length > 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredGames.slice(3).map((game) => (
                <Card key={game.id} className="glass border-white/20 hover:shadow-lg transition-all duration-300 group hover:scale-105">
                  <CardHeader className="pb-2">
                    <div className="text-center">
                      <div className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-300">
                        {game.icon}
                      </div>
                      <CardTitle className="text-base mb-1">{game.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{game.description}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center mb-3">
                      <Badge className={getDifficultyBadge(game.difficulty)} style={{ fontSize: '10px' }}>
                        {game.difficulty}
                      </Badge>
                      <Badge variant="outline" className={`
                        text-xs ${isLoversMode ? 'border-lovers-primary/50 text-lovers-primary' : 'border-general-primary/50 text-general-primary'}
                      `}>
                        {game.players === 'multiplayer' ? '👥' : '👤'}
                      </Badge>
                    </div>
                    
                    <Button 
                      onClick={() => playGame(game)}
                      size="sm"
                      className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'} text-xs py-2`}
                    >
                      {game.players === 'multiplayer' ? (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Invite
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Empty State for No Games */}
        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <div className={`
              w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4
              ${isLoversMode 
                ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
                : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
              }
            `}>
              <Gamepad2 className={`w-12 h-12 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
            </div>
            <h3 className="text-xl font-semibold mb-2">No games in this category</h3>
            <p className="text-muted-foreground">Try selecting a different category!</p>
          </div>
        )}
      </div>
    </div>
  );
};