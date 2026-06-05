import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Phone, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
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
      await signUp(email, password, fullName, phone || undefined);
      // Le root layout redirige après chargement de la session
    } catch {
      setError('Impossible de créer le compte. Vérifiez vos informations.');
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
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg },
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
