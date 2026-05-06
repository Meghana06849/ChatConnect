# RLS Implementation Guide - ChatConnect

## Overview

This document provides complete implementation and verification steps for the Row Level Security (RLS) setup ensuring strict data isolation between General Mode and Lovers Mode.

---

## Architecture & Security Model

### Data Flow

```
User Request → RLS Policies → Database Query
         ↓
    1. Is user authenticated?
    2. Does user own the data?
    3. Is user in a valid relationship (for lovers mode)?
    4. Is data marked as deleted?
         ↓
    Return data OR empty result (no error thrown)
```

### Key Security Principles

1. **Database-Level Enforcement**: All security rules enforced at PostgreSQL level, not frontend
2. **No Data Leakage**: RLS policies prevent accidental access, even if frontend is compromised
3. **Explicit Mode Selection**: Stories must explicitly specify mode (no defaults)
4. **Relationship Verification**: Lovers content only accessible with active relationship
5. **Soft Deletes**: Stories marked as deleted but retained for audit trails

---

## Implementation Steps

### Step 1: Apply RLS Migrations

Execute the SQL migrations in order:

```bash
# In Supabase SQL Editor, execute:
1. 20260506_setup_rls_isolation.sql   (Main RLS setup)
2. 20260506_helper_functions.sql      (Helper functions)
```

### Step 2: Verify Tables Created

```sql
-- Check stories table
SELECT * FROM information_schema.tables 
WHERE table_name = 'stories';

-- Check relationships table
SELECT * FROM information_schema.tables 
WHERE table_name = 'relationships';

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('stories', 'relationships');
-- Should show rowsecurity = true
```

### Step 3: Verify Policies Applied

```sql
-- List all policies on stories table
SELECT policyname, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'stories'
ORDER BY policyname;

-- List all policies on relationships table
SELECT policyname, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'relationships'
ORDER BY policyname;
```

Expected policies:
- `stories_select_own_general` - Own general stories only
- `stories_select_lovers_with_relationship` - Lovers stories if in relationship
- `stories_insert_own` - Insert only own stories
- `stories_update_own` - Update only own stories
- `stories_delete_own` - Delete only own stories
- `relationships_select_own` - Select own relationships
- `relationships_insert_own` - Insert own relationships
- `relationships_update_own` - Update own relationships
- `relationships_delete_own` - Delete own relationships

---

## Using in React Components

### 1. Create General Mode Story

```typescript
import { useRLSStories } from '@/hooks/useRLS';

export const CreateGeneralStory = () => {
  const { createStory, loading } = useRLSStories();

  const handleCreate = async () => {
    const result = await createStory({
      media_url: 'https://example.com/story.jpg',
      mode: 'general'  // MUST be explicit
    });
    
    if (result) {
      console.log('Story created:', result);
    }
  };

  return (
    <button onClick={handleCreate} disabled={loading}>
      Create General Story
    </button>
  );
};
```

### 2. Create Lovers Mode Story

```typescript
const handleCreateLoverStory = async () => {
  const result = await createStory({
    media_url: 'https://example.com/lovers-story.jpg',
    mode: 'lovers'  // Explicitly set to lovers
  });
};
```

### 3. Fetch Stories with RLS

```typescript
import { useRLSStories } from '@/hooks/useRLS';

export const ViewStories = ({ userId }: { userId: string }) => {
  const { fetchUserStories, stories, loading } = useRLSStories();

  useEffect(() => {
    // RLS automatically filters based on:
    // - Current user's auth.uid()
    // - Relationship status with userId
    fetchUserStories(userId);
  }, [userId]);

  return (
    <div>
      {stories.map(story => (
        <div key={story.id}>
          <img src={story.media_url} />
          <p>Mode: {story.mode}</p>
          {story.mode === 'lovers' && (
            <p>🔒 Only visible to partners</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 4. Manage Relationships

```typescript
import { useRLSRelationships } from '@/hooks/useRLS';

