import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { DEFAULT_LOCATION } from '@/constants/breakdownTypes';
import { getCurrentPosition } from '@/lib/location';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { enqueueAction } from '@/lib/offlineQueue';
import { useConnectivity } from '@/hooks/useConnectivity';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LocationConfirmScreen() {
  const { type, phone, name } = useLocalSearchParams<{
    type: string;
    phone: string;
    name?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const [coords, setCoords] = useState({ latitude: DEFAULT_LOCATION.latitude, longitude: DEFAULT_LOCATION.longitude });
  const [locating, setLocating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentPosition().then((position) => {
      setCoords(position);
      setLocating(false);
    });
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      if (isOnline) {
        const { data, error: insertError } = await supabase
          .from('breakdown_requests')
          .insert({
            driver_phone: phone,
            driver_name: name || null,
            latitude: coords.latitude,
            longitude: coords.longitude,
            breakdown_type: type,
            status: 'pending',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        router.replace(`/(driver)/request-sent?requestId=${data.id}`);
      } else {
        // Queue for later when online
        await enqueueAction('create_breakdown_request', {
          driver_phone: phone,
          driver_name: name || null,
          latitude: coords.latitude,
          longitude: coords.longitude,
          breakdown_type: type,
          status: 'pending',
        });

        await AsyncStorage.setItem('sos_panne_pending_type', type);
        await AsyncStorage.setItem('sos_panne_pending_phone', phone);
        if (name) await AsyncStorage.setItem('sos_panne_pending_name', name);

        // Show a local "pending" screen
        router.replace('/(driver)/request-sent?offline=true');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de l\'envoi. Réessayez.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Confirmez votre position</Text>
          <Text style={styles.subtitle}>
            Nous utilisons votre position pour trouver les mécaniciens à proximité
          </Text>
        </View>
      </View>

      <View style={styles.mapPlaceholder}>
        {locating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Localisation en cours...</Text>
          </View>
        ) : (
          <View style={styles.coordsDisplay}>
            <Navigation size={32} color={Colors.primary} />
            <Text style={styles.coordsText}>
              {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </Text>
            <Text style={coords.latitude === DEFAULT_LOCATION.latitude ? styles.fallbackText : styles.confirmedText}>
              {coords.latitude === DEFAULT_LOCATION.latitude
                ? 'Position par défaut (Cotonou)'
                : 'Position GPS détectée'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineText}>
              Hors ligne — votre demande sera envoyée quand la connexion revient
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.confirmButton, (locating || submitting) && styles.confirmButtonDisabled]}
          onPress={handleSubmit}
          disabled={locating || submitting}
          accessibilityLabel="Envoyer la demande"
          accessibilityRole="button"
        >
          <MapPin size={20} color={Colors.textInverse} />
          <Text style={styles.confirmButtonText}>
            {submitting ? 'Envoi en cours...' : 'Envoyer la demande SOS'}
          </Text>
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXl,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: Typography.fontSizeSm * Typography.lineHeightBody,
  },
  mapPlaceholder: {
    flex: 1,
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  coordsDisplay: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coordsText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.text,
  },
  confirmedText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.success,
  },
  fallbackText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.warning,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.error,
    textAlign: 'center',
  },
  offlineNotice: {
    backgroundColor: Colors.warningLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  offlineText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 4,
    borderRadius: BorderRadius.lg,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.textInverse,
  },
});
