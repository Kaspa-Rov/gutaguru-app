-- ============================================================
-- GutaGuru — Fix: Trigger-based counter updates
-- ============================================================
-- WHY THIS IS NEEDED:
--   The previous approach called RPC functions (increment_upvotes etc.)
--   from the app. Those functions are SECURITY DEFINER (so they can UPDATE
--   the events table past RLS), but the `authenticated` role still needs
--   EXECUTE privilege to call them — which was never granted.
--
--   Trigger functions solve this cleanly: they fire automatically in response
--   to INSERT/DELETE on upvotes and saved_events. The app never has to call
--   them — and since triggers are SECURITY DEFINER they run as the table
--   owner (postgres), bypassing RLS with no GRANT required.
-- ============================================================

-- ============================================================
-- Step 1: Drop old RPC functions (no longer called from app)
-- ============================================================
DROP FUNCTION IF EXISTS public.increment_upvotes(UUID);
DROP FUNCTION IF EXISTS public.decrement_upvotes(UUID);
DROP FUNCTION IF EXISTS public.increment_saves(UUID);
DROP FUNCTION IF EXISTS public.decrement_saves(UUID);

-- ============================================================
-- Step 2: Trigger function — keeps events.upvotes_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_upvote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events
    SET upvotes_count = upvotes_count + 1
    WHERE id = NEW.event_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events
    SET upvotes_count = GREATEST(upvotes_count - 1, 0)
    WHERE id = OLD.event_id;
  END IF;

  RETURN NULL;  -- AFTER trigger; return value is ignored for row triggers
END;
$$;

-- Attach trigger to upvotes table
DROP TRIGGER IF EXISTS trg_sync_upvote_count ON public.upvotes;
CREATE TRIGGER trg_sync_upvote_count
AFTER INSERT OR DELETE ON public.upvotes
FOR EACH ROW EXECUTE FUNCTION public.sync_upvote_count();

-- ============================================================
-- Step 3: Trigger function — keeps events.saves_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_save_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events
    SET saves_count = saves_count + 1
    WHERE id = NEW.event_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events
    SET saves_count = GREATEST(saves_count - 1, 0)
    WHERE id = OLD.event_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Attach trigger to saved_events table
DROP TRIGGER IF EXISTS trg_sync_save_count ON public.saved_events;
CREATE TRIGGER trg_sync_save_count
AFTER INSERT OR DELETE ON public.saved_events
FOR EACH ROW EXECUTE FUNCTION public.sync_save_count();

-- ============================================================
-- Step 4: Fix ratings UPDATE policy — add WITH CHECK clause
-- ============================================================
-- The original UPDATE policy had no WITH CHECK, which can cause
-- the upsert to fail the constraint check on new rows.
DROP POLICY IF EXISTS "ratings_own_update" ON public.ratings;
CREATE POLICY "ratings_own_update" ON public.ratings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
