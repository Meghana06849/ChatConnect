import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Heart, 
  Coins, 
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  LogOut,
  HelpCircle,
  Mail,
  Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ModeSwitch } from './ModeSwitch';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { RealActivityDashboard } from '@/components/profile/RealActivityDashboard';
import { PrivacySettings } from '@/components/profile/PrivacySettings';
import { SecurityCenter } from '@/components/profile/SecurityCenter';

const SettingsItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <div 
    className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <div className="flex items-center space-x-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </div>
);

export const AdvancedSettings: React.FC = () => {
  const { mode, switchMode } = useChat();
  const { profile, updateProfile, toggleLoversMode, loading } = useProfile();
  const { toast } = useToast();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showActivityDashboard, setShowActivityDashboard] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showSecurityCenter, setShowSecurityCenter] = useState(false);
  const [showHelpSettings, setShowHelpSettings] = useState(false);
  
  // Notification settings
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [callNotifications, setCallNotifications] = useState(true);
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const isLoversMode = mode === 'lovers';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully.",
    });
  };

  const handleLoversToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowPinDialog(true);
    } else {
      const success = await toggleLoversMode(false);
      if (success) {
        switchMode('general');
        toast({
          title: "Lovers Mode disabled",
          description: "Switched back to general mode.",
        });
      }
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      toast({
        title: "PIN too short",
        description: "PIN must be at least 4 characters.",
        variant: "destructive",
      });
      return;
    }

    const success = await toggleLoversMode(true, pin);
    if (success) {
      switchMode('lovers', pin);
      setShowPinDialog(false);
      setPin('');
      toast({
        title: "Lovers Mode enabled",
        description: "Welcome to your private space! 💕",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <Settings className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Account, Privacy & Security</p>
        </div>

        {/* Account Section */}
        <Card className="glass border-white/20">
          <CardContent className="p-0">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className={`text-2xl ${isLoversMode ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'}`}>
                    {profile?.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{profile?.display_name || 'Your Name'}</h3>
                  <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isLoversMode ? '💕 In Lovers Mode' : '💬 General Mode'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-white/10">
              <SettingsItem 
                icon={<User className="w-5 h-5" />}
                title="Profile"
                subtitle="Edit profile picture, name and bio"
                onClick={() => setShowProfileEditor(true)}
              />
              
              <SettingsItem 
                icon={<Activity className="w-5 h-5" />}
                title="Activity Dashboard"
                subtitle="View your app usage and statistics"
                onClick={() => setShowActivityDashboard(true)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mode Switch */}
        <ModeSwitch />

        {isLoversMode && (
          <Card className="glass border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Coins className="w-6 h-6 text-lovers-primary" />
                  <div>
                    <h4 className="font-semibold">Love Coins</h4>
                    <p className="text-sm text-muted-foreground">Your romantic currency</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-lovers-primary">{profile?.love_coins || 0}</p>
                  <Badge className="bg-lovers-primary/20 text-lovers-primary">✨ Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy & Security Section */}
        <Card className="glass border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/10">
              <SettingsItem 
                icon={<Shield className="w-5 h-5" />}
                title="Privacy"
                subtitle="Control who can see your profile and status"
                onClick={() => setShowPrivacySettings(true)}
              />
              
              <SettingsItem 
                icon={<Lock className="w-5 h-5" />}
                title="Security Center"
                subtitle="Manage security settings and logs"
                onClick={() => setShowSecurityCenter(true)}
              />

              <SettingsItem 
                icon={<Bell className="w-5 h-5" />}
                title="Notifications"
                subtitle="Message, call and story alerts"
                onClick={() => setShowNotificationSettings(true)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="glass border-white/20">
          <CardContent className="p-0">
            <div className="divide-y divide-white/10">
              <SettingsItem 
                icon={<HelpCircle className="w-5 h-5" />}
                title="Help & Support"
                subtitle="Get help and contact support"
                onClick={() => setShowHelpSettings(true)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="glass border-white/20">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors text-destructive" onClick={handleSignOut}>
              <div className="flex items-center space-x-3">
                <LogOut className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium">Sign Out</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* PIN Dialog */}
        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent className="glass border-white/20">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
                <span>Set Your Lovers Mode PIN</span>
              </DialogTitle>
              <DialogDescription>
                Create a secure PIN to protect your private conversations and Dream Room access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4+ characters)</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="glass border-white/20 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handlePinSubmit}
                  className="flex-1 bg-gradient-to-r from-lovers-primary to-lovers-secondary hover:opacity-90"
                >
                  Enable Lovers Mode
                </Button>
                <Button variant="outline" onClick={() => setShowPinDialog(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy Settings Dialog */}
        <Dialog open={showPrivacySettings} onOpenChange={setShowPrivacySettings}>
          <DialogContent className="glass border-white/20 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Privacy Settings</span>
              </DialogTitle>
              <DialogDescription>
                Control who can see your profile, status, and content
              </DialogDescription>
            </DialogHeader>
            <PrivacySettings isLoversMode={isLoversMode} />
          </DialogContent>
        </Dialog>

        {/* Notification Settings Dialog */}
        <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
          <DialogContent className="glass border-white/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Settings</span>
              </DialogTitle>
              <DialogDescription>
                Customize your notification preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Message Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified for new messages</p>
                  </div>
                  <Switch checked={messageNotifications} onCheckedChange={setMessageNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Call Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified for incoming calls</p>
                  </div>
                  <Switch checked={callNotifications} onCheckedChange={setCallNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Group Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified for group activities</p>
                  </div>
                  <Switch checked={groupNotifications} onCheckedChange={setGroupNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sound & Vibration</Label>
                    <p className="text-sm text-muted-foreground">Enable notification sounds</p>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Editor Dialog */}
        <Dialog open={showProfileEditor} onOpenChange={setShowProfileEditor}>
          <DialogContent className="glass border-white/20 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Edit Profile</span>
              </DialogTitle>
              <DialogDescription>
                Update your profile information and picture
              </DialogDescription>
            </DialogHeader>
            <ProfileEditor />
          </DialogContent>
        </Dialog>

        {/* Activity Dashboard Dialog */}
        <Dialog open={showActivityDashboard} onOpenChange={setShowActivityDashboard}>
          <DialogContent className="glass border-white/20 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Activity Dashboard</span>
              </DialogTitle>
              <DialogDescription>
                View your app usage statistics
              </DialogDescription>
            </DialogHeader>
            <RealActivityDashboard />
          </DialogContent>
        </Dialog>

        {/* Security Center Dialog */}
        <Dialog open={showSecurityCenter} onOpenChange={setShowSecurityCenter}>
          <DialogContent className="glass border-white/20 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Security Center</span>
              </DialogTitle>
              <DialogDescription>
                Review security settings and activity logs
              </DialogDescription>
            </DialogHeader>
            <SecurityCenter />
          </DialogContent>
        </Dialog>

        {/* Help Settings Dialog */}
        <Dialog open={showHelpSettings} onOpenChange={setShowHelpSettings}>
          <DialogContent className="glass border-white/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5" />
                <span>Help & Support</span>
              </DialogTitle>
              <DialogDescription>
                Get help and contact our support team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <Card className="glass border-white/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Frequently Asked Questions</h4>
                    <p className="text-sm text-muted-foreground mb-3">Find answers to common questions</p>
                    <Button variant="outline" size="sm">View FAQ</Button>
                  </CardContent>
                </Card>
                <Card className="glass border-white/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Contact Support</h4>
                    <p className="text-sm text-muted-foreground mb-3">Get help from our team</p>
                    <Button variant="outline" size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Support
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};