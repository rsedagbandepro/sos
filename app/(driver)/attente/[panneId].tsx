import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, Phone } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { StatusBadge } from '@/components/StatusBadge';
import { OffreCard } from '@/components/OffreCard';
import { useSinglePanne } from '@/hooks/usePannes';
import { useOffresForPanne } from '@/hooks/useOffres';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import type { Offre } from '@/lib/types';

const CATEGORIE_LABELS: Record<string, string> = {
  flat_tire: 'Crevaison', dead_battery: 'Batterie à plat', engine_failure: 'Panne moteur',
  towing: 'Remorquage', locked_out: 'Clés perdues', other: 'Autre',
};

export default function AttenteScreen() {
  const { panneId } = useLocalSearchParams<{ panneId: string }>();
  const insets = useSafeAreaInsets();
  const { panne, loading: panneLoading } = useSinglePanne(panneId ?? null);
  const { offres, loading: offresLoading, refetch } = useOffresForPanne(panneId ?? null);
  const [accepting, setAccepting] = useState<string | null>(null);

  const handleAccept = async (offre: Offre) => {
    if (!panne?.driver_id) {
      // Guest panne case - cannot create intervention without driver account
      alert('Créez un compte pour accepter une offre. Veuillez vous inscrire d\'abord.');
      router.push('/(auth)/signup');
      return;
    }
    setAccepting(offre.id);
    try {
      // Accept the offre
      await supabase.from('offres').update({ statut: 'accepted' }).eq('id', offre.id);
      // Reject other pending offres
      await supabase.from('offres').update({ statut: 'rejected' })
        .eq('panne_id', panneId).neq('id', offre.id);
      // Create intervention
      const { data: intervention, error } = await supabase
        .from('interventions')
        .insert({
          panne_id: panneId,
          offre_id: offre.id,
          mechanic_id: offre.mechanic_id,
          driver_id: panne.driver_id,
          montant: offre.prix,
          statut: 'acceptee',
        })
        .select()
        .single();
      if (error) throw error;
      // Update panne statut
      await supabase.from('pannes').update({ statut: 'offre_acceptee' }).eq('id', panneId);
      router.replace(`/(driver)/suivi/${intervention.id}`);
    } catch (e: any) {
      console.warn(e.message);
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (offreId: string) => {
    await supabase.from('offres').update({ statut: 'rejected' }).eq('id', offreId);
    refetch();
  };

  if (panneLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!panne) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Panne introuvable</Text>
      </View>
    );
  }

  const pendingOffres = offres.filter(o => o.statut === 'pending');

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.replace('/(driver)')} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Suivi de panne</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={offresLoading} onRefresh={refetch} tintColor={Colors.primary} />}>

        <View style={styles.panneCard}>
          <View style={styles.panneHeader}>
            <Text style={styles.panneType}>{CATEGORIE_LABELS[panne.categorie]}</Text>
            <StatusBadge statut={panne.statut} />
          </View>
          <View style={styles.panneMeta}>
            <MapPin size={14} color={Colors.textTertiary} />
            <Text style={styles.panneMetaText}>{panne.latitude.toFixed(4)}, {panne.longitude.toFixed(4)}</Text>
            <Clock size={14} color={Colors.textTertiary} />
            <Text style={styles.panneMetaText}>
              {new Date(panne.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {panne.description && <Text style={styles.panneDesc}>{panne.description}</Text>}
        </View>

        <View style={styles.offresSection}>
          <Text style={styles.sectionTitle}>
            Offres reçues ({pendingOffres.length})
          </Text>

          {offresLoading && offres.length === 0 ? (
            <View style={styles.waitingBlock}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.waitingText}>Recherche de mécaniciens à proximité...</Text>
            </View>
          ) : pendingOffres.length === 0 ? (
            <View style={styles.waitingBlock}>
              <Clock size={40} color={Colors.textTertiary} />
              <Text style={styles.waitingText}>En attente d'offres de mécaniciens...</Text>
              <Text style={styles.waitingSubtext}>Les mécaniciens proches sont notifiés de votre panne</Text>
            </View>
          ) : (
            pendingOffres.map(offre => (
              <OffreCard
                key={offre.id}
                offre={offre}
                onAccept={() => handleAccept(offre)}
                onReject={() => handleReject(offre.id)}
                readonly={accepting !== null}
              />
            ))
          )}
        </View>

        {offres.filter(o => o.statut === 'rejected').length > 0 && (
          <View style={styles.rejectedSection}>
            <Text style={styles.rejectedTitle}>Offres refusées</Text>
            {offres.filter(o => o.statut === 'rejected').map(offre => (
              <OffreCard key={offre.id} offre={offre} readonly />
            ))}
          </View>
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
  panneCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
    elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  panneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panneType: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXl, color: Colors.text },
  panneMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  panneMetaText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  panneDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  offresSection: { gap: Spacing.md },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  waitingBlock: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  waitingText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textSecondary, textAlign: 'center' },
  waitingSubtext: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary, textAlign: 'center' },
  rejectedSection: { gap: Spacing.sm },
  rejectedTitle: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.error },
});
