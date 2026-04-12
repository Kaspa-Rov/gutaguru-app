-- ── Gutaguru Venue Claims Migration ─────────────────────────────────────────
-- Safe to re-run. Extends the venue_claims table created in add-rbac.sql.
-- Run AFTER add-rbac.sql and add-cms.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Drop old minimal table and recreate with full schema ─────────────────
-- The add-rbac.sql version lacked reviewed_at and reviewed_by.
-- We use a guarded DO block so re-runs are safe.

DO $$ BEGIN
  -- Add missing columns if the table already exists from add-rbac.sql
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'venue_claims') THEN

    ALTER TABLE venue_claims
      ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reviewed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    -- Rename 'created_at' → 'submitted_at' if not already done
    -- (only renames if the old column name exists)
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'venue_claims' AND column_name = 'created_at'
    ) AND NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'venue_claims' AND column_name = 'submitted_at'
    ) THEN
      ALTER TABLE venue_claims RENAME COLUMN created_at TO submitted_at;
    END IF;

    -- Rename 'message' → 'evidence_note' if not already done
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'venue_claims' AND column_name = 'message'
    ) AND NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'venue_claims' AND column_name = 'evidence_note'
    ) THEN
      ALTER TABLE venue_claims RENAME COLUMN message TO evidence_note;
    END IF;

    -- Rename 'user_id' → 'claimant_user_id' if not already done
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'venue_claims' AND column_name = 'user_id'
    ) AND NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'venue_claims' AND column_name = 'claimant_user_id'
    ) THEN
      ALTER TABLE venue_claims RENAME COLUMN user_id TO claimant_user_id;
    END IF;

  ELSE
    -- Table doesn't exist at all — create fresh
    CREATE TABLE venue_claims (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id          UUID        NOT NULL REFERENCES venues(id)     ON DELETE CASCADE,
      claimant_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status            TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'approved', 'rejected')),
      evidence_note     TEXT,
      submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at       TIMESTAMPTZ,
      reviewed_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
      -- One active claim per (venue, user) — prevents spam submissions
      UNIQUE (venue_id, claimant_user_id)
    );
  END IF;
END $$;

-- ─── 2. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE venue_claims ENABLE ROW LEVEL SECURITY;

-- Claimants can see their own submissions
DROP POLICY IF EXISTS "Users see own claims"             ON venue_claims;
DROP POLICY IF EXISTS "Authenticated users can submit claims" ON venue_claims;

CREATE POLICY "claimants_read_own" ON venue_claims
  FOR SELECT USING (auth.uid() = claimant_user_id);

CREATE POLICY "claimants_insert"   ON venue_claims
  FOR INSERT WITH CHECK (auth.uid() = claimant_user_id);

-- ─── 3. Index ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_venue_claims_venue_id         ON venue_claims(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_claims_claimant_user_id ON venue_claims(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_venue_claims_status           ON venue_claims(status);

-- ─── 4. Prevent multiple PENDING claims per venue ────────────────────────────
-- One venue can only have one pending claim at a time.
-- Uses a partial unique index — only pending claims are constrained.

DROP INDEX IF EXISTS idx_venue_claims_one_pending;
CREATE UNIQUE INDEX idx_venue_claims_one_pending
  ON venue_claims(venue_id)
  WHERE status = 'pending';

-- ─── 5. Role-promotion helper ────────────────────────────────────────────────
-- Called by the approval API to upgrade the claimant to venue_manager
-- only if their current role sits below that level.
-- SECURITY DEFINER so it can update profiles regardless of RLS.

CREATE OR REPLACE FUNCTION promote_to_venue_manager_if_below(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_rank INT;
BEGIN
  SELECT
    CASE role
      WHEN 'subscriber'    THEN 0
      WHEN 'contributor'   THEN 1
      WHEN 'venue_manager' THEN 2
      WHEN 'organiser'     THEN 3
      WHEN 'editor'        THEN 4
      WHEN 'admin'         THEN 5
      WHEN 'super_admin'   THEN 6
      ELSE -1
    END
  INTO role_rank
  FROM profiles
  WHERE id = target_user_id;

  -- Only promote if strictly below venue_manager (rank < 2)
  IF role_rank < 2 THEN
    UPDATE profiles
    SET role = 'venue_manager'
    WHERE id = target_user_id;
  END IF;
END;
$$;

-- ─── Done ────────────────────────────────────────────────────────────────────
-- After running:
--   Reload Supabase schema cache (Dashboard → API → Reload schema cache).
