-- ============================================================
-- GutaGuru — Leaderboard SQL View
-- Optional: run in Supabase SQL Editor for direct DB access.
-- The app computes scores in TypeScript, but this view is
-- useful for admin dashboards or future API optimisation.
-- ============================================================

CREATE OR REPLACE VIEW public.event_scores AS
SELECT
  e.id,
  e.title,
  e.date_time,
  e.city,
  e.category,
  e.upvotes_count,
  e.saves_count,
  (e.upvotes_count * 3 + e.saves_count * 2)                              AS score,
  RANK() OVER (ORDER BY (e.upvotes_count * 3 + e.saves_count * 2) DESC)  AS overall_rank,
  -- Week rank: only events in the next 7 days
  CASE
    WHEN e.date_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    THEN RANK() OVER (
      PARTITION BY (e.date_time BETWEEN NOW() AND NOW() + INTERVAL '7 days')
      ORDER BY (e.upvotes_count * 3 + e.saves_count * 2) DESC
    )
    ELSE NULL
  END AS week_rank,
  v.name  AS venue_name,
  v.city  AS venue_city
FROM public.events e
LEFT JOIN public.venues v ON v.id = e.venue_id
WHERE e.date_time >= NOW()
ORDER BY score DESC;

-- Grant read access to anon and authenticated roles
GRANT SELECT ON public.event_scores TO anon, authenticated;

-- ── Index hint ────────────────────────────────────────────────────────────────
-- The scoring formula uses upvotes_count and saves_count.
-- Both should be indexed for fast sorting. Add if missing:
--   CREATE INDEX IF NOT EXISTS idx_events_saves_count ON events(saves_count DESC);
