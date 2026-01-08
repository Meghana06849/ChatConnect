import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface FriendProfile {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  isVerified?: boolean;
  verificationType?: string | null;
}

export interface FriendRequest {
  id: string;
  userId: string;
  contactUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  senderProfile?: FriendProfile;
  receiverProfile?: FriendProfile;
}

interface OnlineUser {
  id: string;
  userId: string;
  isOnline: boolean;
  lastSeen: string | null;
}

export const useFriendRequests = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  // Load all friend requests
  const loadRequests = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .or(`user_id.eq.${currentUserId},contact_user_id.eq.${currentUserId}`);

      if (error) throw error;

      // Fetch profiles for all contacts
      const userIds = new Set<string>();
      data?.forEach(contact => {
        userIds.add(contact.user_id);
        userIds.add(contact.contact_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, is_online, is_verified, verification_type')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const formattedRequests: FriendRequest[] = (data || []).map(contact => {
        const senderProfile = profileMap.get(contact.user_id);
        const receiverProfile = profileMap.get(contact.contact_user_id);

        return {
          id: contact.id,
          userId: contact.user_id,
          contactUserId: contact.contact_user_id,
          status: contact.status as 'pending' | 'accepted' | 'rejected',
          createdAt: contact.created_at,
          senderProfile: senderProfile ? {
            username: senderProfile.username || 'unknown',
            displayName: senderProfile.display_name || 'Unknown',
            avatarUrl: senderProfile.avatar_url,
            isOnline: senderProfile.is_online || false,
            isVerified: senderProfile.is_verified || false,
            verificationType: senderProfile.verification_type
          } : undefined,
          receiverProfile: receiverProfile ? {
            username: receiverProfile.username || 'unknown',
            displayName: receiverProfile.display_name || 'Unknown',
            avatarUrl: receiverProfile.avatar_url,
            isOnline: receiverProfile.is_online || false,
            isVerified: receiverProfile.is_verified || false,
            verificationType: receiverProfile.verification_type
          } : undefined
        };
      });

      setRequests(formattedRequests);

      // Update online users map
      const onlineMap = new Map<string, boolean>();
      profiles?.forEach(p => onlineMap.set(p.user_id, p.is_online || false));
      setOnlineUsers(onlineMap);

    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Send friend request by username, custom ID, display name, or User ID
  const sendRequest = useCallback(async (identifier: string): Promise<boolean> => {
    if (!currentUserId) return false;

    try {
      const trimmedIdentifier = identifier.trim().replace(/^@/, '');

      // Check if identifier looks like a UUID (User ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedIdentifier);

      // IMPORTANT: profiles SELECT is restricted by RLS (connected users only).
      // Use RPC that returns limited public fields and bypasses that restriction for discovery.
      const { data: matches, error: matchError } = await supabase.rpc('search_profiles', {
        _query: trimmedIdentifier,
      });

      if (matchError) throw matchError;

      const best = (matches || [])[0] as
        | { user_id: string; display_name: string | null; username: string | null }
        | undefined;

      const exact = (matches || []).find((m: any) => {
        if (isUUID) return m.user_id === trimmedIdentifier;
        const q = trimmedIdentifier.toLowerCase();
        return (
          (m.username && String(m.username).toLowerCase() === q) ||
          (m.display_name && String(m.display_name).toLowerCase() === q)
        );
      }) as any;

      const targetUser = (exact || best) ? { user_id: (exact || best).user_id, display_name: (exact || best).display_name } : null;

      if (!targetUser) {
        toast({
          title: 'User not found',
          description: isUUID
            ? 'No user exists with that User ID.'
            : 'No user exists with that identifier (username, display name, or custom User ID).',
          variant: 'destructive',
        });
        return false;
      }

      // Prevent self-request
      if (targetUser.user_id === currentUserId) {
        toast({
          title: 'Invalid action',
          description: 'You cannot send a friend request to yourself',
          variant: 'destructive',
        });
        return false;
      }

      // Check for existing request (both directions)
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, status')
        .or(
          `and(user_id.eq.${currentUserId},contact_user_id.eq.${targetUser.user_id}),and(user_id.eq.${targetUser.user_id},contact_user_id.eq.${currentUserId})`
        )
        .maybeSingle();

      if (existing) {
        const statusMessage =
          existing.status === 'pending'
            ? 'A friend request is already pending'
            : 'You are already connected with this user';
        toast({
          title: 'Request exists',
          description: statusMessage,
          variant: 'destructive',
        });
        return false;
      }

      // Insert new request
      const { error: insertError } = await supabase.from('contacts').insert({
        user_id: currentUserId,
        contact_user_id: targetUser.user_id,
        status: 'pending',
      });

      if (insertError) throw insertError;

      toast({
        title: 'Friend request sent!',
        description: `Request sent to ${targetUser.display_name || 'user'}`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to send request',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [currentUserId]);

  // Decline/reject friend request
  const declineRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: "Friend request declined" });
      return true;
    } catch (error) {
      toast({
        title: "Failed to decline request",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  // Cancel sent request
  const cancelRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: "Friend request cancelled" });
      return true;
    } catch (error) {
      toast({
        title: "Failed to cancel request",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  // Remove friend
  const removeFriend = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: "Friend removed" });
      return true;
    } catch (error) {
      toast({
        title: "Failed to remove friend",
        variant: "destructive"
      });
      return false;
    }
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUserId) return;

    loadRequests();

    // Subscribe to contacts changes (friend requests)
    const contactsChannel = supabase
      .channel('realtime-friend-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contacts',
          filter: `contact_user_id=eq.${currentUserId}`
        },
        async (payload) => {
          // New incoming friend request
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url, is_online, is_verified, verification_type')
            .eq('user_id', payload.new.user_id)
            .maybeSingle();

          const newRequest: FriendRequest = {
            id: payload.new.id,
            userId: payload.new.user_id,
            contactUserId: payload.new.contact_user_id,
            status: payload.new.status,
            createdAt: payload.new.created_at,
            senderProfile: senderProfile ? {
              username: senderProfile.username || 'unknown',
              displayName: senderProfile.display_name || 'Unknown',
              avatarUrl: senderProfile.avatar_url,
              isOnline: senderProfile.is_online || false,
              isVerified: senderProfile.is_verified || false,
              verificationType: senderProfile.verification_type
            } : undefined
          };

          setRequests(prev => [newRequest, ...prev]);

          // Show notification
          toast({
            title: "New friend request! 🎉",
            description: `${senderProfile?.display_name || 'Someone'} (@${senderProfile?.username || 'unknown'}) wants to connect`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${currentUserId}`
        },
        async (payload) => {
          // Request we sent - update local state
          const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url, is_online, is_verified, verification_type')
            .eq('user_id', payload.new.contact_user_id)
            .maybeSingle();

          const newRequest: FriendRequest = {
            id: payload.new.id,
            userId: payload.new.user_id,
            contactUserId: payload.new.contact_user_id,
            status: payload.new.status,
            createdAt: payload.new.created_at,
            receiverProfile: receiverProfile ? {
              username: receiverProfile.username || 'unknown',
              displayName: receiverProfile.display_name || 'Unknown',
              avatarUrl: receiverProfile.avatar_url,
              isOnline: receiverProfile.is_online || false,
              isVerified: receiverProfile.is_verified || false,
              verificationType: receiverProfile.verification_type
            } : undefined
          };

          setRequests(prev => [newRequest, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contacts'
        },
        async (payload) => {
          // Request status changed (accepted/rejected)
          const isRelated = payload.new.user_id === currentUserId || payload.new.contact_user_id === currentUserId;
          if (!isRelated) return;

          setRequests(prev => prev.map(req => 
            req.id === payload.new.id 
              ? { ...req, status: payload.new.status }
              : req
          ));

          // Notify if our sent request was accepted
          if (payload.new.user_id === currentUserId && payload.new.status === 'accepted') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', payload.new.contact_user_id)
              .maybeSingle();

            toast({
              title: "Request accepted! 🎉",
              description: `${profile?.display_name || 'Your friend'} accepted your friend request`
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'contacts'
        },
        (payload) => {
          // Request deleted (cancelled/declined/removed)
          setRequests(prev => prev.filter(req => req.id !== payload.old.id));
        }
      )
      .subscribe();

    // Subscribe to profile online status changes
    const profilesChannel = supabase
      .channel('realtime-online-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const { user_id, is_online } = payload.new;
          setOnlineUsers(prev => {
            const newMap = new Map(prev);
            newMap.set(user_id, is_online || false);
            return newMap;
          });

          // Update requests with new online status
          setRequests(prev => prev.map(req => {
            if (req.senderProfile && req.userId === user_id) {
              return { ...req, senderProfile: { ...req.senderProfile, isOnline: is_online || false } };
            }
            if (req.receiverProfile && req.contactUserId === user_id) {
              return { ...req, receiverProfile: { ...req.receiverProfile, isOnline: is_online || false } };
            }
            return req;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [currentUserId, loadRequests]);

  // Computed values
  const incomingRequests = requests.filter(
    r => r.contactUserId === currentUserId && r.status === 'pending'
  );
  
  const outgoingRequests = requests.filter(
    r => r.userId === currentUserId && r.status === 'pending'
  );
  
  const friends = requests.filter(r => r.status === 'accepted');

  return {
    currentUserId,
    requests,
    incomingRequests,
    outgoingRequests,
    friends,
    onlineUsers,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    refreshRequests: loadRequests
  };
};
