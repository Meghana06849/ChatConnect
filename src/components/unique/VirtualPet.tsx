import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Sparkles, Coffee, Gamepad2, Moon, Sun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PetData {
  name: string;
  type: string;
  level: number;
  happiness: number;
  energy: number;
  hunger: number;
  last_fed: string;
  last_played: string;
  last_slept: string;
  evolution_stage: number;
}

export const VirtualPet: React.FC = () => {
  const [pet, setPet] = useState<PetData>({
    name: 'Lovie',
    type: 'heart',
    level: 1,
    happiness: 80,
    energy: 70,
    hunger: 60,
    last_fed: '',
    last_played: '',
    last_slept: '',
    evolution_stage: 1
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPet();
    const interval = setInterval(updatePetStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadPet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dream_features')
        .select('*')
        .eq('user_id', user.id)
        .eq('feature_type', 'virtual_pet')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPet(data.data as unknown as PetData);
      } else {
        // Create initial pet
        await createInitialPet(user.id);
      }
    } catch (error: any) {
      console.error('Error loading pet:', error);
    }
  };

  const createInitialPet = async (userId: string) => {
    const initialPet = {
      name: 'Lovie',
      type: 'heart',
      level: 1,
      happiness: 80,
      energy: 70,
      hunger: 60,
      last_fed: new Date().toISOString(),
      last_played: new Date().toISOString(),
      last_slept: new Date().toISOString(),
      evolution_stage: 1
    };

    const { error } = await supabase
      .from('dream_features')
      .insert([{
        user_id: userId,
        feature_type: 'virtual_pet',
        data: initialPet
      }]);

    if (error) throw error;
    setPet(initialPet);
  };

  const updatePetStats = async () => {
    const now = new Date();
    const hoursSinceLastFed = pet.last_fed ? 
      (now.getTime() - new Date(pet.last_fed).getTime()) / (1000 * 60 * 60) : 0;
    const hoursSinceLastPlayed = pet.last_played ? 
      (now.getTime() - new Date(pet.last_played).getTime()) / (1000 * 60 * 60) : 0;

    let newHunger = Math.max(0, pet.hunger - (hoursSinceLastFed * 2));
    let newHappiness = Math.max(0, pet.happiness - (hoursSinceLastPlayed * 1));
    let newEnergy = pet.energy;

    // Energy decreases over time, increases with sleep
    if (hoursSinceLastPlayed > 8) {
      newEnergy = Math.max(0, newEnergy - 10);
    }

    setPet(prev => ({
      ...prev,
      hunger: newHunger,
      happiness: newHappiness,
      energy: newEnergy
    }));
  };

  const savePet = async (updatedPet: PetData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('dream_features')
        .upsert([{
          user_id: user.id,
          feature_type: 'virtual_pet',
          data: updatedPet as any
        }], { onConflict: 'user_id,feature_type' });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving pet:', error);
    }
  };

  const feedPet = () => {
    if (pet.hunger >= 90) {
      toast({
        title: "Pet is full! 🍰",
        description: `${pet.name} doesn't need food right now.`,
      });
      return;
    }

    const newPet = {
      ...pet,
      hunger: Math.min(100, pet.hunger + 30),
      happiness: Math.min(100, pet.happiness + 10),
      last_fed: new Date().toISOString()
    };

    setPet(newPet);
    savePet(newPet);

    toast({
      title: "Nom nom! 🍯",
      description: `${pet.name} enjoyed the treat and feels happier!`,
    });
  };

  const playWithPet = () => {
    if (pet.energy < 20) {
      toast({
        title: "Pet is tired! 😴",
        description: `${pet.name} needs to rest before playing.`,
      });
      return;
    }

    const newPet = {
      ...pet,
      happiness: Math.min(100, pet.happiness + 25),
      energy: Math.max(0, pet.energy - 15),
      last_played: new Date().toISOString()
    };

    setPet(newPet);
    savePet(newPet);

    toast({
      title: "Fun time! 🎾",
      description: `${pet.name} had a blast playing with you!`,
    });
  };

  const putPetToSleep = () => {
    const newPet = {
      ...pet,
      energy: Math.min(100, pet.energy + 40),
      happiness: Math.min(100, pet.happiness + 5),
      last_slept: new Date().toISOString()
    };

    setPet(newPet);
    savePet(newPet);

    toast({
      title: "Sweet dreams! 🌙",
      description: `${pet.name} is resting and regaining energy.`,
    });
  };

  const getPetEmoji = () => {
    if (pet.happiness > 80) return '💕';
    if (pet.happiness > 60) return '😊';
    if (pet.happiness > 40) return '😐';
    if (pet.happiness > 20) return '😔';
    return '😢';
  };

  const getPetStatus = () => {
    if (pet.happiness > 80 && pet.energy > 70 && pet.hunger > 70) return 'Thriving';
    if (pet.happiness > 60 && pet.energy > 50 && pet.hunger > 50) return 'Happy';
    if (pet.happiness > 40 || pet.energy > 30 || pet.hunger > 30) return 'Okay';
    return 'Needs Care';
  };

  const getStatusColor = () => {
    const status = getPetStatus();
    switch (status) {
      case 'Thriving': return 'text-green-500';
      case 'Happy': return 'text-blue-500';
      case 'Okay': return 'text-yellow-500';
      default: return 'text-red-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Heart className="w-8 h-8 text-lovers-primary animate-heart-beat" />
          <h2 className="text-2xl font-bold">Virtual Pet</h2>
          <Sparkles className="w-8 h-8 text-lovers-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground">
          Meet your digital companion that grows with your love! 🐾
        </p>
      </div>

      {/* Pet Display */}
      <Card className="glass border-lovers-primary/20">
        <CardContent className="text-center py-8">
          <div className="text-8xl mb-4 animate-bounce">
            {getPetEmoji()}
          </div>
          <h3 className="text-2xl font-bold mb-2">{pet.name}</h3>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Badge className={`${getStatusColor()} bg-lovers-primary/10`}>
              Level {pet.level}
            </Badge>
            <Badge className={`${getStatusColor()} bg-lovers-primary/10`}>
              {getPetStatus()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pet Stats */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-lovers-primary" />
            <span>Pet Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center space-x-1">
                <Heart className="w-4 h-4 text-pink-500" />
                <span>Happiness</span>
              </span>
              <span>{pet.happiness}%</span>
            </div>
            <Progress value={pet.happiness} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center space-x-1">
                <Coffee className="w-4 h-4 text-orange-500" />
                <span>Energy</span>
              </span>
              <span>{pet.energy}%</span>
            </div>
            <Progress value={pet.energy} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center space-x-1">
                <span className="text-yellow-500">🍯</span>
                <span>Hunger</span>
              </span>
              <span>{pet.hunger}%</span>
            </div>
            <Progress value={pet.hunger} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Pet Actions */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle>Care for {pet.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={feedPet}
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:opacity-90"
            >
              <span className="mr-2">🍯</span>
              Feed
            </Button>
            
            <Button
              onClick={playWithPet}
              disabled={loading || pet.energy < 20}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
            >
              <Gamepad2 className="w-4 h-4 mr-2" />
              Play
            </Button>
            
            <Button
              onClick={putPetToSleep}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:opacity-90"
            >
              <Moon className="w-4 h-4 mr-2" />
              Sleep
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pet Tips */}
      <Card className="glass border-white/20">
        <CardContent className="p-4">
          <div className="text-center">
            <h4 className="font-semibold mb-2">💡 Pet Care Tips</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Feed your pet regularly to keep hunger levels up</p>
              <p>• Play together to boost happiness and strengthen your bond</p>
              <p>• Let your pet rest when energy is low</p>
              <p>• A happy pet grows faster and unlocks new features!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};