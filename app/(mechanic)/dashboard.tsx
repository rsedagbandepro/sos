import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl,
  Switch, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Wrench, History, User, Bell } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNearbyOpenPannes } from '@/hooks/usePannes';
import { supabase } from '@/lib/supabase';
import { getCurrentPosition } from '@/lib/location';
import { PanneCard } from '@/components/PanneCard';
import { useState, useEffect, useCallback } from 'react';
import type { Mechanic } from '@/lib/types';

export default function MechanicDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [loadingMechanic, setLoadingMechanic] = useState(true);
  const [toggling, setToggling] = useState(false);

  const lat = mechanic?.latitude ?? null;
  const lng = mechanic?.longitude ?? null;
  const radius = mechanic?.intervention_radius_km ?? 30;
  const { pannes, loading: loadingPannes, refetch: refresh } = useNearbyOpenPannes(
    lat, lng, radius
  );

  const loadMechanic = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('mechanics')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      router.replace('/(mechanic)/onboarding');
      return;
    }
    if (data.verification_status !== 'approved') {
      router.replace('/(mechanic)/onboarding');
      return;
    }
    setMechanic(data as Mechanic);
    setLoadingMechanic(false);

    // Update GPS silently
    try {
      const coords = await getCurrentPosition();
      await supabase.from('mechanics').update({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }).eq('id', data.id);
    } catch {
      // non-critical
    }
  }, [user]);

  useEffect(() => {
    loadMechanic();
  }, [loadMechanic]);

  const toggleAvailability = async () => {
    if (!mechanic || toggling) return;
    setToggling(true);
    const next = !mechanic.is_available;
    await supabase.from('mechanics').update({ is_available: next }).eq('id', mechanic.id);
    setMechanic(prev => prev ? { ...prev, is_available: next } : prev);
    setToggling(false);
  };

  if (loadingMechanic) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.name}>{mechanic?.business_name || 'Mécanicien'}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.availRow}>
            <View style={[styles.dot, mechanic?.is_available ? styles.dotOn : styles.dotOff]} />
            <Switch
              value={mechanic?.is_available ?? false}
              onValueChange={toggleAvailability}
              trackColor={{ false: Colors.border, true: Colors.success + '80' }}
              thumbColor={mechanic?.is_available ? Colors.success : Colors.textTertiary}
              disabled={toggling}
            />
          </View>
          <Pressable onPress={() => router.push('/(mechanic)/profil-mechanic')} style={styles.iconBtn}>
            <User size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Pressable style={styles.statCard} onPress={() => router.push('/(mechanic)/interventions')}>
          <History size={20} color={Colors.primary} />
          <Text style={styles.statLabel}>Interventions</Text>
        </Pressable>
        <View style={styles.statCard}>
          <MapPin size={20} color={Colors.accent} />
          <Text style={styles.statLabel}>{radius} km</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: mechanic?.is_available ? Colors.successLight : Colors.surfaceDark }]}>
          <Bell size={20} color={mechanic?.is_available ? Colors.success : Colors.textTertiary} />
          <Text style={styles.statLabel}>{mechanic?.is_available ? 'Actif' : 'Inactif'}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Wrench size={18} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Pannes à proximité</Text>
        {loadingPannes && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loadingPannes} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {!mechanic?.is_available && (
          <View style={styles.inactiveNotice}>
            <Text style={styles.inactiveText}>
              Vous êtes hors ligne. Activez votre disponibilité pour voir les pannes.
            </Text>
          </View>
        )}

        {mechanic?.is_available && pannes.length === 0 && !loadingPannes && (
          <View style={styles.empty}>
            <MapPin size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aucune panne à proximité</Text>
            <Text style={styles.emptyDesc}>Les nouvelles demandes apparaîtront ici en temps réel.</Text>
          </View>
        )}

        {mechanic?.is_available && pannes.map(panne => (
          <PanneCard
            key={panne.id}
            panne={panne}
            onPress={() => router.push(`/(mechanic)/panne/${panne.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  greeting: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  name: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXl, color: Colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: Colors.success },
  dotOff: { backgroundColor: Colors.textTertiary },
  iconBtn: { padding: Spacing.sm },
  statsRow: {
    flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    alignItems: 'center', gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
  },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textSecondary },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  sectionTitle: { flex: 1, fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  inactiveNotice: {
    backgroundColor: Colors.warningLight, borderWidth: 1, borderColor: Colors.warning,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  inactiveText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text, textAlign: 'center' },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  emptyDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary, textAlign: 'center' },
});
