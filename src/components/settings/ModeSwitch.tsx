import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const ModeSwitch = () => {
  const { mode, switchMode, loversPin, setLoversPin } = useChat();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [verifyPin, setVerifyPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const isLoversMode = mode === 'lovers';
  const hasLoversPin = !!loversPin;

  const handleSetupPin = () => {
    if (newPin.length < 4 || newPin.length > 6) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 4-6 digits long",
        variant: "destructive"
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: "PINs don't match",
        description: "Please make sure both PINs match",
        variant: "destructive"
      });
      return;
    }

    setLoversPin(newPin);
    setShowPinSetup(false);
    setNewPin('');
    setConfirmPin('');
    
    toast({
      title: "PIN created successfully! 💕",
      description: "Lovers Mode is now available"
    });
  };

  const handleModeSwitch = () => {
    if (!isLoversMode) {
      // Switching to Lovers Mode
      if (!hasLoversPin) {
        setShowPinSetup(true);
        return;
      }
      setShowPinVerify(true);
    } else {
      // Switching to General Mode
      switchMode('general');
      toast({
        title: "Switched to General Mode",
        description: "Welcome back to general chat"
      });
    }
  };

  const handleVerifyPin = () => {
    if (switchMode('lovers', verifyPin)) {
      setShowPinVerify(false);
      setVerifyPin('');
      toast({
        title: "Welcome to Lovers Mode 💕",
        description: "Your private space awaits"
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
    <>
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isLoversMode ? (
              <>
                <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
                <span>Lovers Mode</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 text-general-primary" />
                <span>Chat Mode</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isLoversMode 
              ? 'You\'re in your private romantic space'
              : 'Switch between general chat and lovers mode'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`
            p-4 rounded-xl border-2 transition-all duration-200
            ${isLoversMode 
              ? 'border-lovers-primary/30 bg-gradient-to-r from-lovers-primary/10 to-lovers-secondary/10' 
              : 'border-general-primary/30 bg-gradient-to-r from-general-primary/10 to-general-secondary/10'
            }
          `}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {isLoversMode ? 'Lovers Mode Active' : 'General Mode Active'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isLoversMode 
                    ? 'Private conversations with extra features'
                    : 'Regular chat with friends and colleagues'
                  }
                </p>
              </div>
              <Button
                onClick={handleModeSwitch}
                className={`
                  ${isLoversMode ? 'btn-general' : 'btn-lovers'}
                  ${!hasLoversPin && !isLoversMode ? 'animate-pulse' : ''}
                `}
              >
                {isLoversMode ? 'Exit Lovers' : hasLoversPin ? 'Enter Lovers' : 'Setup Lovers'}
              </Button>
            </div>
          </div>

          {hasLoversPin && (
            <div className="p-4 rounded-xl bg-muted/50 border border-white/20">
              <div className="flex items-center space-x-2 text-sm">
                <Lock className="w-4 h-4 text-lovers-primary" />
                <span>Lovers Mode PIN is configured</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PIN Setup Dialog */}
      <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
              <span>Setup Lovers Mode PIN</span>
            </DialogTitle>
            <DialogDescription>
              Create a 4-6 digit PIN to protect your private conversations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPin">Create PIN</Label>
              <div className="relative">
                <Input
                  id="newPin"
                  type={showPin ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 4-6 digits"
                  className="glass"
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
              <Input
                id="confirmPin"
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Confirm your PIN"
                className="glass"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPinSetup(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetupPin}
                disabled={!newPin || !confirmPin || newPin.length < 4}
                className="flex-1 btn-lovers"
              >
                Create PIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Verify Dialog */}
      <Dialog open={showPinVerify} onOpenChange={setShowPinVerify}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-lovers-primary" />
              <span>Enter Lovers Mode</span>
            </DialogTitle>
            <DialogDescription>
              Enter your PIN to access your private space
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verifyPin">PIN</Label>
              <Input
                id="verifyPin"
                type="password"
                value={verifyPin}
                onChange={(e) => setVerifyPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter your PIN"
                className="glass text-center text-2xl tracking-widest"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && verifyPin.length >= 4) {
                    handleVerifyPin();
                  }
                }}
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPinVerify(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyPin}
                disabled={verifyPin.length < 4}
                className="flex-1 btn-lovers"
              >
                Enter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};