import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';
import { useAuthRateLimit } from '@/hooks/useAuthRateLimit';

export const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isBlocked, remainingAttempts, checkRateLimit, recordFailedAttempt, resetRateLimit } = useAuthRateLimit();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const attemptType = isSignUp ? 'signup' : 'login';
    
    // Check rate limit before attempting auth
    const allowed = await checkRateLimit(email, attemptType);
    if (!allowed) {
      return;
    }
    
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: displayName || email.split('@')[0],
              username: username || email.split('@')[0]
            }
          }
        });

        if (error) throw error;

        // Reset rate limit on success
        await resetRateLimit(email, attemptType);

        toast({
          title: "Account created!",
          description: "Welcome to ChatConnect! You can start using the app immediately.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Reset rate limit on success
        await resetRateLimit(email, attemptType);

        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
      }
    } catch (error: any) {
      // Record failed attempt
      await recordFailedAttempt(email, attemptType);
      
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20">
      <div className="w-full max-w-md">
        {/* Simple Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4 group cursor-pointer">
            <MessageCircle className="w-10 h-10 text-[#00d4b5] drop-shadow-[0_0_8px_rgba(0,212,181,0.6)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_rgba(0,212,181,0.9)] group-hover:animate-pulse" />
            <span className="text-3xl font-bold text-[#00d4b5] drop-shadow-[0_4px_12px_rgba(0,212,181,0.4)] transition-all duration-300 group-hover:drop-shadow-[0_4px_20px_rgba(0,212,181,0.7)] group-hover:scale-105">
              ChatConnect
            </span>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="glass border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isSignUp ? 'Join ChatConnect' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Create your account to start connecting' 
                : 'Sign in to continue your conversations'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a unique username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="glass border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="How should we call you?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="glass border-white/20"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass border-white/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="glass border-white/20"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                disabled={loading || isBlocked}
              >
                {loading ? 'Please wait...' : isBlocked ? 'Temporarily Blocked' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
              
              {remainingAttempts !== null && remainingAttempts <= 3 && !isBlocked && (
                <p className="text-xs text-destructive text-center mt-2">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
              )}
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
              
              {!isSignUp && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => toast({ 
                      title: "Password Reset", 
                      description: "Check your email for reset instructions" 
                    })}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};