import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CreateMoment from './CreateMoment';
import MomentViewer from './MomentViewer';

const EXPIRY_MS = 24 * 60 * 60 * 1000;

export default function MomentsFeed({
  currentUser,
  initialMoments = [],
  onPublishMoment,
  onReplyToMoment,
  onReactToMoment,
  onUpdateMomentMusic,
}) {
  const [moments, setMoments] = useState(initialMoments);
  const [showCreate, setShowCreate] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const aliveMoments = useMemo(() => {
    const now = Date.now();
    return moments.filter((m) => now - new Date(m.createdAt).getTime() < EXPIRY_MS);
  }, [moments]);

  const myMoments = aliveMoments.filter((m) => m.userId === currentUser?.id);
  const others = aliveMoments.filter((m) => m.userId !== currentUser?.id);

  const groupedByUser = useMemo(() => {
    const map = new Map();
    for (const m of others) {
      if (!map.has(m.userId)) map.set(m.userId, []);
      map.get(m.userId).push(m);
    }
    return [...map.entries()].map(([userId, list]) => ({
      userId,
      username: list[0]?.username || 'friend',
      avatar: list[0]?.avatar,
      moments: list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    }));
  }, [others]);

  const openStoryStack = (stack) => {
    const merged = stack?.moments || [];
    if (!merged.length) return;
    setViewerIndex(0);
    setViewerStack(merged);
    setShowViewer(true);
  };

  const [viewerStack, setViewerStack] = useState([]);

  const publishMoment = async (payload) => {
    const created = {
      id: crypto.randomUUID(),
      userId: currentUser?.id || 'me',
      username: currentUser?.username || 'you',
      avatar: currentUser?.avatar || '',
      createdAt: new Date().toISOString(),
      mediaType: payload.file.type,
      url: payload.url || URL.createObjectURL(payload.file),
      storagePath: payload.storagePath,
      privacy: payload.privacy,
      specificUsers: payload.specificUsers,
      editMeta: payload.editMeta,
      music: payload.music,
    };

    setMoments((prev) => [created, ...prev]);
    await onPublishMoment?.(created);
  };

  const handleUpdateMomentMusic = async (momentId, music) => {
    setMoments((prev) => prev.map((moment) => (moment.id === momentId ? { ...moment, music } : moment)));
    setViewerStack((prev) => prev.map((moment) => (moment.id === momentId ? { ...moment, music } : moment)));
    await onUpdateMomentMusic?.(momentId, music);
  };

  return (
    <section className="rounded-3xl border border-zinc-700 bg-zinc-950 p-4 text-white shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Moments</h2>
          <p className="text-xs text-zinc-400">Stories disappear after 24 hours</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] px-4 py-2 text-sm font-semibold"
        >
          + Create
        </motion.button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          onClick={() => {
            if (!myMoments.length) {
              setShowCreate(true);
              return;
            }
            setViewerStack(myMoments);
            setViewerIndex(0);
            setShowViewer(true);
          }}
          className="min-w-[76px] text-center"
        >
          <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#ff4d6d] bg-zinc-900 text-2xl">
            {myMoments.length ? '🟣' : '+'}
          </div>
          <span className="text-xs text-zinc-300">Your story</span>
        </button>

        {groupedByUser.map((entry) => (
          <button key={entry.userId} onClick={() => openStoryStack(entry)} className="min-w-[76px] text-center">
            <div className="mx-auto mb-1 h-16 w-16 rounded-full bg-gradient-to-br from-[#ff4d6d] to-[#7b2cbf] p-[2px]">
              <div className="h-full w-full overflow-hidden rounded-full bg-zinc-900">
                {entry.avatar ? (
                  <img src={entry.avatar} alt={entry.username} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">👤</div>
                )}
              </div>
            </div>
            <span className="truncate text-xs text-zinc-300">@{entry.username}</span>
          </button>
        ))}
      </div>

      <CreateMoment open={showCreate} onClose={() => setShowCreate(false)} onPublish={publishMoment} />

      <MomentViewer
        open={showViewer}
        moments={viewerStack}
        startIndex={viewerIndex}
        currentUserId={currentUser?.id || null}
        onClose={() => setShowViewer(false)}
        onReply={onReplyToMoment}
        onReact={onReactToMoment}
        onUpdateMusic={handleUpdateMomentMusic}
      />
    </section>
  );
}
