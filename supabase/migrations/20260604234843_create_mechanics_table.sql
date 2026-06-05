/*
# Create Mechanics Table

1. New Tables
- `mechanics` — stores registered mechanic/depanneur profiles
  - `id` (uuid, PK)
  - `user_id` (uuid, FK auth.users, unique) — links to Supabase Auth account
  - `business_name` (text) — name of the mechanic's business
  - `phone` (text, not null) — contact phone number
  - `specializations` (text[]) — array of service types offered (e.g. battery, tire, engine, towing)
  - `latitude` (double precision, not null) — location latitude
  - `longitude` (double precision, not null) — location longitude
  - `location` (geography(Point, 4326)) — PostGIS point for spatial queries
  - `is_available` (boolean, default true) — whether mechanic is currently accepting requests
  - `is_verified` (boolean, default false) — admin verification status
  - `rating_avg` (double precision, default 0) — average rating score
  - `rating_count` (integer, default 0) — number of ratings received
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Indexes
- GIST index on `location` for fast spatial queries
- Index on `user_id` for auth lookups
- Index on `is_available` for filtering available mechanics

3. Security
- RLS enabled on `mechanics`
- Authenticated mechanics can read all mechanics (directory)
- Mechanics can insert their own profile (auth.uid() = user_id)
- Mechanics can update only their own profile
- Anon + authenticated can read mechanics (drivers need to see available mechanics)
*/

CREATE TABLE IF NOT EXISTS mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  phone text NOT NULL,
  specializations text[] NOT NULL DEFAULT '{}',
  latitude double precision NOT NULL DEFAULT 6.3654,
  longitude double precision NOT NULL DEFAULT 2.4183,
  location geography(Point, 4326),
  is_available boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  rating_avg double precision NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Set location from lat/lng on insert/update
CREATE OR REPLACE FUNCTION set_mechanic_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_mechanic_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON mechanics
  FOR EACH ROW EXECUTE FUNCTION set_mechanic_location();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mechanics_location ON mechanics USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_mechanics_user_id ON mechanics (user_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_is_available ON mechanics (is_available) WHERE is_available = true;

-- RLS
ALTER TABLE mechanics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_mechanics" ON mechanics;
CREATE POLICY "anon_read_mechanics" ON mechanics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_mechanic" ON mechanics;
CREATE POLICY "insert_own_mechanic" ON mechanics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_mechanic" ON mechanics;
CREATE POLICY "update_own_mechanic" ON mechanics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_mechanic" ON mechanics;
CREATE POLICY "delete_own_mechanic" ON mechanics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
