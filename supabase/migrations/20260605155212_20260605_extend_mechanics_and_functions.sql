
-- 8. Extend mechanics table for onboarding fields
ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intervention_radius_km integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'incomplete'
    CHECK (verification_status IN ('incomplete','pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS total_revenue numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;

-- Sync is_verified with verification_status
CREATE OR REPLACE FUNCTION sync_mechanic_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'approved' THEN
    NEW.is_verified := true;
  ELSE
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_mechanic_verified
  BEFORE UPDATE OF verification_status ON mechanics
  FOR EACH ROW EXECUTE FUNCTION sync_mechanic_verified();

-- Update mechanic total_revenue after paiement
CREATE OR REPLACE FUNCTION update_mechanic_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'paye' AND (OLD.statut IS NULL OR OLD.statut != 'paye') THEN
    UPDATE mechanics SET total_revenue = total_revenue + NEW.montant
    WHERE id = (SELECT mechanic_id FROM interventions WHERE id = NEW.intervention_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mechanic_revenue
  AFTER INSERT OR UPDATE ON paiements FOR EACH ROW EXECUTE FUNCTION update_mechanic_revenue();

-- Nearby open pannes function for mechanics
CREATE OR REPLACE FUNCTION nearby_open_pannes(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km double precision DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  driver_id uuid,
  latitude double precision,
  longitude double precision,
  categorie text,
  description text,
  statut text,
  created_at timestamptz,
  distance_km double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id, p.driver_id, p.latitude, p.longitude,
    p.categorie, p.description, p.statut, p.created_at,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) / 1000.0 AS distance_km
  FROM pannes p
  WHERE p.statut = 'ouverte'
    AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_km * 1000)
  ORDER BY distance_km ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_open_pannes TO authenticated;
