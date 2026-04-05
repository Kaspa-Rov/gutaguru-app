-- ── Add share tracking to Gutaguru ──────────────────────────────────────────
-- Run this in the Supabase SQL Editor (one-time migration).

-- 1. Add share_count column to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS share_count INT NOT NULL DEFAULT 0;

-- 2. Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: guests can share too
  shared_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shares_event_id_idx ON shares (event_id);

-- 3. RLS on shares
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a share (guests included — user_id will be null)
CREATE POLICY "Anyone can share" ON shares
  FOR INSERT WITH CHECK (true);

-- Users can read their own shares
CREATE POLICY "Users can read own shares" ON shares
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. Trigger to keep share_count in sync
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
