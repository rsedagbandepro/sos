/*
# Create Ratings and Breakdown Photos Tables

1. New Tables
- `ratings` — post-service ratings from drivers to mechanics
  - `id` (uuid, PK)
  - `request_id` (uuid, FK breakdown_requests, unique) — one rating per request
  - `mechanic_id` (uuid, FK mechanics, not null) — rated mechanic
  - `score` (integer, not null, 1-5) — star rating
  - `comment` (text) — optional feedback
  - `created_at` (timestamptz, default now())

- `breakdown_photos` — photos attached to breakdown requests
  - `id` (uuid, PK)
  - `request_id` (uuid, FK breakdown_requests, not null) — parent request
  - `photo_url` (text, not null) — storage URL of uploaded photo
  - `created_at` (timestamptz, default now())

2. Indexes
- Index on ratings.mechanic_id for aggregation queries
- Index on breakdown_photos.request_id

3. Security
- RLS on both tables
- Ratings: anon + authenticated can INSERT (drivers rate without account), anyone can SELECT
- Photos: anon + authenticated can INSERT and SELECT

4. Trigger
- After rating insert, update mechanic's rating_avg and rating_count automatically
*/

CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid UNIQUE REFERENCES breakdown_requests(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS breakdown_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES breakdown_requests(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ratings_mechanic_id ON ratings (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_photos_request_id ON breakdown_photos (request_id);

-- Trigger: update mechanic rating_avg/rating_count on new rating
CREATE OR REPLACE FUNCTION update_mechanic_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mechanics SET
    rating_avg = (SELECT AVG(score) FROM ratings WHERE mechanic_id = NEW.mechanic_id),
    rating_count = (SELECT COUNT(*) FROM ratings WHERE mechanic_id = NEW.mechanic_id)
  WHERE id = NEW.mechanic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mechanic_rating
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_mechanic_rating();

-- RLS: ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ratings" ON ratings;
CREATE POLICY "anon_select_ratings" ON ratings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ratings" ON ratings;
CREATE POLICY "anon_insert_ratings" ON ratings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ratings" ON ratings;
CREATE POLICY "anon_update_ratings" ON ratings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- RLS: breakdown_photos
ALTER TABLE breakdown_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_photos" ON breakdown_photos;
CREATE POLICY "anon_select_photos" ON breakdown_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_photos" ON breakdown_photos;
CREATE POLICY "anon_insert_photos" ON breakdown_photos FOR INSERT
  TO anon, authenticated WITH CHECK (true);
