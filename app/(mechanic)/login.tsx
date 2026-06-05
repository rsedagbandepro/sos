import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Wrench, Mail, Lock, ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MechanicLoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        Alert.alert(
          'Compte créé',
          'Votre compte a été créé. Vous pouvez maintenant compléter votre profil.'
        );
      } else {
        await signIn(email, password);
      }
      router.replace('/(mechanic)/dashboard');
    } catch (err: any) {
      Alert.alert(
        'Erreur',
        err.message || 'Impossible de se connecter'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xxxl }]}>
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Wrench size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>
            {isSignUp ? 'Créer un compte' : 'Espace Mécanicien'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Rejoignez SOS Panne et recevez des demandes à proximité'
              : 'Connectez-vous pour gérer vos demandes'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Mail size={20} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputRow}>
              <Lock size={20} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
            </View>
          </View>

          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Chargement...' : isSignUp ? 'Créer le compte' : 'Se connecter'}
            </Text>
            <ArrowRight size={20} color={Colors.textInverse} />
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Déjà un compte ? Se connecter'
                : 'Pas de compte ? Créer un compte'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXxl,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSizeMd * Typography.lineHeightBody,
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
  switchButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  switchText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.secondaryLight,
  },
});
