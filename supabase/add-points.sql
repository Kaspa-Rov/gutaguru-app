-- ── Gutaguru User Points System ──────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (one-time migration).
-- Prerequisites: add-shares.sql must already be applied.

-- ─── 1. user_points ───────────────────────────────────────────────────────────
-- One row per user. Stores the running total for fast profile reads.
-- Never written directly by application code — only by the triggers below.

CREATE TABLE IF NOT EXISTS user_points (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total      INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Users can only read their own total
CREATE POLICY "Users read own points" ON user_points
  FOR SELECT USING (auth.uid() = user_id);

-- ─── 2. points_ledger ─────────────────────────────────────────────────────────
-- Append-only audit log. One row per point-earning event.
-- Used for: transparency, abuse investigation, future reward tier unlocking,
-- streak calculations, and the referral flow when it ships.

CREATE TABLE IF NOT EXISTS points_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('upvote', 'save', 'rate', 'share', 'referral')
  ),
  event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  points      INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS points_ledger_user_idx  ON points_ledger (user_id);
CREATE INDEX IF NOT EXISTS points_ledger_event_idx ON points_ledger (user_id, event_id, action_type);

ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read their own history (useful for future rewards/history page)
CREATE POLICY "Users read own ledger" ON points_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- ─── 3. Core point helpers ────────────────────────────────────────────────────

-- award_points: inserts a ledger entry and bumps the running total.
-- Idempotent: if the (user_id, event_id, action_type) triple already exists,
-- the second call is a no-op (prevents duplicate farming on re-inserts).
CREATE OR REPLACE FUNCTION award_points(
  p_user_id   UUID,
  p_event_id  UUID,
  p_action    TEXT,
  p_points    INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip guests
  IF p_user_id IS NULL THEN RETURN; END IF;

  -- Dedup: only the first occurrence of (user, event, action) earns points
  IF EXISTS (
    SELECT 1 FROM points_ledger
    WHERE user_id    = p_user_id
      AND action_type = p_action
      AND (
        (event_id = p_event_id) OR
        (event_id IS NULL AND p_event_id IS NULL)
      )
  ) THEN
    RETURN;
  END IF;

  INSERT INTO points_ledger (user_id, event_id, action_type, points)
  VALUES (p_user_id, p_event_id, p_action, p_points);

  INSERT INTO user_points (user_id, total, updated_at)
  VALUES (p_user_id, p_points, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET total      = user_points.total + EXCLUDED.total,
        updated_at = NOW();
END;
$$;

-- revoke_points: deletes the ledger entry and subtracts from the total.
-- Called when a user un-upvotes or un-saves. Points cannot go below 0.
-- Re-doing the action will NOT re-award points (already used up the one shot).
CREATE OR REPLACE FUNCTION revoke_points(
  p_user_id  UUID,
  p_event_id UUID,
  p_action   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INT;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  DELETE FROM points_ledger
  WHERE user_id    = p_user_id
    AND event_id   = p_event_id
    AND action_type = p_action
  RETURNING points INTO v_points;

  IF FOUND THEN
    UPDATE user_points
    SET total      = GREATEST(total - v_points, 0),
        updated_at = NOW()
    WHERE user_id  = p_user_id;
  END IF;
END;
$$;

-- ─── 4. Per-table triggers ────────────────────────────────────────────────────
-- Each trigger calls award_points / revoke_points with the correct weight.
-- Weights mirror SCORE_WEIGHTS in lib/utils.ts for consistency:
--   share 10 · rate 5 · upvote 3 · save 2

-- 4a. Upvotes (3 pts)
CREATE OR REPLACE FUNCTION trg_points_upvote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM award_points(NEW.user_id, NEW.event_id, 'upvote', 3);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM revoke_points(OLD.user_id, OLD.event_id, 'upvote');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_points_upvote ON upvotes;
CREATE TRIGGER trg_points_upvote
  AFTER INSERT OR DELETE ON upvotes
  FOR EACH ROW EXECUTE FUNCTION trg_points_upvote();

-- 4b. Saves (2 pts)
CREATE OR REPLACE FUNCTION trg_points_save()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM award_points(NEW.user_id, NEW.event_id, 'save', 2);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM revoke_points(OLD.user_id, OLD.event_id, 'save');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_points_save ON saved_events;
CREATE TRIGGER trg_points_save
  AFTER INSERT OR DELETE ON saved_events
  FOR EACH ROW EXECUTE FUNCTION trg_points_save();

-- 4c. Ratings (5 pts, INSERT only — changing a rating does not re-award)
CREATE OR REPLACE FUNCTION trg_points_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM award_points(NEW.user_id, NEW.event_id, 'rate', 5);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_points_rate ON ratings;
CREATE TRIGGER trg_points_rate
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION trg_points_rate();

-- 4d. Shares (10 pts, authenticated users only, first share per event only)
CREATE OR REPLACE FUNCTION trg_points_share()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    PERFORM award_points(NEW.user_id, NEW.event_id, 'share', 10);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_points_share ON shares;
CREATE TRIGGER trg_points_share
  AFTER INSERT ON shares
  FOR EACH ROW EXECUTE FUNCTION trg_points_share();

-- ─── 5. Referral foundation (no trigger yet — full flow ships later) ──────────
-- When the referral flow ships, insert a row like:
--   INSERT INTO points_ledger (user_id, event_id, action_type, points)
--   VALUES (<referrer_id>, NULL, 'referral', 25);
-- The award_points helper already supports NULL event_id for this case.
-- The check_action IN (...) constraint already includes 'referral'.
