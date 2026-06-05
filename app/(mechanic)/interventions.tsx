import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Wrench, CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useMechanicInterventions, updateInterventionStatut } from '@/hooks/useIntervention';
import { StatusBadge } from '@/components/StatusBadge';
import { useState, useEffect } from 'react';
import type { Mechanic, Intervention, InterventionStatut } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const STATUT_NEXT: Partial<Record<InterventionStatut, { label: string; next: InterventionStatut }>> = {
  acceptee:  { label: 'Partir vers le client', next: 'en_route' },
  en_route:  { label: 'Marquer arrivee',        next: 'arrivee' },
  arrivee:   { label: 'Demarrer intervention',  next: 'en_cours' },
  en_cours:  { label: 'Terminer intervention',  next: 'terminee' },
};

const STATUT_LABELS: Record<InterventionStatut, string> = {
  acceptee: 'Acceptee',
  en_route: 'En route',
  arrivee: 'Arrive',
  en_cours: 'En cours',
  terminee: 'Terminee',
  annulee: 'Annulee',
};

export default function MechanicInterventionsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const { interventions, loading, refetch } = useMechanicInterventions(mechanicId);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('mechanics').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setMechanicId(data.id); });
  }, [user]);

  const handleNext = async (intervention: Intervention) => {
    const transition = STATUT_NEXT[intervention.statut];
    if (!transition) return;
    setUpdatingId(intervention.id);
    try {
      await updateInterventionStatut(intervention.id, transition.next);
      await refetch();
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  };

  const active = interventions.filter(i => i.statut !== 'terminee' && i.statut !== 'annulee');
  const history = interventions.filter(i => i.statut === 'terminee' || i.statut === 'annulee');

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Mes interventions</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {loading && interventions.length === 0 && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {active.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>En cours ({active.length})</Text>
            {active.map(intervention => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onNext={() => handleNext(intervention)}
                updating={updatingId === intervention.id}
              />
            ))}
          </>
        )}

        {history.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Historique ({history.length})</Text>
            {history.map(intervention => (
              <InterventionCard key={intervention.id} intervention={intervention} />
            ))}
          </>
        )}

        {!loading && interventions.length === 0 && (
          <View style={styles.empty}>
            <Wrench size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aucune intervention</Text>
            <Text style={styles.emptyDesc}>Vos interventions acceptees apparaitront ici.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InterventionCard({
  intervention, onNext, updating,
}: {
  intervention: Intervention;
  onNext?: () => void;
  updating?: boolean;
}) {
  const transition = STATUT_NEXT[intervention.statut];
  const panne = intervention.panne;
  const isTerminee = intervention.statut === 'terminee';

  return (
    <View style={[styles.card, isTerminee && styles.cardDone]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          {isTerminee
            ? <CheckCircle size={20} color={Colors.success} />
            : <Clock size={20} color={Colors.primary} />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>
            {panne ? (panne.categorie.replace(/_/g, ' ')) : 'Intervention'}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(intervention.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <StatusBadge statut={intervention.statut} small />
          <Text style={styles.montant}>{intervention.montant.toLocaleString()} FCFA</Text>
        </View>
      </View>

      {transition && onNext && (
        <Pressable
          style={[styles.nextBtn, updating && styles.nextBtnDisabled]}
          onPress={onNext}
          disabled={updating}
        >
          {updating
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : null
          }
          <Text style={styles.nextBtnText}>{transition.label}</Text>
        </Pressable>
      )}
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
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.md },
  center: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text, marginTop: Spacing.sm },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  emptyDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  cardDone: { opacity: 0.75 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  cardLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text, textTransform: 'capitalize' },
  cardDate: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  montant: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.primary },
  nextBtn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: Spacing.sm,
  },
  nextBtnDisabled: { backgroundColor: Colors.disabled },
  nextBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.textInverse },
});
