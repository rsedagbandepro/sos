import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/(driver)');
      return;
    }

    const role = profile?.role ?? 'driver';

    if (role === 'admin') {
      router.replace('/(admin)');
    } else if (role === 'mechanic') {
      (async () => {
        try {
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
        } catch {
          router.replace('/(mechanic)/onboarding');
        }
      })();
    } else {
      router.replace('/(driver)');
    }
  }, [user, profile, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
