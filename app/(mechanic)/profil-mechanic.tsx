import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Star, Wrench, TrendingUp, MapPin, Clock, LogOut } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { useState, useEffect, useCallback } from 'react';
import type { Mechanic } from '@/lib/types';

const SPECIALISATIONS_LABELS: Record<string, string> = {
  battery: 'Batterie',
  tire: 'Pneus',
  engine: 'Moteur',
  towing: 'Remorquage',
  locks: 'Serrurerie',
  electrical: 'Electricite',
  bodywork: 'Carrosserie',
  aircon: 'Climatisation',
};

export default function MechanicProfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('mechanics').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setMechanic(data as Mechanic);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleAvailability = async () => {
    if (!mechanic || toggling) return;
    setToggling(true);
    const next = !mechanic.is_available;
    await supabase.from('mechanics').update({ is_available: next }).eq('id', mechanic.id);
    setMechanic(prev => prev ? { ...prev, is_available: next } : prev);
    setToggling(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Mon profil</Text>
        <Pressable onPress={signOut} style={styles.logoutBtn}>
          <LogOut size={20} color={Colors.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Avatar
            name={mechanic?.business_name ?? user?.email ?? '?'}
            size={80}
            uri={mechanic?.avatar_url ?? undefined}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{mechanic?.business_name || 'Mecanicien'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <StatusBadge statut={mechanic?.verification_status ?? 'incomplete'} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Star size={20} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.statValue}>{mechanic?.rating_avg?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.statLabel}>Note ({mechanic?.rating_count ?? 0})</Text>
          </View>
          <View style={styles.statItem}>
            <TrendingUp size={20} color={Colors.success} />
            <Text style={styles.statValue}>{mechanic?.total_revenue?.toLocaleString() ?? '0'}</Text>
            <Text style={styles.statLabel}>FCFA gagnes</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{mechanic?.experience_years ?? 0}</Text>
            <Text style={styles.statLabel}>ans exp.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilite</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>{mechanic?.is_available ? 'Disponible' : 'Hors ligne'}</Text>
              <Text style={styles.rowDesc}>
                {mechanic?.is_available
                  ? 'Vous recevez de nouvelles pannes'
                  : 'Vous ne recevez pas de pannes'}
              </Text>
            </View>
            <Switch
              value={mechanic?.is_available ?? false}
              onValueChange={toggleAvailability}
              trackColor={{ false: Colors.border, true: Colors.success + '80' }}
              thumbColor={mechanic?.is_available ? Colors.success : Colors.textTertiary}
              disabled={toggling}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Telephone</Text>
            <Text style={styles.infoValue}>{mechanic?.phone ?? '—'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MapPin size={14} color={Colors.textTertiary} />
            <Text style={styles.infoValue}>Rayon: {mechanic?.intervention_radius_km ?? 30} km</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialites</Text>
          <View style={styles.chipsWrap}>
            {(mechanic?.specializations ?? []).map(s => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{SPECIALISATIONS_LABELS[s] ?? s}</Text>
              </View>
            ))}
            {(mechanic?.specializations ?? []).length === 0 && (
              <Text style={styles.noChips}>Aucune specialite configuree</Text>
            )}
          </View>
        </View>

        {mechanic?.verification_status === 'rejected' && mechanic.rejection_reason && (
          <View style={styles.rejectedBox}>
            <Text style={styles.rejectedTitle}>Dossier rejete</Text>
            <Text style={styles.rejectedReason}>{mechanic.rejection_reason}</Text>
            <Pressable
              style={styles.resubmitBtn}
              onPress={() => router.push('/(mechanic)/onboarding')}
            >
              <Text style={styles.resubmitText}>Soumettre a nouveau</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  title: { flex: 1, fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  logoutBtn: { padding: Spacing.sm },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl, paddingTop: Spacing.md },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  profileInfo: { flex: 1, gap: Spacing.xs },
  profileName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  profileEmail: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  statsGrid: {
    flexDirection: 'row', gap: Spacing.sm,
  },
  statItem: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary, textAlign: 'center' },
  section: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  rowDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary, marginTop: 2 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary, width: 80 },
  infoValue: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
  },
  chipText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.primary },
  noChips: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary },
  rejectedBox: {
    backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.error, gap: Spacing.md,
  },
  rejectedTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.error },
  rejectedReason: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text },
  resubmitBtn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, alignItems: 'center',
  },
  resubmitText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.textInverse },
});
