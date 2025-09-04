import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Heart, Activity, Bluetooth, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeartbeatData {
  bpm: number;
  timestamp: Date;
  source: 'phone' | 'wearable';
}

export const HeartbeatSync: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentHeartbeat, setCurrentHeartbeat] = useState<HeartbeatData | null>(null);
  const [partnerHeartbeat, setPartnerHeartbeat] = useState<HeartbeatData | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isConnected) return;

    // Simulate heartbeat data
    const interval = setInterval(() => {
      const bpm = 60 + Math.floor(Math.random() * 40); // 60-100 BPM
      setCurrentHeartbeat({
        bpm,
        timestamp: new Date(),
        source: Math.random() > 0.5 ? 'phone' : 'wearable'
      });

      // Simulate partner heartbeat
      if (isSharing) {
        const partnerBpm = 65 + Math.floor(Math.random() * 35);
        setPartnerHeartbeat({
          bpm: partnerBpm,
          timestamp: new Date(),
          source: 'wearable'
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, isSharing]);

  const connectDevice = () => {
    setIsConnected(true);
    toast({
      title: "Device Connected! 💓",
      description: "Heartbeat monitoring is now active",
    });
  };

  const startSharing = () => {
    if (!isConnected) {
      toast({
        title: "Connect a device first",
        description: "You need to connect a device before sharing",
        variant: "destructive",
      });
      return;
    }
    
    setIsSharing(true);
    toast({
      title: "Heartbeat sharing started! 💕",
      description: "Your partner can now feel your heartbeat",
    });
  };

  const getHeartbeatStatus = (bpm: number): { status: string; color: string } => {
    if (bpm < 60) return { status: 'Relaxed', color: 'text-blue-500' };
    if (bpm < 80) return { status: 'Normal', color: 'text-green-500' };
    if (bpm < 100) return { status: 'Elevated', color: 'text-yellow-500' };
    return { status: 'Excited', color: 'text-red-500' };
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 text-lovers-primary animate-heart-beat" />
        <h2 className="text-2xl font-bold mb-2">Heartbeat Sync</h2>
        <p className="text-muted-foreground">Share your heartbeat with your partner in real-time</p>
      </div>

      {/* Connection Status */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Device Connection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center space-x-4">
                <div className="text-center p-4 glass rounded-lg border-white/20">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm">Phone Sensor</p>
                </div>
                <div className="text-center p-4 glass rounded-lg border-white/20">
                  <Bluetooth className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm">Smart Watch</p>
                </div>
              </div>
              <Button onClick={connectDevice} className="btn-lovers">
                Connect Device
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-500 font-medium">Connected</span>
              </div>
              <Button 
                onClick={() => setIsConnected(false)}
                variant="outline"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Heartbeat */}
      {isConnected && currentHeartbeat && (
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
              <span>Your Heartbeat</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-lovers-primary">
                {currentHeartbeat.bpm}
              </div>
              <div className="text-lg text-muted-foreground">BPM</div>
              <div className={`text-sm font-medium ${getHeartbeatStatus(currentHeartbeat.bpm).color}`}>
                {getHeartbeatStatus(currentHeartbeat.bpm).status}
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label>Share with partner</Label>
                  <Switch checked={isSharing} onCheckedChange={setIsSharing} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner's Heartbeat */}
      {isSharing && partnerHeartbeat && (
        <Card className="glass border-white/20 border-l-4 border-l-lovers-primary">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-lovers-secondary animate-heart-beat" />
              <span>Partner's Heartbeat</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-lovers-secondary">
                {partnerHeartbeat.bpm}
              </div>
              <div className="text-sm text-muted-foreground">BPM</div>
              <div className={`text-sm font-medium ${getHeartbeatStatus(partnerHeartbeat.bpm).color}`}>
                {getHeartbeatStatus(partnerHeartbeat.bpm).status}
              </div>
              <p className="text-xs text-muted-foreground">
                💕 Feel connected across any distance
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="glass border-white/20">
        <CardContent className="p-4">
          <h4 className="font-semibold mb-2">How it works</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Connect your phone or smartwatch to monitor heartbeat</p>
            <p>• Enable sharing to send your heartbeat to your partner</p>
            <p>• Both partners need to enable sharing to sync heartbeats</p>
            <p>• Perfect for long-distance relationships and intimate moments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};