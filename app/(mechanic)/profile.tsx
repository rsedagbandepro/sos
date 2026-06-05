import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Star,
  Phone,
  Building2,
  MapPin,
  ToggleLeft,
  LogOut,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import type { Mechanic } from '@/lib/types';

const SPECIALIZATION_LABELS: Record<string, string> = {
  battery: 'Batterie',
  tire: 'Pneus',
  engine: 'Moteur',
  towing: 'Remorquage',
  locks: 'Serrurerie',
  electrical: 'Electricite',
};

export default function MechanicProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('mechanics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMechanic(data as Mechanic);
        });
    }
  }, [user]);

  const toggleAvailability = async () => {
    if (!mechanic) return;
    const newAvailability = !mechanic.is_available;
    try {
      const { error } = await supabase
        .from('mechanics')
        .update({ is_available: newAvailability })
        .eq('id', mechanic.id);

      if (error) throw error;
      setMechanic({ ...mechanic, is_available: newAvailability });
    } catch {
      Alert.alert('Erreur', 'Impossible de changer la disponibilité');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(mechanic)/login');
          } catch {
            // Continue even if signOut fails
          }
        },
      },
    ]);
  };

  if (!mechanic) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Mon profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Building2 size={32} color={Colors.primary} />
          </View>
          <Text style={styles.businessName}>
            {mechanic.business_name || 'Mecanicien'}
          </Text>
          <View style={styles.ratingRow}>
            <Star size={18} color={Colors.accent} fill={Colors.accent} />
            <Text style={styles.ratingText}>
              {mechanic.rating_avg.toFixed(1)} ({mechanic.rating_count} avis)
            </Text>
          </View>
          {mechanic.is_verified && (
            <View style={styles.verifiedBadge}>
              <Check size={14} color={Colors.textInverse} />
              <Text style={styles.verifiedText}>Verifie</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Phone size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Telephone</Text>
            <Text style={styles.detailValue}>{mechanic.phone}</Text>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={18} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Position</Text>
            <Text style={styles.detailValue}>
              {mechanic.latitude.toFixed(4)}, {mechanic.longitude.toFixed(4)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialites</Text>
          <View style={styles.specsList}>
            {mechanic.specializations.map((spec) => (
              <View key={spec} style={styles.specBadge}>
                <Text style={styles.specBadgeText}>
                  {SPECIALIZATION_LABELS[spec] || spec}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilite</Text>
          <View style={styles.availabilityRow}>
            <ToggleLeft size={20} color={Colors.textSecondary} />
            <Text style={styles.availabilityLabel}>
              {mechanic.is_available ? 'Disponible' : 'Indisponible'}
            </Text>
            <Switch
              value={mechanic.is_available}
              onValueChange={toggleAvailability}
              trackColor={{ false: Colors.border, true: Colors.success }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Deconnexion</Text>
        </Pressable>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXl,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXs,
    color: Colors.textInverse,
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
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.text,
  },
  specsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specBadge: {
    backgroundColor: Colors.secondaryLight + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  specBadgeText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.secondary,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availabilityLabel: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    paddingVertical: Spacing.md + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.error,
  },
});
