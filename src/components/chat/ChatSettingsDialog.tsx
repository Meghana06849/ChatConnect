import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  BellOff, 
  Bell, 
  Timer, 
  Image as ImageIcon, 
  Ban,
  UserMinus,
  Trash2,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSettings } from '@/hooks/useChatSettings';

interface ChatSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ChatSettings | null;
  contactName: string;
  isLoversMode?: boolean;
  onMuteToggle: () => void;
  onDisappearingModeChange: (mode: 'off' | '30s' | '1min' | 'on_seen') => void;
  onWallpaperChange: () => void;
  onWallpaperReset: () => void;
  onBlock: () => void;
  onRemoveFriend: () => void;
  onClearChat: () => void;
  currentTheme?: 'galaxy' | 'rainy_night' | 'sunset';
  onThemeChange?: (theme: 'galaxy' | 'rainy_night' | 'sunset') => void;
}

export const ChatSettingsDialog: React.FC<ChatSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  contactName,
  isLoversMode = false,
  onMuteToggle,
  onDisappearingModeChange,
  onWallpaperChange,
  onWallpaperReset,
  onBlock,
  onRemoveFriend,
  onClearChat,
  currentTheme,
  onThemeChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-md glass border-white/20",
        isLoversMode 
          ? "bg-gradient-to-br from-lovers-primary/10 to-lovers-secondary/10"
          : "bg-gradient-to-br from-general-primary/10 to-general-secondary/10"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoversMode ? `Couple Space Settings - ${contactName}` : `Chat Settings - ${contactName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings?.is_muted ? (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
              <div>
                <Label>{isLoversMode ? 'Quiet Time' : 'Mute Notifications'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isLoversMode
                    ? 'Pause notifications for this private couple chat'
                    : 'Silence notifications from this chat'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.is_muted || false}
              onCheckedChange={onMuteToggle}
            />
          </div>

          <Separator className="bg-white/10" />

          {/* Disappearing Messages */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5" />
              <div>
                <Label>{isLoversMode ? 'Fading Love Notes' : 'Disappearing Messages'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isLoversMode
                    ? 'Messages can gently fade after they are seen'
                    : 'Messages will auto-delete after being read'}
                </p>
              </div>
            </div>
            
            <RadioGroup
              value={settings?.disappearing_mode || 'off'}
              onValueChange={(value) => onDisappearingModeChange(value as 'off' | '30s' | '1min' | 'on_seen')}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="off" id="off" />
                <Label htmlFor="off" className="text-sm cursor-pointer">Off</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30s" id="30s" />
                <Label htmlFor="30s" className="text-sm cursor-pointer">30 seconds</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1min" id="1min" />
                <Label htmlFor="1min" className="text-sm cursor-pointer">1 minute</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on_seen" id="on_seen" />
                <Label htmlFor="on_seen" className="text-sm cursor-pointer">Delete on seen</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator className="bg-white/10" />

          {/* Wallpaper */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 glass border-white/20"
              onClick={onWallpaperChange}
            >
              <ImageIcon className="w-5 h-5" />
              {isLoversMode ? 'Change Couple Wallpaper' : 'Change Chat Wallpaper'}
            </Button>
            {settings?.wallpaper_url && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 glass border-white/20 text-muted-foreground hover:text-foreground"
                onClick={onWallpaperReset}
              >
                <ImageIcon className="w-5 h-5" />
                {isLoversMode ? 'Reset Couple Wallpaper' : 'Reset to Default Wallpaper'}
              </Button>
            )}
          </div>

          {isLoversMode && currentTheme && onThemeChange && (
            <>
              <Separator className="bg-white/10" />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5" />
                  <div>
                    <Label>Couple Theme</Label>
                    <p className="text-xs text-muted-foreground">Choose the emotional atmosphere of your chat</p>
                  </div>
                </div>
                <RadioGroup
                  value={currentTheme}
                  onValueChange={(value) => onThemeChange(value as 'galaxy' | 'rainy_night' | 'sunset')}
                  className="grid grid-cols-1 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="galaxy" id="theme-galaxy" />
                    <Label htmlFor="theme-galaxy" className="text-sm cursor-pointer">Galaxy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rainy_night" id="theme-rainy" />
                    <Label htmlFor="theme-rainy" className="text-sm cursor-pointer">Rainy Night</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sunset" id="theme-sunset" />
                    <Label htmlFor="theme-sunset" className="text-sm cursor-pointer">Sunset</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <Separator className="bg-white/10" />

          {/* Danger Zone */}
          <div className="space-y-2">
            <Label className="text-destructive text-xs uppercase tracking-wider">
              {isLoversMode ? 'Sensitive Actions' : 'Danger Zone'}
            </Label>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onClearChat}
            >
              <Trash2 className="w-4 h-4" />
              {isLoversMode ? 'Clear Our Chat History' : 'Clear Chat History'}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onRemoveFriend}
            >
              <UserMinus className="w-4 h-4" />
              {isLoversMode ? 'Leave Couple Space' : 'Remove Friend'}
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onBlock}
            >
              <Ban className="w-4 h-4" />
              {isLoversMode ? 'Block Partner Contact' : 'Block Contact'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
