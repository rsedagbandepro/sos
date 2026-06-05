import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, User, Phone, Building2 } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getCurrentPosition } from '@/lib/location';
import { useState } from 'react';

export default function OnboardingIdentiteScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    if (!phone) { setError('Le téléphone est obligatoire'); return; }
    if (!user) { setError('Utilisateur non authentifié'); return; }
    setSaving(true);
    setError(null);
    try {
      const coords = await getCurrentPosition();
      const { error: err } = await supabase.from('mechanics').upsert({
        user_id: user.id,
        business_name: businessName || null,
        phone,
        specializations: [],
        latitude: coords.latitude,
        longitude: coords.longitude,
        onboarding_step: 1,
        verification_status: 'incomplete',
      }, { onConflict: 'user_id' });
      if (err) throw err;
      router.push('/(mechanic)/onboarding/documents');
    } catch {
      setError('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.step}>Étape 1 / 3</Text>
        <Text style={styles.title}>Votre identité</Text>
        <Text style={styles.subtitle}>Informations professionnelles</Text>
      </View>
      <View style={styles.progress}><View style={[styles.progressBar, { width: '33%' }]} /></View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de l'entreprise / Atelier</Text>
          <View style={styles.inputRow}>
            <Building2 size={18} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName}
              placeholder="Garage Auto, Atelier mécanique..." placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Téléphone <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputRow}>
            <Phone size={18} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone}
              placeholder="+229 97 00 00 00" placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad" autoComplete="tel" />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable style={[styles.nextBtn, (!phone || saving) && styles.nextBtnDisabled]}
          onPress={handleNext} disabled={!phone || saving}>
          <Text style={styles.nextBtnText}>{saving ? 'Sauvegarde...' : 'Suivant'}</Text>
          <ArrowRight size={20} color={Colors.textInverse} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { paddingHorizontal: Spacing.lg, gap: Spacing.xs, paddingBottom: Spacing.md },
  step: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  title: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  progress: { height: 4, backgroundColor: Colors.border, marginHorizontal: Spacing.lg, borderRadius: 2 },
  progressBar: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  errorBox: { backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  inputGroup: { gap: Spacing.sm },
  label: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  required: { color: Colors.error },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
  },
  nextBtnDisabled: { backgroundColor: Colors.disabled },
  nextBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
