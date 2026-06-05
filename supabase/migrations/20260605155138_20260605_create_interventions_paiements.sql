
-- 4. interventions table
CREATE TABLE IF NOT EXISTS interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panne_id uuid NOT NULL REFERENCES pannes(id) ON DELETE CASCADE,
  offre_id uuid NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut text NOT NULL DEFAULT 'acceptee' CHECK (statut IN ('acceptee','en_route','arrivee','en_cours','terminee','annulee')),
  montant numeric(10,2) NOT NULL,
  started_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_interventions_updated_at
  BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_interventions_panne ON interventions (panne_id);
CREATE INDEX IF NOT EXISTS idx_interventions_mechanic ON interventions (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_interventions_driver ON interventions (driver_id);
CREATE INDEX IF NOT EXISTS idx_interventions_statut ON interventions (statut);

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_select_interventions" ON interventions FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "mechanic_select_interventions" ON interventions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));
CREATE POLICY "mechanic_insert_interventions" ON interventions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));
CREATE POLICY "mechanic_update_interventions" ON interventions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));
CREATE POLICY "admin_select_all_interventions" ON interventions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- 5. paiements table
CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid UNIQUE NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  montant numeric(10,2) NOT NULL,
  methode text NOT NULL DEFAULT 'especes' CHECK (methode IN ('especes','mobile_money','carte')),
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','paye','echec','rembourse')),
  reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_paiements_updated_at
  BEFORE UPDATE ON paiements FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_select_paiements" ON paiements FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "driver_insert_paiements" ON paiements FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "driver_update_paiements" ON paiements FOR UPDATE TO authenticated USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
CREATE POLICY "mechanic_select_paiements" ON paiements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM interventions i JOIN mechanics m ON m.id = i.mechanic_id WHERE i.id = intervention_id AND m.user_id = auth.uid()));
CREATE POLICY "admin_select_all_paiements" ON paiements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
