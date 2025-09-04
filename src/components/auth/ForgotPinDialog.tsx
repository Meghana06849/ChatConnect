import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Heart, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ForgotPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPinDialog: React.FC<ForgotPinDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendResetEmail = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Simulate sending email
    setTimeout(() => {
      setLoading(false);
      setStep('sent');
      toast({
        title: "Reset email sent! 💕",
        description: "Check your inbox for PIN reset instructions",
      });
    }, 2000);
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass border-white/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
            <span>Forgot PIN?</span>
          </DialogTitle>
          <DialogDescription>
            Reset your Lovers Mode PIN securely
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <div className="space-y-4">
            <Card className="bg-lovers-primary/10 border-lovers-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Key className="w-4 h-4 text-lovers-primary" />
                  <p className="text-sm font-medium">Secure PIN Recovery</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll send you secure instructions to reset your Lovers Mode PIN
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="reset-email">Your Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass border-white/20"
              />
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={sendResetEmail}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-lovers-primary to-lovers-secondary hover:opacity-90"
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-6">
              <Mail className="w-16 h-16 mx-auto mb-4 text-lovers-primary" />
              <h3 className="text-lg font-semibold mb-2">Check Your Email!</h3>
              <p className="text-muted-foreground text-sm">
                We've sent PIN reset instructions to:
              </p>
              <p className="font-medium text-lovers-primary mt-1">{email}</p>
            </div>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <p className="text-xs text-amber-700">
                  If you don't see the email, check your spam folder or contact support
                </p>
              </CardContent>
            </Card>

            <Button 
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary"
            >
              Got it!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};