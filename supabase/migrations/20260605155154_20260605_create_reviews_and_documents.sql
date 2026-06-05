
-- 6. reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid UNIQUE NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  commentaire text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_mechanic ON reviews (mechanic_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_insert_reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "select_reviews" ON reviews FOR SELECT TO authenticated USING (true);

-- Auto-update mechanic rating on review insert
CREATE OR REPLACE FUNCTION update_mechanic_rating_v2()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mechanics SET
    rating_avg = (SELECT AVG(score) FROM reviews WHERE mechanic_id = NEW.mechanic_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE mechanic_id = NEW.mechanic_id)
  WHERE id = NEW.mechanic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_mechanic_rating
  AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION update_mechanic_rating_v2();

-- 7. mechanic_documents table (3 docs required for onboarding)
CREATE TABLE IF NOT EXISTS mechanic_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  type_doc text NOT NULL CHECK (type_doc IN ('identity','certification','address_proof')),
  file_url text NOT NULL,
  statut text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','approved','rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mechanic_id, type_doc)
);

CREATE TRIGGER trg_mechanic_docs_updated_at
  BEFORE UPDATE ON mechanic_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE mechanic_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mechanic_select_own_docs" ON mechanic_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));
CREATE POLICY "mechanic_insert_docs" ON mechanic_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));
CREATE POLICY "mechanic_update_docs" ON mechanic_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()));
CREATE POLICY "admin_select_all_docs" ON mechanic_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_update_docs" ON mechanic_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
