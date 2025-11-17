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
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user has completed onboarding
        const hasCompletedOnboarding = localStorage.getItem('chatconnect_onboarding_completed');
        
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
        } else {
          navigate('/dashboard');
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // For new signups, show onboarding
          const hasCompletedOnboarding = localStorage.getItem('chatconnect_onboarding_completed');
          
          if (!hasCompletedOnboarding) {
            setShowOnboarding(true);
          } else {
            navigate('/dashboard');
          }
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

  if (showOnboarding && user) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return <AuthForm />;
};

export default Index;

