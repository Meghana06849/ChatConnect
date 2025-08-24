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
  MessageSquare,
  ChevronRight,
  Database,
  Users,
  Image,
  Mic,
  Video,
  Globe,
  UserPlus,
  Download,
  LogOut,
  Instagram,
  Facebook,
  Twitter,
  RefreshCw
} from 'lucide-react';
import { ModeSwitch } from './ModeSwitch';
import { toast } from '@/hooks/use-toast';

export const AdvancedSettings: React.FC = () => {
  const { mode } = useChat();
  const { user } = useAuth();
  const { coins, dailyStreak } = useLoveCoins();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
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
      sound: true,
      vibration: true,
      popup: true,
    },
    privacy: {
      readReceipts: true,
      lastSeen: true,
      profilePhoto: 'everyone',
      status: 'contacts',
      blockedContacts: 0,
      disappearingMessages: false,
    },
    security: {
      twoFactor: false,
      biometric: false,
      autoLock: false,
      pinLock: isLoversMode,
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

        {/* WhatsApp-Style Settings List */}
        <div className="space-y-1">
          {/* Account Section */}
          <Card className="glass border-white/20">
            <CardContent className="p-0">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
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
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{user?.name || 'Your Name'}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isLoversMode ? '💕 In Lovers Mode' : '💬 General Mode'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="divide-y divide-white/10">
                <SettingsItem 
                  icon={<User className="w-5 h-5" />}
                  title="Account"
                  subtitle="Security notifications, change number"
                  onClick={() => setShowAccountDialog(true)}
                />
                <SettingsItem 
                  icon={<Shield className="w-5 h-5" />}
                  title="Privacy"
                  subtitle="Block contacts, disappearing messages"
                  onClick={() => setShowPrivacyDialog(true)}
                />
                <SettingsItem 
                  icon={<Image className="w-5 h-5" />}
                  title="Avatar"
                  subtitle="Create, edit, profile photo"
                  onClick={() => {}}
                />
                <SettingsItem 
                  icon={<Users className="w-5 h-5" />}
                  title="Lists"
                  subtitle="Manage people and groups"
                  onClick={() => {}}
                />
                <SettingsItem 
                  icon={<MessageSquare className="w-5 h-5" />}
                  title="Chats"
                  subtitle="Theme, wallpapers, chat history"
                  onClick={() => {}}
                />
                {isLoversMode && (
                  <SettingsItem 
                    icon={<Heart className="w-5 h-5 text-lovers-primary" />}
                    title="Lovers Mode"
                    subtitle="Partner settings, Dream Room access"
                    onClick={() => {}}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Communication Section */}
          <Card className="glass border-white/20">
            <CardContent className="p-0">
              <div className="divide-y divide-white/10">
                <SettingsItem 
                  icon={<Bell className="w-5 h-5" />}
                  title="Notifications"
                  subtitle="Message, group & call tones"
                  onClick={() => setShowNotificationsDialog(true)}
                />
                <SettingsItem 
                  icon={<Database className="w-5 h-5" />}
                  title="Storage and data"
                  subtitle="Network usage, auto-download"
                  onClick={() => {}}
                />
                <SettingsItem 
                  icon={<Globe className="w-5 h-5" />}
                  title="App language"
                  subtitle="English (device's language)"
                  onClick={() => {}}
                />
              </div>
            </CardContent>
          </Card>

          {/* Support Section */}
          <Card className="glass border-white/20">
            <CardContent className="p-0">
              <div className="divide-y divide-white/10">
                <SettingsItem 
                  icon={<HelpCircle className="w-5 h-5" />}
                  title="Help"
                  subtitle="Help centre, contact us, privacy policy"
                  onClick={() => {}}
                />
                <SettingsItem 
                  icon={<UserPlus className="w-5 h-5" />}
                  title="Invite a friend"
                  subtitle=""
                  onClick={() => {}}
                />
              </div>
            </CardContent>
          </Card>

          {/* Love Coins (Lovers Mode Only) */}
          {isLoversMode && (
            <Card className="glass border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Coins className="w-6 h-6 text-lovers-primary" />
                    <div>
                      <h4 className="font-semibold">Love Coins</h4>
                      <p className="text-sm text-muted-foreground">Your romantic currency</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-lovers-primary">{coins}</p>
                    <Badge className="bg-lovers-primary/20 text-lovers-primary">
                      {dailyStreak} day streak
                    </Badge>
                  </div>
                </div>
                <Button className="w-full btn-lovers">
                  <Download className="w-4 h-4 mr-2" />
                  View Transaction History
                </Button>
              </CardContent>
            </Card>
          )}

          {/* App Status */}
          <Card className="glass border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span>App Status</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">Ready for launch</p>
                </div>
                <Badge className="bg-green-500/20 text-green-600">
                  ✓ All systems operational
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="glass border-white/20">
            <CardContent className="p-0">
              <SettingsItem 
                icon={<LogOut className="w-5 h-5 text-destructive" />}
                title="Log out"
                subtitle=""
                onClick={() => {}}
                className="text-destructive"
              />
            </CardContent>
          </Card>
        </div>

        {/* Account Settings Dialog */}
        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
          <DialogContent className="glass border-white/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Account Settings</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input id="display-name" defaultValue={user?.name} className="glass border-white/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="@username" className="glass border-white/20" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status Message</Label>
                <Input id="status" placeholder="Hey there! I'm using ChatConnect" className="glass border-white/20" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                </div>
                <Switch 
                  checked={settings.security.twoFactor}
                  onCheckedChange={(checked) => handleSettingChange('security', 'twoFactor', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">PIN Lock</h4>
                  <p className="text-sm text-muted-foreground">Secure app with PIN</p>
                </div>
                <Switch 
                  checked={settings.security.pinLock}
                  onCheckedChange={(checked) => handleSettingChange('security', 'pinLock', checked)}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button className={`flex-1 ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy Settings Dialog */}
        <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
          <DialogContent className="glass border-white/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Privacy Settings</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Read Receipts</h4>
                  <p className="text-sm text-muted-foreground">Let others know when you've read messages</p>
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
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Disappearing Messages</h4>
                  <p className="text-sm text-muted-foreground">Messages disappear after 24h</p>
                </div>
                <Switch 
                  checked={settings.privacy.disappearingMessages}
                  onCheckedChange={(checked) => handleSettingChange('privacy', 'disappearingMessages', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Profile Photo Visibility</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    size="sm" 
                    variant={settings.privacy.profilePhoto === 'everyone' ? 'default' : 'outline'}
                    onClick={() => handleSettingChange('privacy', 'profilePhoto', 'everyone')}
                  >
                    Everyone
                  </Button>
                  <Button 
                    size="sm" 
                    variant={settings.privacy.profilePhoto === 'contacts' ? 'default' : 'outline'}
                    onClick={() => handleSettingChange('privacy', 'profilePhoto', 'contacts')}
                  >
                    Contacts
                  </Button>
                  <Button 
                    size="sm" 
                    variant={settings.privacy.profilePhoto === 'nobody' ? 'default' : 'outline'}
                    onClick={() => handleSettingChange('privacy', 'profilePhoto', 'nobody')}
                  >
                    Nobody
                  </Button>
                </div>
              </div>
              
              <Button className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}>
                Save Privacy Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notifications Dialog */}
        <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
          <DialogContent className="glass border-white/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Settings</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
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
                  <h4 className="font-medium">Sound</h4>
                  <p className="text-sm text-muted-foreground">Play notification sounds</p>
                </div>
                <Switch 
                  checked={settings.notifications.sound}
                  onCheckedChange={(checked) => handleSettingChange('notifications', 'sound', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Vibration</h4>
                  <p className="text-sm text-muted-foreground">Vibrate on notifications</p>
                </div>
                <Switch 
                  checked={settings.notifications.vibration}
                  onCheckedChange={(checked) => handleSettingChange('notifications', 'vibration', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Popup Notifications</h4>
                  <p className="text-sm text-muted-foreground">Show popup notifications</p>
                </div>
                <Switch 
                  checked={settings.notifications.popup}
                  onCheckedChange={(checked) => handleSettingChange('notifications', 'popup', checked)}
                />
              </div>
              
              <Button className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}>
                Save Notification Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Settings Item Component
interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  className?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon, 
  title, 
  subtitle, 
  onClick, 
  className = "" 
}) => (
  <div 
    className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${className}`}
    onClick={onClick}
  >
    <div className="flex items-center space-x-4">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <h4 className="font-medium">{title}</h4>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </div>
);