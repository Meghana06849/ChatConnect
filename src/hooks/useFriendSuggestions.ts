import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FriendSuggestion {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  mutualFriendCount: number;
  isOnline: boolean;
}

export const useFriendSuggestions = (limit: number = 10) => {
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const loadSuggestions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_friend_suggestions', {
          requesting_user_id: user.id,
          suggestion_limit: limit
        });

      if (error) {
        console.error('Error loading suggestions:', error);
        setLoading(false);
        return;
      }

      const formattedSuggestions: FriendSuggestion[] = (data || []).map((s: any) => ({
        userId: s.user_id,
        username: s.username || 'unknown',
        displayName: s.display_name || 'Unknown',
        avatarUrl: s.avatar_url,
        mutualFriendCount: Number(s.mutual_friend_count) || 0,
        isOnline: s.is_online || false
      }));

      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error in loadSuggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const dismissSuggestion = useCallback((userId: string) => {
    setDismissedIds(prev => new Set([...prev, userId]));
    setSuggestions(prev => prev.filter(s => s.userId !== userId));
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setDismissedIds(new Set());
    loadSuggestions();
  }, [loadSuggestions]);

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.userId));

  return {
    suggestions: visibleSuggestions,
    loading,
    dismissSuggestion,
    refresh
  };
};
