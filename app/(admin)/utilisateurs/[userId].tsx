import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
  TextInput, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, User, Wrench, ShieldCheck, Ban, CircleCheck as CheckCircle,
  Mail, Phone, Calendar, Save, Trash2,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAdminUser, adminUpdateUser, adminSetUserStatus, adminDeleteUser } from '@/hooks/useAdminUsers';
import { useState, useEffect } from 'react';

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

export default function AdminUserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { user, loading, error } = useAdminUser(userId ?? null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('driver');
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? '');
      setPhone(user.phone ?? '');
      setRole(user.role ?? 'driver');
    }
  }, [user]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await adminUpdateUser(userId, fullName || null, phone || null, role);
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setTogglingStatus(true);
    try {
      await adminSetUserStatus(userId!, !user.is_banned);
      // The user data will need to be refreshed - we'll just show a success message for now
      Alert.alert('Succes', user.is_banned ? 'Utilisateur reactive' : 'Utilisateur desactive');
      router.back();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    Alert.alert(
      'Supprimer l\'utilisateur',
      'Cette action est irreversible.Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteUser(userId);
              router.back();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (error || !user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Utilisateur introuvable'}</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Retour</Text></Pressable>
      </View>
    );
  }

  const Icon = ROLE_ICON[user.role] ?? User;
  const roleColor = ROLE_COLORS[user.role] ?? Colors.textTertiary;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Utilisateur</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={[styles.avatarBig, { backgroundColor: roleColor + '15' }]}>
            <Icon size={32} color={roleColor} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.full_name || 'Sans nom'}</Text>
            <View style={styles.statusRow}>
              {user.is_banned ? (
                <View style={styles.statusBadgeInactive}>
                  <Ban size={12} color={Colors.error} />
                  <Text style={styles.statusTextInactive}>Inactif</Text>
                </View>
              ) : (
                <View style={styles.statusBadgeActive}>
                  <CheckCircle size={12} color={Colors.success} />
                  <Text style={styles.statusTextActive}>Actif</Text>
                </View>
              )}
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABELS[user.role] ?? user.role}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Mail size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{user.email}</Text>
          </View>
          {user.phone && (
            <View style={styles.metaItem}>
              <Phone size={14} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{user.phone}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Calendar size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText}>Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modifier les informations</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nom complet"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telephone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Numero de telephone"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleButtons}>
              {(['driver', 'mechanic', 'admin'] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {ROLE_LABELS[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <Save size={18} color={Colors.textInverse} />}
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <Pressable
            style={[styles.toggleBtn, user.is_banned ? styles.activateBtn : styles.deactivateBtn, togglingStatus && styles.btnDisabled]}
            onPress={handleToggleStatus}
            disabled={togglingStatus}
          >
            {togglingStatus ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : user.is_banned ? (
              <CheckCircle size={18} color={Colors.textInverse} />
            ) : (
              <Ban size={18} color={Colors.textInverse} />
            )}
            <Text style={styles.toggleBtnText}>
              {user.is_banned ? 'Reactiver l\'utilisateur' : 'Desactiver l\'utilisateur'}
            </Text>
          </Pressable>

          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Trash2 size={18} color={Colors.error} />
            <Text style={styles.deleteBtnText}>Supprimer l\'utilisateur</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.background },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  backLink: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.primary },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  title: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, paddingTop: Spacing.md },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  avatarBig: {
    width: 64, height: 64, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1, gap: Spacing.xs },
  profileName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusBadgeActive: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full,
    backgroundColor: Colors.successLight,
  },
  statusTextActive: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs, color: Colors.success },
  statusBadgeInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorLight,
  },
  statusTextInactive: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs, color: Colors.error },
  roleBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full,
  },
  roleText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs },
  metaRow: { gap: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
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
  roleButtons: { flexDirection: 'row', gap: Spacing.sm },
  roleBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  roleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleBtnText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  roleBtnTextActive: { color: Colors.textInverse },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.textInverse },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
  },
  activateBtn: { backgroundColor: Colors.success },
  deactivateBtn: { backgroundColor: Colors.warning },
  toggleBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.textInverse },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error,
  },
  deleteBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.error },
  btnDisabled: { opacity: 0.5 },
});
