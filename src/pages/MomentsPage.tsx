import MomentsFeed from '@/components/moments/MomentsFeed';
import { addMomentReaction, addMomentReply, listMoments, publishMoment, updateMomentMusic } from '@/components/moments/momentsService';
import { useChat } from '@/contexts/ChatContext';

const MomentsPage = () => {
  const { mode } = useChat();
  const initialMoments = listMoments(mode);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <MomentsFeed
          currentUser={{ id: 'me', username: 'you', avatar: '' }}
          initialMoments={initialMoments}
          onPublishMoment={async (createdMoment) => {
            // tag with current mode
            createdMoment.mode = mode;
            publishMoment(createdMoment);
          }}
          onReplyToMoment={(moment, replyText) => {
            addMomentReply(moment.id, replyText, 'me', mode);
          }}
          onReactToMoment={(moment, emoji) => {
            addMomentReaction(moment.id, emoji, 'me', mode);
          }}
          onUpdateMomentMusic={async (momentId, music) => {
            await updateMomentMusic(momentId, music, mode);
          }}
        />
      </div>
    </div>
  );
};

export default MomentsPage;
