import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['driver', 'mechanic', 'admin'];

/**
 * Returns the user's role from app_metadata embedded in the JWT.
 * app_metadata is written only by server-side triggers (SECURITY DEFINER)
 * and is never writable by the client — unlike raw_user_meta_data.
 *
 * Falls back to a fresh session refresh if the JWT is stale (e.g. right after
 * a role promotion), ensuring the caller always sees the current role.
 */
export async function getServerRole(userId: string): Promise<UserRole | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || session.user.id !== userId) return null;

  const roleFromJwt = session.user.app_metadata?.role as UserRole | undefined;
  if (roleFromJwt && VALID_ROLES.includes(roleFromJwt)) return roleFromJwt;

  // JWT may be stale — refresh and retry once
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session) return null;

  const refreshedRole = refreshed.session.user.app_metadata?.role as UserRole | undefined;
  if (refreshedRole && VALID_ROLES.includes(refreshedRole)) return refreshedRole;

  // JWT may lack role metadata entirely (e.g. right after first login before
  // the trigger syncs). Fall back to the profiles table as last resort.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.role && VALID_ROLES.includes(profile.role as UserRole)) {
    return profile.role as UserRole;
  }

  return null;
}

/**
 * Verifies the current session and returns the user + their role from app_metadata.
 * Returns null if no valid session exists.
 */
export async function getSessionWithRole(): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const role = await getServerRole(session.user.id);
  if (!role) return null;

  return { userId: session.user.id, role };
}
