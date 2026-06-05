
-- 3. offres table (mechanic proposes price+eta on a panne)
CREATE TABLE IF NOT EXISTS offres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panne_id uuid NOT NULL REFERENCES pannes(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  prix numeric(10,2) NOT NULL,
  eta_minutes integer NOT NULL DEFAULT 15,
  message text,
  statut text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','accepted','rejected','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (panne_id, mechanic_id)
);

CREATE TRIGGER trg_offres_updated_at
  BEFORE UPDATE ON offres FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_offres_panne ON offres (panne_id);
CREATE INDEX IF NOT EXISTS idx_offres_mechanic ON offres (mechanic_id);

ALTER TABLE offres ENABLE ROW LEVEL SECURITY;

-- Driver sees offres on own pannes
CREATE POLICY "driver_select_offres" ON offres FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pannes WHERE id = panne_id AND driver_id = auth.uid()));

-- Mechanic sees own offres
CREATE POLICY "mechanic_select_own_offres" ON offres FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));

-- Mechanic inserts offres
CREATE POLICY "mechanic_insert_offres" ON offres FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid() AND is_verified = true));

-- Mechanic updates own offres
CREATE POLICY "mechanic_update_offres" ON offres FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));

-- Driver updates offre statut (accept/reject)
CREATE POLICY "driver_update_offre_statut" ON offres FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM pannes WHERE id = panne_id AND driver_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM pannes WHERE id = panne_id AND driver_id = auth.uid()));

-- Admin
CREATE POLICY "admin_select_all_offres" ON offres FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
