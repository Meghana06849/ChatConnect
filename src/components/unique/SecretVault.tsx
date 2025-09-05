import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Lock, 
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  AlertTriangle,
  Image,
  FileText,
  Video,
  Camera,
  Upload,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VaultItem {
  id: string;
  type: 'image' | 'video' | 'document' | 'note';
  name: string;
  size?: string;
  dateAdded: string;
  isDecoy?: boolean;
}

export const SecretVault: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showFakeMode, setShowFakeMode] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const { toast } = useToast();

  const realVaultItems: VaultItem[] = [
    { id: '1', type: 'image', name: 'Private Photo 1', size: '2.3 MB', dateAdded: '2024-01-15' },
    { id: '2', type: 'video', name: 'Secret Video', size: '15.7 MB', dateAdded: '2024-01-10' },
    { id: '3', type: 'note', name: 'Personal Diary', dateAdded: '2024-01-08' },
    { id: '4', type: 'document', name: 'Important Docs', size: '1.2 MB', dateAdded: '2024-01-05' },
  ];

  const decoyVaultItems: VaultItem[] = [
    { id: 'd1', type: 'image', name: 'Regular Photo', size: '1.1 MB', dateAdded: '2024-01-12', isDecoy: true },
    { id: 'd2', type: 'document', name: 'Work Notes', size: '0.8 MB', dateAdded: '2024-01-09', isDecoy: true },
  ];

  const handleUnlock = () => {
    if (pin === '1234') {
      setIsUnlocked(true);
      setShowFakeMode(false);
      toast({
        title: "Vault Unlocked 🔓",
        description: "Welcome to your secure vault"
      });
    } else if (pin === '0000') {
      setIsUnlocked(true);
      setShowFakeMode(true);
      toast({
        title: "Decoy Mode Active ⚠️",
        description: "Showing fake content for privacy protection"
      });
    } else {
      toast({
        title: "Incorrect PIN",
        description: "Please try again",
        variant: "destructive"
      });
    }
    setPin('');
  };

  const handleBiometricUnlock = () => {
    toast({
      title: "Biometric scan successful ✅",
      description: "Vault unlocked with fingerprint"
    });
    setIsUnlocked(true);
    setShowFakeMode(false);
  };

  const getFileIcon = (type: VaultItem['type']) => {
    switch (type) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      case 'note': return <FileText className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="relative mb-6">
              <Shield className="w-20 h-20 mx-auto text-primary animate-pulse" />
              <Lock className="absolute -bottom-2 -right-2 w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Secret Vault</h1>
            <p className="text-muted-foreground">
              Your ultra-secure private storage with decoy protection
            </p>
          </div>

          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>Unlock Vault</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Biometric Option */}
              {biometricEnabled && (
                <div className="text-center">
                  <Button
                    onClick={handleBiometricUnlock}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                    size="lg"
                  >
                    <Fingerprint className="w-5 h-5 mr-2" />
                    Unlock with Biometrics
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Touch sensor or use face recognition
                  </p>
                </div>
              )}

              {/* PIN Option */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vault-pin">Enter PIN</Label>
                  <div className="relative">
                    <Input
                      id="vault-pin"
                      type={showPin ? "text" : "password"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter your secure PIN"
                      className="glass border-white/20 pr-10"
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
                  onClick={handleUnlock}
                  className="w-full"
                  disabled={pin.length < 4}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Unlock Vault
                </Button>
              </div>

              {/* Security Tips */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-yellow-500 mb-1">Security Tips:</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Use PIN "1234" for real vault</li>
                      <li>• Use PIN "0000" for decoy mode</li>
                      <li>• Decoy mode shows fake content if forced</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const vaultItems = showFakeMode ? decoyVaultItems : realVaultItems;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {showFakeMode ? 'Documents' : 'Secret Vault'}
            </h1>
            <p className="text-muted-foreground">
              {showFakeMode 
                ? 'Regular document storage' 
                : 'Your ultra-secure private storage'
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {showFakeMode && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Decoy Mode
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={() => setIsUnlocked(false)}
              className="glass border-white/20"
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock Vault
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="glass border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Add to Vault</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-20 flex-col space-y-2 glass border-white/20">
                <Camera className="w-6 h-6" />
                <span className="text-sm">Take Photo</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 glass border-white/20">
                <Image className="w-6 h-6" />
                <span className="text-sm">Add Image</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 glass border-white/20">
                <Video className="w-6 h-6" />
                <span className="text-sm">Add Video</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 glass border-white/20">
                <FileText className="w-6 h-6" />
                <span className="text-sm">Add Note</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vault Items */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Stored Items ({vaultItems.length})</span>
              </div>
              <Badge variant="outline" className="glass">
                {showFakeMode ? 'Fake Content' : 'Real Content'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vaultItems.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Vault is Empty</h3>
                <p className="text-muted-foreground">Add your first secure item</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vaultItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-primary">
                        {getFileIcon(item.type)}
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{item.dateAdded}</span>
                          {item.size && (
                            <>
                              <span>•</span>
                              <span>{item.size}</span>
                            </>
                          )}
                          {item.isDecoy && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                Decoy
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="glass border-white/20">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="glass border-white/20 hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};