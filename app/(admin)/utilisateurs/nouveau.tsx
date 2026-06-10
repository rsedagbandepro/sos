import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Wrench, ShieldCheck, Mail, Phone, UserPlus } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { adminCreateUser } from '@/hooks/useAdminUsers';
import { useState } from 'react';

const ROLE_ICON: Record<string, typeof User> = {
  driver: User,
  mechanic: Wrench,
  admin: ShieldCheck,
};

const ROLE_COLORS: Record<string, string> = {
  driver: Colors.primary,
  mechanic: Colors.accent,
  admin: Colors.error,
};

const ROLE_LABELS: Record<string, string> = {
  driver: 'Conducteur',
  mechanic: 'Mecanicien',
  admin: 'Admin',
};

export default function AdminNewUserScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'driver' | 'mechanic' | 'admin'>('driver');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('L\'email est requis');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await adminCreateUser(
        email.trim().toLowerCase(),
        password,
        fullName.trim() || null,
        phone.trim() || null,
        role
      );
      Alert.alert('Succes', 'Utilisateur cree avec succes', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = ROLE_ICON[role];
  const roleColor = ROLE_COLORS[role];

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Nouvel utilisateur</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.previewCard}>
          <View style={[styles.avatarBig, { backgroundColor: roleColor + '15' }]}>
            <Icon size={32} color={roleColor} />
          </View>
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{fullName || 'Nouvel utilisateur'}</Text>
            <Text style={styles.previewEmail}>{email || 'email@exemple.com'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABELS[role]}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de connexion</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.inputInner}
                value={email}
                onChangeText={setEmail}
                placeholder="email@exemple.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 caracteres"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jean Dupont"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telephone</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.inputInner}
                value={phone}
                onChangeText={setPhone}
                placeholder="+229 90 00 00 00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Role</Text>
          <View style={styles.roleButtons}>
            {(['driver', 'mechanic', 'admin'] as const).map((r) => {
              const RIcon = ROLE_ICON[r];
              const rColor = ROLE_COLORS[r];
              return (
                <Pressable
                  key={r}
                  style={[styles.roleCard, role === r && { borderColor: rColor, backgroundColor: rColor + '10' }]}
                  onPress={() => setRole(r)}
                >
                  <View style={[styles.roleIconWrap, { backgroundColor: rColor + '15' }]}>
                    <RIcon size={20} color={rColor} />
                  </View>
                  <Text style={[styles.roleCardText, role === r && { color: rColor }]}>{ROLE_LABELS[r]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <UserPlus size={20} color={Colors.textInverse} />
          )}
          <Text style={styles.submitBtnText}>Creer l\'utilisateur</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, paddingTop: Spacing.md },
  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  avatarBig: {
    width: 64, height: 64, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  previewInfo: { flex: 1, gap: Spacing.xs },
  previewName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  previewEmail: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full,
  },
  roleText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs },
  section: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  field: { gap: Spacing.xs },
  label: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md,
  },
  inputInner: {
    flex: 1, paddingVertical: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text,
  },
  roleButtons: { gap: Spacing.sm },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  roleIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  roleCardText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  errorBox: {
    backgroundColor: Colors.errorLight, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg,
  },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
  btnDisabled: { opacity: 0.6 },
});
