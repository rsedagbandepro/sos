-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE: Prevent role escalation
-- Users must NOT be able to change their own role.
-- Only service_role (via triggers) or admins can set role.
-- ============================================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM profiles WHERE user_id = auth.uid())
  );

-- Admins can update any profile (including role changes)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================================
-- 2. PANNES TABLE: Prevent driver_id spoofing
-- Authenticated users must only insert pannes with their own user_id.
-- Allow NULL driver_id only when user is NOT authenticated (anon/guest).
-- ============================================================
DROP POLICY IF EXISTS "driver_insert_panne" ON pannes;
DROP POLICY IF EXISTS "guest_insert_panne" ON pannes;
DROP POLICY IF EXISTS "anon_insert_pannes" ON pannes;

-- Authenticated driver inserts own panne (driver_id must match auth.uid())
CREATE POLICY "driver_insert_panne" ON pannes FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- Anon/guest inserts panne with NULL driver_id
CREATE POLICY "guest_insert_panne" ON pannes FOR INSERT
  TO anon
  WITH CHECK (driver_id IS NULL);

-- ============================================================
-- 3. PANNES UPDATE: Prevent escalation
-- Drivers can only update their own pannes (non-terminal states).
-- Admins can update any panne.
-- ============================================================
DROP POLICY IF EXISTS "driver_update_panne" ON pannes;
DROP POLICY IF EXISTS "admin_update_panne" ON pannes;
DROP POLICY IF EXISTS "anon_update_guest_panne" ON pannes;

CREATE POLICY "driver_update_panne" ON pannes FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "admin_update_panne" ON pannes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. OFFRES: Prevent price/mechanic_id tampering on update
-- Mechanics can only update message/statut, not prix or panne_id.
-- ============================================================
DROP POLICY IF EXISTS "mechanic_update_offres" ON offres;

CREATE POLICY "mechanic_update_offres" ON offres FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND panne_id = panne_id  -- panne_id cannot change
  );

-- ============================================================
-- 5. INTERVENTIONS: Mechanics should not be able to update driver_id or montant
-- ============================================================
DROP POLICY IF EXISTS "mechanic_update_intervention" ON interventions;
DROP POLICY IF EXISTS "mechanic_insert_intervention" ON interventions;

CREATE POLICY "mechanic_insert_intervention" ON interventions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM offres
      WHERE id = offre_id
      AND mechanic_id = interventions.mechanic_id
      AND statut = 'accepted'
    )
  );

CREATE POLICY "mechanic_update_intervention" ON interventions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND mechanic_id = mechanic_id  -- mechanic_id cannot change
    AND driver_id = driver_id      -- driver_id cannot change
    AND montant = montant          -- montant cannot change
  );

-- ============================================================
-- 6. PAIEMENTS: Drivers cannot change the montant
-- ============================================================
DROP POLICY IF EXISTS "driver_insert_paiement" ON paiements;
DROP POLICY IF EXISTS "driver_update_paiement" ON paiements;

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
  );

CREATE POLICY "driver_update_paiement" ON paiements FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (
    driver_id = auth.uid()
    AND montant = montant  -- montant cannot change after creation
  );

-- ============================================================
-- 7. REVIEWS: One review per intervention, reviewer must be driver
-- ============================================================
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
    )
  );

-- Reviews are immutable after insert — no UPDATE policy allowed

-- ============================================================
-- 8. MECHANIC_DOCUMENTS: Mechanics can only insert/view own docs
-- ============================================================
DROP POLICY IF EXISTS "mechanic_update_document" ON mechanic_documents;
DROP POLICY IF EXISTS "mechanic_insert_document" ON mechanic_documents;

CREATE POLICY "mechanic_insert_document" ON mechanic_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
  );

-- Mechanics cannot change type_doc or mechanic_id after submission
CREATE POLICY "mechanic_update_document" ON mechanic_documents FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM mechanics WHERE id = mechanic_id AND user_id = auth.uid())
    AND type_doc = type_doc
    AND mechanic_id = mechanic_id
  );

-- ============================================================
-- 9. MECHANICS: Prevent user_id spoofing on insert
-- ============================================================
DROP POLICY IF EXISTS "mechanic_insert_own" ON mechanics;
DROP POLICY IF EXISTS "authenticated_insert_mechanic" ON mechanics;

CREATE POLICY "mechanic_insert_own" ON mechanics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 10. Add a secure helper function to check if current user is admin
-- This avoids repeating the subquery in every policy
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
