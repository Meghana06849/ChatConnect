import MomentsFeed from '@/components/moments/MomentsFeed';
import { addMomentReaction, addMomentReply, listMoments, publishMoment, updateMomentMusic } from '@/components/moments/momentsService';

const MomentsPage = () => {
  const initialMoments = listMoments();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <MomentsFeed
          currentUser={{ id: 'me', username: 'you', avatar: '' }}
          initialMoments={initialMoments}
          onPublishMoment={async (createdMoment) => {
            publishMoment(createdMoment);
          }}
          onReplyToMoment={(moment, replyText) => {
            addMomentReply(moment.id, replyText, 'me');
          }}
          onReactToMoment={(moment, emoji) => {
            addMomentReaction(moment.id, emoji, 'me');
          }}
          onUpdateMomentMusic={async (momentId, music) => {
            await updateMomentMusic(momentId, music);
          }}
        />
      </div>
    </div>
  );
};

export default MomentsPage;
