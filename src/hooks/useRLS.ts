import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  Story,
  Relationship,
  RelationshipView,
  CreateStoryInput,
  CreateRelationshipInput,
  StoryMode,
  RelationshipStatus,
} from '@/types/rls';

/**
 * Hook for managing RLS-protected stories
 * Enforces mode selection and proper data isolation
 */
export const useRLSStories = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Fetch stories visible to current user
   * RLS will automatically filter based on auth.uid() and relationships
   */
  const fetchStories = useCallback(async (mode?: StoryMode) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('stories').select('*').eq('is_deleted', false);

      if (mode) {
        query = query.eq('mode', mode);
      }

      const { data, error: fetchError } = await query.order('created_at', {
        ascending: false,
      });

      if (fetchError) throw fetchError;
      setStories(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stories';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Fetch stories from a specific user
   * RLS enforces access control - general stories visible to owner only,
   * lovers stories visible to owner and active partners
   */
  const fetchUserStories = useCallback(async (userId: string, mode?: StoryMode) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);

      if (mode) {
        query = query.eq('mode', mode);
      }

      const { data, error: fetchError } = await query.order('created_at', {
        ascending: false,
      });

      if (fetchError) throw fetchError;
      setStories(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user stories';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Create a new story with explicit mode specification
   * CRITICAL: mode must be explicitly provided - no defaults allowed
   * RLS enforces that only auth.uid() can create stories for themselves
   */
  const createStory = useCallback(
    async (input: CreateStoryInput) => {
      setLoading(true);
      setError(null);
      try {
        // Validate input
        if (!input.media_url || !input.mode) {
          throw new Error('Media URL and mode are required');
        }

        if (!['general', 'lovers'].includes(input.mode)) {
          throw new Error(`Invalid mode: ${input.mode}. Must be 'general' or 'lovers'`);
        }

        const { data, error: createError } = await supabase
          .from('stories')
          .insert([
            {
              media_url: input.media_url,
              mode: input.mode,
              // user_id is automatically set to auth.uid() by RLS policy
            },
          ])
          .select();

        if (createError) throw createError;

        toast({
          title: 'Success',
          description: `Story created in ${input.mode} mode`,
        });

        return data?.[0] || null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create story';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Delete a story (soft delete)
   * RLS enforces that only the owner can delete their stories
   */
  const deleteStory = useCallback(
    async (storyId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error: deleteError } = await supabase
          .from('stories')
          .update({ is_deleted: true })
          .eq('id', storyId);

        if (deleteError) throw deleteError;

        toast({
          title: 'Success',
          description: 'Story deleted',
        });

        setStories((prev) => prev.filter((s) => s.id !== storyId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete story';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    stories,
    loading,
    error,
    fetchStories,
    fetchUserStories,
    createStory,
    deleteStory,
  };
};

/**
 * Hook for managing relationships with RLS protection
 * Handles relationship lifecycle: pending -> active -> blocked
 */
export const useRLSRelationships = () => {
  const [relationships, setRelationships] = useState<RelationshipView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Fetch all relationships for current user
   * RLS ensures users only see relationships they're part of
   */
  const fetchRelationships = useCallback(async (status?: RelationshipStatus) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('relationships').select('*');

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query.order('created_at', {
        ascending: false,
      });

      if (fetchError) throw fetchError;
      setRelationships(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch relationships';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Create a new relationship (invitation)
   * RLS enforces that users can only create relationships involving themselves
   */
  const createRelationship = useCallback(
    async (input: CreateRelationshipInput) => {
      setLoading(true);
      setError(null);
      try {
        if (!input.other_user_id) {
          throw new Error('User ID is required');
        }

        const { data, error: createError } = await supabase
          .from('relationships')
          .insert([
            {
              user1: input.other_user_id, // Will be reordered by DB
              user2: input.other_user_id,
              status: input.status || 'pending',
            },
          ])
          .select();

        if (createError) throw createError;

        toast({
          title: 'Success',
          description: 'Relationship request sent',
        });

        return data?.[0] || null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create relationship';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Accept a pending relationship request
   * Transitions status from 'pending' to 'active'
   */
  const acceptRelationship = useCallback(
    async (relationshipId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error: updateError } = await supabase
          .from('relationships')
          .update({ status: 'active' })
          .eq('id', relationshipId);

        if (updateError) throw updateError;

        toast({
          title: 'Success',
          description: 'Relationship accepted',
        });

        setRelationships((prev) =>
          prev.map((r) => (r.id === relationshipId ? { ...r, status: 'active' } : r))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to accept relationship';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Block a user
   * Prevents access to lovers stories and future communications
   */
  const blockUser = useCallback(
    async (relationshipId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error: updateError } = await supabase
          .from('relationships')
          .update({ status: 'blocked' })
          .eq('id', relationshipId);

        if (updateError) throw updateError;

        toast({
          title: 'Success',
          description: 'User blocked',
        });

        setRelationships((prev) =>
          prev.map((r) => (r.id === relationshipId ? { ...r, status: 'blocked' } : r))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to block user';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Remove a relationship
   * RLS enforces that only participants can delete
   */
  const removeRelationship = useCallback(
    async (relationshipId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error: deleteError } = await supabase
          .from('relationships')
          .delete()
          .eq('id', relationshipId);

        if (deleteError) throw deleteError;

        toast({
          title: 'Success',
          description: 'Relationship removed',
        });

        setRelationships((prev) => prev.filter((r) => r.id !== relationshipId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove relationship';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    relationships,
    loading,
    error,
    fetchRelationships,
    createRelationship,
    acceptRelationship,
    blockUser,
    removeRelationship,
  };
};
