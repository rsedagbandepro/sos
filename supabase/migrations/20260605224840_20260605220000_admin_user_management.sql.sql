-- ============================================================
-- ADMIN USER MANAGEMENT FUNCTIONS
-- Allows admins to create, modify, activate/deactivate users
-- ============================================================

-- ============================================================
-- 1. Function to get all users with auth details (for admin)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role text,
  full_name text,
  phone text,
  avatar_url text,
  email text,
  is_banned boolean,
  banned_until timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.role,
    p.full_name,
    p.phone,
    p.avatar_url,
    u.email,
    (u.banned_until IS NOT NULL AND u.banned_until > now()) as is_banned,
    u.banned_until,
    u.last_sign_in_at,
    p.created_at,
    p.updated_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.deleted_at IS NULL OR u.deleted_at > now()
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;

-- ============================================================
-- 2. Function to get single user with auth details
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_user(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role text,
  full_name text,
  phone text,
  avatar_url text,
  email text,
  is_banned boolean,
  banned_until timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  raw_app_meta_data jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    prof.id,
    prof.user_id,
    prof.role,
    prof.full_name,
    prof.phone,
    prof.avatar_url,
    u.email,
    (u.banned_until IS NOT NULL AND u.banned_until > now()) as is_banned,
    u.banned_until,
    u.last_sign_in_at,
    prof.created_at,
    prof.updated_at,
    u.raw_app_meta_data
  FROM profiles prof
  JOIN auth.users u ON u.id = prof.user_id
  WHERE prof.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user(uuid) TO authenticated;

-- ============================================================
-- 3. Function to create a new user (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email text,
  p_password text,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT 'driver'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege: Only admins can create users';
  END IF;

  -- Validate role
  IF p_role NOT IN ('driver', 'mechanic', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change_token_new,
    email_change_token_current,
    recovery_token,
    is_sso_user,
    is_anonymous
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), -- Auto-confirm email for admin-created users
    jsonb_build_object('role', p_role, 'provider', 'email', 'providers', '["email"]'),
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    false,
    false
  ) RETURNING id INTO v_user_id;

  -- Create profile
  INSERT INTO profiles (user_id, role, full_name, phone)
  VALUES (v_user_id, p_role, p_full_name, p_phone);

  -- Create mechanic record if role is mechanic
  IF p_role = 'mechanic' THEN
    INSERT INTO mechanics (user_id, phone, specializations, latitude, longitude, is_available, is_verified, verification_status)
    VALUES (v_user_id, COALESCE(p_phone, ''), '{}', 6.3654, 2.4183, false, false, 'incomplete');
  END IF;

  -- Create identity in auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    p_email,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    now(),
    now(),
    now()
  );

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_user(text, text, text, text, text) TO authenticated;

-- ============================================================
-- 4. Function to update user profile (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege: Only admins can update users';
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Update role if provided (using existing function)
  IF p_role IS NOT NULL THEN
    PERFORM set_role_in_app_metadata(p_user_id, p_role);
    
    -- Create mechanic record if changing to mechanic and doesn't exist
    IF p_role = 'mechanic' THEN
      INSERT INTO mechanics (user_id, phone, specializations, latitude, longitude, is_available, is_verified, verification_status)
      SELECT p_user_id, COALESCE(p_phone, ''), '{}', 6.3654, 2.4183, false, false, 'incomplete'
      WHERE NOT EXISTS (SELECT 1 FROM mechanics WHERE user_id = p_user_id);
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user(uuid, text, text, text) TO authenticated;

-- ============================================================
-- 5. Function to activate/deactivate user (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_user_status(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege: Only admins can activate/deactivate users';
  END IF;

  IF p_is_active THEN
    -- Activate: clear banned_until
    UPDATE auth.users
    SET banned_until = NULL, updated_at = now()
    WHERE id = p_user_id;
  ELSE
    -- Deactivate: set banned_until to far future
    UPDATE auth.users
    SET banned_until = '9999-12-31 23:59:59'::timestamptz, updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_user_status(uuid, boolean) TO authenticated;

-- ============================================================
-- 6. Function to delete user (soft delete - admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'insufficient_privilege: Only admins can delete users';
  END IF;

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Soft delete: set deleted_at and ban
  UPDATE auth.users
  SET deleted_at = now(), banned_until = '9999-12-31 23:59:59'::timestamptz, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_user(uuid) TO authenticated;

-- ============================================================
-- 7. Add RLS policies for admin user management
-- ============================================================

-- Admin can insert profiles
DROP POLICY IF EXISTS "admin_insert_profile" ON profiles;
CREATE POLICY "admin_insert_profile" ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admin can update any profile
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin can delete profiles
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());
