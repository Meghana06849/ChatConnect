import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Heart, 
  Camera, 
  MessageCircle, 
  MapPin,
  Gift,
  Calendar,
  Star,
  Check,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  completed: boolean;
  dueDate?: string;
}

const challenges: Challenge[] = [
  {
    id: '1',
    title: 'Send a Sweet Photo',
    description: 'Share a cute selfie or photo that made you think of them',
    icon: Camera,
    difficulty: 'easy',
    points: 10,
    completed: false,
  },
  {
    id: '2',
    title: 'Write a Love Letter',
    description: 'Send a heartfelt message about why you appreciate them',
    icon: MessageCircle,
    difficulty: 'medium',
    points: 25,
    completed: true,
  },
  {
    id: '3',
    title: 'Plan a Virtual Date',
    description: 'Organize a virtual date activity you can do together online',
    icon: Calendar,
    difficulty: 'medium',
    points: 30,
    completed: false,
    dueDate: '2025-09-10'
  },
  {
    id: '4',
    title: 'Share Your Location',
    description: 'Send a photo of somewhere special to you with the story',
    icon: MapPin,
    difficulty: 'easy',
    points: 15,
    completed: false,
  },
  {
    id: '5',
    title: 'Create a Memory Album',
    description: 'Compile your favorite photos together in the Dream Room',
    icon: Gift,
    difficulty: 'hard',
    points: 50,
    completed: false,
  },
];

export const CoupleChallenge: React.FC = () => {
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const { toast } = useToast();

  const completedChallenges = challenges.filter(c => c.completed).length;
  const totalPoints = challenges.filter(c => c.completed).reduce((sum, c) => sum + c.points, 0);
  const progressPercent = (completedChallenges / challenges.length) * 100;

  const handleStartChallenge = (challenge: Challenge) => {
    setActiveChallenge(challenge);
    toast({
      title: "Challenge Started! 💝",
      description: `Time to: ${challenge.title}`,
    });
  };

  const handleCompleteChallenge = (challengeId: string) => {
    toast({
      title: "Challenge Completed! 🎉",
      description: "Love points earned! Your bond grows stronger.",
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500 bg-green-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20';
      case 'hard': return 'text-red-500 bg-red-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="glass border-lovers-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-lovers-primary" />
            <span>Couple Challenges</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-lovers-primary mb-2">
              {totalPoints}
            </div>
            <p className="text-sm text-muted-foreground">Love Points Earned</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedChallenges}/{challenges.length}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-lovers-primary">
                {completedChallenges}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {challenges.length - completedChallenges}
              </div>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Challenge */}
      {activeChallenge && (
        <Card className="glass border-lovers-secondary/30 bg-gradient-to-r from-lovers-primary/10 to-lovers-secondary/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-lovers-secondary animate-pulse" />
              <span>Active Challenge</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <activeChallenge.icon className="w-6 h-6 text-lovers-primary" />
              <div>
                <h4 className="font-semibold">{activeChallenge.title}</h4>
                <p className="text-sm text-muted-foreground">{activeChallenge.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className={getDifficultyColor(activeChallenge.difficulty)}>
                {activeChallenge.difficulty.toUpperCase()}
              </Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{activeChallenge.points} points</span>
                <Button 
                  size="sm" 
                  onClick={() => handleCompleteChallenge(activeChallenge.id)}
                  className="bg-lovers-primary hover:bg-lovers-primary/80"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Challenges */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Challenges</h3>
        {challenges.map((challenge) => {
          const Icon = challenge.icon;
          
          return (
            <Card 
              key={challenge.id} 
              className={`glass transition-all hover:shadow-lg ${
                challenge.completed 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : 'border-white/20'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      challenge.completed ? 'bg-green-500/20' : 'bg-white/10'
                    }`}>
                      {challenge.completed ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Icon className="w-5 h-5 text-lovers-primary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{challenge.title}</h4>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                      {challenge.dueDate && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span className="text-xs text-orange-500">Due {challenge.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className={getDifficultyColor(challenge.difficulty)}>
                      {challenge.difficulty}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">{challenge.points} pts</div>
                      {!challenge.completed && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStartChallenge(challenge)}
                          className="mt-1"
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};