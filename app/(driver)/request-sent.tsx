import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useBreakdownRequest } from '@/hooks/useBreakdownRequest';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useConnectivity } from '@/hooks/useConnectivity';
import { Clock, MapPin, Phone, Star, Wrench, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import type { Mechanic } from '@/lib/types';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: 'En attente de mécanicien', color: Colors.warning, icon: Clock },
  accepted: { label: 'Mécanicien trouvé !', color: Colors.success, icon: CheckCircle },
  in_progress: { label: 'Le mécanicien arrive', color: Colors.accent, icon: Navigation },
  resolved: { label: 'Panne résolue', color: Colors.success, icon: CheckCircle },
  cancelled: { label: 'Demande annulée', color: Colors.error, icon: XCircle },
};

const BREAKDOWN_LABELS: Record<string, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie à plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Clés perdues',
  other: 'Autre',
};

export default function RequestSentScreen() {
  const { requestId, offline } = useLocalSearchParams<{
    requestId?: string;
    offline?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const { request, loading, error } = useBreakdownRequest(requestId || null);
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Fetch mechanic details when accepted
  useEffect(() => {
    if (!request?.accepted_by) return;
    supabase
      .from('mechanics')
      .select('*')
      .eq('id', request.accepted_by)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMechanic(data as Mechanic);
      });
  }, [request?.accepted_by]);

  const handleSubmitRating = async () => {
    if (!request || !mechanic || rating === 0) return;
    try {
      const { error: ratingError } = await supabase.from('ratings').insert({
        request_id: request.id,
        mechanic_id: mechanic.id,
        score: rating,
      });
      if (ratingError) throw ratingError;
      setRatingSubmitted(true);
    } catch {
      // Rating failure is non-critical
    }
  };

  if (offline === 'true') {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top + Spacing.xxl }]}>
          <View style={styles.offlineCard}>
            <AlertCircle size={48} color={Colors.warning} />
            <Text style={styles.offlineTitle}>Demande enregistrée</Text>
            <Text style={styles.offlineMessage}>
              Votre demande SOS a été enregistrée. Elle sera envoyée automatiquement
              dès que la connexion internet sera rétablie.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (loading && !request) {
    return <LoadingSpinner message="Chargement de votre demande..." />;
  }

  if (error || !request) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>
            {error || 'Demande introuvable'}
          </Text>
          <Pressable style={styles.homeButton} onPress={() => router.replace('/(driver)')}>
            <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.bannerWrapper}>
          <OfflineBanner visible={!isOnline} />
        </View>
      )}

      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.statusCard}>
          <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.color + '20' }]}>
            <StatusIcon size={40} color={statusConfig.color} />
          </View>
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
          {request.status === 'pending' && (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
          )}
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Wrench size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Type de panne</Text>
            <Text style={styles.detailValue}>
              {BREAKDOWN_LABELS[request.breakdown_type] || request.breakdown_type}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Position</Text>
            <Text style={styles.detailValue}>
              {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Phone size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Téléphone</Text>
            <Text style={styles.detailValue}>{request.driver_phone}</Text>
          </View>
        </View>

        {mechanic && (
          <View style={styles.mechanicCard}>
            <Text style={styles.mechanicTitle}>Votre mécanicien</Text>
            <Text style={styles.mechanicName}>
              {mechanic.business_name || 'Mécanicien'}
            </Text>
            <View style={styles.mechanicMeta}>
              <Star size={16} color={Colors.accent} />
              <Text style={styles.mechanicRating}>
                {mechanic.rating_avg.toFixed(1)} ({mechanic.rating_count} avis)
              </Text>
            </View>
            {request.status === 'accepted' || request.status === 'in_progress' ? (
              <Pressable
                style={styles.callButton}
                onPress={() => Linking.openURL('tel:' + mechanic.phone)}
                accessibilityLabel="Appeler le mécanicien"
              >
                <Phone size={18} color={Colors.textInverse} />
                <Text style={styles.callButtonText}>Appeler {mechanic.phone}</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {request.status === 'resolved' && mechanic && !ratingSubmitted && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Évaluez le service</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setRating(s)} accessibilityLabel={`${s} étoiles`}>
                  <Star
                    size={36}
                    color={s <= rating ? Colors.accent : Colors.border}
                    fill={s <= rating ? Colors.accent : 'none'}
                  />
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <Pressable style={styles.rateButton} onPress={handleSubmitRating}>
                <Text style={styles.rateButtonText}>Envoyer l'évaluation</Text>
              </Pressable>
            )}
          </View>
        )}

        {ratingSubmitted && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Merci pour votre évaluation !</Text>
          </View>
        )}

        <Pressable
          style={styles.homeButton}
          onPress={() => router.replace('/(driver)')}
        >
          <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bannerWrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  offlineCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.warning,
    alignItems: 'center',
    gap: Spacing.md,
  },
  offlineTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXl,
    color: Colors.text,
  },
  offlineMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSizeMd * Typography.lineHeightBody,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    textAlign: 'center',
  },
  spinner: {
    marginTop: Spacing.sm,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
  },
  mechanicCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.success,
    gap: Spacing.sm,
  },
  mechanicTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mechanicName: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.text,
  },
  mechanicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mechanicRating: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  callButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.textInverse,
  },
  ratingCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.md,
  },
  ratingTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.text,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rateButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  rateButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.textInverse,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.error,
    textAlign: 'center',
  },
  homeButton: {
    backgroundColor: Colors.surfaceDark,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  homeButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.secondary,
  },
});
