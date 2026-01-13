import React, { useRef } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaAttachmentPickerProps {
  onImageSelect: (file: File) => void;
  onVideoSelect: (file: File) => void;
  onDocumentSelect: (file: File) => void;
  onCameraCapture: () => void;
  onLocationShare: () => void;
  onContactShare: () => void;
  isLoversMode?: boolean;
}

const attachmentOptions = [
  { icon: Camera, label: 'Camera', color: 'bg-rose-500', action: 'camera' },
  { icon: Image, label: 'Gallery', color: 'bg-purple-500', action: 'gallery' },
  { icon: Video, label: 'Video', color: 'bg-pink-500', action: 'video' },
  { icon: FileText, label: 'Document', color: 'bg-indigo-500', action: 'document' },
  { icon: Music, label: 'Audio', color: 'bg-orange-500', action: 'audio' },
  { icon: MapPin, label: 'Location', color: 'bg-green-500', action: 'location' },
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
}) => {
  const [open, setOpen] = React.useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

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
      case 'audio':
        audioInputRef.current?.click();
        break;
      case 'location':
        onLocationShare();
        break;
      case 'contact':
        onContactShare();
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
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
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
          <div className="grid grid-cols-4 gap-4">
            {attachmentOptions.map((option) => (
              <button
                key={option.action}
                onClick={() => handleAction(option.action)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform group-hover:scale-110",
                  option.color
                )}>
                  <option.icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
