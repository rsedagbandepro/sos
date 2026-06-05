
-- 2. pannes table
CREATE TABLE IF NOT EXISTS pannes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL DEFAULT 6.3654,
  longitude double precision NOT NULL DEFAULT 2.4183,
  location geography(Point, 4326),
  categorie text NOT NULL DEFAULT 'other' CHECK (categorie IN ('flat_tire','dead_battery','engine_failure','towing','locked_out','other')),
  description text,
  statut text NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte','offre_acceptee','en_cours','terminee','annulee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_panne_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_panne_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON pannes
  FOR EACH ROW EXECUTE FUNCTION set_panne_location();

CREATE INDEX IF NOT EXISTS idx_pannes_location ON pannes USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_pannes_driver ON pannes (driver_id);
CREATE INDEX IF NOT EXISTS idx_pannes_statut ON pannes (statut);
CREATE INDEX IF NOT EXISTS idx_pannes_created ON pannes (created_at DESC);

ALTER TABLE pannes ENABLE ROW LEVEL SECURITY;

-- Driver: CRUD own pannes
CREATE POLICY "driver_select_own_pannes" ON pannes FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "driver_insert_pannes" ON pannes FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "driver_update_own_pannes" ON pannes FOR UPDATE TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
CREATE POLICY "driver_delete_own_pannes" ON pannes FOR DELETE TO authenticated USING (driver_id = auth.uid());

-- Mechanic: read open pannes
CREATE POLICY "mechanic_select_open_pannes" ON pannes FOR SELECT TO authenticated
  USING (statut = 'ouverte');

-- Admin: read all
CREATE POLICY "admin_select_all_pannes" ON pannes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Panne photos
CREATE TABLE IF NOT EXISTS panne_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panne_id uuid NOT NULL REFERENCES pannes(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panne_photos ON panne_photos (panne_id);
ALTER TABLE panne_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_panne_photos" ON panne_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_panne_photos" ON panne_photos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM pannes WHERE id = panne_id AND driver_id = auth.uid())
);
