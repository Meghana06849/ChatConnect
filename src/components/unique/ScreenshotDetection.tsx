import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle, Eye, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScreenshotAlert {
  id: string;
  timestamp: Date;
  location: string;
  type: 'screenshot' | 'screen-recording';
}

export const ScreenshotDetection: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [alerts, setAlerts] = useState<ScreenshotAlert[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!isEnabled) return;

    // Simulate screenshot detection (in real app, this would use native APIs)
    const detectScreenshot = () => {
      // For demo purposes, randomly trigger alerts
      if (Math.random() < 0.1) { // 10% chance every 10 seconds
        const newAlert: ScreenshotAlert = {
          id: Date.now().toString(),
          timestamp: new Date(),
          location: 'Chat',
          type: Math.random() > 0.5 ? 'screenshot' : 'screen-recording'
        };
        
        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep last 10 alerts
        
        toast({
          title: "🚨 Screenshot Detected!",
          description: `Someone took a ${newAlert.type === 'screenshot' ? 'screenshot' : 'screen recording'} in ${newAlert.location}`,
          variant: "destructive",
        });
      }
    };

    const interval = setInterval(detectScreenshot, 10000);
    return () => clearInterval(interval);
  }, [isEnabled, toast]);

  const formatTime = (date: Date): string => {
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Screenshot Detection</h2>
        <p className="text-muted-foreground">Protect your privacy with screenshot alerts</p>
      </div>

      {/* Settings */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Detection Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Screenshot Detection</Label>
              <p className="text-sm text-muted-foreground">Get notified when someone screenshots</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-900">Privacy Protection</p>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Detection works in chats and vault. Screenshots are logged for security.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alerts History */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Recent Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No screenshot alerts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isEnabled ? "Your conversations are being monitored" : "Enable detection to start monitoring"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <Camera className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-red-900">
                        {alert.type === 'screenshot' ? 'Screenshot taken' : 'Screen recording detected'}
                      </p>
                      <p className="text-sm text-red-700">
                        Location: {alert.location} • {formatTime(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                    ALERT
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};