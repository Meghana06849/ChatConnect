import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Eye, 
  EyeOff, 
  Users, 
  Clock, 
  Image as ImageIcon,
  Shield
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PrivacyOption {
  value: string;
  label: string;
  description: string;
}

const privacyOptions: PrivacyOption[] = [
  { value: 'everyone', label: 'Everyone', description: 'Visible to all users' },
  { value: 'contacts', label: 'Contacts Only', description: 'Only your contacts can see' },
  { value: 'nobody', label: 'Nobody', description: 'Hidden from everyone' },
];

interface PrivacySettingsProps {
  isLoversMode?: boolean;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ isLoversMode = false }) => {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    show_profile_photo: 'everyone',
    show_last_seen: 'everyone',
    show_online_status: 'everyone',
    show_moments: 'everyone',
  });

  useEffect(() => {
    if (profile?.privacy_settings) {
      const privacySettings = profile.privacy_settings;
      setSettings({
        show_profile_photo: privacySettings.show_profile_photo || 'everyone',
        show_last_seen: privacySettings.show_last_seen || 'everyone',
        show_online_status: privacySettings.show_online_status || 'everyone',
        show_moments: privacySettings.show_moments || 'everyone',
      });
    }
  }, [profile]);

  const handleSettingChange = async (key: string, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await updateProfile({ privacy_settings: newSettings });
      toast({
        title: "Privacy updated",
        description: "Your privacy settings have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const privacyItems = [
    {
      key: 'show_profile_photo',
      icon: ImageIcon,
      label: 'Profile Photo',
      description: 'Who can see your profile picture',
    },
    {
      key: 'show_last_seen',
      icon: Clock,
      label: 'Last Seen',
      description: 'Who can see when you were last active',
    },
    {
      key: 'show_online_status',
      icon: Eye,
      label: 'Online Status',
      description: 'Who can see when you are online',
    },
    {
      key: 'show_moments',
      icon: Users,
      label: 'Moments',
      description: 'Who can see your moments/stories',
    },
  ];

  return (
    <Card className={cn(
      "glass border-white/20",
      isLoversMode && "border-lovers-primary/20"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className={cn(
            "w-5 h-5",
            isLoversMode ? "text-lovers-primary" : "text-general-primary"
          )} />
          Privacy Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {privacyItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "w-5 h-5",
                  isLoversMode ? "text-lovers-primary" : "text-muted-foreground"
                )} />
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              
              <RadioGroup
                value={settings[item.key as keyof typeof settings]}
                onValueChange={(value) => handleSettingChange(item.key, value)}
                className="flex flex-wrap gap-2"
              >
                {privacyOptions.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <RadioGroupItem
                      value={option.value}
                      id={`${item.key}-${option.value}`}
                      className={cn(
                        isLoversMode && "border-lovers-primary data-[state=checked]:bg-lovers-primary"
                      )}
                    />
                    <Label
                      htmlFor={`${item.key}-${option.value}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
