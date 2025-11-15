import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Sun, Moon, X, Loader2 } from 'lucide-react';

export const WallpaperUpload: React.FC = () => {
  const [dayWallpaper, setDayWallpaper] = useState<string | null>(null);
  const [nightWallpaper, setNightWallpaper] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'day' | 'night' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUserWallpapers();
  }, []);

  const loadUserWallpapers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_wallpapers')
        .select('day_wallpaper_url, night_wallpaper_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDayWallpaper(data.day_wallpaper_url);
        setNightWallpaper(data.night_wallpaper_url);
      }
    } catch (error) {
      console.error('Error loading wallpapers:', error);
    }
  };

  const uploadWallpaper = async (file: File, type: 'day' | 'night') => {
    if (!userId) return;

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

    setUploading(type);

    try {
      // Delete old wallpaper if exists
      const oldUrl = type === 'day' ? dayWallpaper : nightWallpaper;
      if (oldUrl) {
        const oldPath = oldUrl.split('/wallpapers/')[1];
        if (oldPath) {
          await supabase.storage.from('wallpapers').remove([oldPath]);
        }
      }

      // Upload new wallpaper
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;
      
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

      // Update database
      const updateData = type === 'day' 
        ? { day_wallpaper_url: publicUrl }
        : { night_wallpaper_url: publicUrl };

      const { error: dbError } = await supabase
        .from('user_wallpapers')
        .upsert({
          user_id: userId,
          ...updateData
        }, {
          onConflict: 'user_id'
        });

      if (dbError) throw dbError;

      // Update local state
      if (type === 'day') {
        setDayWallpaper(publicUrl);
      } else {
        setNightWallpaper(publicUrl);
      }

      toast({
        title: "Wallpaper uploaded!",
        description: `Your ${type} mode wallpaper has been set`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload wallpaper",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const removeWallpaper = async (type: 'day' | 'night') => {
    if (!userId) return;

    try {
      const url = type === 'day' ? dayWallpaper : nightWallpaper;
      if (!url) return;

      // Delete from storage
      const path = url.split('/wallpapers/')[1];
      if (path) {
        await supabase.storage.from('wallpapers').remove([path]);
      }

      // Update database
      const updateData = type === 'day' 
        ? { day_wallpaper_url: null }
        : { night_wallpaper_url: null };

      await supabase
        .from('user_wallpapers')
        .upsert({
          user_id: userId,
          ...updateData
        }, {
          onConflict: 'user_id'
        });

      // Update local state
      if (type === 'day') {
        setDayWallpaper(null);
      } else {
        setNightWallpaper(null);
      }

      toast({
        title: "Wallpaper removed",
        description: `${type} mode wallpaper has been reset to default`,
      });

    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Failed to remove",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (type: 'day' | 'night') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadWallpaper(file, type);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Custom Wallpapers</h2>
        <p className="text-muted-foreground">Set your own backgrounds for day and night modes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day Wallpaper */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-500" />
              Day Wallpaper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-sky-50 to-blue-100">
              {dayWallpaper ? (
                <>
                  <img 
                    src={dayWallpaper} 
                    alt="Day wallpaper preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => removeWallpaper('day')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Default gradient</p>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => handleFileSelect('day')}
              disabled={uploading === 'day'}
              className="w-full"
            >
              {uploading === 'day' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Day Wallpaper
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Night Wallpaper */}
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-400" />
              Night Wallpaper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950">
              {nightWallpaper ? (
                <>
                  <img 
                    src={nightWallpaper} 
                    alt="Night wallpaper preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => removeWallpaper('night')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Default gradient</p>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => handleFileSelect('night')}
              disabled={uploading === 'night'}
              className="w-full"
            >
              {uploading === 'night' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Night Wallpaper
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/20">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Tips:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Recommended size: 1920x1080 pixels or higher</li>
              <li>Maximum file size: 5MB</li>
              <li>Supported formats: JPG, PNG, WEBP</li>
              <li>Wallpapers auto-switch based on time (6AM-6PM = Day, 6PM-6AM = Night)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
