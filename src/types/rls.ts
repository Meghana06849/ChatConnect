// Type definitions for RLS-protected data structures
// Ensures type safety across the application

export type StoryMode = 'general' | 'lovers';
export type RelationshipStatus = 'pending' | 'active' | 'blocked';

/**
 * Story object with RLS protection
 * - General stories: visible only to owner
 * - Lovers stories: visible only to owner and active partners
 */
export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  mode: StoryMode;
  created_at: string;
  updated_at?: string;
  is_deleted?: boolean;
}

/**
 * Relationship object representing connections between users
 * - pending: relationship request awaiting acceptance
 * - active: confirmed relationship (can access lovers stories)
 * - blocked: user is blocked (no access to content)
 */
export interface Relationship {
  id: string;
  user1: string;
  user2: string;
  status: RelationshipStatus;
  created_at: string;
  updated_at?: string;
}

/**
 * Relationship view - current user's perspective
 * Returned by get_user_relationships function
 */
export interface RelationshipView {
  id: string;
  user1: string;
  user2: string;
  other_user_id: string; // The other party in the relationship
  status: RelationshipStatus;
  created_at: string;
}

/**
 * Input for creating a story
 * Must explicitly specify mode to prevent accidental data leakage
 */
export interface CreateStoryInput {
  media_url: string;
  mode: StoryMode;
}

/**
 * Input for creating a relationship
 * Initial status is 'pending' by default
 */
export interface CreateRelationshipInput {
  other_user_id: string;
  status?: RelationshipStatus;
}

/**
 * Response from RLS operations
 * Indicates success/failure of database operations
 */
export interface RLSOperationResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Story access context
 * Indicates what stories the current user can access
 */
export interface StoryAccessContext {
  canViewOwnGeneral: boolean;
  canViewOwnLovers: boolean;
  canViewOtherGeneral: boolean;
  canViewOtherLovers: boolean;
  reason?: string;
}
