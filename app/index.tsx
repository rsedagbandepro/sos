import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Unauthenticated users go directly to the driver home as guests
      router.replace('/(driver)');
      return;
    }

    const role = profile?.role ?? 'driver';

    if (role === 'admin') {
      router.replace('/(admin)');
    } else if (role === 'mechanic') {
      router.replace('/(mechanic)/onboarding');
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
