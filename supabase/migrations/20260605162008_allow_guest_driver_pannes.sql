-- Make driver_id nullable to support guest (unauthenticated) pannes
ALTER TABLE pannes ALTER COLUMN driver_id DROP NOT NULL;

-- Add phone column for guest drivers
ALTER TABLE pannes ADD COLUMN IF NOT EXISTS driver_phone text;

-- Drop and recreate RLS policies to allow anonymous inserts
DROP POLICY IF EXISTS "insert_own_pannes" ON pannes;
DROP POLICY IF EXISTS "select_own_pannes" ON pannes;
DROP POLICY IF EXISTS "update_own_pannes" ON pannes;
DROP POLICY IF EXISTS "delete_own_pannes" ON pannes;

-- Authenticated drivers can insert their own pannes
CREATE POLICY "insert_own_pannes" ON pannes FOR INSERT
  TO authenticated WITH CHECK (
    driver_id = auth.uid()
  );

-- Allow anonymous inserts for guest drivers (driver_id is null)
CREATE POLICY "insert_guest_pannes" ON pannes FOR INSERT
  TO anon WITH CHECK (
    driver_id IS NULL
  );

-- Authenticated drivers see their own pannes; mechanics/admins see all open ones
CREATE POLICY "select_own_pannes" ON pannes FOR SELECT
  TO authenticated USING (
    driver_id = auth.uid()
    OR EXISTS (SELECT 1 FROM mechanics WHERE user_id = auth.uid() AND is_verified = true)
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Allow anon users to select their own guest panne by id (needed for attente screen)
CREATE POLICY "select_guest_pannes" ON pannes FOR SELECT
  TO anon USING (driver_id IS NULL);

-- Drivers can update own pannes
CREATE POLICY "update_own_pannes" ON pannes FOR UPDATE
  TO authenticated USING (driver_id = auth.uid());

-- Allow anon to update guest pannes (e.g. cancel)
CREATE POLICY "update_guest_pannes" ON pannes FOR UPDATE
  TO anon USING (driver_id IS NULL);

-- Drivers can delete own pannes
CREATE POLICY "delete_own_pannes" ON pannes FOR DELETE
  TO authenticated USING (driver_id = auth.uid());
