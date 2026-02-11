import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  Camera,
  Image,
  FileText,
  MapPin,
  Contact,
  Music,
  Video,
  Mic,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageEditor } from '@/components/media/ImageEditor';
import { SongManager } from '@/components/media/SongManager';
import { ARFilters } from '@/components/unique/ARFilters';
import { VoiceChangeChat } from '@/components/unique/VoiceChangeChat';

interface MediaAttachmentPickerProps {
  onImageSelect: (file: File) => void;
  onVideoSelect: (file: File) => void;
  onDocumentSelect: (file: File) => void;
  onCameraCapture: () => void;
  onLocationShare: () => void;
  onContactShare: () => void;
  isLoversMode?: boolean;
  onImageEdited?: (url: string) => void;
}

const attachmentOptions = [
  { icon: Camera, label: 'Camera', color: 'bg-rose-500', action: 'camera' },
  { icon: Image, label: 'Gallery', color: 'bg-purple-500', action: 'gallery' },
  { icon: Video, label: 'Video', color: 'bg-pink-500', action: 'video' },
  { icon: FileText, label: 'Document', color: 'bg-indigo-500', action: 'document' },
  { icon: Music, label: 'Music', color: 'bg-orange-500', action: 'music' },
  { icon: MapPin, label: 'Location', color: 'bg-green-500', action: 'location' },
  { icon: Edit3, label: 'Editor', color: 'bg-cyan-500', action: 'image-editor' },
  { icon: Sparkles, label: 'AR Filters', color: 'bg-yellow-500', action: 'ar-filters' },
  { icon: Mic, label: 'Voice FX', color: 'bg-red-500', action: 'voice-changer' },
  { icon: Contact, label: 'Contact', color: 'bg-blue-500', action: 'contact' },
];

export const MediaAttachmentPicker: React.FC<MediaAttachmentPickerProps> = ({
  onImageSelect,
  onVideoSelect,
  onDocumentSelect,
  onCameraCapture,
  onLocationShare,
  onContactShare,
  isLoversMode = false,
  onImageEdited,
}) => {
  const [open, setOpen] = React.useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showMusicManager, setShowMusicManager] = useState(false);
  const [showARFilters, setShowARFilters] = useState(false);
  const [showVoiceChanger, setShowVoiceChanger] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const handleAction = (action: string) => {
    setOpen(false);
    
    switch (action) {
      case 'camera':
        onCameraCapture();
        break;
      case 'gallery':
        imageInputRef.current?.click();
        break;
      case 'video':
        videoInputRef.current?.click();
        break;
      case 'document':
        documentInputRef.current?.click();
        break;
      case 'music':
        setShowMusicManager(true);
        break;
      case 'location':
        onLocationShare();
        break;
      case 'contact':
        onContactShare();
        break;
      case 'image-editor':
        setShowImageEditor(true);
        break;
      case 'ar-filters':
        setShowARFilters(true);
        break;
      case 'voice-changer':
        setShowVoiceChanger(true);
        break;
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    handler: (file: File) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handler(file);
    }
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, onImageSelect)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, onVideoSelect)}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        className="hidden"
        onChange={(e) => handleFileChange(e, onDocumentSelect)}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full hover:bg-white/10 transition-transform",
              open && "rotate-45"
            )}
          >
            <Plus className={cn(
              "w-5 h-5",
              isLoversMode ? "text-lovers-primary" : "text-general-primary"
            )} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="start"
          className="w-auto p-4 glass border-white/20"
        >
          <div className="grid grid-cols-5 gap-3">
            {attachmentOptions.map((option) => (
              <button
                key={option.action}
                onClick={() => handleAction(option.action)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-white transition-transform group-hover:scale-110",
                  option.color
                )}>
                  <option.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground leading-tight">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Image Editor Dialog */}
      <ImageEditor 
        isOpen={showImageEditor} 
        onClose={() => setShowImageEditor(false)}
        onSave={(url) => {
          onImageEdited?.(url);
          setShowImageEditor(false);
        }}
      />

      {/* Music Manager Dialog */}
      <Dialog open={showMusicManager} onOpenChange={setShowMusicManager}>
        <DialogContent className="glass border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Music className="w-5 h-5" />
              <span>Music Collection</span>
            </DialogTitle>
          </DialogHeader>
          <SongManager />
        </DialogContent>
      </Dialog>

      {/* AR Filters Dialog — now functional */}
      <Dialog open={showARFilters} onOpenChange={setShowARFilters}>
        <DialogContent className="glass border-white/20 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>AR Filters & Effects</span>
            </DialogTitle>
          </DialogHeader>
          <ARFilters onSendImage={(file) => {
            onImageSelect(file);
            setShowARFilters(false);
          }} />
        </DialogContent>
      </Dialog>

      {/* Voice Changer Dialog — now functional */}
      <Dialog open={showVoiceChanger} onOpenChange={setShowVoiceChanger}>
        <DialogContent className="glass border-white/20 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mic className="w-5 h-5" />
              <span>Voice Changer</span>
            </DialogTitle>
          </DialogHeader>
          <VoiceChangeChat onSendVoice={(file) => {
            onImageSelect(file); // reuse same upload handler
            setShowVoiceChanger(false);
          }} />
        </DialogContent>
      </Dialog>
    </>
  );
};
