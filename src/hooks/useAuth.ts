import { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [customUserId, setCustomUserId] = useState<string | null>(null);

  const fetchCustomUserId = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('custom_user_id, username')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setCustomUserId(data.custom_user_id || data.username || null);
      }
    } catch (error) {
      console.error('Error fetching custom user ID:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          fetchCustomUserId(session.user.id);
        } else {
          setCustomUserId(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchCustomUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  // Returns custom_user_id if available, otherwise falls back to UUID
  const getUserId = useCallback(() => customUserId || user?.id || null, [customUserId, user]);
  
  // Returns the actual UUID (useful for database operations)
  const getAuthUserId = useCallback(() => user?.id ?? null, [user]);

  const getEmail = useCallback(() => user?.email ?? null, [user]);

  return {
    user,
    session,
    loading,
    signOut,
    getUserId,
    getAuthUserId,
    getEmail,
    customUserId,
    isAuthenticated: !!session,
  };
};

export default useAuth;
