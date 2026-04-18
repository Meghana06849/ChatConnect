import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import MomentEditor from './MomentEditor';
import { useProfile } from '@/hooks/useProfile';
import { uploadMomentMedia } from './momentsService';
import { toast } from '@/hooks/use-toast';

const MAX_VIDEO_SECONDS = 30;

export default function CreateMoment({ open, onClose, onPublish }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const { profile } = useProfile();

  const previewUrl = useMemo(() => {
    if (!selectedFile) return '';
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  const reset = () => {
    setSelectedFile(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Only image or video files are allowed.');
      return;
    }

    if (isVideo) {
      const duration = await new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve(video.duration || 0);
        };
        video.onerror = reject;
        video.src = URL.createObjectURL(file);
      });

      if (duration > MAX_VIDEO_SECONDS) {
        setError(`Video must be ${MAX_VIDEO_SECONDS}s or shorter.`);
        return;
      }
    }

    setSelectedFile(file);
  };

  const onSaveEdit = async (payload) => {
    try {
      setUploading(true);
      const uploadResult = await uploadMomentMedia(payload.file, profile?.user_id || 'unknown');

      if (!uploadResult) {
        toast({
          title: 'Upload Failed',
          description: 'Could not save your media. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      await onPublish({
        ...payload,
        url: uploadResult.url,
        storagePath: uploadResult.storagePath,
      });

      toast({
        title: 'Moment Published',
        description: 'Your moment has been shared.',
      });
      handleClose();
    } catch (err) {
      console.error('Failed to publish moment:', err);
      toast({
        title: 'Error',
        description: 'Failed to publish moment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  if (selectedFile) {
    return (
      <MomentEditor
        file={selectedFile}
        onCancel={handleClose}
        onSave={onSaveEdit}
        isSaving={uploading}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-zinc-900 p-5 text-white shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Create Moment</h3>
          <button onClick={handleClose} className="rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10">Close</button>
        </div>

        <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/30 bg-white/5 text-center hover:bg-white/10">
          <span className="mb-2 text-sm font-semibold">Upload Image or Video</span>
          <span className="text-xs text-white/70">Video max 30 seconds</span>
          <input type="file" accept="image/*,video/*" className="hidden" onChange={onPickFile} />
        </label>

        {previewUrl && (
          <div className="mt-3 rounded-xl border border-white/20 p-2">
            {selectedFile?.type?.startsWith('video/') ? (
              <video src={previewUrl} controls className="h-44 w-full rounded-lg object-cover" />
            ) : (
              <img src={previewUrl} alt="preview" className="h-44 w-full rounded-lg object-cover" />
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </motion.div>
    </div>
  );
}
