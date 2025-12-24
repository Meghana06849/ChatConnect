import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Upload, Save, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserIdCard } from './UserIdCard';

export const ProfileEditor: React.FC = () => {
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Update local state when profile changes
  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: data.publicUrl });
      
      toast({
        title: "Avatar updated!",
        description: "Your profile picture has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Name required",
        description: "Display name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updateProfile({ display_name: displayName.trim() });
      setEditingName(false);
    } catch (error: any) {
      console.error('Name update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update display name",
        variant: "destructive",
      });
    }
  };

  const handleSaveBio = async () => {
    try {
      await updateProfile({ bio: bio });
      setEditingBio(false);
    } catch (error: any) {
      console.error('Bio update error:', error);
      toast({
        title: "Update failed", 
        description: error.message || "Failed to update bio",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Edit3 className="w-5 h-5" />
          <span>Edit Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-white">
                {profile?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="glass border-white/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Change Photo'}
          </Button>
        </div>

        {/* Display Name Section */}
        <div className="space-y-2">
          <Label>Display Name</Label>
          {editingName ? (
            <div className="flex space-x-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="glass border-white/20"
              />
              <Button size="sm" onClick={handleSaveName}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingName(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span>{profile?.display_name || 'No name set'}</span>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Bio Section */}
        <div className="space-y-2">
          <Label>Bio</Label>
          {editingBio ? (
            <div className="space-y-2">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
                className="glass border-white/20 min-h-[100px]"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {bio.length}/500 characters
                </span>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleSaveBio}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingBio(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg min-h-[100px]">
              <span className="text-sm">
                {profile?.bio || 'No bio added yet. Tell people about yourself!'}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditingBio(true)}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Username (Read-only) */}
        <div className="space-y-2">
          <Label>Username</Label>
          <div className="p-3 bg-white/5 rounded-lg">
            <span className="text-sm">{profile?.username}</span>
          </div>
        </div>

        {/* User ID Card */}
        <UserIdCard />
      </CardContent>
    </Card>
  );
};