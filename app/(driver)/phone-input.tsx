import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { COUNTRY_CODE } from '@/constants/breakdownTypes';
import { ArrowLeft, Phone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhoneInputScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (phone.length < 8) {
      Alert.alert('Erreur', 'Entrez un numéro de téléphone valide');
      return;
    }

    setSubmitting(true);
    try {
      const fullPhone = COUNTRY_CODE + phone;
      await AsyncStorage.setItem('sos_panne_driver_phone', fullPhone);
      if (name) {
        await AsyncStorage.setItem('sos_panne_driver_name', name);
      }
      router.replace(`/(driver)/location-confirm?type=${type}&phone=${fullPhone}&name=${encodeURIComponent(name)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Vos informations</Text>
          <Text style={styles.subtitle}>
            Numéro de téléphone requis pour être contacté par le mécanicien
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Numéro de téléphone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>{COUNTRY_CODE}</Text>
            </View>
            <TextInput
              ref={inputRef}
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="97 00 00 00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
              autoFocus
              maxLength={12}
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Votre nom (optionnel)</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Comment vous appelle-t-on ?"
            placeholderTextColor={Colors.textTertiary}
            maxLength={50}
            autoComplete="name"
            textContentType="name"
          />
        </View>

        <Pressable
          style={[styles.submitButton, (!phone || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!phone || submitting}
          accessibilityLabel="Continuer"
          accessibilityRole="button"
        >
          <Phone size={20} color={Colors.textInverse} />
          <Text style={styles.submitButtonText}>
            {submitting ? 'Envoi...' : 'Continuer'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  form: {
    paddingHorizontal: Spacing.lg,
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
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  countryCode: {
    backgroundColor: Colors.surfaceDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    minWidth: 70,
    alignItems: 'center',
  },
  countryCodeText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  nameInput: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    marginTop: Spacing.md,
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
