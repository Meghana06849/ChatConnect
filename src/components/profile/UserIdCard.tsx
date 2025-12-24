import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Check, QrCode, Share2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserIdCardProps {
  className?: string;
  compact?: boolean;
}

export const UserIdCard: React.FC<UserIdCardProps> = ({ className = '', compact = false }) => {
  const { user, getUserId } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const userId = getUserId();

  const copyUserId = async () => {
    if (!userId) return;
    
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      toast({
        title: "User ID Copied!",
        description: "Share this ID with friends to connect instantly.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the ID manually",
        variant: "destructive",
      });
    }
  };

  const shareUserId = async () => {
    if (!userId) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Connect with me on ChatConnect',
          text: `Add me on ChatConnect! My User ID: ${userId}`,
          url: window.location.origin,
        });
      } catch (error) {
        // User cancelled or error
        copyUserId();
      }
    } else {
      copyUserId();
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('user-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `chatconnect-${userId?.substring(0, 8)}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!userId) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Dialog open={showQR} onOpenChange={setShowQR}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="glass border-white/20">
              <QrCode className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/20 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">Your Connection QR Code</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 p-4">
              <div className="p-4 bg-white rounded-2xl">
                <QRCodeSVG 
                  id="user-qr-code"
                  value={userId} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Friends can scan this to add you instantly
              </p>
              <code className="text-xs font-mono p-2 bg-muted/50 rounded-lg break-all max-w-full">
                {userId}
              </code>
              <div className="flex gap-2 w-full">
                <Button onClick={copyUserId} variant="outline" className="flex-1">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy ID'}
                </Button>
                <Button onClick={downloadQR} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Save QR
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button variant="outline" size="icon" onClick={copyUserId} className="glass border-white/20">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Card className={`glass border-white/20 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Your User ID
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share your unique ID or QR code for instant connections
        </p>
        
        <div className="flex items-center gap-2">
          <code className="flex-1 p-3 bg-muted/50 rounded-lg text-sm font-mono overflow-x-auto">
            {userId}
          </code>
          <Button variant="outline" size="icon" onClick={copyUserId}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 glass border-white/20">
                <QrCode className="w-4 h-4 mr-2" />
                Show QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-white/20 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center">Your Connection QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4 p-4">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG 
                    id="user-qr-code"
                    value={userId} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Friends can scan this QR code to add you
                </p>
                <div className="flex gap-2 w-full">
                  <Button onClick={copyUserId} variant="outline" className="flex-1">
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copy ID
                  </Button>
                  <Button onClick={downloadQR} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Save QR
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={shareUserId} className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Share ID
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
