-- ── Gutaguru CMS Migration ────────────────────────────────────────────────────
-- Run in Supabase SQL Editor → Run.
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS and guarded DO blocks.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. EXTEND events
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS full_description  TEXT,
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS share_count       INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'published';

-- Backfill existing rows to 'published' (in case DEFAULT didn't apply)
UPDATE events SET status = 'published' WHERE status IS NULL;

-- Add status CHECK constraint (idempotent via DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'events_status_check' AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_status_check
        CHECK (status IN ('draft', 'pending_review', 'published', 'rejected'));
  END IF;
END $$;

-- Add length CHECK constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'events_title_length' AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_title_length CHECK (char_length(title) <= 80);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'events_short_description_length' AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_short_description_length
        CHECK (char_length(short_description) <= 220);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'events_full_description_length' AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_full_description_length
        CHECK (char_length(full_description) <= 1000);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_status     ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_share_count ON events(share_count);

-- Update public-read RLS: guests see published only; authenticated users see all.
-- Admin routes use the service-role client which bypasses RLS entirely.
DROP POLICY IF EXISTS "events_public_read" ON events;
CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. EXTEND venues
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS full_description  TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS amenities         TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_methods   TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_claimed        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified       BOOLEAN NOT NULL DEFAULT false;

-- Length CHECK constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'venues_short_description_length' AND conrelid = 'venues'::regclass
  ) THEN
    ALTER TABLE venues
      ADD CONSTRAINT venues_short_description_length
        CHECK (char_length(short_description) <= 220);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'venues_full_description_length' AND conrelid = 'venues'::regclass
  ) THEN
    ALTER TABLE venues
      ADD CONSTRAINT venues_full_description_length
        CHECK (char_length(full_description) <= 1000);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venues_city        ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_is_claimed  ON venues(is_claimed) WHERE is_claimed = true;
CREATE INDEX IF NOT EXISTS idx_venues_is_verified ON venues(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_venues_owner       ON venues(owner_user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SHARES table (if add-shares.sql has not been run)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shares (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = guest share
  shared_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shares_event_id ON shares(event_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_id  ON shares(user_id);

ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shares_public_insert" ON shares;
CREATE POLICY "shares_public_insert" ON shares
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "shares_own_read" ON shares;
CREATE POLICY "shares_own_read" ON shares
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger: keep events.share_count in sync with the shares table
CREATE OR REPLACE FUNCTION sync_share_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events SET share_count = share_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events SET share_count = GREATEST(share_count - 1, 0) WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_share_count ON shares;
CREATE TRIGGER trg_sync_share_count
  AFTER INSERT OR DELETE ON shares
  FOR EACH ROW EXECUTE FUNCTION sync_share_count();


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done
-- ═══════════════════════════════════════════════════════════════════════════════
-- After running this SQL:
--   1. In Supabase Dashboard → API (left sidebar) → click "Reload schema cache"
--      (or just wait ~10 seconds — PostgREST reloads automatically).
--   2. Restart your local Next.js dev server if running locally.
--   3. Existing events will have status = 'published'. No data is lost.
