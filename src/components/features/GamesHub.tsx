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
    toast({
      title: `Game Invite Sent!`,
      description: `Invited ${friendId || 'friend'} to play ${game.title}`,
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

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <Card key={game.id} className="glass border-white/20 hover:shadow-lg transition-all duration-200 group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{game.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{game.description}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getDifficultyBadge(game.difficulty)}>
                    {game.difficulty}
                  </Badge>
                  <Badge variant="outline" className={`
                    ${isLoversMode ? 'border-lovers-primary/50 text-lovers-primary' : 'border-general-primary/50 text-general-primary'}
                  `}>
                    {game.players === 'multiplayer' ? '👥 Multiplayer' : '👤 Single'}
                  </Badge>
                </div>
                
                <Button 
                  onClick={() => playGame(game)}
                  className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                >
                  {game.players === 'multiplayer' ? (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
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