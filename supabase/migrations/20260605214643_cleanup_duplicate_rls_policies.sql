-- =====================================================
-- Clean up duplicate and insecure RLS policies
-- =====================================================

-- ── PANNES TABLE ──────────────────────────────────────

-- Drop duplicate DELETE policies (keep delete_own_pannes + admin_delete_panne)
DROP POLICY IF EXISTS driver_delete_own_pannes ON pannes;

-- Drop duplicate INSERT policies (keep driver_insert_panne + guest_insert_panne)
DROP POLICY IF EXISTS driver_insert_pannes ON pannes;
DROP POLICY IF EXISTS insert_own_pannes ON pannes;
DROP POLICY IF EXISTS insert_guest_pannes ON pannes;

-- Drop duplicate SELECT policies (select_own_pannes is more comprehensive than driver_select_own_pannes)
DROP POLICY IF EXISTS driver_select_own_pannes ON pannes;

-- Drop duplicate/broken UPDATE policies
-- driver_update_own_pannes is identical to driver_update_panne — keep driver_update_panne
-- update_own_pannes has with_check=null (no constraint on updated values) — dangerous
DROP POLICY IF EXISTS driver_update_own_pannes ON pannes;
DROP POLICY IF EXISTS update_own_pannes ON pannes;

-- ── PROFILES TABLE ────────────────────────────────────

-- Drop the insecure update_own_profile (no role lock).
-- The "Users can update own profile" policy correctly locks the role column.
DROP POLICY IF EXISTS update_own_profile ON profiles;
