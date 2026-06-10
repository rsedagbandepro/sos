import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Phone, ArrowLeft, ArrowRight, Car, Wrench, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

type UserRole = 'driver' | 'mechanic';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('driver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!email || !password || !fullName) { setError('Remplissez tous les champs obligatoires'); return; }
    if (password.length < 6) { setError('Mot de passe : 6 caracteres minimum'); return; }
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, fullName, phone || undefined, role);
      router.replace('/');
    } catch {
      setError('Impossible de creer le compte. Verifiez vos informations.');
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
        <Text style={styles.topTitle}>Creer un compte</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.form}>
          {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          {/* Role Selector */}
          <View style={styles.roleSection}>
            <Text style={styles.label}>Je suis...</Text>
            <View style={styles.roleCards}>
              <Pressable
                style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
                onPress={() => setRole('driver')}>
                <View style={[styles.roleIconWrap, role === 'driver' && styles.roleIconActive]}>
                  <Car size={28} color={role === 'driver' ? Colors.primary : Colors.textSecondary} />
                </View>
                <Text style={[styles.roleTitle, role === 'driver' && styles.roleTitleActive]}>Conducteur</Text>
                <Text style={styles.roleDesc}>Acces immediat</Text>
                {role === 'driver' && (
                  <View style={styles.roleCheck}>
                    <CheckCircle size={16} color={Colors.primary} />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={[styles.roleCard, role === 'mechanic' && styles.roleCardActive]}
                onPress={() => setRole('mechanic')}>
                <View style={[styles.roleIconWrap, role === 'mechanic' && styles.roleIconActive]}>
                  <Wrench size={28} color={role === 'mechanic' ? Colors.primary : Colors.textSecondary} />
                </View>
                <Text style={[styles.roleTitle, role === 'mechanic' && styles.roleTitleActive]}>Mecanicien</Text>
                <Text style={styles.roleDesc}>Validation admin</Text>
                {role === 'mechanic' && (
                  <View style={styles.roleCheck}>
                    <CheckCircle size={16} color={Colors.primary} />
                  </View>
                )}
              </Pressable>
            </View>
            {role === 'mechanic' && (
              <View style={styles.roleNotice}>
                <Text style={styles.roleNoticeText}>
                  Votre compte necessite une validation par un administrateur avant utilisation.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <User size={18} color={Colors.textTertiary} />
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
                placeholder="Prenom Nom" placeholderTextColor={Colors.textTertiary} autoComplete="name" />
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
            <Text style={styles.label}>Telephone</Text>
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
                placeholder="6 caracteres minimum" placeholderTextColor={Colors.textTertiary}
                secureTextEntry autoComplete="new-password" />
            </View>
          </View>

          <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSignup} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Creation...' : 'Creer mon compte'}</Text>
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
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg },
  form: { gap: Spacing.lg },
  errorBox: { backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  roleSection: { gap: Spacing.md },
  label: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  roleCards: { flexDirection: 'row', gap: Spacing.md },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  roleIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  roleIconActive: {
    backgroundColor: Colors.primaryLight,
  },
  roleTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  roleTitleActive: { color: Colors.primary },
  roleDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary, marginTop: 2 },
  roleCheck: { position: 'absolute', top: 8, right: 8 },
  roleNotice: {
    backgroundColor: Colors.warningLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  roleNoticeText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text, textAlign: 'center' },
  inputGroup: { gap: Spacing.sm },
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
