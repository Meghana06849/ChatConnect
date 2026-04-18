import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatLayout } from "@/components/layout/ChatLayout";
import { useUserPresence } from '@/hooks/useUserPresence';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { useLoveCoins } from '@/contexts/LoveCoinsContext';
import { User } from '@supabase/supabase-js';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { updateStreak } = useLoveCoins();
  
  // Track user presence (online/offline status)
  useUserPresence();
  
  // Enable push notifications for new messages
  useMessageNotifications(user?.id || null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/');
      } else {
        // Update daily streak on login
        updateStreak();
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate('/');
        } else if (event === 'SIGNED_IN') {
          // Update streak on sign in
          updateStreak();
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, updateStreak]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <ChatLayout />;
};

export default Dashboard;
