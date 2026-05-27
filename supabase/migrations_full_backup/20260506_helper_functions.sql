-- ========================================
-- Helper Functions and Triggers
-- ========================================
-- These functions automate common operations and maintain data consistency

-- ========================================
-- 1. FUNCTION: Create or Update Relationship
-- ========================================
CREATE OR REPLACE FUNCTION create_relationship(
  other_user_id UUID,
  relationship_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Validate input
  IF other_user_id IS NULL OR other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid user ID';
  END IF;
  
  IF relationship_status NOT IN ('pending', 'active', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  
  -- Insert with LEAST/GREATEST to avoid duplicates
  INSERT INTO relationships (user1, user2, status)
  VALUES (
    LEAST(auth.uid(), other_user_id),
    GREATEST(auth.uid(), other_user_id),
    relationship_status
  )
  ON CONFLICT (LEAST(user1, user2), GREATEST(user1, user2)) DO UPDATE
  SET status = relationship_status, updated_at = now()
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION create_relationship(UUID, TEXT) IS 'Create or update a relationship between two users';

-- ========================================
-- 2. FUNCTION: Check if Users are in Relationship
-- ========================================
CREATE OR REPLACE FUNCTION are_in_relationship(
  user1_id UUID,
  user2_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM relationships
    WHERE status = 'active'
    AND (
      (user1 = user1_id AND user2 = user2_id)
      OR (user1 = user2_id AND user2 = user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION are_in_relationship(UUID, UUID) IS 'Check if two users are in an active relationship';

-- ========================================
-- 3. FUNCTION: Get Accessible Stories
-- ========================================
CREATE OR REPLACE FUNCTION get_user_stories(
  target_user_id UUID,
  story_mode TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  media_url TEXT,
  mode TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- If viewing own stories, return all
  IF target_user_id = auth.uid() THEN
    RETURN QUERY
    SELECT s.id, s.user_id, s.media_url, s.mode, s.created_at
    FROM stories s
    WHERE s.user_id = target_user_id
    AND s.is_deleted = FALSE
    AND (story_mode IS NULL OR s.mode = story_mode)
    ORDER BY s.created_at DESC;
  ELSE
    -- Viewing other's stories - only general + lovers (if in relationship)
    RETURN QUERY
    SELECT s.id, s.user_id, s.media_url, s.mode, s.created_at
    FROM stories s
    WHERE s.user_id = target_user_id
    AND s.is_deleted = FALSE
    AND (
      (s.mode = 'general')
      OR (
        s.mode = 'lovers'
        AND are_in_relationship(auth.uid(), target_user_id)
      )
    )
    AND (story_mode IS NULL OR s.mode = story_mode)
    ORDER BY s.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_user_stories(UUID, TEXT) IS 'Get all stories accessible to current user from a target user';

-- ========================================
-- 4. FUNCTION: Create Story with Validation
-- ========================================
CREATE OR REPLACE FUNCTION create_story(
  media_url TEXT,
  story_mode TEXT
)
RETURNS stories AS $$
DECLARE
  new_story stories;
BEGIN
  -- Validate mode
  IF story_mode NOT IN ('general', 'lovers') THEN
    RAISE EXCEPTION 'Invalid story mode: %', story_mode;
  END IF;
  
  -- Validate media URL
  IF media_url IS NULL OR media_url = '' THEN
    RAISE EXCEPTION 'Media URL is required';
  END IF;
  
  -- Insert story
  INSERT INTO stories (user_id, media_url, mode)
  VALUES (auth.uid(), media_url, story_mode)
  RETURNING * INTO new_story;
  
  RETURN new_story;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION create_story(TEXT, TEXT) IS 'Create a new story with mode validation';

-- ========================================
-- 5. TRIGGER: Update Timestamps
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relationships table
DROP TRIGGER IF EXISTS update_relationships_updated_at ON relationships;
CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to stories table
DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically update updated_at timestamp on record modification';

-- ========================================
-- 6. FUNCTION: Get User Relationships
-- ========================================
CREATE OR REPLACE FUNCTION get_user_relationships(
  filter_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user1 UUID,
  user2 UUID,
  other_user_id UUID,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user1,
    r.user2,
    CASE WHEN r.user1 = auth.uid() THEN r.user2 ELSE r.user1 END as other_user_id,
    r.status,
    r.created_at
  FROM relationships r
  WHERE (r.user1 = auth.uid() OR r.user2 = auth.uid())
  AND (filter_status IS NULL OR r.status = filter_status)
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_user_relationships(TEXT) IS 'Get all relationships for current user, optionally filtered by status';

-- ========================================
-- 7. FUNCTION: Block User
-- ========================================
CREATE OR REPLACE FUNCTION block_user(
  user_to_block UUID
)
RETURNS UUID AS $$
DECLARE
  rel_id UUID;
BEGIN
  -- Validate input
  IF user_to_block IS NULL OR user_to_block = auth.uid() THEN
    RAISE EXCEPTION 'Invalid user ID';
  END IF;
  
  -- Create or update relationship with blocked status
  INSERT INTO relationships (user1, user2, status)
  VALUES (
    LEAST(auth.uid(), user_to_block),
    GREATEST(auth.uid(), user_to_block),
    'blocked'
  )
  ON CONFLICT (LEAST(user1, user2), GREATEST(user1, user2)) DO UPDATE
  SET status = 'blocked', updated_at = now()
  RETURNING id INTO rel_id;
  
  RETURN rel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION block_user(UUID) IS 'Block a user (prevents relationship access)';

-- ========================================
-- 8. FUNCTION: Unblock User
-- ========================================
CREATE OR REPLACE FUNCTION unblock_user(
  user_to_unblock UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE relationships
  SET status = 'pending', updated_at = now()
  WHERE status = 'blocked'
  AND (
    (user1 = auth.uid() AND user2 = user_to_unblock)
    OR (user2 = auth.uid() AND user1 = user_to_unblock)
  );
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION unblock_user(UUID) IS 'Unblock a previously blocked user';

-- ========================================
-- 9. FUNCTION: Accept Relationship Request
-- ========================================
CREATE OR REPLACE FUNCTION accept_relationship(
  requester_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE relationships
  SET status = 'active', updated_at = now()
  WHERE status = 'pending'
  AND (
    (user1 = requester_id AND user2 = auth.uid())
    OR (user1 = auth.uid() AND user2 = requester_id)
  );
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION accept_relationship(UUID) IS 'Accept a pending relationship request';

-- ========================================
-- Summary
-- ========================================
/*
Functions created for secure operations:

✓ create_relationship(UUID, TEXT) - Create/update relationships
✓ are_in_relationship(UUID, UUID) - Check if users are partners
✓ get_user_stories(UUID, TEXT) - Get accessible stories with RLS
✓ create_story(TEXT, TEXT) - Create story with validation
✓ get_user_relationships(TEXT) - Get user's relationships
✓ block_user(UUID) - Block a user
✓ unblock_user(UUID) - Unblock a user
✓ accept_relationship(UUID) - Accept relationship request

All functions use SECURITY DEFINER to enforce business logic
while maintaining RLS boundaries.
*/
