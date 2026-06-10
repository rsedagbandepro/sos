-- Add is_approved column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved) WHERE is_approved = false;

-- Update existing profiles: drivers are approved, mechanics need to set properly
UPDATE profiles SET is_approved = true WHERE role = 'driver';
UPDATE profiles SET is_approved = true WHERE role = 'admin';

-- Drop the old trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the trigger with approval logic
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, role, full_name, phone, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'driver') = 'mechanic' THEN false
      ELSE true
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RPC function for admin to approve a mechanic
CREATE OR REPLACE FUNCTION approve_mechanic(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get the profile
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_profile.role != 'mechanic' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a mechanic');
  END IF;

  -- Update profile approval
  UPDATE profiles 
  SET is_approved = true, rejection_reason = null, updated_at = now()
  WHERE user_id = p_user_id;

  -- Create mechanics entry if not exists
  INSERT INTO mechanics (user_id, phone, specializations, latitude, longitude, is_available, is_verified, verification_status)
  SELECT 
    p_user_id,
    v_profile.phone,
    '{}',
    6.3654,  -- Default location (Cotonou)
    2.4183,
    false,
    false,
    'pending'
  WHERE NOT EXISTS (SELECT 1 FROM mechanics WHERE user_id = p_user_id);

  -- Update role in app_metadata
  PERFORM set_role_in_app_metadata(p_user_id, 'mechanic');

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function for admin to reject a mechanic
CREATE OR REPLACE FUNCTION reject_mechanic(p_user_id uuid, p_reason text DEFAULT null)
RETURNS jsonb AS $$
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update profile
  UPDATE profiles 
  SET is_approved = false, rejection_reason = p_reason, updated_at = now()
  WHERE user_id = p_user_id AND role = 'mechanic';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mechanic profile not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get pending mechanic approvals
CREATE OR REPLACE FUNCTION get_pending_mechanics()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  phone text,
  email text,
  created_at timestamptz
) AS $$
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.phone,
    u.email::text,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.role = 'mechanic' AND p.is_approved = false
  ORDER BY p.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_mechanic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_mechanic(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_mechanics() TO authenticated;
