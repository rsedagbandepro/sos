import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, FileCheck, Wrench, LogOut, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getServerRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

interface Stats {
  pendingDossiers: number;
  totalMechanics: number;
  totalUsers: number;
  openPannes: number;
}

export default function AdminIndexScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({ pendingDossiers: 0, totalMechanics: 0, totalUsers: 0, openPannes: 0 });
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/(driver)');
      return;
    }
    // Verify admin role from DB before loading any admin data
    getServerRole(user.id).then(role => {
      if (role !== 'admin') {
        router.replace('/(driver)');
        return;
      }
      setAuthorized(true);
    });
  }, [user]);

  useEffect(() => {
    if (!authorized) return;
    Promise.all([
      supabase.from('mechanics').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('mechanics').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('pannes').select('*', { count: 'exact', head: true }).eq('statut', 'ouverte'),
    ]).then(([pending, mechs, users, pannes]) => {
      setStats({
        pendingDossiers: pending.count ?? 0,
        totalMechanics: mechs.count ?? 0,
        totalUsers: users.count ?? 0,
        openPannes: pannes.count ?? 0,
      });
      setLoading(false);
    });
  }, [authorized]);

  const MENU = [
    {
      icon: FileCheck,
      label: 'Dossiers mécaniciens',
      desc: `${stats.pendingDossiers} en attente`,
      badge: stats.pendingDossiers,
      route: '/(admin)/dossiers',
      color: stats.pendingDossiers > 0 ? Colors.warning : Colors.primary,
    },
    {
      icon: Wrench,
      label: 'Pannes actives',
      desc: `${stats.openPannes} pannes ouvertes`,
      route: '/(admin)/pannes',
      color: Colors.accent,
    },
    {
      icon: Users,
      label: 'Utilisateurs',
      desc: `${stats.totalUsers} comptes`,
      route: '/(admin)/utilisateurs',
      color: Colors.secondary,
    },
  ];

  if (!authorized) {
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
          <Text style={styles.greeting}>Administration</Text>
          <Text style={styles.subtitle}>Tableau de bord</Text>
        </View>
        <Pressable onPress={async () => {
          try { await signOut(); } catch {}
          router.replace('/(driver)');
        }} style={styles.logoutBtn}>
          <LogOut size={22} color={Colors.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats.totalMechanics}</Text>
                <Text style={styles.statLabel}>Mécaniciens</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>Utilisateurs</Text>
              </View>
              <View style={[styles.statCard, stats.pendingDossiers > 0 && styles.statCardAlert]}>
                <Text style={[styles.statNum, stats.pendingDossiers > 0 && { color: Colors.warning }]}>
                  {stats.pendingDossiers}
                </Text>
                <Text style={styles.statLabel}>En attente</Text>
              </View>
            </View>

            {MENU.map(item => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.route}
                  style={styles.menuItem}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon size={24} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc}>{item.desc}</Text>
                  </View>
                  {item.badge && item.badge > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  ) : (
                    <ChevronRight size={20} color={Colors.textTertiary} />
                  )}
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
  },
  greeting: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  logoutBtn: { padding: Spacing.sm },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  center: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  statCardAlert: { borderColor: Colors.warning, backgroundColor: Colors.warningLight },
  statNum: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXl, color: Colors.text },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary, textAlign: 'center' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: {
    width: 52, height: 52, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText: { flex: 1, gap: 2 },
  menuLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  menuDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  badge: {
    backgroundColor: Colors.warning, minWidth: 24, height: 24,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xs,
  },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs, color: Colors.textInverse },
});
