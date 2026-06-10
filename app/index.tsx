import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getServerRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const { user, profile, loading } = useAuth();
  const [resolvingRole, setResolvingRole] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setResolvingRole(false);
      router.replace('/(driver)');
      return;
    }

    setResolvingRole(true);
    let cancelled = false;

    (async () => {
      try {
        const role = await getServerRole(user.id);
        if (cancelled) return;

        if (role === 'admin') {
          router.replace('/(admin)');
        } else if (role === 'mechanic') {
          // Check if mechanic account is approved
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_approved')
            .eq('user_id', user.id)
            .maybeSingle();

          // If not approved, show waiting screen
          if (profileData && profileData.is_approved === false) {
            router.replace('/(auth)/en-attente');
            return;
          }

          // Check mechanics table for verification status
          const { data } = await supabase
            .from('mechanics')
            .select('verification_status')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data?.verification_status === 'approved') {
            router.replace('/(mechanic)/dashboard');
          } else {
            router.replace('/(mechanic)/onboarding');
          }
        } else {
          router.replace('/(driver)');
        }
      } catch {
        if (!cancelled) router.replace('/(driver)');
      } finally {
        if (!cancelled) setResolvingRole(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, loading]);

  if (!resolvingRole && !loading && !user) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
