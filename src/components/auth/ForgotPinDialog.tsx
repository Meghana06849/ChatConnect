import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Key, Eye, EyeOff, CheckCircle2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ForgotPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPinDialog: React.FC<ForgotPinDialogProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState<'verify' | 'newpin' | 'done'>('verify');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      toast({ title: 'Password required', variant: 'destructive' });
      return;
    }
    setStep('newpin');
  };

  const handleResetPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      toast({ title: 'PIN must be 4-6 characters', variant: 'destructive' });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "PINs don't match", variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Verify password via edge function
      const { data, error } = await supabase.functions.invoke('reset-lovers-pin', {
        body: { action: 'password', password, new_pin: newPin },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        if (data.error === 'Incorrect password') setStep('verify');
        setLoading(false);
        return;
      }

      // Step 2: Also update the hashed PIN in lovers_mode_secrets
      const { error: hashError } = await supabase.rpc('upsert_lovers_pin', { _pin: newPin });
      if (hashError) {
        console.error('Failed to update hashed PIN:', hashError);
      }

      setStep('done');
      toast({ title: 'PIN Reset! 💕', description: 'Your new PIN is active' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('verify');
    setPassword('');
    setNewPin('');
    setConfirmPin('');
    setShowPassword(false);
    setShowPin(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass border-white/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
            <span>Reset Lovers PIN</span>
          </DialogTitle>
          <DialogDescription>Verify your identity to set a new PIN</DialogDescription>
        </DialogHeader>

        {step === 'verify' && (
          <div className="space-y-4">
            <Card className="bg-lovers-primary/10 border-lovers-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-4 h-4 text-lovers-primary" />
                  <p className="text-sm font-medium">Identity Verification</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your account password to verify your identity
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="reset-password">Account Password</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass border-white/20 pr-10"
                />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleVerifyPassword} disabled={!password.trim()}
                className="flex-1 bg-gradient-to-r from-lovers-primary to-lovers-secondary hover:opacity-90">
                Continue
              </Button>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 'newpin' && (
          <div className="space-y-4">
            <Card className="bg-lovers-primary/10 border-lovers-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Key className="w-4 h-4 text-lovers-primary" />
                  <p className="text-sm font-medium">Set New PIN</p>
                </div>
                <p className="text-xs text-muted-foreground">Create a new 4-6 digit PIN for Lovers Mode</p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>New PIN</Label>
              <div className="relative">
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.slice(0, 6))}
                  placeholder="4-6 digit PIN"
                  className="glass border-lovers-primary/20 pr-10"
                />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPin(!showPin)}>
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirm PIN</Label>
              <Input
                type={showPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.slice(0, 6))}
                placeholder="Confirm PIN"
                className="glass border-lovers-primary/20"
              />
            </div>

            <Button onClick={handleResetPin} disabled={loading || newPin.length < 4 || newPin !== confirmPin}
              className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary hover:opacity-90">
              {loading ? 'Resetting...' : 'Reset PIN'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-400" />
            <h3 className="text-lg font-semibold">PIN Updated!</h3>
            <p className="text-sm text-muted-foreground">
              Your new Lovers Mode PIN is now active. Use it next time you enter.
            </p>
            <Button onClick={handleClose}
              className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
