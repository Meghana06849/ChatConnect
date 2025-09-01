import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Image, 
  Upload, 
  Download, 
  RotateCw, 
  Crop, 
  Palette, 
  Contrast,
  Sun,
  Zap,
  Filter,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
}

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (imageUrl: string) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ isOpen, onClose, onSave }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hue: 0
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImage = (file: File) => {
    const img = document.createElement('img');
    img.onload = () => {
      setImage(img);
      drawImage(img, filters);
    };
    img.src = URL.createObjectURL(file);
  };

  const drawImage = (img: HTMLImageElement, currentFilters: ImageFilters) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;

    // Apply filters
    ctx.filter = `
      brightness(${currentFilters.brightness}%) 
      contrast(${currentFilters.contrast}%) 
      saturate(${currentFilters.saturation}%) 
      blur(${currentFilters.blur}px)
      hue-rotate(${currentFilters.hue}deg)
    `;

    // Draw image
    ctx.drawImage(img, 0, 0);
  };

  const handleFilterChange = (filterName: keyof ImageFilters, value: number) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    if (image) {
      drawImage(image, newFilters);
    }
  };

  const resetFilters = () => {
    const resetFilters = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      hue: 0
    };
    setFilters(resetFilters);
    if (image) {
      drawImage(image, resetFilters);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const saveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    
    try {
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Failed to create image blob');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Upload to Supabase storage
        const fileName = `${user.id}/edited_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        if (onSave) {
          onSave(data.publicUrl);
        }

        toast({
          title: "Image saved!",
          description: "Your edited image has been saved to your media.",
        });

        onClose();
      }, 'image/png');
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `edited_image_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Image className="w-5 h-5" />
            <span>Image Editor</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!image ? (
            <Card className="glass border-white/20">
              <CardContent className="p-8 text-center">
                <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Upload an image to start editing</h3>
                <p className="text-muted-foreground mb-4">Supports JPEG, PNG, GIF formats</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Image
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Canvas Area */}
              <div className="lg:col-span-2">
                <Card className="glass border-white/20">
                  <CardContent className="p-4">
                    <div className="flex justify-center">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-96 object-contain border border-white/20 rounded"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Controls Panel */}
              <div className="space-y-4">
                <Card className="glass border-white/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Palette className="w-4 h-4" />
                      <span>Filters</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Brightness */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center space-x-2">
                          <Sun className="w-4 h-4" />
                          <span>Brightness</span>
                        </Label>
                        <span className="text-sm text-muted-foreground">{filters.brightness}%</span>
                      </div>
                      <Slider
                        value={[filters.brightness]}
                        onValueChange={(value) => handleFilterChange('brightness', value[0])}
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center space-x-2">
                          <Contrast className="w-4 h-4" />
                          <span>Contrast</span>
                        </Label>
                        <span className="text-sm text-muted-foreground">{filters.contrast}%</span>
                      </div>
                      <Slider
                        value={[filters.contrast]}
                        onValueChange={(value) => handleFilterChange('contrast', value[0])}
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center space-x-2">
                          <Zap className="w-4 h-4" />
                          <span>Saturation</span>
                        </Label>
                        <span className="text-sm text-muted-foreground">{filters.saturation}%</span>
                      </div>
                      <Slider
                        value={[filters.saturation]}
                        onValueChange={(value) => handleFilterChange('saturation', value[0])}
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Blur */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center space-x-2">
                          <Filter className="w-4 h-4" />
                          <span>Blur</span>
                        </Label>
                        <span className="text-sm text-muted-foreground">{filters.blur}px</span>
                      </div>
                      <Slider
                        value={[filters.blur]}
                        onValueChange={(value) => handleFilterChange('blur', value[0])}
                        min={0}
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Hue */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center space-x-2">
                          <RotateCw className="w-4 h-4" />
                          <span>Hue</span>
                        </Label>
                        <span className="text-sm text-muted-foreground">{filters.hue}°</span>
                      </div>
                      <Slider
                        value={[filters.hue]}
                        onValueChange={(value) => handleFilterChange('hue', value[0])}
                        min={-180}
                        max={180}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <Separator />

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        onClick={resetFilters}
                        className="w-full glass border-white/20"
                      >
                        Reset Filters
                      </Button>
                      
                      <Button 
                        onClick={downloadImage}
                        variant="secondary"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>

                      <Button 
                        onClick={saveImage}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-primary to-accent"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save to Media'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};