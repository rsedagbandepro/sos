import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl,
  Switch, ActivityIndicator, AppState,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Wrench, History, User, Bell, RefreshCw } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getServerRole } from '@/lib/auth';
import { useNearbyOpenPannes } from '@/hooks/usePannes';
import { useMechanicLocation } from '@/hooks/useMechanicLocation';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/lib/supabase';
import { getCurrentPosition } from '@/lib/location';
import { PanneCard } from '@/components/PanneCard';
import { NewPanneAlert } from '@/components/NewPanneAlert';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Mechanic } from '@/lib/types';
import type { AppStateStatus } from 'react-native';
import type { PanneCategorie } from '@/lib/types';

export default function MechanicDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [loadingMechanic, setLoadingMechanic] = useState(true);
  const [toggling, setToggling] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const locationHook = useMechanicLocation(mechanic);
  const pushHook = usePushNotifications({
    mechanicId: mechanic?.id ?? null,
  });

  const lat = locationHook.latitude ?? mechanic?.latitude ?? null;
  const lng = locationHook.longitude ?? mechanic?.longitude ?? null;
  const radius = mechanic?.intervention_radius_km ?? 5;
  const { pannes, loading: loadingPannes, refetch: refresh } = useNearbyOpenPannes(
    lat, lng, radius
  );

  const loadMechanic = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setLoadingMechanic(false);
      return;
    }

    const role = await getServerRole(user.id);
    if (role !== 'mechanic') {
      router.replace('/(driver)');
      return;
    }

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

    try {
      const coords = await getCurrentPosition();
      if (coords.latitude !== 6.3654 || coords.longitude !== 2.4183) {
        await supabase.from('mechanics').update({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }).eq('id', data.id);
      }
    } catch {
      // non-critical
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadMechanic();
  }, [loadMechanic]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadMechanic();
        refresh();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [loadMechanic, refresh]);

  const toggleAvailability = async () => {
    if (!mechanic || toggling) return;
    setToggling(true);
    const next = !mechanic.is_available;

    await locationHook.toggleAvailability(next);

    setMechanic(prev => prev ? { ...prev, is_available: next } : prev);
    setToggling(false);
  };

  const handleForceLocationUpdate = async () => {
    await locationHook.forceUpdate();
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
          <Text style={styles.name}>{mechanic?.business_name || 'Mecanicien'}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.availRow}>
            <View style={[styles.dot, locationHook.isAvailable ? styles.dotOn : styles.dotOff]} />
            <Switch
              value={locationHook.isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: Colors.border, true: Colors.success + '80' }}
              thumbColor={locationHook.isAvailable ? Colors.success : Colors.textTertiary}
              disabled={toggling}
            />
          </View>
          <Pressable onPress={() => router.push('/(mechanic)/profil-mechanic')} style={styles.iconBtn}>
            <User size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* GPS Status Indicator */}
      <View style={styles.gpsStatus}>
        <View style={styles.gpsLeft}>
          <View style={[styles.gpsDot, locationHook.isTracking ? styles.gpsDotActive : styles.gpsDotInactive]} />
          <Text style={styles.gpsText}>
            {locationHook.isTracking ? 'GPS actif' : 'GPS inactif'}
          </Text>
        </View>
        {locationHook.lastUpdate && (
          <View style={styles.gpsUpdateRow}>
            <Text style={styles.gpsUpdateText}>
              Mis a jour {formatTimeAgo(locationHook.lastUpdate)}
            </Text>
            <Pressable onPress={handleForceLocationUpdate} style={styles.refreshBtn}>
              <RefreshCw size={14} color={Colors.primary} />
            </Pressable>
          </View>
        )}
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
        <View style={[styles.statCard, { backgroundColor: locationHook.isAvailable ? Colors.successLight : Colors.surfaceDark }]}>
          <Bell size={20} color={locationHook.isAvailable ? Colors.success : Colors.textTertiary} />
          <Text style={styles.statLabel}>{locationHook.isAvailable ? 'Actif' : 'Inactif'}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Wrench size={18} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Pannes a proximite</Text>
        {loadingPannes && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loadingPannes} onRefresh={refresh} tintColor={Colors.primary} />
        }>
        {!locationHook.isAvailable && (
          <View style={styles.inactiveNotice}>
            <Text style={styles.inactiveText}>
              Vous etes hors ligne. Activez votre disponibilite pour voir les pannes.
            </Text>
          </View>
        )}

        {locationHook.isAvailable && pannes.length === 0 && !loadingPannes && (
          <View style={styles.empty}>
            <MapPin size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aucune panne a proximite</Text>
            <Text style={styles.emptyDesc}>Les nouvelles demandes apparaitront ici en temps reel.</Text>
          </View>
        )}

        {locationHook.isAvailable && pannes.map(panne => (
          <PanneCard
            key={panne.id}
            panne={panne}
            onPress={() => router.push(`/(mechanic)/panne/${panne.id}`)}
          />
        ))}
      </ScrollView>

      <NewPanneAlert
        visible={pushHook.hasNewAlert}
        panneId={pushHook.newAlert?.panneId ?? ''}
        distanceKm={pushHook.newAlert?.distanceKm ?? 0}
        categorie={(pushHook.newAlert?.categorie as PanneCategorie) ?? 'other'}
        onDismiss={pushHook.dismissAlert}
        onViewDetails={pushHook.navigateToPanne}
      />
    </View>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "a l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `il y a ${diffHour}h`;
  return `il y a ${Math.floor(diffHour / 24)}j`;
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
  gpsStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  gpsLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  gpsDot: { width: 10, height: 10, borderRadius: 5 },
  gpsDotActive: { backgroundColor: Colors.success },
  gpsDotInactive: { backgroundColor: Colors.textTertiary },
  gpsText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  gpsUpdateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  gpsUpdateText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  refreshBtn: { padding: Spacing.xs },
  statsRow: {
    flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginVertical: Spacing.md,
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
