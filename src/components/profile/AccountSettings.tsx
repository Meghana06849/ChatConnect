import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { VerificationBadge } from './VerificationBadge';
import { 
  Settings, 
  User, 
  Key, 
  Save, 
  Loader2,
  Check,
  X,
  Copy,
  RefreshCw
} from 'lucide-react';

export const AccountSettings: React.FC = () => {
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();
  const [customUserId, setCustomUserId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile?.custom_user_id) {
      setCustomUserId(profile.custom_user_id);
    }
  }, [profile?.custom_user_id]);

  const validateUserId = (id: string): string | null => {
    if (id.length < 4) return 'User ID must be at least 4 characters';
    if (id.length > 24) return 'User ID must be 24 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(id)) return 'Only letters, numbers, and underscores allowed';
    if (/^[0-9]/.test(id)) return 'User ID cannot start with a number';
    return null;
  };

  const checkAvailability = async () => {
    const error = validateUserId(customUserId);
    if (error) {
      toast({ title: 'Invalid User ID', description: error, variant: 'destructive' });
      return;
    }

    setChecking(true);
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('custom_user_id')
        .eq('custom_user_id', customUserId.toLowerCase())
        .neq('user_id', profile?.user_id || '')
        .maybeSingle();

      if (queryError) throw queryError;
      
      setIsAvailable(!data);
      if (data) {
        toast({
          title: 'Not Available',
          description: 'This User ID is already taken',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Available!',
          description: 'This User ID is available',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error checking availability',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSaveUserId = async () => {
    const error = validateUserId(customUserId);
    if (error) {
      toast({ title: 'Invalid User ID', description: error, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ custom_user_id: customUserId.toLowerCase() });
      setIsEditing(false);
      setIsAvailable(null);
      toast({
        title: 'User ID Updated!',
        description: 'Your custom User ID has been saved',
      });
    } catch (error: any) {
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        toast({
          title: 'User ID Taken',
          description: 'This User ID is already in use',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error saving User ID',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'User ID copied to clipboard',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Account Settings
        </CardTitle>
        <CardDescription>
          Manage your account preferences and custom User ID
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verification Status */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Verification Status
          </Label>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            {profile?.is_verified ? (
              <>
                <VerificationBadge 
                  isVerified={profile.is_verified} 
                  verificationType={profile.verification_type}
                  size="lg"
                />
                <span className="text-sm font-medium">
                  {profile.verification_type === 'premium' && 'Premium Verified'}
                  {profile.verification_type === 'verified' && 'Verified Account'}
                  {profile.verification_type === 'creator' && 'Content Creator'}
                  {profile.verification_type === 'official' && 'Official Account'}
                  {!profile.verification_type && 'Verified'}
                </span>
              </>
            ) : (
              <>
                <Badge variant="secondary">Not Verified</Badge>
                <span className="text-sm text-muted-foreground">
                  Request verification to get a badge
                </span>
              </>
            )}
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* System User ID */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            System User ID
          </Label>
          <div className="flex items-center gap-2">
            <Input 
              value={profile?.user_id || ''} 
              readOnly 
              className="glass border-white/20 font-mono text-xs"
            />
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => copyToClipboard(profile?.user_id || '')}
              className="glass border-white/20"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This is your permanent system ID. It cannot be changed.
          </p>
        </div>

        {/* Custom User ID */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Custom User ID
          </Label>
          
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    value={customUserId}
                    onChange={(e) => {
                      setCustomUserId(e.target.value);
                      setIsAvailable(null);
                    }}
                    placeholder="your_custom_id"
                    className="glass border-white/20 pl-8"
                    maxLength={24}
                  />
                </div>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={checkAvailability}
                  disabled={checking || !customUserId}
                  className="glass border-white/20"
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
              
              {isAvailable !== null && (
                <div className={`flex items-center gap-2 text-sm ${isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                  {isAvailable ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {isAvailable ? 'Available' : 'Not available'}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveUserId} 
                  disabled={saving || !customUserId}
                  className="flex-1"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setCustomUserId(profile?.custom_user_id || '');
                    setIsAvailable(null);
                  }}
                  className="glass border-white/20"
                >
                  Cancel
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                4-24 characters. Letters, numbers, and underscores only.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-white/5 rounded-lg">
                {profile?.custom_user_id ? (
                  <span className="font-medium">@{profile.custom_user_id}</span>
                ) : (
                  <span className="text-muted-foreground">No custom ID set</span>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="glass border-white/20"
              >
                {profile?.custom_user_id ? 'Change' : 'Set ID'}
              </Button>
              {profile?.custom_user_id && (
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => copyToClipboard(`@${profile.custom_user_id}`)}
                  className="glass border-white/20"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
