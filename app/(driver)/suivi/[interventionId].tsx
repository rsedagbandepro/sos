import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, MapPin, Clock, Navigation, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { useIntervention } from '@/hooks/useIntervention';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

const CATEGORIE_LABELS: Record<string, string> = {
  flat_tire: 'Crevaison', dead_battery: 'Batterie à plat', engine_failure: 'Panne moteur',
  towing: 'Remorquage', locked_out: 'Clés perdues', other: 'Autre',
};

const STATUT_STEPS = [
  { key: 'acceptee',  label: 'Offre acceptée',    done: (s: string) => ['acceptee','en_route','arrivee','en_cours','terminee'].includes(s) },
  { key: 'en_route',  label: 'Mécanicien en route', done: (s: string) => ['en_route','arrivee','en_cours','terminee'].includes(s) },
  { key: 'arrivee',   label: 'Mécanicien arrivé',  done: (s: string) => ['arrivee','en_cours','terminee'].includes(s) },
  { key: 'en_cours',  label: 'Intervention en cours', done: (s: string) => ['en_cours','terminee'].includes(s) },
  { key: 'terminee',  label: 'Panne résolue',       done: (s: string) => s === 'terminee' },
];

export default function SuiviScreen() {
  const { interventionId } = useLocalSearchParams<{ interventionId: string }>();
  const insets = useSafeAreaInsets();
  const { intervention, loading } = useIntervention(interventionId ?? null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!loading && intervention?.statut === 'terminee') {
      router.replace(`/(driver)/paiement/${interventionId}`);
    }
  }, [intervention?.statut, loading, interventionId]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await supabase.from('interventions').update({ statut: 'annulee' }).eq('id', interventionId);
      if (intervention?.panne_id) {
        await supabase.from('pannes').update({ statut: 'annulee' }).eq('id', intervention.panne_id);
      }
      router.replace('/(driver)');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!intervention) {
    return <View style={styles.center}><Text style={styles.errorText}>Intervention introuvable</Text></View>;
  }

  const mec = intervention.mechanic;
  const isCancelled = intervention.statut === 'annulee';

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.replace('/(driver)')} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Suivi intervention</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status steps */}
        <View style={styles.stepsCard}>
          {STATUT_STEPS.map((step, i) => {
            const done = step.done(intervention.statut);
            const current = intervention.statut === step.key;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                  {done && !current && <CheckCircle size={14} color={Colors.textInverse} />}
                  {current && <View style={styles.stepDotInner} />}
                </View>
                {i < STATUT_STEPS.length - 1 && (
                  <View style={[styles.stepLine, done && styles.stepLineDone]} />
                )}
                <Text style={[styles.stepLabel, done && styles.stepLabelDone, current && styles.stepLabelCurrent]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Mechanic info */}
        {mec && (
          <View style={styles.mechCard}>
            <Avatar uri={mec.avatar_url} name={mec.business_name} size={52} />
            <View style={styles.mechInfo}>
              <Text style={styles.mechName}>{mec.business_name || 'Mécanicien'}</Text>
              <View style={styles.statusRow}>
                <StatusBadge statut={intervention.statut} small />
              </View>
            </View>
            <Pressable
              style={styles.callBtn}
              onPress={() => Linking.openURL('tel:' + mec.phone)}>
              <Phone size={20} color={Colors.textInverse} />
            </Pressable>
          </View>
        )}

        {/* Intervention details */}
        {intervention.panne && (
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <MapPin size={16} color={Colors.textSecondary} />
              <Text style={styles.detailLabel}>Panne</Text>
              <Text style={styles.detailValue}>{CATEGORIE_LABELS[intervention.panne.categorie]}</Text>
            </View>
            <View style={styles.detailRow}>
              <Navigation size={16} color={Colors.textSecondary} />
              <Text style={styles.detailLabel}>Montant</Text>
              <Text style={styles.detailValue}>{intervention.montant.toLocaleString('fr-FR')} FCFA</Text>
            </View>
          </View>
        )}

        {!isCancelled && intervention.statut !== 'terminee' && (
          <Pressable style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
            <XCircle size={18} color={Colors.error} />
            <Text style={styles.cancelBtnText}>Annuler l'intervention</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  stepsCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: 0,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: 0 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2,
    flexShrink: 0,
  },
  stepDotDone: { backgroundColor: Colors.success },
  stepDotCurrent: { backgroundColor: Colors.primary, borderWidth: 3, borderColor: Colors.primary + '40' },
  stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textInverse },
  stepLine: {
    position: 'absolute', left: 11, top: 26, width: 2, height: 32, backgroundColor: Colors.border,
  },
  stepLineDone: { backgroundColor: Colors.success },
  stepLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary, flex: 1, paddingBottom: Spacing.lg },
  stepLabelDone: { color: Colors.text },
  stepLabelCurrent: { fontFamily: 'Inter-Bold', color: Colors.primary },
  mechCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  mechInfo: { flex: 1, gap: Spacing.xs },
  mechName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  statusRow: { flexDirection: 'row' },
  callBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
  },
  detailCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary, flex: 1 },
  detailValue: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.errorLight, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.error,
  },
  cancelBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.error },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.error },
});
