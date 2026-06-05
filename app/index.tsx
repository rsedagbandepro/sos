import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getServerRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/(driver)');
      return;
    }

    // Always resolve role from the database — never trust client-side state
    (async () => {
      try {
        const role = await getServerRole(user.id);

        if (role === 'admin') {
          router.replace('/(admin)');
        } else if (role === 'mechanic') {
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
        router.replace('/(driver)');
      }
    })();
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
