import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Heart, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ForgotPinDialog } from '@/components/auth/ForgotPinDialog';

interface LoversUnlockProps {
  onSectionChange: (section: string) => void;
}

export const LoversUnlock: React.FC<LoversUnlockProps> = ({ onSectionChange }) => {
  const { switchMode, setLoversPin } = useChat();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showVerifyPin, setShowVerifyPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  // Check if user has a hashed PIN in lovers_mode_secrets
  React.useEffect(() => {
    const checkPin = async () => {
      try {
        const { data, error } = await supabase.rpc('has_lovers_pin');
        if (error) throw error;
        if (data) {
          setShowCreatePin(false);
          setShowVerifyPin(true);
        } else {
          setShowCreatePin(true);
          setShowVerifyPin(false);
        }
      } catch (e) {
        // Fallback to profile check
        if (profile) {
          if (!profile.dream_room_pin) {
            setShowCreatePin(true);
            setShowVerifyPin(false);
          } else {
            setShowCreatePin(false);
            setShowVerifyPin(true);
          }
        }
      }
    };
    if (profile) checkPin();
  }, [profile]);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

  const handleCreatePin = async () => {
    if (pin.length < 4) {
      toast({
        title: "PIN too short",
        description: "PIN must be at least 4 characters long",
        variant: "destructive"
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        title: "PINs don't match",
        description: "Please make sure both PINs match",
        variant: "destructive"
      });
      return;
    }

    setPinLoading(true);
    try {
      const { error } = await supabase.rpc('upsert_lovers_pin', { _pin: pin });
      if (error) throw error;
      // Also store in profile for backward compat
      await updateProfile({ dream_room_pin: pin });
      setLoversPin(pin);

      const switched = switchMode('lovers', pin);
      if (!switched) {
        throw new Error('PIN saved, but Lovers Mode could not be unlocked. Please try again.');
      }

      onSectionChange('dreamroom');
      toast({
        title: "Welcome to Lovers Mode! 💕",
        description: "Your private space has been created"
      });
    } catch (e: unknown) {
      toast({
        title: "Error creating PIN",
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setPinLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    setPinLoading(true);
    try {
      const { data: valid, error } = await supabase.rpc('verify_lovers_pin', { _pin: pin });
      if (error) throw error;

      // Fallback: also accept plain-text match from profile for existing users
      const isValid = valid || (pin === profile?.dream_room_pin);
      if (isValid) {
        // If verified via plain-text fallback, migrate to hashed
        if (!valid && pin === profile?.dream_room_pin) {
          await supabase.rpc('upsert_lovers_pin', { _pin: pin });
        }

        setLoversPin(pin);
        const switched = switchMode('lovers', pin);
        if (!switched) {
          throw new Error('PIN verified, but Lovers Mode could not be unlocked. Please try again.');
        }

        onSectionChange('dreamroom');
        toast({
          title: "Welcome back! 💕",
          description: "Entering your private lovers space"
        });
      } else {
        toast({
          title: "Incorrect PIN",
          description: "Please try again",
          variant: "destructive"
        });
      }
    } catch (e: unknown) {
      toast({
        title: "Error verifying PIN",
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <Heart className="w-20 h-20 mx-auto text-lovers-primary animate-heart-beat" />
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-lovers-secondary animate-float" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent mb-2">
            Lovers Mode
          </h1>
          <p className="text-muted-foreground">
            Your secret, magical space together
          </p>
        </div>

        {showCreatePin && (
          <Card className="glass border-lovers-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-lovers-primary" />
                <span>Create Your Secret PIN</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a secure PIN to protect your Dream Room and private conversations
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="pin">Enter PIN</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Create your PIN"
                    className="glass border-lovers-primary/20 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <div className="relative">
                  <Input
                    id="confirmPin"
                    type={showConfirmPin ? "text" : "password"}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm your PIN"
                    className="glass border-lovers-primary/20 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                  >
                    {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleCreatePin}
                className="w-full btn-lovers"
                disabled={pin.length < 4 || pin !== confirmPin || pinLoading}
              >
                {pinLoading ? (
                  <span className="animate-pulse">Creating...</span>
                ) : (
                  <>
                <Heart className="w-4 h-4 mr-2" />
                Create Lovers Space
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {showVerifyPin && (
          <Card className="glass border-lovers-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-lovers-primary" />
                <span>Enter Your PIN</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your secret PIN to access your Dream Room
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="verifyPin">PIN</Label>
                <div className="relative">
                  <Input
                    id="verifyPin"
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter your PIN"
                    className="glass border-lovers-primary/20 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleVerifyPin}
                className="w-full btn-lovers"
                disabled={pin.length < 4 || pinLoading}
              >
                {pinLoading ? (
                  <span className="animate-pulse">Verifying...</span>
                ) : (
                  <>
                <Heart className="w-4 h-4 mr-2" />
                Enter Lovers Mode
                  </>
                )}
              </Button>

              <div className="text-center mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPin(true)}
                  className="block w-full text-sm text-muted-foreground hover:text-lovers-primary transition-colors"
                >
                  Forgot your PIN?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPin('');
                    setConfirmPin('');
                    setShowCreatePin(true);
                    setShowVerifyPin(false);
                  }}
                  className="block w-full text-sm text-lovers-primary hover:opacity-80 transition-opacity"
                >
                  Create a new PIN instead
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <Button 
            variant="ghost" 
            onClick={() => onSectionChange('chats')}
            className="text-muted-foreground hover:text-foreground"
          >
            Back to Chat
          </Button>
        </div>

        <ForgotPinDialog 
          open={showForgotPin} 
          onOpenChange={setShowForgotPin} 
        />
      </div>
    </div>
  );
};