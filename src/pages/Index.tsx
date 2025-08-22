import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ChatLayout } from '@/components/layout/ChatLayout';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-general-primary/30 border-t-general-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading ChatConnect...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return <ChatLayout />;
};

export default Index;
