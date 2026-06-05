import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Clock } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { useState, useEffect, useCallback } from 'react';
import type { Panne, PanneCategorie } from '@/lib/types';

const CATEGORIE_LABELS: Record<PanneCategorie, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie a plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Cles perdues',
  other: 'Autre',
};

export default function AdminPannesScreen() {
  const insets = useSafeAreaInsets();
  const [pannes, setPannes] = useState<Panne[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pannes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setPannes((data as Panne[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Pannes</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        {loading && pannes.length === 0 && (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        )}

        {!loading && pannes.length === 0 && (
          <View style={styles.empty}><Text style={styles.emptyText}>Aucune panne</Text></View>
        )}

        {pannes.map(p => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.categLabel}>{CATEGORIE_LABELS[p.categorie] ?? p.categorie}</Text>
              <StatusBadge statut={p.statut} small />
            </View>
            <View style={styles.metaRow}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.meta}>
                {new Date(p.created_at).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={12} color={Colors.textTertiary} />
              <Text style={styles.meta}>{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</Text>
            </View>
            {p.description && (
              <Text style={styles.desc} numberOfLines={2}>{p.description}</Text>
            )}
          </View>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm, paddingTop: Spacing.sm },
  center: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  empty: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textTertiary },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  meta: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  desc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
});
