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
  Trash2
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
  onBlock: () => void;
  onRemoveFriend: () => void;
  onClearChat: () => void;
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
  onBlock,
  onRemoveFriend,
  onClearChat,
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
            Chat Settings - {contactName}
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
                <Label>Mute Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Silence notifications from this chat
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
                <Label>Disappearing Messages</Label>
                <p className="text-xs text-muted-foreground">
                  Messages will auto-delete after being read
                </p>
              </div>
            </div>
            
            <RadioGroup
              value={settings?.disappearing_mode || 'off'}
              onValueChange={(value) => onDisappearingModeChange(value as any)}
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
          <Button
            variant="outline"
            className="w-full justify-start gap-3 glass border-white/20"
            onClick={onWallpaperChange}
          >
            <ImageIcon className="w-5 h-5" />
            Change Chat Wallpaper
          </Button>

          <Separator className="bg-white/10" />

          {/* Danger Zone */}
          <div className="space-y-2">
            <Label className="text-destructive text-xs uppercase tracking-wider">
              Danger Zone
            </Label>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onClearChat}
            >
              <Trash2 className="w-4 h-4" />
              Clear Chat History
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onRemoveFriend}
            >
              <UserMinus className="w-4 h-4" />
              Remove Friend
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={onBlock}
            >
              <Ban className="w-4 h-4" />
              Block Contact
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
