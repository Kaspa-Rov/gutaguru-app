-- ============================================================
-- GutaGuru Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- VENUES
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT,
  city        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT NOT NULL,
  description    TEXT,
  date_time      TIMESTAMPTZ NOT NULL,
  location       TEXT,
  city           TEXT NOT NULL DEFAULT 'Harare',
  category       TEXT NOT NULL CHECK (category IN ('Music','Food','Culture','Networking','Sports','Art')),
  image_url      TEXT,
  ticket_link    TEXT,
  venue_id       UUID REFERENCES venues(id) ON DELETE SET NULL,
  upvotes_count  INT NOT NULL DEFAULT 0,
  saves_count    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date_time     ON events(date_time);
CREATE INDEX idx_events_category      ON events(category);
CREATE INDEX idx_events_city          ON events(city);
CREATE INDEX idx_events_upvotes_count ON events(upvotes_count DESC);

-- ============================================================
-- UPVOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS upvotes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_upvotes_event_id ON upvotes(event_id);

-- ============================================================
-- SAVED EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_saved_events_user_id  ON saved_events(user_id);
CREATE INDEX idx_saved_events_event_id ON saved_events(event_id);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_ratings_event_id ON ratings(event_id);

-- ============================================================
-- PENDING EVENTS (user-submitted, awaiting admin approval)
-- ============================================================
CREATE TABLE IF NOT EXISTS pending_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  date_time    TIMESTAMPTZ NOT NULL,
  location     TEXT,
  city         TEXT NOT NULL DEFAULT 'Harare',
  category     TEXT NOT NULL CHECK (category IN ('Music','Food','Culture','Networking','Sports','Art')),
  image_url    TEXT,
  ticket_link  TEXT,
  venue_id     UUID REFERENCES venues(id) ON DELETE SET NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RPC FUNCTIONS for atomic counter updates
-- ============================================================
CREATE OR REPLACE FUNCTION increment_upvotes(event_id UUID)
RETURNS VOID AS $$
  UPDATE events SET upvotes_count = upvotes_count + 1 WHERE id = event_id;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_upvotes(event_id UUID)
RETURNS VOID AS $$
  UPDATE events SET upvotes_count = GREATEST(upvotes_count - 1, 0) WHERE id = event_id;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_saves(event_id UUID)
RETURNS VOID AS $$
  UPDATE events SET saves_count = saves_count + 1 WHERE id = event_id;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_saves(event_id UUID)
RETURNS VOID AS $$
  UPDATE events SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = event_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Events: public read, no direct write (use pending_events)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_public_read" ON events FOR SELECT USING (true);

-- Venues: public read
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_public_read" ON venues FOR SELECT USING (true);

-- Upvotes: authenticated users can manage their own
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upvotes_own_read"   ON upvotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "upvotes_own_insert" ON upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upvotes_own_delete" ON upvotes FOR DELETE USING (auth.uid() = user_id);

-- Saved events: authenticated users can manage their own
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_own_read"   ON saved_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_own_insert" ON saved_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_own_delete" ON saved_events FOR DELETE USING (auth.uid() = user_id);

-- Ratings: authenticated users can manage their own
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_public_read" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_own_insert"  ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_own_update"  ON ratings FOR UPDATE USING (auth.uid() = user_id);

-- Pending events: authenticated users can submit and read their own
ALTER TABLE pending_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_own_read"   ON pending_events FOR SELECT USING (auth.uid() = submitted_by);
CREATE POLICY "pending_own_insert" ON pending_events FOR INSERT WITH CHECK (auth.uid() = submitted_by);
