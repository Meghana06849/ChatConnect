import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useProfile } from '@/hooks/useProfile';
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
  const { switchMode } = useChat();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [showCreatePin, setShowCreatePin] = useState(!profile?.dream_room_pin);
  const [showVerifyPin, setShowVerifyPin] = useState(!!profile?.dream_room_pin);
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

    const success = await updateProfile({ dream_room_pin: pin });
    if (success) {
      switchMode('lovers', pin);
      onSectionChange('dreamroom');
      toast({
        title: "Welcome to Lovers Mode! 💕",
        description: "Your private space has been created"
      });
    }
  };

  const handleVerifyPin = async () => {
    if (pin === profile?.dream_room_pin) {
      switchMode('lovers', pin);
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
                disabled={pin.length < 4 || pin !== confirmPin}
              >
                <Heart className="w-4 h-4 mr-2" />
                Create Lovers Space
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
                disabled={pin.length < 4}
              >
                <Heart className="w-4 h-4 mr-2" />
                Enter Lovers Mode
              </Button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPin(true)}
                  className="text-sm text-muted-foreground hover:text-lovers-primary transition-colors"
                >
                  Forgot your PIN?
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