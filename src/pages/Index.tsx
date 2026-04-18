import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from "@/components/auth/AuthForm";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { User } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStorageKey, setOnboardingStorageKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const getOnboardingStorageKey = (userId: string) => `chatconnect_onboarding_completed_${userId}`;
  const legacyOnboardingKey = 'chatconnect_onboarding_completed';

  const hasCompletedOnboarding = (storageKey: string) => {
    const userSpecificCompletion = localStorage.getItem(storageKey);

    if (userSpecificCompletion) {
      return true;
    }

    const legacyCompletion = localStorage.getItem(legacyOnboardingKey);
    if (legacyCompletion) {
      localStorage.setItem(storageKey, legacyCompletion);
      return true;
    }

    return false;
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      const nextStorageKey = nextUser ? getOnboardingStorageKey(nextUser.id) : null;

      setUser(nextUser);
      setOnboardingStorageKey(nextStorageKey);

      if (nextUser && nextStorageKey) {
        // Check if user has completed onboarding
        if (!hasCompletedOnboarding(nextStorageKey)) {
          setShowOnboarding(true);
        } else {
          navigate('/dashboard');
        }
      } else {
        setShowOnboarding(false);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextUser = session?.user ?? null;
        const nextStorageKey = nextUser ? getOnboardingStorageKey(nextUser.id) : null;

        setUser(nextUser);
        setOnboardingStorageKey(nextStorageKey);
        
        if (nextUser && event === 'SIGNED_IN' && nextStorageKey) {
          // For new signups, show onboarding
          if (!hasCompletedOnboarding(nextStorageKey)) {
            setShowOnboarding(true);
          } else {
            navigate('/dashboard');
          }
        } else if (!nextUser) {
          setShowOnboarding(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showOnboarding && user && onboardingStorageKey) {
    return <OnboardingFlow storageKey={onboardingStorageKey} onComplete={handleOnboardingComplete} />;
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return <AuthForm />;
};

export default Index;

