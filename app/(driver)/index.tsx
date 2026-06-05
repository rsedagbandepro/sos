import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SOSButton } from '@/components/SOSButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useDriverRequests } from '@/hooks/useBreakdownRequest';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clock, MapPin, ChevronRight } from 'lucide-react-native';
import type { BreakdownRequest } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Mécanicien trouvé',
  in_progress: 'En route',
  resolved: 'Résolu',
  cancelled: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  accepted: Colors.secondaryLight,
  in_progress: Colors.accent,
  resolved: Colors.success,
  cancelled: Colors.textTertiary,
};

export default function DriverHome() {
  const { isOnline } = useConnectivity();
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const { requests, loading } = useDriverRequests(driverPhone || '');

  useEffect(() => {
    AsyncStorage.getItem('sos_panne_driver_phone').then((phone) => {
      if (phone) setDriverPhone(phone);
    });
  }, []);

  const activeRequests = requests.filter(
    (r: BreakdownRequest) =>
      r.status === 'pending' || r.status === 'accepted' || r.status === 'in_progress'
  );

  const handleSOSPress = () => {
    router.push('/(driver)/breakdown-type');
  };

  const handleRequestPress = (requestId: string) => {
    router.push(`/(driver)/request-sent?requestId=${requestId}`);
  };

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.bannerWrapper}>
          <OfflineBanner visible={!isOnline} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Besoin d'aide ?</Text>
          <Text style={styles.subtitle}>
            Appuyez sur le bouton SOS pour signaler votre panne
          </Text>
        </View>

        <View style={styles.sosContainer}>
          <SOSButton onPress={handleSOSPress} />
        </View>

        {activeRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.sectionTitle}>Demandes en cours</Text>
            {activeRequests.map((req: BreakdownRequest) => (
              <Pressable
                key={req.id}
                style={styles.requestCard}
                onPress={() => handleRequestPress(req.id)}
              >
                <View style={styles.requestInfo}>
                  <View style={styles.requestHeader}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: STATUS_COLORS[req.status] || Colors.textTertiary },
                      ]}
                    />
                    <Text style={styles.requestStatus}>
                      {STATUS_LABELS[req.status] || req.status}
                    </Text>
                  </View>
                  <View style={styles.requestMeta}>
                    <Clock size={14} color={Colors.textTertiary} />
                    <Text style={styles.requestMetaText}>
                      {new Date(req.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <MapPin size={14} color={Colors.textTertiary} />
                    <Text style={styles.requestMetaText}>
                      {req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}

        {driverPhone && activeRequests.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Aucune demande en cours. Appuyez sur SOS si vous êtes en panne.
            </Text>
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXxl,
    color: Colors.text,
    lineHeight: Typography.fontSizeXxl * Typography.lineHeightHeading,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: Typography.fontSizeMd * Typography.lineHeightBody,
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  requestsSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  requestInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  requestStatus: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  requestMetaText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.textTertiary,
  },
  emptyState: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: Typography.fontSizeMd * Typography.lineHeightBody,
  },
});
