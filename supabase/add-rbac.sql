-- ── Gutaguru RBAC Migration ───────────────────────────────────────────────────
-- Run AFTER add-points.sql. Safe to re-run (all operations are idempotent).

-- ─── 1. profiles ─────────────────────────────────────────────────────────────
-- Single source of truth for user identity, role, and point total display.
-- points here is a synced copy of user_points.total (see trigger §5).

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT,
  role         TEXT NOT NULL DEFAULT 'subscriber' CHECK (
    role IN (
      'super_admin', 'admin', 'editor',
      'organiser', 'venue_manager', 'contributor', 'subscriber'
    )
  ),
  points       INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Each user can read their own profile.
-- Admin reads of other profiles go through the service-role client (bypasses RLS).
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own display_name only.
-- Role changes are done exclusively via the service-role API route.
CREATE POLICY "Users update own display_name" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── 2. Auto-create profile on signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

-- ─── 3. Backfill existing auth.users into profiles ───────────────────────────
INSERT INTO profiles (id, email, display_name)
SELECT id, email, split_part(email, '@', 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Promote the first user to super_admin ────────────────────────────────
-- Remove or comment this out after you have set your own admin account.
-- UPDATE profiles SET role = 'super_admin'
-- WHERE email = 'your@email.com';

-- ─── 5. Sync user_points.total → profiles.points ─────────────────────────────
-- Keeps profiles.points current without a JOIN on every profile read.
CREATE OR REPLACE FUNCTION sync_profile_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET points = NEW.total WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_points ON user_points;
CREATE TRIGGER trg_sync_profile_points
  AFTER INSERT OR UPDATE ON user_points
  FOR EACH ROW EXECUTE FUNCTION sync_profile_points();

-- Backfill existing point totals
UPDATE profiles p
SET points = up.total
FROM user_points up
WHERE p.id = up.user_id;

-- ─── 6. venue_claims ─────────────────────────────────────────────────────────
-- Users claim ownership of a venue. Admins approve or reject.

CREATE TABLE IF NOT EXISTS venue_claims (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'rejected')),
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (venue_id, user_id)
);

ALTER TABLE venue_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own claims" ON venue_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can submit claims" ON venue_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- After running this:
-- 1. Set your own account to super_admin via the Supabase table editor
--    (update profiles set role = 'super_admin' where email = 'you@example.com')
-- 2. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (from Supabase → Settings → API)