export const RelationshipManager = () => {
  const {
    relationships,
    fetchRelationships,
    createRelationship,
    acceptRelationship,
    blockUser
  } = useRLSRelationships();

  useEffect(() => {
    // Only shows relationships user is part of (RLS enforced)
    fetchRelationships();
  }, []);

  const handleInvite = async (userId: string) => {
    await createRelationship({ other_user_id: userId });
  };

  const handleAccept = async (relationshipId: string) => {
    await acceptRelationship(relationshipId);
  };

  return (
    <div>
      {relationships.map(rel => (
        <div key={rel.id}>
          <p>User: {rel.other_user_id}</p>
          <p>Status: {rel.status}</p>
          {rel.status === 'pending' && (
            <button onClick={() => handleAccept(rel.id)}>Accept</button>
          )}
          {rel.status === 'active' && (
            <p>✅ Can access lovers stories</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## Test Scenarios

### Scenario 1: User Can Access Own General Stories

```sql
-- User A logged in
SET ROLE authenticated;
SELECT * FROM stories 
WHERE mode = 'general' AND user_id = auth.uid();
-- ✓ Returns User A's general stories
```

### Scenario 2: User Cannot Access Other's General Stories

```sql
-- User A logged in, trying to view User B's general stories
SET ROLE authenticated;
SELECT * FROM stories 
WHERE mode = 'general' AND user_id = 'USER_B_ID'::uuid;
-- ✓ Returns 0 rows (RLS blocks access)
```

### Scenario 3: User Can Access Lovers Stories Only If in Relationship

```sql
-- User A logged in
-- No relationship with User B
SELECT * FROM stories 
WHERE mode = 'lovers' AND user_id = 'USER_B_ID'::uuid;
-- ✓ Returns 0 rows

-- After User B accepts relationship
SELECT * FROM stories 
WHERE mode = 'lovers' AND user_id = 'USER_B_ID'::uuid;
-- ✓ Returns User B's lovers stories
```

### Scenario 4: Story Mode Must Be Explicit

```sql
-- Trying to insert without mode - should fail
INSERT INTO stories (user_id, media_url)
VALUES (auth.uid(), 'https://example.com/story.jpg');
-- ✗ ERROR: null value in column "mode" violates not-null constraint

-- Trying with default - should fail
INSERT INTO stories (user_id, media_url, mode)
VALUES (auth.uid(), 'https://example.com/story.jpg', DEFAULT);
-- ✗ ERROR: null value in column "mode"

-- Must be explicit
INSERT INTO stories (user_id, media_url, mode)
VALUES (auth.uid(), 'https://example.com/story.jpg', 'general');
-- ✓ SUCCESS
```

### Scenario 5: Anonymous User Cannot Access Data

```sql
-- Not authenticated (anon role)
SET ROLE anon;
SELECT * FROM stories;
-- ✗ Permission denied for schema "public"
```

### Scenario 6: Relationships Only Show Own Connections

```sql
-- User A logged in
SELECT * FROM relationships;
-- ✓ Only shows relationships where user1=User A OR user2=User A
```

---

## Verification Checklist

- [ ] `stories` table created with proper columns
- [ ] `relationships` table created with proper columns
- [ ] RLS enabled on both tables (rowsecurity = true)
- [ ] All 5 story policies applied (select, select_lovers, insert, update, delete)
- [ ] All 3 relationship policies applied (select, insert, update, delete)
- [ ] Indexes created for performance
- [ ] anon role has no permissions
- [ ] authenticated role has appropriate permissions
- [ ] CHECK constraints enforced on mode column
- [ ] UNIQUE constraint on relationships (no duplicates)

---

## Performance Considerations

### Indexes Created

```sql
idx_stories_user_id_mode          -- Fast user story lookups
idx_stories_mode                  -- Fast mode filtering
idx_relationships_user1           -- Fast user1 lookups
idx_relationships_user2           -- Fast user2 lookups
idx_relationships_users_status    -- Composite for relationship checks
```

### Query Performance Tips

1. **Always filter by mode**: Use specific mode values to leverage indexes
2. **Batch requests**: Fetch multiple users' stories in single query when possible
3. **Use functions**: Helper functions like `get_user_stories()` are optimized
4. **Monitor slow queries**: Check PostgreSQL logs for optimization opportunities

---

## Migration Rollback

If needed to rollback the RLS setup:

```sql
-- DANGER: This removes all RLS protection
-- Only execute if absolutely necessary

-- Disable RLS
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE relationships DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY stories_select_own_general ON stories;
DROP POLICY stories_select_lovers_with_relationship ON stories;
DROP POLICY stories_insert_own ON stories;
DROP POLICY stories_update_own ON stories;
DROP POLICY stories_delete_own ON stories;
DROP POLICY relationships_select_own ON relationships;
DROP POLICY relationships_insert_own ON relationships;
DROP POLICY relationships_update_own ON relationships;
DROP POLICY relationships_delete_own ON relationships;

-- Drop helper functions
DROP FUNCTION IF EXISTS create_relationship(UUID, TEXT);
DROP FUNCTION IF EXISTS are_in_relationship(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_stories(UUID, TEXT);
DROP FUNCTION IF EXISTS create_story(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_relationships(TEXT);
DROP FUNCTION IF EXISTS block_user(UUID);
DROP FUNCTION IF EXISTS unblock_user(UUID);
DROP FUNCTION IF EXISTS accept_relationship(UUID);

-- Grant permissions (WARNING: Opens data to all authenticated users)
GRANT ALL ON stories TO authenticated;
GRANT ALL ON relationships TO authenticated;
```

---

## Troubleshooting

### Issue: "Permission denied" errors

**Cause**: RLS is blocking the query
**Solution**: Verify policy conditions match your query intent

```sql
-- Check what policies apply to your query
SELECT * FROM pg_policies WHERE tablename = 'stories';

-- Test query manually
SELECT * FROM stories WHERE user_id = auth.uid();
```

### Issue: Empty results when expecting data

**Cause**: RLS policies filtering out results
**Solution**: Check relationship status and user IDs

```sql
-- Verify relationship exists and is active
SELECT * FROM relationships 
WHERE status = 'active'
AND ((user1 = auth.uid() AND user2 = 'TARGET_USER'::uuid)
     OR (user2 = auth.uid() AND user1 = 'TARGET_USER'::uuid));
```

### Issue: Slow query performance

**Cause**: Missing indexes or inefficient policy evaluation
**Solution**: Analyze query plan and add indexes

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM stories 
WHERE mode = 'general' AND user_id = auth.uid();

-- Add missing indexes if needed
CREATE INDEX idx_stories_mode_user 
ON stories(mode, user_id) 
WHERE is_deleted = FALSE;
```

---

## Best Practices

1. **Always Use Mode Explicitly**: Never allow mode to default
2. **Test RLS in Frontend**: Use different user accounts to verify
3. **Monitor Permissions**: Regularly audit role permissions
4. **Use Helper Functions**: Prefer database functions for complex logic
5. **Document Relationships**: Maintain clear relationship semantics
6. **Audit Logs**: Consider adding audit logging for sensitive operations
7. **Regular Backups**: Ensure you can recover from RLS misconfiguration

---

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [ChatConnect RLS Types](../types/rls.ts)
- [ChatConnect RLS Hooks](../hooks/useRLS.ts)
