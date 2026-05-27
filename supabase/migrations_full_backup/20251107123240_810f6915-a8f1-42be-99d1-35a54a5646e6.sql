-- Drop problematic group_members policies
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;

-- Create security definer function to check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_id = _group_id
    AND user_id = _user_id
  )
$$;

-- Create security definer function to check if user is a group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_id = _group_id
    AND user_id = _user_id
    AND role = 'admin'
  )
$$;

-- Create new policies using security definer functions
CREATE POLICY "Users can view group members of their groups"
ON group_members FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can manage members"
ON group_members FOR ALL
USING (public.is_group_admin(group_id, auth.uid()));