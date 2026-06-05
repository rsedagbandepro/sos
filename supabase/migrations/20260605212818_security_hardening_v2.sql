-- ============================================================
-- COMPREHENSIVE SECURITY HARDENING V2
-- Fixes: tautological WITH CHECK, missing DELETE policies,
-- data leaks, immutability enforcement, guest access controls
-- ============================================================

-- ============================================================
-- 1. FIX TAUTOLOGICAL WITH CHECK on offres
--    "panne_id = panne_id" is always true (compares NEW to NEW)
--    Must compare NEW to stored value to prevent tampering
-- ============================================================
DROP POLICY IF EXISTS "mechanic_update_offres" ON offres;

CREATE POLICY "mechanic_update_offres" ON offres FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND panne_id = (SELECT o.panne_id FROM offres o WHERE o.id = offres.id)
    AND prix = (SELECT o.prix FROM offres o WHERE o.id = offres.id)
    AND mechanic_id = (SELECT o.mechanic_id FROM offres o WHERE o.id = offres.id)
  );

-- ============================================================
-- 2. FIX TAUTOLOGICAL WITH CHECK on interventions
-- ============================================================
DROP POLICY IF EXISTS "mechanic_update_intervention" ON interventions;
DROP POLICY IF EXISTS "mechanic_update_interventions" ON interventions;

CREATE POLICY "mechanic_update_intervention" ON interventions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND mechanic_id = (SELECT i.mechanic_id FROM interventions i WHERE i.id = interventions.id)
    AND driver_id = (SELECT i.driver_id FROM interventions i WHERE i.id = interventions.id)
    AND montant = (SELECT i.montant FROM interventions i WHERE i.id = interventions.id)
    AND offre_id = (SELECT i.offre_id FROM interventions i WHERE i.id = interventions.id)
    AND panne_id = (SELECT i.panne_id FROM interventions i WHERE i.id = interventions.id)
  );

-- ============================================================
-- 3. FIX TAUTOLOGICAL WITH CHECK on paiements
-- ============================================================
DROP POLICY IF EXISTS "driver_update_paiement" ON paiements;
DROP POLICY IF EXISTS "driver_update_paiements" ON paiements;

CREATE POLICY "driver_update_paiement" ON paiements FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (
    driver_id = auth.uid()
    AND montant = (SELECT p.montant FROM paiements p WHERE p.id = paiements.id)
    AND intervention_id = (SELECT p.intervention_id FROM paiements p WHERE p.id = paiements.id)
  );

-- ============================================================
-- 4. FIX TAUTOLOGICAL WITH CHECK on mechanic_documents
-- ============================================================
DROP POLICY IF EXISTS "mechanic_update_document" ON mechanic_documents;
DROP POLICY IF EXISTS "mechanic_update_docs" ON mechanic_documents;

CREATE POLICY "mechanic_update_document" ON mechanic_documents FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND type_doc = (SELECT d.type_doc FROM mechanic_documents d WHERE d.id = mechanic_documents.id)
    AND mechanic_id = (SELECT d.mechanic_id FROM mechanic_documents d WHERE d.id = mechanic_documents.id)
  );

-- ============================================================
-- 5. ADD DELETE PREVENTION for immutable tables
-- ============================================================

-- Reviews: deny DELETE entirely (immutable audit records)
CREATE POLICY "deny_delete_reviews" ON reviews FOR DELETE
  TO authenticated USING (false);
CREATE POLICY "deny_delete_reviews_anon" ON reviews FOR DELETE
  TO anon USING (false);

-- Paiements: deny DELETE entirely (financial audit records)
CREATE POLICY "deny_delete_paiements" ON paiements FOR DELETE
  TO authenticated USING (false);
CREATE POLICY "deny_delete_paiements_anon" ON paiements FOR DELETE
  TO anon USING (false);

-- Interventions: only admin can delete
CREATE POLICY "deny_delete_interventions" ON interventions FOR DELETE
  TO authenticated USING (is_admin());

-- Offres: deny DELETE (audit trail)
CREATE POLICY "deny_delete_offres" ON offres FOR DELETE
  TO authenticated USING (false);
CREATE POLICY "deny_delete_offres_anon" ON offres FOR DELETE
  TO anon USING (false);

-- Profiles: only admin can delete
CREATE POLICY "deny_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================
-- 6. FIX REVIEWS: Add immutability (no UPDATE) and proper INSERT guard
-- ============================================================
DROP POLICY IF EXISTS "driver_insert_reviews" ON reviews;
DROP POLICY IF EXISTS "driver_insert_review" ON reviews;
DROP POLICY IF EXISTS "authenticated_insert_review" ON reviews;

CREATE POLICY "driver_insert_review" ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM interventions
      WHERE id = intervention_id
      AND driver_id = auth.uid()
      AND statut = 'terminee'
    )
  );

-- Deny UPDATE on reviews entirely (immutable)
CREATE POLICY "deny_update_reviews" ON reviews FOR UPDATE
  TO authenticated USING (false);
CREATE POLICY "deny_update_reviews_anon" ON reviews FOR UPDATE
  TO anon USING (false);

