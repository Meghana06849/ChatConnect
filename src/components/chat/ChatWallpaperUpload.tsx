import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Image } from 'lucide-react';

interface ChatWallpaperUploadProps {
  onUploadComplete: (url: string) => void;
  currentWallpaper?: string | null;
}

export const ChatWallpaperUpload: React.FC<ChatWallpaperUploadProps> = ({
  onUploadComplete,
  currentWallpaper
}) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await uploadWallpaper(file);
      }
    };
    input.click();
  };

  const uploadWallpaper = async (file: File) => {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, WEBP)",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload wallpaper
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/chat-wallpaper-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('wallpapers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('wallpapers')
        .getPublicUrl(fileName);

      toast({
        title: "Wallpaper uploaded!",
        description: "Your chat wallpaper has been set",
      });

      onUploadComplete(publicUrl);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload wallpaper",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted">
        {currentWallpaper ? (
          <>
            <img 
              src={currentWallpaper} 
              alt="Chat wallpaper preview"
              className="w-full h-full object-cover"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={() => onUploadComplete('')}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Image className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No wallpaper set</p>
          </div>
        )}
      </div>
      
      <Button 
        onClick={handleFileSelect}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {currentWallpaper ? 'Change Wallpaper' : 'Upload Wallpaper'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Max 5MB · JPG, PNG, or WEBP
      </p>
    </div>
  );
};