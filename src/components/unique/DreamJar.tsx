import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Clock, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DreamWish {
  id: string;
  content: string;
  reveal_date: string;
  is_revealed: boolean;
  created_at: string;
}

export const DreamJar: React.FC = () => {
  const [wishes, setWishes] = useState<DreamWish[]>([]);
  const [newWish, setNewWish] = useState('');
  const [revealDate, setRevealDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadWishes();
  }, []);

  const loadWishes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dream_features')
        .select('*')
        .eq('user_id', user.id)
        .eq('feature_type', 'dream_jar')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const wishData = data?.map(item => ({
        id: item.id,
        content: item.data.content,
        reveal_date: item.data.reveal_date,
        is_revealed: new Date(item.data.reveal_date) <= new Date(),
        created_at: item.created_at
      })) || [];

      setWishes(wishData);
    } catch (error: any) {
      toast({
        title: "Error loading wishes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addWish = async () => {
    if (!newWish.trim() || !revealDate) {
      toast({
        title: "Missing information",
        description: "Please enter both a wish and reveal date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dream_features')
        .insert([{
          user_id: user.id,
          feature_type: 'dream_jar',
          data: {
            content: newWish,
            reveal_date: revealDate,
            created_at: new Date().toISOString()
          }
        }]);

      if (error) throw error;

      toast({
        title: "Wish added! ✨",
        description: "Your wish has been sealed in the Dream Jar.",
      });

      setNewWish('');
      setRevealDate('');
      loadWishes();
    } catch (error: any) {
      toast({
        title: "Error adding wish",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilReveal = (revealDate: string) => {
    const today = new Date();
    const reveal = new Date(revealDate);
    const diffTime = reveal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Sparkles className="w-8 h-8 text-lovers-primary animate-pulse" />
          <h2 className="text-2xl font-bold">Dream Jar</h2>
          <Sparkles className="w-8 h-8 text-lovers-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground">
          Drop your dreams and wishes here. They'll magically reveal themselves when the time is right! ✨
        </p>
      </div>

      {/* Add New Wish */}
      <Card className="glass border-lovers-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-lovers-primary" />
            <span>Make a Wish</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wish">Your Wish</Label>
            <Textarea
              id="wish"
              placeholder="What do you wish for? Dreams, goals, or special moments..."
              value={newWish}
              onChange={(e) => setNewWish(e.target.value)}
              className="glass border-white/20 min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="revealDate">When should this reveal?</Label>
            <Input
              id="revealDate"
              type="date"
              value={revealDate}
              onChange={(e) => setRevealDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="glass border-white/20"
            />
          </div>
          
          <Button
            onClick={addWish}
            disabled={loading}
            className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary hover:opacity-90"
          >
            {loading ? 'Adding Wish...' : '✨ Seal in Dream Jar'}
          </Button>
        </CardContent>
      </Card>

      {/* Wishes List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
          <span>Your Wishes ({wishes.length})</span>
        </h3>
        
        {wishes.length === 0 ? (
          <Card className="glass border-white/20">
            <CardContent className="text-center py-8">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Your Dream Jar is empty. Make your first wish!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {wishes.map((wish) => {
              const daysUntil = getDaysUntilReveal(wish.reveal_date);
              const isRevealed = wish.is_revealed;

              return (
                <Card
                  key={wish.id}
                  className={`glass transition-all duration-300 ${
                    isRevealed 
                      ? 'border-lovers-primary/40 bg-lovers-primary/5' 
                      : 'border-white/20'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge
                        className={
                          isRevealed
                            ? 'bg-lovers-primary/20 text-lovers-primary'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {isRevealed ? (
                          <><Gift className="w-3 h-3 mr-1" /> Revealed!</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> {daysUntil} days</>
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(wish.reveal_date)}
                      </span>
                    </div>
                    
                    {isRevealed ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Your wish was:</p>
                        <p className="text-foreground bg-lovers-primary/10 p-3 rounded-lg border border-lovers-primary/20">
                          {wish.content}
                        </p>
                        <p className="text-xs text-lovers-primary">✨ Dream revealed!</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                        <p className="text-muted-foreground text-sm">
                          This wish is sealed until {formatDate(wish.reveal_date)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {daysUntil > 0 ? `${daysUntil} days to go...` : 'Ready to reveal!'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};