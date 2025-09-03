import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Smile, 
  Frown, 
  Meh, 
  Angry, 
  Zap,
  Sun,
  Cloud,
  Moon,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

const moodOptions = [
  { id: 'happy', icon: Smile, label: 'Happy', color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
  { id: 'love', icon: Heart, label: 'In Love', color: 'text-pink-500', bg: 'bg-pink-500/20' },
  { id: 'excited', icon: Zap, label: 'Excited', color: 'text-orange-500', bg: 'bg-orange-500/20' },
  { id: 'calm', icon: Sun, label: 'Calm', color: 'text-blue-500', bg: 'bg-blue-500/20' },
  { id: 'neutral', icon: Meh, label: 'Neutral', color: 'text-gray-500', bg: 'bg-gray-500/20' },
  { id: 'tired', icon: Moon, label: 'Tired', color: 'text-purple-500', bg: 'bg-purple-500/20' },
  { id: 'sad', icon: Frown, label: 'Sad', color: 'text-blue-600', bg: 'bg-blue-600/20' },
  { id: 'stressed', icon: Cloud, label: 'Stressed', color: 'text-gray-600', bg: 'bg-gray-600/20' },
];

export const MoodSync: React.FC = () => {
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [partnerMood, setPartnerMood] = useState<string | null>('happy'); // Mock partner mood
  const { toast } = useToast();
  const { updateProfile } = useProfile();

  const handleMoodSelect = async (moodId: string) => {
    setCurrentMood(moodId);
    
    // In a real app, this would sync with partner's device
    const success = await updateProfile({ 
      bio: `Currently feeling ${moodOptions.find(m => m.id === moodId)?.label.toLowerCase()}` 
    });
    
    if (success) {
      toast({
        title: `Mood Updated! ${moodOptions.find(m => m.id === moodId)?.label}`,
        description: "Your partner will see your current mood",
      });
    }
  };

  const getMoodMatch = () => {
    if (!currentMood || !partnerMood) return null;
    
    if (currentMood === partnerMood) {
      return { match: true, message: "Perfect mood sync! 💕" };
    }
    
    const happyMoods = ['happy', 'love', 'excited'];
    const calmMoods = ['calm', 'neutral'];
    const lowMoods = ['sad', 'tired', 'stressed'];
    
    const userMoodGroup = happyMoods.includes(currentMood) ? 'happy' : 
                         calmMoods.includes(currentMood) ? 'calm' : 'low';
    const partnerMoodGroup = happyMoods.includes(partnerMood) ? 'happy' : 
                            calmMoods.includes(partnerMood) ? 'calm' : 'low';
    
    if (userMoodGroup === partnerMoodGroup) {
      return { match: true, message: "You're both in sync! ✨" };
    }
    
    return { match: false, message: "Maybe send some love their way 💝" };
  };

  const moodMatch = getMoodMatch();

  return (
    <div className="space-y-6">
      <Card className="glass border-lovers-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-lovers-primary" />
            <span>Mood Sync</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Mood Selection */}
          <div>
            <h4 className="font-semibold mb-3">How are you feeling?</h4>
            <div className="grid grid-cols-4 gap-2">
              {moodOptions.map((mood) => {
                const Icon = mood.icon;
                const isSelected = currentMood === mood.id;
                
                return (
                  <Button
                    key={mood.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMoodSelect(mood.id)}
                    className={`flex flex-col h-16 ${isSelected ? mood.bg : ''}`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : mood.color}`} />
                    <span className="text-xs mt-1">{mood.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Partner's Mood */}
          {partnerMood && (
            <div>
              <h4 className="font-semibold mb-3">Your partner is feeling...</h4>
              <div className="flex items-center space-x-3">
                {(() => {
                  const partnerMoodData = moodOptions.find(m => m.id === partnerMood);
                  if (!partnerMoodData) return null;
                  const Icon = partnerMoodData.icon;
                  return (
                    <>
                      <div className={`p-3 rounded-full ${partnerMoodData.bg}`}>
                        <Icon className={`w-6 h-6 ${partnerMoodData.color}`} />
                      </div>
                      <div>
                        <p className="font-medium">{partnerMoodData.label}</p>
                        <p className="text-sm text-muted-foreground">2 minutes ago</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Mood Sync Result */}
          {moodMatch && (
            <div className="text-center">
              <Badge 
                variant={moodMatch.match ? "default" : "secondary"}
                className={moodMatch.match ? "bg-lovers-primary" : ""}
              >
                {moodMatch.message}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};