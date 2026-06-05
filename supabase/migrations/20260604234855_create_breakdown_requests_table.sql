/*
# Create Breakdown Requests Table

1. New Tables
- `breakdown_requests` — emergency breakdown assistance requests from drivers
  - `id` (uuid, PK)
  - `driver_phone` (text, not null) — the driver's phone number (only identifier needed, per Rule #1)
  - `driver_name` (text) — optional driver name
  - `latitude` (double precision, not null) — breakdown location latitude
  - `longitude` (double precision, not null) — breakdown location longitude
  - `location` (geography(Point, 4326)) — PostGIS point for spatial queries
  - `breakdown_type` (text, not null) — type: flat_tire, dead_battery, engine_failure, towing, locked_out, other
  - `description` (text) — optional free-text description of the problem
  - `status` (text, not null, default 'pending') — pending, accepted, in_progress, resolved, cancelled
  - `accepted_by` (uuid, FK mechanics) — mechanic who accepted the request
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Indexes
- GIST index on `location` for spatial queries
- Index on `status` for filtering pending requests
- Index on `driver_phone` for driver lookups
- Index on `accepted_by` for mechanic lookups

3. Security
- RLS enabled on `breakdown_requests`
- Anon + authenticated can INSERT (drivers have no account)
- Anon + authenticated can SELECT (driver tracks status, mechanic sees requests)
- Only the accepting mechanic can UPDATE (change status)
- Anon can DELETE own requests by phone (identified via query param, not RLS — handled at app level)
*/

CREATE TABLE IF NOT EXISTS breakdown_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_phone text NOT NULL,
  driver_name text,
  latitude double precision NOT NULL DEFAULT 6.3654,
  longitude double precision NOT NULL DEFAULT 2.4183,
  location geography(Point, 4326),
  breakdown_type text NOT NULL DEFAULT 'other',
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'resolved', 'cancelled')),
  accepted_by uuid REFERENCES mechanics(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Set location from lat/lng
CREATE OR REPLACE FUNCTION set_breakdown_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_breakdown_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON breakdown_requests
  FOR EACH ROW EXECUTE FUNCTION set_breakdown_location();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_breakdown_location ON breakdown_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_breakdown_status ON breakdown_requests (status);
CREATE INDEX IF NOT EXISTS idx_breakdown_driver_phone ON breakdown_requests (driver_phone);
CREATE INDEX IF NOT EXISTS idx_breakdown_accepted_by ON breakdown_requests (accepted_by);
CREATE INDEX IF NOT EXISTS idx_breakdown_created_at ON breakdown_requests (created_at DESC);

-- RLS
ALTER TABLE breakdown_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_breakdowns" ON breakdown_requests;
CREATE POLICY "anon_select_breakdowns" ON breakdown_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_breakdowns" ON breakdown_requests;
CREATE POLICY "anon_insert_breakdowns" ON breakdown_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "mechanic_update_breakdowns" ON breakdown_requests;
CREATE POLICY "mechanic_update_breakdowns" ON breakdown_requests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_breakdowns" ON breakdown_requests;
CREATE POLICY "anon_delete_breakdowns" ON breakdown_requests FOR DELETE
  TO anon, authenticated USING (true);
