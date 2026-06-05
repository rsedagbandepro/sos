import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Phone, ArrowLeft, Siren, Wrench, ArrowRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/types';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [role, setRole] = useState<UserRole>('driver');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!email || !password || !fullName) { setError('Remplissez tous les champs obligatoires'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return; }
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, role, fullName, phone || undefined);
      // Root layout will redirect after session loads
    } catch (e: any) {
      setError(e.message || 'Impossible de créer le compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Créer un compte</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={styles.sectionLabel}>Je suis un(e)</Text>
        <View style={styles.roleRow}>
          <Pressable style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
            onPress={() => setRole('driver')}>
            <Siren size={28} color={role === 'driver' ? Colors.textInverse : Colors.primary} />
            <Text style={[styles.roleLabel, role === 'driver' && styles.roleLabelActive]}>Conducteur</Text>
            <Text style={[styles.roleDesc, role === 'driver' && styles.roleDescActive]}>Je signale une panne</Text>
          </Pressable>
          <Pressable style={[styles.roleCard, role === 'mechanic' && styles.roleCardActiveMec]}
            onPress={() => setRole('mechanic')}>
            <Wrench size={28} color={role === 'mechanic' ? Colors.textInverse : Colors.secondary} />
            <Text style={[styles.roleLabel, role === 'mechanic' && styles.roleLabelActive]}>Mécanicien</Text>
            <Text style={[styles.roleDesc, role === 'mechanic' && styles.roleDescActive]}>Je répare des pannes</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <User size={18} color={Colors.textTertiary} />
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
                placeholder="Prénom Nom" placeholderTextColor={Colors.textTertiary} autoComplete="name" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <Mail size={18} color={Colors.textTertiary} />
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="votre@email.com" placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputRow}>
              <Phone size={18} color={Colors.textTertiary} />
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="+229 97 00 00 00" placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad" autoComplete="tel" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <Lock size={18} color={Colors.textTertiary} />
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                placeholder="6 caractères minimum" placeholderTextColor={Colors.textTertiary}
                secureTextEntry autoComplete="new-password" />
            </View>
          </View>

          <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSignup} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Création...' : 'Créer mon compte'}</Text>
            <ArrowRight size={20} color={Colors.textInverse} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  sectionLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  roleRow: { flexDirection: 'row', gap: Spacing.md },
  roleCard: {
    flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.xl,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center', gap: Spacing.sm,
  },
  roleCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleCardActiveMec: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  roleLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  roleLabelActive: { color: Colors.textInverse },
  roleDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textSecondary, textAlign: 'center' },
  roleDescActive: { color: Colors.textInverse + 'cc' },
  form: { gap: Spacing.lg },
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
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
    elevation: 3, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  submitBtnDisabled: { backgroundColor: Colors.disabled, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
