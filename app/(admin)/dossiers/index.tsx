import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Clock, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { useState, useEffect, useCallback } from 'react';
import type { Mechanic } from '@/lib/types';

type Tab = 'pending' | 'approved' | 'rejected';

export default function AdminDossiersScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('pending');
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mechanics')
      .select('*')
      .eq('verification_status', tab)
      .order('created_at', { ascending: tab === 'pending' });
    setMechanics((data as Mechanic[]) || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const TABS: { key: Tab; label: string; icon: typeof Clock }[] = [
    { key: 'pending', label: 'En attente', icon: Clock },
    { key: 'approved', label: 'Approuves', icon: CheckCircle },
    { key: 'rejected', label: 'Rejetes', icon: XCircle },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Dossiers mecaniciens</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Icon size={14} color={tab === t.key ? Colors.primary : Colors.textTertiary} />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        {loading && mechanics.length === 0 && (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        )}

        {!loading && mechanics.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun dossier {tab === 'pending' ? 'en attente' : tab === 'approved' ? 'approuve' : 'rejete'}</Text>
          </View>
        )}

        {mechanics.map(m => (
          <Pressable
            key={m.id}
            style={styles.card}
            onPress={() => router.push(`/(admin)/dossiers/${m.id}`)}
          >
            <Avatar name={m.business_name ?? '?'} size={48} uri={m.avatar_url ?? undefined} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{m.business_name || 'Sans nom'}</Text>
              <Text style={styles.cardPhone}>{m.phone}</Text>
              <Text style={styles.cardDate}>
                {new Date(m.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <StatusBadge statut={m.verification_status} small />
              <ChevronRight size={18} color={Colors.textTertiary} />
            </View>
          </Pressable>
        ))}
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
  tabs: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tabText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  tabTextActive: { fontFamily: 'Inter-Bold', color: Colors.primary },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  center: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  empty: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textTertiary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  cardPhone: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  cardDate: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
});
