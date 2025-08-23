import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoveCoins } from '@/contexts/LoveCoinsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Heart, 
  Coins, 
  Lock,
  Smartphone,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Fingerprint,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { ModeSwitch } from './ModeSwitch';
import { toast } from '@/hooks/use-toast';

export const AdvancedSettings: React.FC = () => {
  const { mode } = useChat();
  const { user } = useAuth();
  const { coins, dailyStreak } = useLoveCoins();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  const isLoversMode = mode === 'lovers';

  const [settings, setSettings] = useState({
    notifications: {
      messages: true,
      calls: true,
      stories: true,
      loveCoins: isLoversMode,
    },
    privacy: {
      readReceipts: true,
      lastSeen: true,
      profilePhoto: 'everyone',
      status: 'contacts'
    },
    security: {
      twoFactor: false,
      biometric: false,
      autoLock: false
    }
  });

  const handleSettingChange = (category: keyof typeof settings, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
    
    toast({
      title: "Settings updated",
      description: "Your preferences have been saved"
    });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive"
      });
      return;
    }
    
    // Password change logic would go here
    toast({
      title: "Password changed",
      description: "Your password has been updated successfully"
    });
    
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Settings className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Customize your ChatConnect experience</p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 glass border-white/20">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            {/* Profile Card */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className={`
                      text-2xl
                      ${isLoversMode 
                        ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' 
                        : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                      }
                    `}>
                      {user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user?.name} className="glass border-white/20" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" defaultValue={user?.email} className="pl-10 glass border-white/20" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" className="pl-10 glass border-white/20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch 
                    checked={settings.security.twoFactor}
                    onCheckedChange={(checked) => handleSettingChange('security', 'twoFactor', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Biometric Lock</h4>
                    <p className="text-sm text-muted-foreground">Use fingerprint or face unlock</p>
                  </div>
                  <Switch 
                    checked={settings.security.biometric}
                    onCheckedChange={(checked) => handleSettingChange('security', 'biometric', checked)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="glass border-white/20">
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass border-white/20">
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="current-password"
                              type={showPasswords ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="glass border-white/20 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowPasswords(!showPasswords)}
                            >
                              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type={showPasswords ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="glass border-white/20"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input
                            id="confirm-password"
                            type={showPasswords ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="glass border-white/20"
                          />
                        </div>
                        
                        <Button 
                          onClick={handlePasswordChange}
                          className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                          disabled={!currentPassword || !newPassword || !confirmPassword}
                        >
                          Update Password
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" className="glass border-white/20">
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Setup Biometric
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mode Switch */}
            <ModeSwitch />

            {/* Love Coins (Lovers Mode Only) */}
            {isLoversMode && (
              <Card className="glass border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Coins className="w-5 h-5 text-lovers-primary" />
                    <span>Love Coins</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center space-x-2">
                        <Heart className="w-4 h-4 text-lovers-primary" />
                        <span>Current Balance</span>
                      </h4>
                      <p className="text-2xl font-bold text-lovers-primary">{coins} Love Coins</p>
                    </div>
                    <Badge className="bg-lovers-primary/20 text-lovers-primary">
                      {dailyStreak} day streak
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Earn Love Coins by:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Daily login streaks</li>
                      <li>Sending messages to your partner</li>
                      <li>Playing games together</li>
                      <li>Sharing stories and moments</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Privacy Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Read Receipts</h4>
                    <p className="text-sm text-muted-foreground">Let others know when you've read their messages</p>
                  </div>
                  <Switch 
                    checked={settings.privacy.readReceipts}
                    onCheckedChange={(checked) => handleSettingChange('privacy', 'readReceipts', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Last Seen</h4>
                    <p className="text-sm text-muted-foreground">Show when you were last online</p>
                  </div>
                  <Switch 
                    checked={settings.privacy.lastSeen}
                    onCheckedChange={(checked) => handleSettingChange('privacy', 'lastSeen', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Message Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get notified for new messages</p>
                  </div>
                  <Switch 
                    checked={settings.notifications.messages}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'messages', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Call Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get notified for incoming calls</p>
                  </div>
                  <Switch 
                    checked={settings.notifications.calls}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'calls', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Story Updates</h4>
                    <p className="text-sm text-muted-foreground">Get notified when friends post stories</p>
                  </div>
                  <Switch 
                    checked={settings.notifications.stories}
                    onCheckedChange={(checked) => handleSettingChange('notifications', 'stories', checked)}
                  />
                </div>
                
                {isLoversMode && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Love Coins Updates</h4>
                      <p className="text-sm text-muted-foreground">Get notified when you earn Love Coins</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.loveCoins}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'loveCoins', checked)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Themes & Customization</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Theme Options</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border-2 border-general-primary/50 cursor-pointer hover:border-general-primary transition-colors">
                      <div className="h-8 bg-gradient-to-r from-general-primary to-general-secondary rounded mb-2"></div>
                      <p className="text-sm font-medium">Ocean Breeze</p>
                    </div>
                    <div className="p-4 rounded-lg border-2 border-lovers-primary/50 cursor-pointer hover:border-lovers-primary transition-colors">
                      <div className="h-8 bg-gradient-to-r from-lovers-primary to-lovers-secondary rounded mb-2"></div>
                      <p className="text-sm font-medium">Romance</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help & Support */}
          <TabsContent value="help" className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5" />
                  <span>Help & Support</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start glass border-white/20">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Frequently Asked Questions
                </Button>
                
                <Button variant="outline" className="w-full justify-start glass border-white/20">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
                
                <Button variant="outline" className="w-full justify-start glass border-white/20">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Report an Issue
                </Button>
                
                <div className="pt-4 text-center text-sm text-muted-foreground">
                  <p>ChatConnect Version 2.0.0</p>
                  <p>© 2024 ChatConnect. All rights reserved.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};