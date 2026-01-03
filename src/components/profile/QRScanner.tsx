import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (userId: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  const startScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(decodedText)) {
            stopScanner();
            onScan(decodedText);
            toast({
              title: "QR Code Scanned!",
              description: "User ID detected. Sending friend request...",
            });
          } else {
            toast({
              title: "Invalid QR Code",
              description: "This QR code doesn't contain a valid User ID.",
              variant: "destructive",
            });
          }
        },
        () => {
          // Ignore scan failures (no QR in frame)
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err.message || 'Failed to start camera');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="glass border-white/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan QR Code to Connect
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            id="qr-reader" 
            className="w-full aspect-square rounded-lg overflow-hidden bg-black/50"
          />
          
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
              <Button 
                onClick={startScanner} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {isScanning && !error && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Point camera at a friend's QR code
            </div>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            Ask your friend to show their QR code from their profile to connect instantly
          </p>
          
          <Button onClick={handleClose} variant="outline" className="w-full">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
