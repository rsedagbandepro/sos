import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_banned: boolean;
  banned_until: string | null;
  created_at: string;
}

interface AdminUserDetail extends AdminUser {
  avatar_url: string | null;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.rpc('admin_get_all_users');
      if (e) throw e;
      setUsers((data as AdminUser[]) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

export function useAdminUser(userId: string | null) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: e } = await supabase.rpc('admin_get_user', { p_user_id: userId });
        if (e) throw e;
        setUser(data as AdminUserDetail);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
}

export async function adminCreateUser(
  email: string,
  password: string,
  fullName: string | null,
  phone: string | null,
  role: string
) {
  const { data, error } = await supabase.rpc('admin_create_user', {
    p_email: email,
    p_password: password,
    p_full_name: fullName,
    p_phone: phone,
    p_role: role,
  });
  if (error) throw error;
  return data;
}

export async function adminUpdateUser(
  userId: string,
  fullName: string | null,
  phone: string | null,
  role: string
) {
  const { error } = await supabase.rpc('admin_update_user', {
    p_user_id: userId,
    p_full_name: fullName,
    p_phone: phone,
    p_role: role,
  });
  if (error) throw error;
}

export async function adminSetUserStatus(userId: string, isActive: boolean) {
  const { error } = await supabase.rpc('admin_set_user_status', {
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) throw error;
}

export async function adminDeleteUser(userId: string) {
  const { error } = await supabase.rpc('admin_delete_user', {
    p_user_id: userId,
  });
  if (error) throw error;
}