-- ============================================================
-- 7. FIX NEARBY_OPEN_PANNES: Stop leaking driver_id to mechanics
--    (old function already dropped, recreate with safe columns)
-- ============================================================
CREATE OR REPLACE FUNCTION nearby_open_pannes(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km double precision DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  latitude double precision,
  longitude double precision,
  categorie text,
  description text,
  driver_phone text,
  statut text,
  created_at timestamptz,
  distance_km double precision
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.latitude, p.longitude,
    p.categorie, p.description,
    p.driver_phone,
    p.statut, p.created_at,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) / 1000.0 AS distance_km
  FROM pannes p
  WHERE p.statut = 'ouverte'
    AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_km * 1000)
  ORDER BY distance_km ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_open_pannes TO authenticated;

-- ============================================================
-- 8. FIX GUEST PANNE ACCESS: Restrict anon SELECT to active pannes only
-- ============================================================
DROP POLICY IF EXISTS "select_guest_pannes" ON pannes;

CREATE POLICY "select_guest_pannes" ON pannes FOR SELECT
  TO anon USING (
    driver_id IS NULL
    AND statut IN ('ouverte', 'offre_acceptee', 'en_cours')
  );

-- ============================================================
-- 9. FIX GUEST PANNE UPDATE: Restrict anon updates to open pannes only
-- ============================================================
DROP POLICY IF EXISTS "update_guest_pannes" ON pannes;

CREATE POLICY "update_guest_pannes" ON pannes FOR UPDATE
  TO anon USING (
    driver_id IS NULL
    AND statut IN ('ouverte', 'offre_acceptee')
  )
  WITH CHECK (
    driver_id IS NULL
    AND statut IN ('ouverte', 'offre_acceptee', 'annulee')
  );

-- ============================================================
-- 10. FIX PANNE_PHOTOS: Overly permissive SELECT (true)
-- ============================================================
DROP POLICY IF EXISTS "select_panne_photos" ON panne_photos;

CREATE POLICY "select_panne_photos" ON panne_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pannes WHERE id = panne_id
      AND (driver_id = auth.uid()
           OR statut = 'ouverte'
           OR EXISTS (SELECT 1 FROM mechanics WHERE user_id = auth.uid() AND is_verified = true)
           OR is_admin())
    )
  );

-- ============================================================
-- 11. FIX REVIEWS SELECT: Currently exposes all reviews to everyone
-- ============================================================
DROP POLICY IF EXISTS "select_reviews" ON reviews;

CREATE POLICY "select_reviews" ON reviews FOR SELECT
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM interventions i JOIN mechanics m ON m.id = i.mechanic_id WHERE i.id = reviews.intervention_id AND m.user_id = auth.uid())
    OR is_admin()
  );

-- ============================================================
-- 12. FIX INTERVENTION INSERT: Validate offre matches and is accepted
-- ============================================================
DROP POLICY IF EXISTS "mechanic_insert_intervention" ON interventions;
DROP POLICY IF EXISTS "mechanic_insert_interventions" ON interventions;

CREATE POLICY "mechanic_insert_intervention" ON interventions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND driver_id = (SELECT driver_id FROM pannes WHERE id = panne_id)
    AND montant = (SELECT prix FROM offres WHERE id = offre_id)
    AND EXISTS (
      SELECT 1 FROM offres
      WHERE id = offre_id
      AND mechanic_id = interventions.mechanic_id
      AND panne_id = interventions.panne_id
      AND statut = 'accepted'
    )
  );

-- ============================================================
-- 13. FIX PAIEMENT INSERT: Validate montant matches intervention
-- ============================================================
DROP POLICY IF EXISTS "driver_insert_paiement" ON paiements;
DROP POLICY IF EXISTS "driver_insert_paiements" ON paiements;

CREATE POLICY "driver_insert_paiement" ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM interventions
      WHERE id = intervention_id
      AND driver_id = auth.uid()
      AND statut = 'terminee'
    )
    AND montant = (SELECT montant FROM interventions WHERE id = intervention_id)
  );

-- ============================================================
-- 14. FIX OFFRE INSERT: Verify panne is actually open
-- ============================================================
DROP POLICY IF EXISTS "mechanic_insert_offres" ON offres;

CREATE POLICY "mechanic_insert_offres" ON offres FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid() AND is_verified = true)
    AND EXISTS (SELECT 1 FROM pannes WHERE id = panne_id AND statut = 'ouverte')
  );

-- ============================================================
-- 15. ADD ADMIN POLICIES where missing
-- ============================================================

-- Admin can update any intervention
CREATE POLICY "admin_update_intervention" ON interventions FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Admin can update any paiement
CREATE POLICY "admin_update_paiement" ON paiements FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Admin can update/delete pannes
DROP POLICY IF EXISTS "admin_update_panne" ON pannes;
CREATE POLICY "admin_update_panne" ON pannes FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_panne" ON pannes FOR DELETE
  TO authenticated USING (is_admin());

-- Admin can update any offre
CREATE POLICY "admin_update_offre" ON offres FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Admin can insert reviews
CREATE POLICY "admin_insert_review" ON reviews FOR INSERT
  TO authenticated WITH CHECK (is_admin());
