import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Mail, Lock, User, Loader2, Eye, EyeOff, Hash } from 'lucide-react';
import { useAuthRateLimit } from '@/hooks/useAuthRateLimit';

export const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'userid'>('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [customUserId, setCustomUserId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { isBlocked, remainingAttempts, checkRateLimit, recordFailedAttempt, resetRateLimit } = useAuthRateLimit();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google Sign-In Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const validateForm = (): string | null => {
    if (isSignUp) {
      if (!email.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
      if (!customUserId.trim()) return 'User ID is required';
      if (customUserId.length < 4 || customUserId.length > 32) return 'User ID must be 4-32 characters';
      if (!/^[a-zA-Z0-9_-]+$/.test(customUserId)) return 'User ID can only contain letters, numbers, _ and -';
    } else {
      if (loginMethod === 'email') {
        if (!email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
      } else {
        if (!userId.trim()) return 'User ID is required';
      }
    }
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    const identifier = isSignUp || loginMethod === 'email' ? email : userId;
    const attemptType = isSignUp ? 'signup' : 'login';
    
    // Check rate limit before attempting auth
    const allowed = await checkRateLimit(identifier, attemptType);
    if (!allowed) {
      return;
    }
    
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: displayName.trim() || customUserId.trim(),
              custom_user_id: customUserId.trim()
            }
          }
        });

        if (error) throw error;

        // Update profile with custom_user_id
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              custom_user_id: customUserId.trim(),
              username: customUserId.trim().toLowerCase(),
              display_name: displayName.trim() || customUserId.trim()
            })
            .eq('user_id', data.user.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
        }

        // Reset rate limit on success
        await resetRateLimit(identifier, attemptType);

        toast({
          title: "Account created!",
          description: `Welcome! Your User ID is: ${customUserId}. Use this to login and connect with friends!`,
        });
      } else {
        if (loginMethod === 'email') {
          // Standard email login
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

          if (error) throw error;
        } else {
          // User ID login via edge function
          const response = await supabase.functions.invoke('login-with-id', {
            body: { userId: userId.trim(), password }
          });

          if (response.error) {
            throw new Error(response.error.message || 'Login failed');
          }

          if (response.data?.error) {
            throw new Error(response.data.error);
          }

          // Set the session from the response
          if (response.data?.session) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: response.data.session.access_token,
              refresh_token: response.data.session.refresh_token,
            });
            
            if (sessionError) throw sessionError;
          }
        }

        // Reset rate limit on success
        await resetRateLimit(identifier, attemptType);

        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
      }
    } catch (error: any) {
      // Record failed attempt
      await recordFailedAttempt(identifier, attemptType);
      
      // Handle specific error messages
      let errorMessage = error.message || 'Authentication failed';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account.';
      } else if (error.message?.includes('Password should be')) {
        errorMessage = 'Password must be at least 6 characters long.';
      }
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a password reset link",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20">
      <div className="w-full max-w-md">
        {/* Logo */}
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
                ? 'Create your account with a unique User ID' 
                : 'Sign in with your User ID or email'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customUserId" className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Your Unique User ID
                    </Label>
                    <Input
                      id="customUserId"
                      type="text"
                      placeholder="e.g., john_doe123"
                      value={customUserId}
                      onChange={(e) => setCustomUserId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      required
                      maxLength={32}
                      disabled={loading}
                      className="glass border-white/20 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      4-32 characters. Letters, numbers, _ and - only. This will be your login ID.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name (optional)</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="How should we call you?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                      className="glass border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="glass border-white/20"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Login Method Tabs */}
                  <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'email' | 'userid')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 glass border-white/20">
                      <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="userid" className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        User ID
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="email" className="space-y-2 mt-4">
                      <Label htmlFor="email-login" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Label>
                      <Input
                        id="email-login"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="glass border-white/20"
                      />
                    </TabsContent>
                    
                    <TabsContent value="userid" className="space-y-2 mt-4">
                      <Label htmlFor="userid-login" className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        User ID
                      </Label>
                      <Input
                        id="userid-login"
                        type="text"
                        placeholder="your_user_id"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        disabled={loading}
                        className="glass border-white/20 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the User ID you created when signing up
                      </p>
                    </TabsContent>
                  </Tabs>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="glass border-white/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                disabled={loading || isBlocked}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : isBlocked ? (
                  'Temporarily Blocked'
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
              
              {remainingAttempts !== null && remainingAttempts <= 3 && !isBlocked && (
                <p className="text-xs text-destructive text-center mt-2">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
              )}
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <Separator className="bg-white/20" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>

            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full glass border-white/20"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Sign in with Google
            </Button>

            <div className="mt-6 text-center space-y-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                disabled={loading}
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
              
              {!isSignUp && loginMethod === 'email' && (
                <div>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    disabled={loading}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-muted/20 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                {isSignUp 
                  ? 'A unique User ID will be generated for your account. Save it for quick logins!'
                  : 'Sign in with your email or User ID to access General Chat, Lovers Mode, and Dream Room.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
