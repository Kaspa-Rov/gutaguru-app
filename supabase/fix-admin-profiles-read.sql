-- ── Fix: allow admin+ to read all profiles ───────────────────────────────────
-- Run this in the Supabase SQL Editor.
-- Fixes: /admin/users showing 0 users.
--
-- The original policy only allowed users to read their own profile row.
-- The admin client (service role) should bypass this, but reads now go through
-- the regular server client for reliability — so the RLS policy must allow
-- admin+ to read all rows.
--
-- SECURITY DEFINER on is_admin_user() prevents the recursive-RLS problem that
-- would occur if an ordinary SQL function on profiles referenced profiles itself
-- inside an RLS check on profiles.

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id    = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- Replace the existing SELECT policy with one that also allows admin+ to read all rows.
DROP POLICY IF EXISTS "Users read own profile" ON profiles;

CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id OR is_admin_user());
