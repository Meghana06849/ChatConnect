import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Camera, Image, Heart, Star, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Story {
  id: string;
  userId: string;
  userName: string;
  content: string;
  media?: string;
  mediaType?: 'image' | 'video';
  timestamp: Date;
  viewed: boolean;
}

export const Stories: React.FC = () => {
  const { mode } = useChat();
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [newStoryContent, setNewStoryContent] = useState('');
  const isLoversMode = mode === 'lovers';

  const createStory = () => {
    if (!newStoryContent.trim()) return;
    
    const newStory: Story = {
      id: Date.now().toString(),
      userId: user?.id || 'current-user',
      userName: user?.name || 'You',
      content: newStoryContent,
      timestamp: new Date(),
      viewed: false
    };
    
    setStories(prev => [newStory, ...prev]);
    setNewStoryContent('');
    setShowCreateStory(false);
    
    toast({
      title: "Story shared!",
      description: "Your story is now visible to your contacts"
    });
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Star className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'} animate-blink-star`} />
          <h1 className="text-3xl font-bold mb-2">
            {isLoversMode ? 'Love Stories' : 'Stories'}
          </h1>
          <p className="text-muted-foreground">
            {isLoversMode ? 'Share your romantic moments' : 'Share your daily moments with friends'}
          </p>
        </div>

        {/* Create Story */}
        <Card className="glass border-white/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className={`
                  ${isLoversMode 
                    ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' 
                    : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                  }
                `}>
                  {user?.name?.[0] || 'Y'}
                </AvatarFallback>
              </Avatar>
              
              <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1 justify-start glass border-white/20 hover:bg-white/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isLoversMode ? 'Share a love moment...' : 'What\'s on your mind?'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-white/20">
                  <DialogHeader>
                    <DialogTitle>Create Story</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      value={newStoryContent}
                      onChange={(e) => setNewStoryContent(e.target.value)}
                      placeholder={isLoversMode ? "Share something special..." : "What's happening?"}
                      className="glass border-white/20"
                      rows={4}
                    />
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" className="flex-1 glass border-white/20">
                        <Camera className="w-4 h-4 mr-2" />
                        Camera
                      </Button>
                      <Button variant="outline" className="flex-1 glass border-white/20">
                        <Image className="w-4 h-4 mr-2" />
                        Gallery
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={createStory} 
                      disabled={!newStoryContent.trim()}
                      className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                    >
                      Share Story
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <Card 
              key={story.id} 
              className={`
                glass border-white/20 hover:shadow-lg transition-all duration-200 cursor-pointer group
                ${!story.viewed ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''}
                ${!story.viewed && isLoversMode ? 'ring-lovers-primary' : ''}
                ${!story.viewed && !isLoversMode ? 'ring-general-primary' : ''}
              `}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`
                      ${isLoversMode 
                        ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' 
                        : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                      }
                    `}>
                      {story.userName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{story.userName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {story.timestamp.toLocaleString()}
                    </p>
                  </div>
                  {!story.viewed && (
                    <div className={`w-2 h-2 rounded-full ${isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'}`} />
                  )}
                </div>
                
                {story.media && (
                  <div className="mb-3 relative">
                    <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                      {story.mediaType === 'video' ? (
                        <Play className="w-8 h-8 text-gray-600" />
                      ) : (
                        <Image className="w-8 h-8 text-gray-600" />
                      )}
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">{story.content}</p>
                
                {isLoversMode && (
                  <div className="mt-3 flex justify-center">
                    <Heart className="w-4 h-4 text-lovers-primary animate-heart-beat" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {stories.length === 0 && (
          <div className="text-center py-12">
            <div className={`
              w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4
              ${isLoversMode 
                ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
                : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
              }
            `}>
              <Star className={`w-12 h-12 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
            </div>
            <h3 className="text-xl font-semibold mb-2">No stories yet</h3>
            <p className="text-muted-foreground">Be the first to share a moment!</p>
          </div>
        )}
      </div>
    </div>
  );
};