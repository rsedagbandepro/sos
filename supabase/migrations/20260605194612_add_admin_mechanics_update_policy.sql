
-- Allow admin to update any mechanic record (needed for approve/reject dossier workflow)
CREATE POLICY "admin_update_mechanic"
  ON mechanics FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Also allow admin to read all mechanics explicitly (anon policy already covers it,
-- but an explicit authenticated admin policy is cleaner and future-proof)
CREATE POLICY "admin_select_all_mechanics"
  ON mechanics FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');
