import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Wrench, ShieldCheck } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import type { Profile } from '@/lib/types';

const ROLE_ICON: Record<string, typeof User> = {
  driver: User,
  mechanic: Wrench,
  admin: ShieldCheck,
};

const ROLE_COLORS: Record<string, string> = {
  driver: Colors.primary,
  mechanic: Colors.accent,
  admin: Colors.error,
};

const ROLE_LABELS: Record<string, string> = {
  driver: 'Conducteur',
  mechanic: 'Mécanicien',
  admin: 'Admin',
};

export default function AdminUtilisateursScreen() {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const drivers = profiles.filter(p => p.role === 'driver');
  const mechanics = profiles.filter(p => p.role === 'mechanic');
  const admins = profiles.filter(p => p.role === 'admin');

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Utilisateurs</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <User size={16} color={Colors.primary} />
          <Text style={styles.summaryNum}>{drivers.length}</Text>
          <Text style={styles.summaryLabel}>Conducteurs</Text>
        </View>
        <View style={styles.summaryItem}>
          <Wrench size={16} color={Colors.accent} />
          <Text style={styles.summaryNum}>{mechanics.length}</Text>
          <Text style={styles.summaryLabel}>Mécaniciens</Text>
        </View>
        <View style={styles.summaryItem}>
          <ShieldCheck size={16} color={Colors.error} />
          <Text style={styles.summaryNum}>{admins.length}</Text>
          <Text style={styles.summaryLabel}>Admins</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        {loading && profiles.length === 0 && (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        )}

        {profiles.map(p => {
          const Icon = ROLE_ICON[p.role] ?? User;
          const color = ROLE_COLORS[p.role] ?? Colors.textTertiary;
          return (
            <View key={p.id} style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: color + '15' }]}>
                <Icon size={20} color={color} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{p.full_name || 'Sans nom'}</Text>
                <Text style={styles.phone}>{p.phone || '—'}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: color + '15' }]}>
                <Text style={[styles.roleText, { color }]}>{ROLE_LABELS[p.role] ?? p.role}</Text>
              </View>
            </View>
          );
        })}

        {!loading && profiles.length === 0 && (
          <View style={styles.empty}><Text style={styles.emptyText}>Aucun utilisateur</Text></View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  summary: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryNum: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  summaryLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  center: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  empty: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textTertiary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  phone: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  roleBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full,
  },
  roleText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs },
});
