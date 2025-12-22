import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface BlockedUser {
  id: string;
  blockedUserId: string;
  blockType: 'block' | 'mute';
  reason: string | null;
  createdAt: string;
  profile?: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export const useBlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  // Load blocked users
  const loadBlockedUsers = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for blocked users
      const blockedIds = data?.map(b => b.blocked_user_id) || [];
      
      let profileMap = new Map();
      if (blockedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', blockedIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      const formattedBlocked: BlockedUser[] = (data || []).map(b => {
        const profile = profileMap.get(b.blocked_user_id);
        return {
          id: b.id,
          blockedUserId: b.blocked_user_id,
          blockType: b.block_type as 'block' | 'mute',
          reason: b.reason,
          createdAt: b.created_at,
          profile: profile ? {
            username: profile.username || 'unknown',
            displayName: profile.display_name || 'Unknown',
            avatarUrl: profile.avatar_url
          } : undefined
        };
      });

      setBlockedUsers(formattedBlocked);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      loadBlockedUsers();
    }
  }, [currentUserId, loadBlockedUsers]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('blocked-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_users',
          filter: `user_id=eq.${currentUserId}`
        },
        () => {
          loadBlockedUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadBlockedUsers]);

  // Block a user
  const blockUser = useCallback(async (userId: string, reason?: string): Promise<boolean> => {
    if (!currentUserId) return false;

    if (userId === currentUserId) {
      toast({
        title: 'Invalid action',
        description: 'You cannot block yourself',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: currentUserId,
          blocked_user_id: userId,
          block_type: 'block',
          reason: reason || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already blocked',
            description: 'This user is already blocked',
            variant: 'destructive'
          });
          return false;
        }
        throw error;
      }

      toast({
        title: 'User blocked',
        description: 'They will no longer be able to send you requests'
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to block user',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [currentUserId]);

  // Mute a user
  const muteUser = useCallback(async (userId: string, reason?: string): Promise<boolean> => {
    if (!currentUserId) return false;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: currentUserId,
          blocked_user_id: userId,
          block_type: 'mute',
          reason: reason || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already muted',
            description: 'This user is already muted',
            variant: 'destructive'
          });
          return false;
        }
        throw error;
      }

      toast({
        title: 'User muted',
        description: 'You will no longer receive notifications from them'
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to mute user',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [currentUserId]);

  // Unblock a user
  const unblockUser = useCallback(async (blockId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({ title: 'User unblocked' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to unblock user',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, []);

  // Check if a user is blocked
  const isBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.some(b => b.blockedUserId === userId);
  }, [blockedUsers]);

  // Get block type for a user
  const getBlockType = useCallback((userId: string): 'block' | 'mute' | null => {
    const blocked = blockedUsers.find(b => b.blockedUserId === userId);
    return blocked?.blockType || null;
  }, [blockedUsers]);

  return {
    blockedUsers,
    loading,
    blockUser,
    muteUser,
    unblockUser,
    isBlocked,
    getBlockType,
    refresh: loadBlockedUsers
  };
};
