import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Camera, 
  Sparkles, 
  Send,
  Upload,
  X,
  RotateCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ARFiltersProps {
  onSendImage?: (file: File) => void;
}

const filters = [
  { id: 'none', name: 'Original', icon: '😊', css: '' },
  { id: 'warm', name: 'Warm', icon: '🌅', css: 'saturate(1.3) sepia(0.2) brightness(1.05)' },
  { id: 'cool', name: 'Cool', icon: '❄️', css: 'saturate(0.9) hue-rotate(20deg) brightness(1.05)' },
  { id: 'vintage', name: 'Vintage', icon: '📷', css: 'sepia(0.5) contrast(1.1) brightness(0.95)' },
  { id: 'dramatic', name: 'Dramatic', icon: '🎭', css: 'contrast(1.4) saturate(1.3) brightness(0.9)' },
  { id: 'glow', name: 'Glow', icon: '✨', css: 'brightness(1.2) contrast(0.95) saturate(1.2)' },
  { id: 'noir', name: 'Noir', icon: '🖤', css: 'grayscale(1) contrast(1.3) brightness(0.9)' },
  { id: 'pop', name: 'Pop Art', icon: '🎨', css: 'saturate(2) contrast(1.5) brightness(1.1)' },
  { id: 'dream', name: 'Dreamy', icon: '💫', css: 'brightness(1.1) saturate(0.8) blur(0.5px) contrast(0.9)' },
  { id: 'fire', name: 'Fire', icon: '🔥', css: 'saturate(1.8) hue-rotate(-10deg) contrast(1.2)' },
  { id: 'ice', name: 'Ice', icon: '🧊', css: 'saturate(0.7) hue-rotate(180deg) brightness(1.1)' },
  { id: 'sunset', name: 'Sunset', icon: '🌇', css: 'sepia(0.3) saturate(1.5) hue-rotate(-20deg) brightness(1.05)' },
];

export const ARFilters: React.FC<ARFiltersProps> = ({ onSendImage }) => {
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    
    const img = document.createElement('img');
    img.onload = () => { imageRef.current = img; applyFilter(img, 'none'); };
    img.src = url;
    setSelectedFilter('none');
    e.target.value = '';
  };

  const applyFilter = useCallback((img: HTMLImageElement, filterId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxW = 800;
    const scale = img.width > maxW ? maxW / img.width : 1;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    const filterDef = filters.find(f => f.id === filterId);
    ctx.filter = filterDef?.css || 'none';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    if (imageRef.current) {
      applyFilter(imageRef.current, filterId);
    }
  };

  const handleSend = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSendImage) return;
    setSending(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed')), 'image/jpeg', 0.9);
      });
      const file = new File([blob], `filtered_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onSendImage(file);
      toast({ title: '📸 Image sent!', description: `Sent with ${filters.find(f => f.id === selectedFilter)?.name} filter` });
      resetState();
    } catch (err: any) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const resetState = () => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedFilter('none');
    imageRef.current = null;
  };

  return (
    <div className="space-y-4">
      {!imageFile ? (
        <Card className="glass border-white/20">
          <CardContent className="p-8 text-center">
            <Camera className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Choose a photo to apply filters</h3>
            <p className="text-muted-foreground mb-4 text-sm">Select an image, apply a filter, then send it in chat</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} size="lg">
              <Upload className="w-4 h-4 mr-2" /> Choose Photo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Preview */}
          <Card className="glass border-white/20 relative">
            <CardContent className="p-2">
              <Button
                variant="ghost" size="icon"
                className="absolute top-3 right-3 z-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
                onClick={resetState}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[320px] object-contain rounded-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Filters strip */}
          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterSelect(filter.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[60px] shrink-0 transition-all",
                  selectedFilter === filter.id
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
                    : "bg-white/5 hover:bg-white/10"
                )}
              >
                <span className="text-xl">{filter.icon}</span>
                <span className="text-[10px] font-medium leading-tight">{filter.name}</span>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 glass border-white/20" onClick={() => handleFilterSelect('none')}>
              <RotateCw className="w-4 h-4 mr-2" /> Reset
            </Button>
            {onSendImage && (
              <Button className="flex-1" onClick={handleSend} disabled={sending}>
                <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending...' : 'Send in Chat'}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
