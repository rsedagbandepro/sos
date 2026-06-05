import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useBreakdownRequest, updateRequestStatus } from '@/hooks/useBreakdownRequest';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  MapPin,
  Phone,
  Navigation,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Clock,
  Wrench,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import type { Mechanic } from '@/lib/types';

const BREAKDOWN_LABELS: Record<string, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie à plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Clés perdues',
  other: 'Autre',
};

export default function ActiveRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const insets = useSafeAreaInsets();
  const { request, loading, error } = useBreakdownRequest(requestId);
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);

  useEffect(() => {
    if (request?.accepted_by && !mechanic) {
      supabase
        .from('mechanics')
        .select('*')
        .eq('id', request.accepted_by)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMechanic(data as Mechanic);
        });
    }
  }, [request?.accepted_by]);

  const handleStartProgress = async () => {
    try {
      await updateRequestStatus(requestId, 'in_progress');
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const handleResolve = async () => {
    try {
      await updateRequestStatus(requestId, 'resolved');
      Alert.alert('Terminé', 'La demande a été marquée comme résolue');
      router.back();
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Annuler',
      'Voulez-vous vraiment annuler cette demande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateRequestStatus(requestId, 'cancelled');
              router.back();
            } catch {
              Alert.alert('Erreur', 'Impossible d\'annuler');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner message="Chargement..." />;
  if (error || !request) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Demande introuvable'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Détails de la demande</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              request.status === 'accepted' && styles.statusBadgeAccepted,
              request.status === 'in_progress' && styles.statusBadgeProgress,
            ]}
          >
            {request.status === 'accepted' && <CheckCircle size={20} color={Colors.success} />}
            {request.status === 'in_progress' && <Navigation size={20} color={Colors.accent} />}
            <Text
              style={[
                styles.statusText,
                request.status === 'accepted' && styles.statusTextAccepted,
                request.status === 'in_progress' && styles.statusTextProgress,
              ]}
            >
              {request.status === 'accepted' ? 'Acceptée' : 'En route'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Wrench size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>
              {BREAKDOWN_LABELS[request.breakdown_type] || request.breakdown_type}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Phone size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Conducteur</Text>
            <Text style={styles.detailValue}>{request.driver_phone}</Text>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Position</Text>
            <Text style={styles.detailValue}>
              {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Heure</Text>
            <Text style={styles.detailValue}>
              {new Date(request.created_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {request.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{request.description}</Text>
            </View>
          )}
        </View>

        {request.status === 'accepted' && (
          <Pressable style={styles.actionButton} onPress={handleStartProgress}>
            <Navigation size={20} color={Colors.textInverse} />
            <Text style={styles.actionButtonText}>Je suis en route</Text>
          </Pressable>
        )}

        {request.status === 'in_progress' && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, styles.resolveButton]}
              onPress={handleResolve}
            >
              <CheckCircle size={20} color={Colors.textInverse} />
              <Text style={styles.actionButtonText}>Panne résolue</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
            >
              <XCircle size={20} color={Colors.textInverse} />
              <Text style={styles.actionButtonText}>Annuler</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBack: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.error,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  backButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.textInverse,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  statusSection: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceDark,
  },
  statusBadgeAccepted: {
    backgroundColor: Colors.successLight,
  },
  statusBadgeProgress: {
    backgroundColor: Colors.accentLight + '40',
  },
  statusText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  statusTextAccepted: {
    color: Colors.success,
  },
  statusTextProgress: {
    color: Colors.accentDark,
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
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  descriptionLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  descriptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
    lineHeight: Typography.fontSizeMd * Typography.lineHeightBody,
  },
  actionRow: {
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md + 4,
    borderRadius: BorderRadius.lg,
    elevation: 3,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  resolveButton: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  cancelButton: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
  },
  actionButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.textInverse,
  },
});
