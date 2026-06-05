import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getCurrentPosition } from '@/lib/location';
import {
  Wrench,
  Phone,
  MapPin,
  Building2,
  ArrowLeft,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { DEFAULT_LOCATION } from '@/constants/breakdownTypes';

const SPECIALIZATIONS = [
  { key: 'battery', label: 'Batterie' },
  { key: 'tire', label: 'Pneus' },
  { key: 'engine', label: 'Moteur' },
  { key: 'towing', label: 'Remorquage' },
  { key: 'locks', label: 'Serrurerie' },
  { key: 'electrical', label: 'Électricité' },
];

export default function MechanicRegisterScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if mechanic profile already exists
  useState(() => {
    if (user) {
      supabase
        .from('mechanics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            router.replace('/(mechanic)/dashboard');
          } else {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
  });

  const toggleSpec = (key: string) => {
    setSelectedSpecs((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!phone || selectedSpecs.length === 0) {
      Alert.alert('Erreur', 'Remplissez le téléphone et sélectionnez au moins une spécialité');
      return;
    }

    setSubmitting(true);
    try {
      const coords = await getCurrentPosition();

      const { error: insertError } = await supabase.from('mechanics').insert({
        user_id: user!.id,
        business_name: businessName || null,
        phone,
        specializations: selectedSpecs,
        latitude: coords.latitude,
        longitude: coords.longitude,
        is_available: true,
      });

      if (insertError) throw insertError;
      router.replace('/(mechanic)/dashboard');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer le profil');
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
          <Text style={styles.title}>Votre profil</Text>
          <Text style={styles.subtitle}>
            Complétez votre profil pour recevoir des demandes
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom de l'entreprise</Text>
            <View style={styles.inputRow}>
              <Building2 size={20} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Garage, atelier..."
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputRow}>
              <Phone size={20} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+229 97 00 00 00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Spécialités</Text>
            <Text style={styles.helperText}>
              Sélectionnez vos domaines d'expertise
            </Text>
            <View style={styles.specsGrid}>
              {SPECIALIZATIONS.map((spec) => {
                const selected = selectedSpecs.includes(spec.key);
                return (
                  <Pressable
                    key={spec.key}
                    style={[styles.specChip, selected && styles.specChipSelected]}
                    onPress={() => toggleSpec(spec.key)}
                  >
                    {selected && <Check size={16} color={Colors.textInverse} />}
                    <Text
                      style={[
                        styles.specChipText,
                        selected && styles.specChipTextSelected,
                      ]}
                    >
                      {spec.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.locationNote}>
            <MapPin size={18} color={Colors.success} />
            <Text style={styles.locationNoteText}>
              Votre position sera utilisée pour les demandes à proximité
            </Text>
          </View>

          <Pressable
            style={[
              styles.submitButton,
              (!phone || selectedSpecs.length === 0 || submitting) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!phone || selectedSpecs.length === 0 || submitting}
          >
            <Wrench size={20} color={Colors.textInverse} />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Création...' : 'Créer mon profil'}
            </Text>
          </Pressable>
        </View>
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
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.textTertiary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  specChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  specChipText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
  },
  specChipTextSelected: {
    color: Colors.textInverse,
    fontFamily: 'Inter-Bold',
  },
  locationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  locationNoteText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    flex: 1,
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: Colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.textInverse,
  },
});
