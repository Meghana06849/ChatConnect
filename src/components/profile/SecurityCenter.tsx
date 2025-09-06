import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Globe, 
  Lock, 
  Eye,
  EyeOff,
  Shield,
  Smartphone,
  Mail,
  Key,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  type: 'login' | 'password_change' | 'privacy_update' | 'suspicious_activity';
  description: string;
  timestamp: Date;
  location?: string;
  device?: string;
  status: 'success' | 'warning' | 'error';
}

export const SecurityCenter: React.FC = () => {
  const { toast } = useToast();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  const securityEvents: SecurityEvent[] = [
    {
      id: '1',
      type: 'login',
      description: 'Successful login from Chrome',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      location: 'New York, US',
      device: 'Chrome on Windows',
      status: 'success'
    },
    {
      id: '2',
      type: 'privacy_update',
      description: 'Privacy settings updated',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'success'
    },
    {
      id: '3',
      type: 'login',
      description: 'Login attempt from unknown device',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      location: 'Unknown location',
      device: 'Unknown device',
      status: 'warning'
    }
  ];

  const getEventIcon = (type: string, status: string) => {
    if (status === 'warning' || status === 'error') {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
    
    switch (type) {
      case 'login':
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      case 'password_change':
        return <Key className="w-4 h-4 text-green-500" />;
      case 'privacy_update':
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-500">Secure</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-500">Alert</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const enableTwoFactor = () => {
    setTwoFactorEnabled(true);
    toast({
      title: "Two-Factor Authentication Enabled",
      description: "Your account is now more secure with 2FA",
    });
  };

  const changePassword = () => {
    toast({
      title: "Password Change",
      description: "Redirecting to secure password change form...",
    });
  };

  const reviewLogins = () => {
    toast({
      title: "Login Review",
      description: "All recent logins have been reviewed",
    });
  };

  return (
    <div className="space-y-6">
      {/* Security Status */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span>Security Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <Lock className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-semibold text-green-500">Secure</h4>
              <p className="text-xs text-muted-foreground">Account protected</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Key className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h4 className="font-semibold text-yellow-500">Password</h4>
              <p className="text-xs text-muted-foreground">Good strength</p>
            </div>
            
            <div className={`text-center p-4 rounded-lg ${
              twoFactorEnabled 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <Smartphone className={`w-8 h-8 mx-auto mb-2 ${
                twoFactorEnabled ? 'text-green-500' : 'text-red-500'
              }`} />
              <h4 className={`font-semibold ${
                twoFactorEnabled ? 'text-green-500' : 'text-red-500'
              }`}>
                2FA
              </h4>
              <p className="text-xs text-muted-foreground">
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle>Security Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={changePassword}
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-12"
            >
              <Key className="w-4 h-4" />
              <span>Change Password</span>
            </Button>
            
            <Button 
              onClick={enableTwoFactor}
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-12"
              disabled={twoFactorEnabled}
            >
              <Smartphone className="w-4 h-4" />
              <span>{twoFactorEnabled ? '2FA Enabled' : 'Enable 2FA'}</span>
            </Button>
            
            <Button 
              onClick={reviewLogins}
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-12"
            >
              <Globe className="w-4 h-4" />
              <span>Review Logins</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center justify-center space-x-2 h-12"
            >
              <Mail className="w-4 h-4" />
              <span>Security Alerts</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Security Events</span>
            <Badge variant="outline">{securityEvents.length} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3">
                  {getEventIcon(event.type, event.status)}
                  <div>
                    <p className="font-medium text-sm">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.timestamp.toLocaleString()}
                      {event.location && ` • ${event.location}`}
                      {event.device && ` • ${event.device}`}
                    </p>
                  </div>
                </div>
                {getEventBadge(event.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings Quick Access */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Privacy Quick Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Online Status</p>
                <p className="text-sm text-muted-foreground">Show when you're online</p>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm">Visible</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Profile Visibility</p>
                <p className="text-sm text-muted-foreground">Who can see your profile</p>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Friends</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Message Encryption</p>
                <p className="text-sm text-muted-foreground">End-to-end encryption status</p>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-green-500" />
                <span className="text-sm">Enabled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};