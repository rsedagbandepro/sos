-- 1. Fix breakdown_requests UPDATE: restrict to the accepting mechanic only
DROP POLICY IF EXISTS "mechanic_update_breakdowns" ON breakdown_requests;
CREATE POLICY "mechanic_update_breakdowns" ON breakdown_requests FOR UPDATE
  TO authenticated
  USING (accepted_by IN (SELECT id FROM mechanics WHERE user_id = auth.uid()))
  WITH CHECK (accepted_by IN (SELECT id FROM mechanics WHERE user_id = auth.uid()));

-- 2. Fix breakdown_requests DELETE: restrict to the accepting mechanic only
DROP POLICY IF EXISTS "anon_delete_breakdowns" ON breakdown_requests;
CREATE POLICY "mechanic_delete_own_breakdowns" ON breakdown_requests FOR DELETE
  TO authenticated
  USING (accepted_by IN (SELECT id FROM mechanics WHERE user_id = auth.uid()));

-- 3. Remove ratings UPDATE policy (ratings should be immutable after insert)
DROP POLICY IF EXISTS "anon_update_ratings" ON ratings;

-- 4. Grant EXECUTE on nearby_mechanics function to anon and authenticated
GRANT EXECUTE ON FUNCTION public.nearby_mechanics TO anon, authenticated;