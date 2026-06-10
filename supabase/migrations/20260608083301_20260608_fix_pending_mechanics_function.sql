-- Fix the get_pending_mechanics function with proper column qualification
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
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin') THEN
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