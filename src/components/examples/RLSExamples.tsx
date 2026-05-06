import React, { useState, useEffect } from 'react';
import { useRLSStories, useRLSRelationships } from '@/hooks/useRLS';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { StoryMode } from '@/types/rls';

/**
 * Example: Create Story Component
 * Demonstrates explicit mode selection for security
 */
export const CreateStoryExample = () => {
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedMode, setSelectedMode] = useState<StoryMode | ''>('');
  const { createStory, loading } = useRLSStories();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!mediaUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a media URL',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedMode) {
      toast({
        title: 'Error',
        description: 'Please select a mode (General or Lovers)',
        variant: 'destructive',
      });
      return;
    }

    // Create story with explicit mode
    const result = await createStory({
      media_url: mediaUrl,
      mode: selectedMode as StoryMode,
    });

    if (result) {
      setMediaUrl('');
      setSelectedMode('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Story</CardTitle>
        <CardDescription>
          Select a mode: General (Private to you) or Lovers (Only visible to partners)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Media URL Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Media URL</label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          {/* Mode Selection - MUST BE EXPLICIT */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Mode <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="general"
                  checked={selectedMode === 'general'}
                  onChange={(e) => setSelectedMode(e.target.value as StoryMode)}
                  className="mr-2"
                />
                <span>
                  🔒 General Mode (Private - Only you can see)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="lovers"
                  checked={selectedMode === 'lovers'}
                  onChange={(e) => setSelectedMode(e.target.value as StoryMode)}
                  className="mr-2"
                />
                <span>
                  💕 Lovers Mode (Only visible to your partners)
                </span>
              </label>
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Story'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

/**
 * Example: View Stories Component
 * Shows automatic RLS filtering based on relationships
 */
export const ViewStoriesExample = ({ userId }: { userId: string }) => {
  const { stories, loading, fetchUserStories, deleteStory } = useRLSStories();
  const [selectedMode, setSelectedMode] = useState<StoryMode | 'all'>('all');

  useEffect(() => {
    // RLS automatically filters based on:
    // 1. Is this the current user? (show all)
    // 2. Is this another user's general story? (hide it)
    // 3. Is this another user's lovers story? (show only if in relationship)
    fetchUserStories(userId, selectedMode === 'all' ? undefined : selectedMode as StoryMode);
  }, [userId, selectedMode]);

  const filteredStories = stories.filter(
    (story) => selectedMode === 'all' || story.mode === selectedMode
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stories</CardTitle>
        <CardDescription>
          {stories.length === 0
            ? 'No stories available'
            : `${stories.length} story/stories${selectedMode !== 'all' ? ` (${selectedMode} mode)` : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedMode} onValueChange={(v) => setSelectedMode(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="lovers">Lovers</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="text-center py-8">Loading stories...</div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No stories in this mode</div>
          ) : (
            <div className="space-y-4 mt-4">
              {filteredStories.map((story) => (
                <div key={story.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <img
                        src={story.media_url}
                        alt="Story"
                        className="w-full rounded-md max-h-96 object-cover"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {story.mode === 'general' ? '🔒 General' : '💕 Lovers'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(story.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStory(story.id)}
                      className="ml-4"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

/**
 * Example: Relationship Manager Component
 * Manages connections between users with status updates
 */
export const RelationshipManagerExample = () => {
  const {
    relationships,
    loading,
    fetchRelationships,
    createRelationship,
    acceptRelationship,
    blockUser,
    removeRelationship,
  } = useRLSRelationships();

  const [inviteUserId, setInviteUserId] = useState('');

  useEffect(() => {
    // Fetch only shows relationships user is part of (RLS enforced)
    fetchRelationships();
  }, []);

  const handleInvite = async () => {
    if (!inviteUserId) return;
    await createRelationship({ other_user_id: inviteUserId });
    setInviteUserId('');
  };

  const handleAccept = async (relationshipId: string) => {
    await acceptRelationship(relationshipId);
    // After accepting, can now access lovers stories
  };

  const handleBlock = async (relationshipId: string) => {
    await blockUser(relationshipId);
    // After blocking, cannot access lovers stories anymore
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Relationships</CardTitle>
        <CardDescription>
          Send invitations and manage your connections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Send Invitation */}
        <div className="border-b pb-6">
          <h3 className="font-medium mb-3">Send Relationship Invitation</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              placeholder="Enter user ID or email"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button onClick={handleInvite} disabled={loading || !inviteUserId}>
              Send Invite
            </Button>
          </div>
        </div>

        {/* Relationships List */}
        <div>
          <h3 className="font-medium mb-3">Your Relationships</h3>
          {loading ? (
            <div className="text-center py-4">Loading relationships...</div>
          ) : relationships.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No relationships yet</div>
          ) : (
            <div className="space-y-3">
              {relationships.map((rel) => (
                <div key={rel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{rel.other_user_id}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status:{' '}
                      <span className="capitalize">
                        {rel.status === 'pending' && '⏳ Pending'}
                        {rel.status === 'active' && '✅ Active'}
                        {rel.status === 'blocked' && '🚫 Blocked'}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {rel.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(rel.id)}
                          disabled={loading}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeRelationship(rel.id)}
                          disabled={loading}
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {rel.status === 'active' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBlock(rel.id)}
                        disabled={loading}
                      >
                        Block
                      </Button>
                    )}

                    {rel.status === 'blocked' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeRelationship(rel.id)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <p>
            💡 <strong>Tip:</strong> Accept a relationship invitation to unlock access to that
            person's Lovers Mode stories!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Example: Dashboard Component
 * Combines all RLS features into one view
 */
export const RLSDashboardExample = ({ userId }: { userId: string; currentUserId: string }) => {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">ChatConnect Dashboard</h1>
        <p className="text-gray-600">
          Powered by Row Level Security (RLS) for complete data isolation
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList>
          <TabsTrigger value="create">Create Story</TabsTrigger>
          <TabsTrigger value="view">View Stories</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateStoryExample />
        </TabsContent>

        <TabsContent value="view">
          <ViewStoriesExample userId={userId} />
        </TabsContent>

        <TabsContent value="relationships">
          <RelationshipManagerExample />
        </TabsContent>
      </Tabs>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔒 Security Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ General Mode stories are private to you only</li>
            <li>✓ Lovers Mode stories require active relationships to view</li>
            <li>✓ Mode is enforced at database level (cannot be bypassed)</li>
            <li>✓ RLS prevents data leakage even if frontend is compromised</li>
            <li>✓ All access control happens at the PostgreSQL database level</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default RLSDashboardExample;
